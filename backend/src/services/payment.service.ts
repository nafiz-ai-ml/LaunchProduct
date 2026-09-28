import crypto from 'crypto';
import mongoose, { Types } from 'mongoose';
import { Campaign, CampaignTier } from '../models/Campaign.model';
import { Payment } from '../models/Payment.model';
import { PaymentWebhookEvent } from '../models/PaymentWebhookEvent.model';
import { ActivityEvent } from '../models/ActivityEvent.model';
import { User } from '../models/User.model';
import { campaignQueue } from '../shared/campaign-queue';
import { emailQueue } from '../shared/email-queue';
import { PaymentStatus, EventSource, SPONSORSHIP_DURATIONS_HOURS } from '../shared/constants';
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
  amountCents: number;
  currency: string;
  status: PaymentStatus;
  rawPayload: Record<string, unknown>;
}

export interface IPaymentProvider {
  createCheckoutSession(params: CheckoutSessionParams): Promise<CheckoutSessionResult>;
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
 * Paddle Global Merchant of Record Implementation
 * Primary provider for LaunchProduct global digital USD checkout
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
    const checkoutHost = process.env.NODE_ENV === 'production'
      ? 'https://checkout.paddle.com'
      : 'https://sandbox-checkout.paddle.com';

    // Build URL encoded query parameters with custom campaign metadata
    const query = new URLSearchParams({
      txn: sessionId,
      campaignId: params.campaignId,
      tier: params.tier,
      amountCents: params.amountCents.toString(),
      returnUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
    });

    if (params.founderEmail) {
      query.set('email', params.founderEmail);
    }
    if (params.productName) {
      query.set('productName', params.productName);
    }

    const checkoutUrl = `${checkoutHost}/checkout/build?${query.toString()}`;

    logger.info(
      { campaignId: params.campaignId, sessionId, tier: params.tier, amountCents: params.amountCents },
      'Generated Paddle checkout session'
    );

    return {
      checkoutUrl,
      sessionId,
    };
  }

  verifyWebhookSignature(rawBody: string | Buffer, signatureHeader: string): boolean {
    if (!signatureHeader) return false;

    try {
      const bodyStr = Buffer.isBuffer(rawBody) ? rawBody.toString('utf8') : rawBody;

      // 1. Paddle v2 signature format: ts=1690000000;h1=hash
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

      // 2. Standard HMAC-SHA256 signature fallback
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

    // Extract custom metadata identifying campaignId
    const campaignId =
      data.custom_data?.campaignId ||
      data.custom_data?.campaign_id ||
      payload.passthrough ||
      data.passthrough ||
      undefined;

    const paymentId = data.id || data.order_id || data.payment_id;
    const customerId = data.customer_id || data.user_id;

    // Normalize amount in cents
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
      amountCents,
      currency,
      status,
      rawPayload: payload,
    };
  }
}

/**
 * Lemon Squeezy Merchant of Record Implementation
 * Fallback / alternative provider for LaunchProduct global digital checkout
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

    return {
      checkoutUrl,
      sessionId,
    };
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

/**
 * Factory to retrieve the requested Payment Provider
 */
export function getPaymentProvider(provider: string = 'paddle'): IPaymentProvider {
  const normalized = provider.toLowerCase().trim();
  if (normalized === 'paddle') {
    return paddleProvider;
  }
  if (normalized === 'lemonsqueezy' || normalized === 'lemon_squeezy') {
    return lemonSqueezyProvider;
  }

  throw new ValidationError(`Unsupported payment provider '${provider}'. Supported: paddle, lemonsqueezy`, [
    { field: 'provider', code: 'INVALID_ENUM', message: 'Provider must be paddle or lemonsqueezy' },
  ]);
}

