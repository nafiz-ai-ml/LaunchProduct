import crypto from 'crypto';
import mongoose, { Types } from 'mongoose';
import { Campaign, CampaignTier } from '../models/Campaign.model';
import { Product } from '../models/Product.model';
import { Payment } from '../models/Payment.model';
import { RankingLedger } from '../models/RankingLedger.model';
import { PaymentWebhookEvent } from '../models/PaymentWebhookEvent.model';
import { ActivityEvent } from '../models/ActivityEvent.model';
import { User } from '../models/User.model';
import { campaignQueue } from '../shared/campaign-queue';
import { emailQueue } from '../shared/email-queue';
import {
  PaymentStatus,
  EventSource,
  SPONSORSHIP_DURATIONS_HOURS,
  MIN_INITIAL_RANKING_PAYMENT_CENTS,
  MIN_RANKING_INCREMENT_CENTS,
} from '../shared/constants';
import { redis, isRedisConnected } from '../shared/redis';
import { rankingService } from './ranking.service';
import { config } from '../shared/config';
import { logger } from '../shared/logger';
import { AppError, AuthenticationError, ValidationError, NotFoundError } from '../shared/errors';

export interface CheckoutSessionParams {
  tier: CampaignTier;
  amountCents: number;
  campaignId: string;
  successUrl: string;
  cancelUrl: string;
  founderEmail?: string;
  productName?: string;
  targetCategorySlug?: string;
}

export interface RankingCheckoutSessionParams {
  productId: string;
  productName: string;
  founderId: string;
  founderEmail?: string;
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
  provider: 'paddle' | 'lemonsqueezy';
  providerEventId: string;
  providerPaymentId?: string;
  providerOrderId?: string;
  providerCustomerId?: string;
  campaignId?: string;
  productId?: string;
  founderId?: string;
  paymentType?: 'RANKING' | 'SPONSORSHIP';
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  rawPayload: Record<string, unknown>;
}

export interface IPaymentProvider {
  createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult>;
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
  private webhookSecret: string;

  constructor(secret?: string) {
    this.webhookSecret =
      secret ||
      process.env.PADDLE_WEBHOOK_SECRET ||
      config.PADDLE_WEBHOOK_SECRET ||
      'paddle_webhook_secret_dev_key_fallback_12345';
  }

  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    const sessionId = `txn_paddle_${params.campaignId}_${Date.now()}`;
    const checkoutHost =
      process.env.NODE_ENV === 'production'
        ? 'https://checkout.paddle.com'
        : 'https://sandbox-checkout.paddle.com';

    const query = new URLSearchParams({
      txn: sessionId,
      campaignId: params.campaignId,
      tier: params.tier,
      amountCents: params.amountCents.toString(),
      returnUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
    });

    if (params.founderEmail) query.set('email', params.founderEmail);
    if (params.productName) query.set('productName', params.productName);

    const checkoutUrl = `${checkoutHost}/checkout/build?${query.toString()}`;

    logger.info(
      { campaignId: params.campaignId, sessionId, tier: params.tier, amountCents: params.amountCents },
      'Generated Paddle checkout session'
    );

    return { checkoutUrl, sessionId };
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
      founderId: params.founderId,
      paymentType: 'RANKING',
      amountCents: params.amountCents.toString(),
      returnUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
    });

    if (params.founderEmail) query.set('email', params.founderEmail);
    if (params.productName) query.set('productName', `${params.productName} — LaunchProduct Rank`);

    const checkoutUrl = `${checkoutHost}/checkout/build?${query.toString()}`;

    logger.info(
      { productId: params.productId, sessionId, amountCents: params.amountCents },
      'Generated Paddle Pay-to-Rank checkout session'
    );

    return { checkoutUrl, sessionId };
  }

  verifyWebhookSignature(rawBody: string | Buffer, signatureHeader: string): boolean {
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

    const campaignId =
      data.custom_data?.campaignId ||
      data.custom_data?.campaign_id ||
      payload.passthrough ||
      data.passthrough ||
      undefined;

    const productId =
      data.custom_data?.productId ||
      data.custom_data?.product_id ||
      data.custom_data?.productId_ ||
      undefined;

    const founderId =
      data.custom_data?.founderId ||
      data.custom_data?.founder_id ||
      undefined;

    const paymentType: 'RANKING' | 'SPONSORSHIP' =
      data.custom_data?.paymentType === 'RANKING' || productId ? 'RANKING' : 'SPONSORSHIP';

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
      campaignId,
      productId,
      founderId,
      paymentType,
      amountCents,
      currency,
      status,
      rawPayload: payload,
    };
  }
}

