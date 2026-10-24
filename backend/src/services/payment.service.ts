import crypto from 'crypto';
import mongoose, { Types } from 'mongoose';
import { Product } from '../models/Product.model';
import { Payment } from '../models/Payment.model';
import { RankingLedger, RankingContributionType } from '../models/RankingLedger.model';
import { PaymentWebhookEvent } from '../models/PaymentWebhookEvent.model';
import { ActivityEvent } from '../models/ActivityEvent.model';
import { emailQueue } from '../shared/email-queue';
import {
  PaymentStatus,
  ProductStatus,
  EventSource,
  MIN_INITIAL_RANKING_PAYMENT_CENTS,
  MIN_RANKING_INCREMENT_CENTS,
} from '../shared/constants';
import { redis, isRedisConnected } from '../shared/redis';
import { rankingService } from './ranking.service';
import { config } from '../shared/config';
import { logger } from '../shared/logger';
import { AppError, ValidationError, NotFoundError } from '../shared/errors';

export interface RankingCheckoutSessionParams {
  productId: string;
  productName: string;
  payerEmail?: string;
  contributionType?: 'INITIAL_ENTRY' | 'DAILY' | 'ALL_TIME_BOOST';
  amountCents: number;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSessionResult {
  checkoutUrl: string;
  sessionId: string;
}

export interface ParsedWebhookEvent {
  eventType: string;
  provider: 'paddle';
  providerEventId: string;
  providerPaymentId?: string;
  providerOrderId?: string;
  providerCustomerId?: string;
  productId?: string;
  payerEmail?: string;
  paymentType?: 'RANKING';
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  rawPayload: Record<string, unknown>;
}

export interface IPaymentProvider {
  createRankingCheckoutSession(params: RankingCheckoutSessionParams): Promise<CheckoutSessionResult>;
  verifyWebhookSignature(rawBody: string | Buffer, signatureHeader: string): boolean;
  parseWebhookEvent(rawBody: string | Buffer | Record<string, unknown>): ParsedWebhookEvent;
}

/**
 * Constant-time string comparison that prevents timing attacks and rejects length mismatches cleanly
 */
function safeCompare(a: string, b: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Helper to invalidate Redis leaderboard caches on payment updates
 */
async function invalidateLeaderboardCaches(): Promise<void> {
  if (!isRedisConnected()) return;
  try {
    const keys = await redis.keys('leaderboard:cache:*');
    if (keys && keys.length > 0) {
      await redis.del(...keys);
      logger.info({ count: keys.length }, 'Invalidated Redis leaderboard cache keys');
    }
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed to invalidate Redis leaderboard cache');
  }
}

/**
 * Paddle Global Merchant of Record Implementation
 */
export class PaddleProvider implements IPaymentProvider {
  private explicitSecret?: string;

  constructor(secret?: string) {
    this.explicitSecret = secret;
  }

  get webhookSecret(): string {
    return this.explicitSecret !== undefined ? this.explicitSecret : (config.PADDLE_WEBHOOK_SECRET || '');
  }

  hasWebhookSecret(): boolean {
    const secret = this.webhookSecret;
    return Boolean(secret && secret.trim().length > 0);
  }

  async createRankingCheckoutSession(params: RankingCheckoutSessionParams): Promise<CheckoutSessionResult> {
    const sessionId = `txn_paddle_rank_${params.productId}_${Date.now()}`;
    const checkoutHost =
      process.env.NODE_ENV === 'production'
        ? 'https://checkout.paddle.com'
        : 'https://sandbox-checkout.paddle.com';

    const query = new URLSearchParams({
      txn: sessionId,
      productId: params.productId,
      paymentType: 'RANKING',
      contributionType: params.contributionType || 'DAILY',
      amountCents: params.amountCents.toString(),
      returnUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
    });

    if (params.payerEmail) query.set('email', params.payerEmail);
    if (params.productName) query.set('productName', `${params.productName} — LaunchProduct Rank`);

    const checkoutUrl = `${checkoutHost}/checkout/build?${query.toString()}`;

    logger.info(
      { productId: params.productId, sessionId, amountCents: params.amountCents },
      'Generated Paddle Pay-to-Rank checkout session'
    );

    return { checkoutUrl, sessionId };
  }

  verifyWebhookSignature(rawBody: string | Buffer, signatureHeader: string): boolean {
    if (!this.hasWebhookSecret()) {
      return false;
    }
    if (!signatureHeader) return false;

    try {
      const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;

      if (signatureHeader.includes('ts=') && signatureHeader.includes('h1=')) {
        const parts = signatureHeader.split(';');
        const tsPart = parts.find((p) => p.startsWith('ts='));
        const h1Part = parts.find((p) => p.startsWith('h1='));

        if (!tsPart || !h1Part) return false;

        const ts = tsPart.split('=')[1];
        const h1 = h1Part.split('=')[1];
        const payloadToSign = `${ts}:${bodyStr}`;

        const computed = crypto
          .createHmac('sha256', this.webhookSecret)
          .update(payloadToSign)
          .digest('hex');

        return safeCompare(computed, h1);
      }

      const computed = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(bodyStr)
        .digest('hex');

      return safeCompare(computed, signatureHeader);
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Paddle signature verification failure');
      return false;
    }
  }

  parseWebhookEvent(rawBody: string | Buffer | Record<string, unknown>): ParsedWebhookEvent {
    let payload: Record<string, any>;
    if (typeof rawBody === 'string' || Buffer.isBuffer(rawBody)) {
      payload = JSON.parse(rawBody.toString('utf8'));
    } else {
      payload = rawBody;
    }

    const eventType = payload.event_type || payload.alert_name || 'transaction.completed';
    const eventId = payload.event_id || payload.alert_id || `evt_${Date.now()}`;
    const data = payload.data || payload;

    const productId =
      data.custom_data?.productId ||
      data.custom_data?.product_id ||
      data.custom_data?.productId_ ||
      undefined;

    const payerEmail =
      data.customer?.email ||
      data.email ||
      payload.email ||
      (data.custom_data?.payerEmail as string) ||
      undefined;

    const paymentId = data.id || data.order_id || data.payment_id;
    const customerId = data.customer_id || data.user_id;

    let amountCents = 0;
    if (data.details?.totals?.total) {
      amountCents = Math.round(parseFloat(data.details.totals.total) * 100);
    } else if (data.unit_price) {
      amountCents = Math.round(parseFloat(data.unit_price) * 100);
    } else if (data.amount) {
      amountCents = parseInt(data.amount, 10);
    }

    const currency = data.currency_code || data.currency || 'USD';

    let status = PaymentStatus.PENDING;
    if (['transaction.completed', 'payment.succeeded', 'order.completed'].includes(eventType)) {
      status = PaymentStatus.SUCCEEDED;
    } else if (['transaction.failed', 'payment.failed'].includes(eventType)) {
      status = PaymentStatus.FAILED;
    } else if (['transaction.refunded', 'payment.refunded'].includes(eventType)) {
      status = PaymentStatus.REFUNDED;
    } else if (['transaction.disputed', 'dispute.created'].includes(eventType)) {
      status = PaymentStatus.DISPUTED;
    }

    return {
      eventType,
      provider: 'paddle',
      providerEventId: eventId,
      providerPaymentId: paymentId,
      providerOrderId: data.order_id || paymentId,
      providerCustomerId: customerId,
      productId,
      payerEmail,
      paymentType: 'RANKING',
      amountCents,
      currency,
      status,
      rawPayload: payload,
    };
  }
}

// Singletons
const paddleProvider = new PaddleProvider();

export function getPaymentProvider(provider: string = 'paddle'): IPaymentProvider {
  const normalized = provider.toLowerCase().trim();
  if (normalized === 'paddle') return paddleProvider;

  throw new ValidationError(`Unsupported payment provider '${provider}'. Supported: paddle`, [
    { field: 'provider', code: 'INVALID_ENUM', message: 'Provider must be paddle' },
  ]);
}

const DISALLOWED_PRODUCT_STATUSES = [
  ProductStatus.SUSPENDED,
  ProductStatus.REJECTED,
  ProductStatus.DELETED,
  ProductStatus.ARCHIVED,
];

export class PaymentService {
  /**
   * Generates a Pay-to-Rank checkout session for a product
   */
  async createRankingCheckout(params: {
    productId: string;
    amountCents: number;
    payerEmail?: string;
    contributionType?: 'INITIAL_ENTRY' | 'DAILY' | 'ALL_TIME_BOOST';
    provider?: string;
    successUrl: string;
    cancelUrl: string;
  }): Promise<{
    checkoutUrl: string;
    sessionId: string;
    amountCents: number;
    productId: string;
    targetDailyDate: string;
    formattedAmount: string;
  }> {
    const {
      productId,
      payerEmail,
      contributionType = 'DAILY',
      amountCents,
      successUrl,
      cancelUrl,
      provider = 'paddle',
    } = params;

    if (!productId || !Types.ObjectId.isValid(productId)) {
      throw new ValidationError('Valid productId is required for ranking checkout', [
        { field: 'productId', code: 'INVALID', message: 'A valid product ID is required' },
      ]);
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new NotFoundError(`Product '${productId}' not found`);
    }

    // SUSPENDED, REJECTED, DELETED and ARCHIVED products must never receive ranking payments
    if (DISALLOWED_PRODUCT_STATUSES.includes(product.status)) {
      throw new ValidationError(
        `Product '${product.slug}' is in status '${product.status}' and cannot receive ranking payments`,
        [
          {
            field: 'productId',
            code: 'INVALID_STATUS',
            message: `Cannot checkout for product in status ${product.status}`,
          },
        ]
      );
    }

    // Validate Pay-to-Rank threshold and increment rules
    const rules = await rankingService.getRankingRules();
    const currentPaidCents = product.paidRankingAmountCents || 0;

    if (currentPaidCents === 0 && amountCents < rules.minInitialPaymentCents) {
      throw new ValidationError(
        `Initial ranking payment must be at least $${(rules.minInitialPaymentCents / 100).toFixed(2)} (${rules.minInitialPaymentCents} cents)`,
        [
          {
            field: 'amountCents',
            code: 'MIN_THRESHOLD',
            message: `Minimum initial entry payment is $${(rules.minInitialPaymentCents / 100).toFixed(2)}`,
          },
        ]
      );
    }

    if (amountCents < rules.minIncrementCents) {
      throw new ValidationError(
        `Ranking payment increment must be at least $${(rules.minIncrementCents / 100).toFixed(2)} (${rules.minIncrementCents} cents)`,
        [
          {
            field: 'amountCents',
            code: 'MIN_INCREMENT',
            message: `Minimum increment is $${(rules.minIncrementCents / 100).toFixed(2)}`,
          },
        ]
      );
    }

    const providerInstance = getPaymentProvider(provider);

    const sessionResult = await providerInstance.createRankingCheckoutSession({
      productId: product._id.toString(),
      productName: product.name,
      payerEmail,
      contributionType,
      amountCents,
      successUrl,
      cancelUrl,
    });

    const targetDailyDate = new Date().toISOString().split('T')[0];

    return {
      checkoutUrl: sessionResult.checkoutUrl,
      sessionId: sessionResult.sessionId,
      amountCents,
      productId: product._id.toString(),
      targetDailyDate,
      formattedAmount: `$${(amountCents / 100).toFixed(2)}`,
    };
  }

  /**
   * Authoritative Merchant of Record Inbound Webhook Processor
   * Only processes Pay-to-Rank ranking confirmations, refunds, and disputes.
   */
  async handlePaymentWebhook(
    providerName: string,
    rawBody: Buffer | string,
    signatureHeader: string
  ): Promise<{ success: boolean; message: string; productId?: string }> {
    const provider = getPaymentProvider(providerName);

    if (provider instanceof PaddleProvider && !provider.hasWebhookSecret()) {
      logger.error('Paddle webhook secret is not configured on this server');
      throw new AppError(503, 'WEBHOOK_NOT_CONFIGURED', 'Paddle webhook secret is not configured on this server');
    }

    // 1. Verify signature
    const isValid = provider.verifyWebhookSignature(rawBody, signatureHeader);
    if (!isValid) {
      logger.warn({ provider: providerName }, 'Inbound webhook HMAC signature validation failed');
      throw new AppError(400, 'WEBHOOK_SIGNATURE_INVALID', 'Invalid webhook HMAC signature');
    }

    // 2. Parse event
    const event = provider.parseWebhookEvent(rawBody);

    // 3. Timestamp drift check (< 300s)
    const nowSec = Math.floor(Date.now() / 1000);
    let eventTsSec: number | null = null;
    if (signatureHeader && signatureHeader.includes('ts=')) {
      const match = signatureHeader.match(/ts=(\d+)/);
      if (match && match[1]) eventTsSec = parseInt(match[1], 10);
    }
    if (eventTsSec === null) {
      const payloadDate =
        event.rawPayload?.occurred_at ||
        event.rawPayload?.created_at ||
        (event.rawPayload?.data as any)?.created_at;
      if (payloadDate) {
        eventTsSec =
          typeof payloadDate === 'number'
            ? payloadDate
            : Math.floor(new Date(payloadDate).getTime() / 1000);
      }
    }
    if (eventTsSec !== null && !isNaN(eventTsSec)) {
      const drift = Math.abs(nowSec - eventTsSec);
      if (drift > 300) {
        logger.warn({ provider: providerName, drift }, 'Webhook timestamp expired (>300s)');
        throw new AppError(400, 'WEBHOOK_TIMESTAMP_EXPIRED', 'Webhook event timestamp is too old (> 300s drift)');
      }
    }

    // 4. Idempotency check: providerEventId
    const existing = await PaymentWebhookEvent.findOne({ providerEventId: event.providerEventId });
    if (existing && (existing.processingStatus === 'PROCESSED' || existing.status === 'PROCESSED')) {
      logger.info({ providerEventId: event.providerEventId }, 'Idempotent duplicate webhook event skipped');
      return {
        success: true,
        message: 'Webhook event already processed (idempotent duplicate).',
        productId: event.productId,
      };
    }

    let webhookRecord = existing;
    if (!webhookRecord) {
      webhookRecord = await PaymentWebhookEvent.create({
        provider: event.provider,
        providerEventId: event.providerEventId,
        eventType: event.eventType,
        rawPayload: event.rawPayload,
        processingStatus: 'RECEIVED',
        status: 'RECEIVED',
      });
    }

    const isSuccess =
      event.status === PaymentStatus.SUCCEEDED ||
      ['transaction.completed', 'payment.succeeded', 'order.completed', 'order_created'].includes(
        event.eventType
      );

    // Pay-to-Rank Confirmation
    if (isSuccess && event.productId && Types.ObjectId.isValid(event.productId)) {
      const product = await Product.findById(event.productId);
      if (!product) {
        logger.warn({ productId: event.productId }, 'Product not found for ranking payment activation');
        await PaymentWebhookEvent.findByIdAndUpdate(webhookRecord._id, {
          $set: { processingStatus: 'FAILED', status: 'FAILED', processedAt: new Date() },
        });
        throw new NotFoundError(`Product '${event.productId}' not found for ranking payment`);
      }

      // SUSPENDED, REJECTED, DELETED and ARCHIVED products must never become LIVE through a payment
      if (DISALLOWED_PRODUCT_STATUSES.includes(product.status)) {
        logger.warn({ productId: product._id, status: product.status }, 'Webhook received payment for product in disallowed status');
        await PaymentWebhookEvent.findByIdAndUpdate(webhookRecord._id, {
          $set: { processingStatus: 'FAILED', status: 'FAILED', processedAt: new Date() },
        });
        throw new AppError(400, 'PRODUCT_STATUS_DISALLOWED', `Product is in status ${product.status} and cannot receive ranking payments`);
      }

      const now = new Date();
      const targetDailyDate = now.toISOString().split('T')[0];
      const paymentAmountCents = event.amountCents || MIN_INITIAL_RANKING_PAYMENT_CENTS;

      const previousAllTime = product.paidRankingAmountCents || 0;
      const previousToday = product.todayPaidDate === targetDailyDate ? (product.todayPaidAmountCents || 0) : 0;

      const rawContrib =
        (event.rawPayload?.contributionType as string) ||
        (event.rawPayload?.['checkout[custom][contribution_type]'] as string) ||
        (previousAllTime === 0 ? 'INITIAL_ENTRY' : 'DAILY');

      const contributionType: RankingContributionType =
        rawContrib === 'INITIAL_ENTRY' || rawContrib === 'ALL_TIME_BOOST' || rawContrib === 'DAILY'
          ? (rawContrib as RankingContributionType)
          : (previousAllTime === 0 ? 'INITIAL_ENTRY' : 'DAILY');

      let newAllTime = previousAllTime;
      let newToday = previousToday;

      if (contributionType === 'INITIAL_ENTRY') {
        newAllTime = previousAllTime + paymentAmountCents;
        newToday = previousToday + paymentAmountCents;
      } else if (contributionType === 'DAILY') {
        newToday = previousToday + paymentAmountCents;
      } else if (contributionType === 'ALL_TIME_BOOST') {
        newAllTime = previousAllTime + paymentAmountCents;
      }

      const payerEmail =
        (event.rawPayload?.email as string) ||
        (event.rawPayload?.data as any)?.customer?.email ||
        event.payerEmail;

      // MongoDB Multi-Document ACID Transaction with standalone fallback
      let session: mongoose.ClientSession | null = null;
      try {
        session = await mongoose.startSession();
        session.startTransaction();

        // 1. Insert Payment Document (account-free)
        const [paymentDoc] = await Payment.create(
          [
            {
              productId: product._id,
              payerEmail: payerEmail || undefined,
              contributionType,
              paymentType: 'RANKING',
              provider: event.provider,
              providerCustomerId: event.providerCustomerId || undefined,
              providerPaymentId: event.providerPaymentId || undefined,
              providerOrderId: event.providerOrderId || undefined,
              providerEventId: event.providerEventId,
              amountCents: paymentAmountCents,
              rankingContributionCents: paymentAmountCents,
              appliedToRanking: true,
              targetDailyDate,
              currency: event.currency || 'USD',
              status: PaymentStatus.SUCCEEDED,
            },
          ],
          { session }
        );

        // 2. Insert Immutable RankingLedger Audit Entry (account-free)
        await RankingLedger.create(
          [
            {
              paymentId: paymentDoc._id,
              productId: product._id,
              payerEmail: payerEmail || undefined,
              contributionType,
              amountCents: paymentAmountCents,
              qualifyingAmountCents: paymentAmountCents,
              targetDailyDate,
              status: 'APPLIED',
              previousAllTimeCents: previousAllTime,
              newAllTimeCents: newAllTime,
              previousTodayCents: previousToday,
              newTodayCents: newToday,
              appliedAt: now,
            },
          ],
          { session }
        );

        // 3. Atomically Update Product Paid Ranking Totals & Dates
        // The payment webhook may ONLY move DRAFT -> LIVE.
        const productUpdates: any = {
          $set: {
            paidRankingAmountCents: newAllTime,
            todayPaidAmountCents: newToday,
            todayPaidDate: targetDailyDate,
            lastPaidAt: now,
            updatedAt: now,
          },
        };
        if (product.status === ProductStatus.DRAFT) {
          productUpdates.$set.status = ProductStatus.LIVE;
        }
        if (!product.firstPaidAt) {
          productUpdates.$set.firstPaidAt = now;
        }

        await Product.findByIdAndUpdate(product._id, productUpdates, { session });

        // 4. Mark Webhook as PROCESSED
        await PaymentWebhookEvent.findByIdAndUpdate(
          webhookRecord._id,
          {
            $set: {
              processingStatus: 'PROCESSED',
              status: 'PROCESSED',
              processedAt: now,
            },
          },
          { session }
        );

        // 5. Record ActivityEvent (account-free)
        await ActivityEvent.create(
          [
            {
              productId: product._id,
              eventType: 'RANKING_PAYMENT_CONFIRMED',
              eventSource: EventSource.SPONSORED,
              metadata: {
                paymentId: paymentDoc._id.toString(),
                amountCents: paymentAmountCents,
                newAllTimeCents: newAllTime,
                targetDailyDate,
                contributionType,
                provider: event.provider,
                providerPaymentId: event.providerPaymentId,
              },
            },
          ],
          { session }
        );

        await session.commitTransaction();
        logger.info({ productId: product._id, amountCents: paymentAmountCents, contributionType }, 'Pay-to-Rank transaction committed');
      } catch (txnErr: any) {
        if (session) {
          try {
            await session.abortTransaction();
          } catch {
            // ignore
          }
        }
        if (txnErr.message && txnErr.message.includes('replica set')) {
          // Standalone MongoDB fallback for test environments
          const paymentDoc = await Payment.create({
            productId: product._id,
            payerEmail: payerEmail || undefined,
            contributionType,
            paymentType: 'RANKING',
            provider: event.provider,
            providerCustomerId: event.providerCustomerId || undefined,
            providerPaymentId: event.providerPaymentId || undefined,
            providerOrderId: event.providerOrderId || undefined,
            providerEventId: event.providerEventId,
            amountCents: paymentAmountCents,
            rankingContributionCents: paymentAmountCents,
            appliedToRanking: true,
            targetDailyDate,
            currency: event.currency || 'USD',
            status: PaymentStatus.SUCCEEDED,
          });

          await RankingLedger.create({
            paymentId: paymentDoc._id,
            productId: product._id,
            payerEmail: payerEmail || undefined,
            contributionType,
            amountCents: paymentAmountCents,
            qualifyingAmountCents: paymentAmountCents,
            targetDailyDate,
            status: 'APPLIED',
            previousAllTimeCents: previousAllTime,
            newAllTimeCents: newAllTime,
            previousTodayCents: previousToday,
            newTodayCents: newToday,
            appliedAt: now,
          });

          const fallbackUpdates: any = {
            $set: {
              paidRankingAmountCents: newAllTime,
              todayPaidAmountCents: newToday,
              todayPaidDate: targetDailyDate,
              lastPaidAt: now,
              updatedAt: now,
            },
          };
          if (product.status === ProductStatus.DRAFT) {
            fallbackUpdates.$set.status = ProductStatus.LIVE;
          }
          if (!product.firstPaidAt) {
            fallbackUpdates.$set.firstPaidAt = now;
          }

          await Product.findByIdAndUpdate(product._id, fallbackUpdates);

          await PaymentWebhookEvent.findByIdAndUpdate(webhookRecord._id, {
            $set: { processingStatus: 'PROCESSED', status: 'PROCESSED', processedAt: now },
          });
        } else {
          await PaymentWebhookEvent.findByIdAndUpdate(webhookRecord._id, {
            $set: { processingStatus: 'FAILED', status: 'FAILED', processedAt: now },
          });
          throw txnErr;
        }
      } finally {
        if (session) await session.endSession();
      }

      await invalidateLeaderboardCaches();

      // Enqueue ranking payment confirmation email using payer email from Paddle payload
      if (payerEmail) {
        try {
          await emailQueue.add('RANKING_PAYMENT_CONFIRMED', {
            to: payerEmail,
            productName: product.name,
            slug: product.slug,
            amountCents: paymentAmountCents,
            contributionType,
            targetDailyDate,
          });
          logger.info({ payerEmail, productId: product._id }, 'Enqueued ranking payment confirmation email');
        } catch (mailErr: any) {
          logger.warn({ err: mailErr.message }, 'Failed to enqueue ranking payment confirmed email');
        }
      }

      return {
        success: true,
        message: 'Pay-to-Rank payment confirmed and durable ledger updated.',
        productId: product._id.toString(),
      };
    }

    // Refunds, Disputes, and Reversals
    const isRefundOrDispute =
      event.status === PaymentStatus.REFUNDED ||
      event.status === PaymentStatus.DISPUTED ||
      ['transaction.refunded', 'payment.refunded', 'order_refunded', 'transaction.disputed', 'dispute.created'].includes(
        event.eventType
      );

    if (isRefundOrDispute) {
      const paymentFilter: any = {};
      if (event.providerPaymentId) {
        paymentFilter.providerPaymentId = event.providerPaymentId;
      } else if (event.productId && Types.ObjectId.isValid(event.productId)) {
        paymentFilter.productId = new Types.ObjectId(event.productId);
      }

      const existingPayment = await Payment.findOne(paymentFilter);
      if (existingPayment) {
        await Payment.findByIdAndUpdate(existingPayment._id, {
          $set: { status: event.status || PaymentStatus.REFUNDED, updatedAt: new Date() },
        });

        // Reverse ledger entry and decrement product ranking amount
        if (existingPayment.rankingContributionCents > 0) {
          await RankingLedger.findOneAndUpdate(
            { paymentId: existingPayment._id },
            {
              $set: {
                status: 'REVERSED',
                reversedAt: new Date(),
                reversalReason: event.eventType,
              },
            }
          );

          const reversalAmount = existingPayment.rankingContributionCents;
          const productToDeduct = await Product.findById(existingPayment.productId);
          if (productToDeduct) {
            const newPaid = Math.max(0, (productToDeduct.paidRankingAmountCents || 0) - reversalAmount);
            const todayStr = new Date().toISOString().split('T')[0];
            const updates: any = {
              $set: { paidRankingAmountCents: newPaid, updatedAt: new Date() },
            };
            if (existingPayment.targetDailyDate === todayStr) {
              updates.$set.todayPaidAmountCents = Math.max(0, (productToDeduct.todayPaidAmountCents || 0) - reversalAmount);
            }
            await Product.findByIdAndUpdate(productToDeduct._id, updates);
            await invalidateLeaderboardCaches();
          }

          logger.warn(
            { paymentId: existingPayment._id, eventType: event.eventType },
            'Reversed ranking contribution due to refund/dispute'
          );
        }
      }
    }

    await PaymentWebhookEvent.findByIdAndUpdate(webhookRecord._id, {
      $set: { processingStatus: 'PROCESSED', status: 'PROCESSED', processedAt: new Date() },
    });

    return {
      success: true,
      message: 'Webhook processed.',
      productId: event.productId,
    };
  }
}

export const paymentService = new PaymentService();
export default paymentService;