export class PaymentService {
  /**
   * Authoritative Merchant of Record Inbound Webhook Processor
   * Enforces cryptographic signature verification, idempotency, and multi-document ACID transactions.
   */
  async handlePaymentWebhook(
    providerName: string,
    rawBody: Buffer | string,
    signatureHeader: string
  ): Promise<{ success: boolean; message: string; campaignId?: string }> {
    // 1. Get provider instance from factory
    const provider = getPaymentProvider(providerName);

    // 2. Verify signature: provider.verifyWebhookSignature(rawBody, signatureHeader)
    const isValid = provider.verifyWebhookSignature(rawBody, signatureHeader);
    if (!isValid) {
      logger.warn({ provider: providerName }, 'Inbound webhook HMAC signature validation failed');
      throw new AppError(400, 'WEBHOOK_SIGNATURE_INVALID', 'Invalid webhook HMAC signature');
    }

    // 3. Parse event
    const event = provider.parseWebhookEvent(rawBody);

    // 4. Check timestamp drift: if event timestamp > 300 seconds old -> throw 400
    const nowSec = Math.floor(Date.now() / 1000);
    let eventTsSec: number | null = null;

    if (signatureHeader && signatureHeader.includes('ts=')) {
      const match = signatureHeader.match(/ts=(\d+)/);
      if (match && match[1]) {
        eventTsSec = parseInt(match[1], 10);
      }
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
        logger.warn({ provider: providerName, drift, eventTsSec, nowSec }, 'Webhook timestamp expired');
        throw new AppError(400, 'WEBHOOK_TIMESTAMP_EXPIRED', 'Webhook event timestamp is too old (> 300s drift)');
      }
    }

    // 5. Check idempotency: find PaymentWebhookEvent by providerEventId
    const existing = await PaymentWebhookEvent.findOne({ providerEventId: event.providerEventId });
    if (existing && (existing.processingStatus === 'PROCESSED' || existing.status === 'PROCESSED')) {
      logger.info({ providerEventId: event.providerEventId }, 'Idempotent duplicate webhook event skipped');
      return {
        success: true,
        message: 'Webhook event already processed (idempotent duplicate).',
        campaignId: event.campaignId,
      };
    }

    // 6. Record webhook: insert or update PaymentWebhookEvent { status: 'RECEIVED' }
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

    // 7. If event is a payment success (transaction.completed, payment.succeeded, order_created, etc.)
    const isSuccess =
      event.status === PaymentStatus.SUCCEEDED ||
      ['transaction.completed', 'payment.succeeded', 'order.completed', 'order_created'].includes(
        event.eventType
      );