/**
 * Lemon Squeezy Merchant of Record Implementation
 */
export class LemonSqueezyProvider implements IPaymentProvider {
  private webhookSecret: string;

  constructor(secret?: string) {
    this.webhookSecret =
      secret ||
      process.env.LEMONSQUEEZY_WEBHOOK_SECRET ||
      'lemonsqueezy_webhook_secret_dev_key_fallback_12345';
  }

  async createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult> {
    const sessionId = `txn_ls_${params.campaignId}_${Date.now()}`;
    const query = new URLSearchParams({
      'checkout[custom][campaign_id]': params.campaignId,
      'checkout[custom][tier]': params.tier,
      'checkout[email]': params.founderEmail || '',
      'checkout[product_name]': params.productName || 'LaunchProduct Sponsorship',
      'return_url': params.successUrl,
      'cancel_url': params.cancelUrl,
    });

    const checkoutUrl = `https://launchproduct.lemonsqueezy.com/buy/${sessionId}?${query.toString()}`;

    logger.info(
      { campaignId: params.campaignId, sessionId, tier: params.tier, amountCents: params.amountCents },
      'Generated Lemon Squeezy checkout session'
    );

    return { checkoutUrl, sessionId };
  }

  async createRankingCheckoutSession(params: RankingCheckoutSessionParams): Promise<CheckoutSessionResult> {
    const sessionId = `txn_ls_rank_${params.productId}_${Date.now()}`;
    const query = new URLSearchParams({
      'checkout[custom][product_id]': params.productId,
      'checkout[custom][founder_id]': params.founderId,
      'checkout[custom][payment_type]': 'RANKING',
      'checkout[email]': params.founderEmail || '',
      'checkout[product_name]': `${params.productName} — LaunchProduct Rank`,
      'return_url': params.successUrl,
      'cancel_url': params.cancelUrl,
    });

    const checkoutUrl = `https://launchproduct.lemonsqueezy.com/buy/${sessionId}?${query.toString()}`;

    logger.info(
      { productId: params.productId, sessionId, amountCents: params.amountCents },
      'Generated Lemon Squeezy Pay-to-Rank checkout session'
    );

    return { checkoutUrl, sessionId };
  }