    if (isSuccess) {
      if (!event.campaignId || !Types.ObjectId.isValid(event.campaignId)) {
        logger.warn({ eventId: event.providerEventId }, 'Payment success webhook missing valid campaignId');
        await PaymentWebhookEvent.findByIdAndUpdate(webhookRecord._id, {
          $set: { processingStatus: 'PROCESSED', status: 'PROCESSED', processedAt: new Date() },
        });
        return { success: true, message: 'Payment recorded without matching campaign' };
      }

      const campaign = await Campaign.findById(event.campaignId);
      if (!campaign) {
        logger.warn({ campaignId: event.campaignId }, 'Campaign not found for payment webhook activation');
        await PaymentWebhookEvent.findByIdAndUpdate(webhookRecord._id, {
          $set: { processingStatus: 'FAILED', status: 'FAILED', processedAt: new Date() },
        });
        throw new NotFoundError(`Campaign '${event.campaignId}' not found for activation`);
      }

      // Calculate runtime scheduling
      const now = new Date();
      const startsAt = campaign.startsAt && campaign.startsAt > now ? campaign.startsAt : now;
      const durationHours = SPONSORSHIP_DURATIONS_HOURS[campaign.tier] || 24;
      const endsAt = new Date(startsAt.getTime() + durationHours * 3600 * 1000);

      // Execute MongoDB Multi-Document ACID Transaction
      let session: mongoose.ClientSession | null = null;
      try {
        session = await mongoose.startSession();
        session.startTransaction();

        // a. Insert Payment document
        await Payment.create(
          [
            {
              campaignId: campaign._id,
              founderId: campaign.founderId,
              provider: event.provider,
              providerCustomerId: event.providerCustomerId || null,
              providerPaymentId: event.providerPaymentId || null,
              providerOrderId: event.providerOrderId || null,
              providerEventId: event.providerEventId,
              amountCents: event.amountCents || campaign.amountCents,
              currency: event.currency || 'USD',
              status: PaymentStatus.SUCCEEDED,
            },
          ],
          { session }
        );

        // b. Update Campaign document
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

        // c. Update PaymentWebhookEvent
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

        // d. Insert ActivityEvent: CAMPAIGN_STARTED
        await ActivityEvent.create(
          [
            {
              productId: campaign.productId,
              eventType: 'CAMPAIGN_STARTED',
              eventSource: EventSource.SPONSORED,
              metadata: {
                campaignId: campaign._id.toString(),
                tier: campaign.tier,
                amountCents: event.amountCents || campaign.amountCents,
                provider: event.provider,
                providerPaymentId: event.providerPaymentId,
              },
            },
          ],
          { session }
        );

        await session.commitTransaction();
        logger.info({ campaignId: campaign._id }, 'Campaign activated via MoR webhook transaction');
      } catch (txnErr: any) {
        if (session) {
          try {
            await session.abortTransaction();
          } catch {
            // ignore abort error
          }
        }

        // Standalone MongoDB fallback
        if (txnErr.message && txnErr.message.includes('replica set')) {
          logger.warn({ campaignId: campaign._id }, 'MongoDB standalone fallback: activating campaign sequentially');
          await Payment.create({
            campaignId: campaign._id,
            founderId: campaign.founderId,
            provider: event.provider,
            providerCustomerId: event.providerCustomerId || null,
            providerPaymentId: event.providerPaymentId || null,
            providerOrderId: event.providerOrderId || null,
            providerEventId: event.providerEventId,
            amountCents: event.amountCents || campaign.amountCents,
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

          await ActivityEvent.create({
            productId: campaign.productId,
            eventType: 'CAMPAIGN_STARTED',
            eventSource: EventSource.SPONSORED,
            metadata: {
              campaignId: campaign._id.toString(),
              tier: campaign.tier,
              amountCents: event.amountCents || campaign.amountCents,
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
        if (session) {
          await session.endSession();
        }
      }

      // Enqueue BullMQ delayed job for campaign expiration at endsAt
      const delayMs = Math.max(0, endsAt.getTime() - Date.now());
      try {
        await campaignQueue.add(
          'expire-campaign',
          { campaignId: campaign._id.toString() },
          { delay: delayMs }
        );
      } catch (qErr: any) {
        logger.warn({ err: qErr.message }, 'Failed to enqueue campaign expiration to BullMQ');
      }

      // Enqueue notification to founder in emailQueue
      try {
        const founder = await User.findById(campaign.founderId).select('email').lean();
        if (founder?.email) {
          await emailQueue.add('send-campaign-activated', {
            to: founder.email,
            campaignId: campaign._id.toString(),
            tier: campaign.tier,
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
          });
        }
      } catch (emailErr: any) {
        logger.warn({ err: emailErr.message }, 'Failed to enqueue founder campaign email');
      }

      return {
        success: true,
        message: 'Webhook processed and campaign activated.',
        campaignId: campaign._id.toString(),
      };
    }

    // 8. If event is a chargeback/refund/dispute: pause campaign and notify admin
    const isRefundOrDispute =
      event.status === PaymentStatus.REFUNDED ||
      event.status === PaymentStatus.DISPUTED ||
      ['transaction.refunded', 'payment.refunded', 'order_refunded', 'transaction.disputed', 'dispute.created'].includes(
        event.eventType
      );

    if (isRefundOrDispute && event.campaignId && Types.ObjectId.isValid(event.campaignId)) {
      const campaign = await Campaign.findById(event.campaignId);
      if (campaign) {
        await Campaign.findByIdAndUpdate(campaign._id, {
          $set: { status: 'PAUSED', updatedAt: new Date() },
        });

        await Payment.updateMany(
          { campaignId: campaign._id },
          { $set: { status: event.status || PaymentStatus.REFUNDED, updatedAt: new Date() } }
        );

        await ActivityEvent.create({
          productId: campaign.productId,
          eventType: 'CAMPAIGN_PAUSED',
          eventSource: EventSource.SPONSORED,
          metadata: {
            campaignId: campaign._id.toString(),
            reason: event.eventType,
            provider: event.provider,
          },
        });

        logger.warn(
          { campaignId: campaign._id, eventType: event.eventType },
          'Campaign paused due to refund or payment dispute'
        );
      }
    }

    await PaymentWebhookEvent.findByIdAndUpdate(webhookRecord._id, {
      $set: { processingStatus: 'PROCESSED', status: 'PROCESSED', processedAt: new Date() },
    });

    return {
      success: true,
      message: 'Webhook event processed.',
      campaignId: event.campaignId,
    };
  }
}

export const paymentService = new PaymentService();
export default paymentService;