  verifyWebhookSignature(rawBody: string | Buffer, signatureHeader: string): boolean {
    if (!signatureHeader) return false;

    try {
      const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;
      const computed = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(bodyStr)
        .digest('hex');

      return safeCompare(computed, signatureHeader);
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Lemon Squeezy signature verification failure');
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

    const eventName = payload.meta?.event_name || 'order_created';
    const eventId = payload.meta?.webhook_id || `evt_ls_${Date.now()}`;
    const data = payload.data || {};
    const attributes = data.attributes || {};

    const campaignId =
      payload.meta?.custom_data?.campaign_id ||
      payload.meta?.custom_data?.campaignId ||
      undefined;

    const productId =
      payload.meta?.custom_data?.product_id ||
      payload.meta?.custom_data?.productId ||
      undefined;

    const founderId =
      payload.meta?.custom_data?.founder_id ||
      payload.meta?.custom_data?.founderId ||
      undefined;

    const paymentType: 'RANKING' | 'SPONSORSHIP' =
      payload.meta?.custom_data?.payment_type === 'RANKING' || productId ? 'RANKING' : 'SPONSORSHIP';

    const paymentId = data.id || attributes.order_number?.toString();
    const customerId = attributes.customer_id?.toString();
    const amountCents = attributes.total || attributes.total_usd || 0;
    const currency = attributes.currency || 'USD';

    let status = PaymentStatus.PENDING;
    if (['order_created', 'subscription_payment_success'].includes(eventName)) {
      status = PaymentStatus.SUCCEEDED;
    } else if (['order_refunded'].includes(eventName)) {
      status = PaymentStatus.REFUNDED;
    }

    return {
      eventType: eventName,
      provider: 'lemonsqueezy',
      providerEventId: eventId,
      providerPaymentId: paymentId,
      providerOrderId: attributes.order_number?.toString() || paymentId,
      providerCustomerId: customerId,
      campaignId,
      productId,
      founderId,
      paymentType,
      amountCents,
      currency,
      status,
      rawPayload: payload,
    };
  }
}

// Singletons
const paddleProvider = new PaddleProvider();
const lemonSqueezyProvider = new LemonSqueezyProvider();

export function getPaymentProvider(provider: string = 'paddle'): IPaymentProvider {
  const normalized = provider.toLowerCase().trim();
  if (normalized === 'paddle') return paddleProvider;
  if (normalized === 'lemonsqueezy' || normalized === 'lemon_squeezy') return lemonSqueezyProvider;

  throw new ValidationError(`Unsupported payment provider '${provider}'. Supported: paddle, lemonsqueezy`, [
    { field: 'provider', code: 'INVALID_ENUM', message: 'Provider must be paddle or lemonsqueezy' },
  ]);
}

export class PaymentService {
  /**
   * Generates a Pay-to-Rank checkout session for a product
   */
  async createRankingCheckout(params: {
    productId: string;
    founderId: string;
    amountCents: number;
    successUrl: string;
    cancelUrl: string;
    provider?: string;
  }): Promise<{
    checkoutUrl: string;
    sessionId: string;
    amountCents: number;
    productId: string;
    targetDailyDate: string;
    formattedAmount: string;
  }> {
    const { productId, founderId, amountCents, successUrl, cancelUrl, provider = 'paddle' } = params;

    if (!productId || !Types.ObjectId.isValid(productId)) {
      throw new ValidationError('Valid productId is required for ranking checkout', [
        { field: 'productId', code: 'INVALID', message: 'A valid product ID is required' },
      ]);
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new NotFoundError(`Product '${productId}' not found`);
    }

    // Tenant / Ownership Authorization check
    const isOwner =
      (product.founderId && product.founderId.toString() === founderId) ||
      (product.submittedById && product.submittedById.toString() === founderId);

    if (!isOwner) {
      const user = await User.findById(founderId).lean();
      if (!user || user.role !== 'ADMIN') {
        throw new AuthenticationError('You do not have permission to purchase ranking for this product', 'FORBIDDEN');
      }
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

    const founder = await User.findById(founderId).lean();
    const providerInstance = getPaymentProvider(provider);

    const sessionResult = await providerInstance.createRankingCheckoutSession({
      productId: product._id.toString(),
      productName: product.name,
      founderId,
      founderEmail: founder?.email,
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
   * Supports Pay-to-Rank transactions as well as legacy campaign sponsorships.
   */
  async handlePaymentWebhook(
    providerName: string,
    rawBody: Buffer | string,
    signatureHeader: string
  ): Promise<{ success: boolean; message: string; campaignId?: string; productId?: string }> {
    const provider = getPaymentProvider(providerName);

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
        campaignId: event.campaignId,
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

    const isRankingPayment =
      event.paymentType === 'RANKING' ||
      (event.productId && Types.ObjectId.isValid(event.productId)) ||
      (!event.campaignId && Boolean(event.productId));

    // ==========================================
    // Flow A: Pay-to-Rank Confirmation
    // ==========================================
    if (isSuccess && isRankingPayment && event.productId && Types.ObjectId.isValid(event.productId)) {
      const product = await Product.findById(event.productId);
      if (!product) {
        logger.warn({ productId: event.productId }, 'Product not found for ranking payment activation');
        await PaymentWebhookEvent.findByIdAndUpdate(webhookRecord._id, {
          $set: { processingStatus: 'FAILED', status: 'FAILED', processedAt: new Date() },
        });
        throw new NotFoundError(`Product '${event.productId}' not found for ranking payment`);
      }

      const now = new Date();
      const targetDailyDate = now.toISOString().split('T')[0];
      const founderId = product.founderId || (event.founderId ? new Types.ObjectId(event.founderId) : product.submittedById);
      const paymentAmountCents = event.amountCents || MIN_INITIAL_RANKING_PAYMENT_CENTS;

      const previousAllTime = product.paidRankingAmountCents || 0;
      const newAllTime = previousAllTime + paymentAmountCents;
      const previousToday = product.todayPaidDate === targetDailyDate ? (product.todayPaidAmountCents || 0) : 0;
      const newToday = previousToday + paymentAmountCents;

      // MongoDB Multi-Document ACID Transaction with standalone fallback
      let session: mongoose.ClientSession | null = null;
      try {
        session = await mongoose.startSession();
        session.startTransaction();

        // 1. Insert Payment Document
        const [paymentDoc] = await Payment.create(
          [
            {
              productId: product._id,
              founderId,
              paymentType: 'RANKING',
              provider: event.provider,
              providerCustomerId: event.providerCustomerId || null,
              providerPaymentId: event.providerPaymentId || null,
              providerOrderId: event.providerOrderId || null,
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

        // 2. Insert Immutable RankingLedger Audit Entry
        await RankingLedger.create(
          [
            {
              paymentId: paymentDoc._id,
              productId: product._id,
              founderId,
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
        const productUpdates: any = {
          $set: {
            paidRankingAmountCents: newAllTime,
            todayPaidAmountCents: newToday,
            todayPaidDate: targetDailyDate,
            lastPaidAt: now,
            updatedAt: now,
          },
        };
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

        // 5. Record ActivityEvent
        await ActivityEvent.create(
          [
            {
              productId: product._id,
              userId: founderId,
              eventType: 'RANKING_PAYMENT_CONFIRMED',
              eventSource: EventSource.SPONSORED,
              metadata: {
                paymentId: paymentDoc._id.toString(),
                amountCents: paymentAmountCents,
                newAllTimeCents: newAllTime,
                targetDailyDate,
                provider: event.provider,
                providerPaymentId: event.providerPaymentId,
              },
            },
          ],
          { session }
        );

        await session.commitTransaction();
        logger.info({ productId: product._id, amountCents: paymentAmountCents }, 'Pay-to-Rank transaction committed');
      } catch (txnErr: any) {
        if (session) {
          try {
            await session.abortTransaction();
          } catch {
            // ignore abort error
          }
        }

        // Standalone MongoDB Fallback (e.g. local dev without replica set)
        if (txnErr.message && txnErr.message.includes('replica set')) {
          logger.warn({ productId: product._id }, 'Executing Pay-to-Rank sequentially in standalone mode');

          const paymentDoc = await Payment.create({
            productId: product._id,
            founderId,
            paymentType: 'RANKING',
            provider: event.provider,
            providerCustomerId: event.providerCustomerId || null,
            providerPaymentId: event.providerPaymentId || null,
            providerOrderId: event.providerOrderId || null,
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
            founderId,
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

          const productUpdates: any = {
            $set: {
              paidRankingAmountCents: newAllTime,
              todayPaidAmountCents: newToday,
              todayPaidDate: targetDailyDate,
              lastPaidAt: now,
              updatedAt: now,
            },
          };
          if (!product.firstPaidAt) {
            productUpdates.$set.firstPaidAt = now;
          }

          await Product.findByIdAndUpdate(product._id, productUpdates);

          await PaymentWebhookEvent.findByIdAndUpdate(webhookRecord._id, {
            $set: { processingStatus: 'PROCESSED', status: 'PROCESSED', processedAt: now },
          });

          await ActivityEvent.create({
            productId: product._id,
            userId: founderId,
            eventType: 'RANKING_PAYMENT_CONFIRMED',
            eventSource: EventSource.SPONSORED,
            metadata: {
              paymentId: paymentDoc._id.toString(),
              amountCents: paymentAmountCents,
              newAllTimeCents: newAllTime,
              targetDailyDate,
              provider: event.provider,
              providerPaymentId: event.providerPaymentId,
            },
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

      // Invalidate Redis Leaderboard caches immediately
      await invalidateLeaderboardCaches();

      // Enqueue notification email to founder
      try {
        const founderUser = await User.findById(founderId).select('email').lean();
        if (founderUser?.email) {
          await emailQueue.add('send-ranking-confirmed', {
            to: founderUser.email,
            productId: product._id.toString(),
            productName: product.name,
            amountPaidFormatted: `$${(paymentAmountCents / 100).toFixed(2)}`,
            newAllTimeFormatted: `$${(newAllTime / 100).toFixed(2)}`,
          });
        }
      } catch (eErr: any) {
        logger.warn({ err: eErr.message }, 'Failed to enqueue founder ranking payment confirmation email');
      }

      return {
        success: true,
        message: 'Pay-to-Rank payment confirmed and durable ledger updated.',
        productId: product._id.toString(),
      };
    }

    // ==========================================
    // Flow B: Legacy Campaign Sponsorship Confirmation
    // ==========================================
    if (isSuccess && event.campaignId && Types.ObjectId.isValid(event.campaignId)) {
      const campaign = await Campaign.findById(event.campaignId);
      if (!campaign) {
        logger.warn({ campaignId: event.campaignId }, 'Campaign not found for payment webhook activation');
        await PaymentWebhookEvent.findByIdAndUpdate(webhookRecord._id, {
          $set: { processingStatus: 'FAILED', status: 'FAILED', processedAt: new Date() },
        });
        throw new NotFoundError(`Campaign '${event.campaignId}' not found for activation`);
      }

      const now = new Date();
      const startsAt = campaign.startsAt && campaign.startsAt > now ? campaign.startsAt : now;
      const durationHours = SPONSORSHIP_DURATIONS_HOURS[campaign.tier] || 24;
      const endsAt = new Date(startsAt.getTime() + durationHours * 3600 * 1000);

      let session: mongoose.ClientSession | null = null;
      try {
        session = await mongoose.startSession();
        session.startTransaction();

        await Payment.create(
          [
            {
              productId: campaign.productId,
              campaignId: campaign._id,
              founderId: campaign.founderId,
              paymentType: 'SPONSORSHIP',
              provider: event.provider,
              providerCustomerId: event.providerCustomerId || null,
              providerPaymentId: event.providerPaymentId || null,
              providerOrderId: event.providerOrderId || null,
              providerEventId: event.providerEventId,
              amountCents: event.amountCents || campaign.amountCents,
              rankingContributionCents: 0,
              appliedToRanking: false,
              currency: event.currency || 'USD',
              status: PaymentStatus.SUCCEEDED,
            },
          ],
          { session }
        );

        await Campaign.findByIdAndUpdate(
          campaign._id,
          {
            $set: {
              status: 'ACTIVE',
              startsAt,
              endsAt,
              providerPaymentId: event.providerPaymentId || campaign.providerPaymentId,
              updatedAt: now,
            },
          },
          { session }
        );

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

        await session.commitTransaction();
      } catch (txnErr: any) {
        if (session) {
          try {
            await session.abortTransaction();
          } catch {
            // ignore
          }
        }
        if (txnErr.message && txnErr.message.includes('replica set')) {
          await Payment.create({
            productId: campaign.productId,
            campaignId: campaign._id,
            founderId: campaign.founderId,
            paymentType: 'SPONSORSHIP',
            provider: event.provider,
            providerCustomerId: event.providerCustomerId || null,
            providerPaymentId: event.providerPaymentId || null,
            providerOrderId: event.providerOrderId || null,
            providerEventId: event.providerEventId,
            amountCents: event.amountCents || campaign.amountCents,
            rankingContributionCents: 0,
            appliedToRanking: false,
            currency: event.currency || 'USD',
            status: PaymentStatus.SUCCEEDED,
          });

          await Campaign.findByIdAndUpdate(campaign._id, {
            $set: {
              status: 'ACTIVE',
              startsAt,
              endsAt,
              providerPaymentId: event.providerPaymentId || campaign.providerPaymentId,
              updatedAt: now,
            },
          });

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

      return {
        success: true,
        message: 'Campaign activated via MoR webhook.',
        campaignId: campaign._id.toString(),
      };
    }

    // ==========================================
    // Flow C: Refunds, Disputes, and Reversals
    // ==========================================
    const isRefundOrDispute =
      event.status === PaymentStatus.REFUNDED ||
      event.status === PaymentStatus.DISPUTED ||
      ['transaction.refunded', 'payment.refunded', 'order_refunded', 'transaction.disputed', 'dispute.created'].includes(
        event.eventType
      );

    if (isRefundOrDispute) {
      // Find the corresponding payment record
      const paymentFilter: any = {};
      if (event.providerPaymentId) {
        paymentFilter.providerPaymentId = event.providerPaymentId;
      } else if (event.productId && Types.ObjectId.isValid(event.productId)) {
        paymentFilter.productId = new Types.ObjectId(event.productId);
      } else if (event.campaignId && Types.ObjectId.isValid(event.campaignId)) {
        paymentFilter.campaignId = new Types.ObjectId(event.campaignId);
      }

      const existingPayment = await Payment.findOne(paymentFilter);
      if (existingPayment) {
        await Payment.findByIdAndUpdate(existingPayment._id, {
          $set: { status: event.status || PaymentStatus.REFUNDED, updatedAt: new Date() },
        });

        // If Pay-to-Rank: Reverse ledger entry and decrement product ranking amount
        if (existingPayment.paymentType === 'RANKING' || existingPayment.rankingContributionCents > 0) {
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
        } else if (existingPayment.campaignId) {
          // Pause campaign
          await Campaign.findByIdAndUpdate(existingPayment.campaignId, {
            $set: { status: 'PAUSED', updatedAt: new Date() },
          });
        }
      }
    }

    await PaymentWebhookEvent.findByIdAndUpdate(webhookRecord._id, {
      $set: { processingStatus: 'PROCESSED', status: 'PROCESSED', processedAt: new Date() },
    });

    return {
      success: true,
      message: 'Webhook processed.',
      campaignId: event.campaignId,
      productId: event.productId,
    };
  }
}

export const paymentService = new PaymentService();
export default paymentService;
