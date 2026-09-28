import { Types } from 'mongoose';
import { Campaign, ICampaign, CampaignTier } from '../models/Campaign.model';
import { Product } from '../models/Product.model';
import { ActivityEvent } from '../models/ActivityEvent.model';
import { campaignRepository } from '../repositories/campaign.repository';
import { getPaymentProvider } from './payment.service';
import {
  SPONSORSHIP_PRICES_CENTS,
  SPONSORSHIP_DURATIONS_HOURS,
  SLOT_LIMITS,
  SLOT_RESERVATION_TTL_SECONDS,
} from '../shared/constants';
import { ConflictError, NotFoundError, AuthorizationError, ValidationError } from '../shared/errors';
import { redis, isRedisConnected } from '../shared/redis';
import { config } from '../shared/config';
import { logger } from '../shared/logger';

export interface AvailabilityResult {
  available: boolean;
  tier: CampaignTier;
  slotKey: string;
  maxSlots: number;
  priceCents: number;
  currency: string;
  startDate: string;
  endDate: string;
  nextAvailableDate?: string;
}

export interface CampaignDailyItem {
  date: string;
  impressions: number;
  clicks: number;
}

export interface CampaignAnalytics {
  campaignId: string;
  status: string;
  tier: string;
  impressionsDelivered: number;
  sponsoredClicksDelivered: number;
  ctr: number;
  spendCents: number;
  dailyBreakdown: CampaignDailyItem[];
}

export class CampaignService {
  /**
   * Derives standardized slot key based on sponsorship tier and target category
   */
  resolveSlotKey(tier: CampaignTier, targetCategorySlug?: string): { slotKey: string; maxSlots: number } {
    switch (tier) {
      case 'HOMEPAGE_SPOTLIGHT':
        return { slotKey: 'homepage:spotlight', maxSlots: SLOT_LIMITS.HOMEPAGE_SPOTLIGHT };
      case 'CATEGORY_FEATURED': {
        const slug = (targetCategorySlug || 'general').toLowerCase().trim();
        return { slotKey: `category:${slug}`, maxSlots: SLOT_LIMITS.CATEGORY_FEATURED };
      }
      case 'LAUNCH_BOOST':
        return { slotKey: 'launch:boost', maxSlots: SLOT_LIMITS.LAUNCH_BOOST };
      case 'LAUNCH_PARTNER':
        return { slotKey: 'partner:bundle', maxSlots: SLOT_LIMITS.LAUNCH_PARTNER };
      default:
        throw new ValidationError(`Unknown sponsorship tier '${tier}'`, [
          { field: 'tier', code: 'INVALID_ENUM', message: 'Invalid tier specified' },
        ]);
    }
  }

  /**
   * 1. Check slot calendar inventory availability for a requested tier and time window.
   */
  async checkSlotAvailability(
    tier: CampaignTier,
    targetCategorySlug?: string,
    startDate?: Date | string,
    endDate?: Date | string
  ): Promise<AvailabilityResult> {
    const { slotKey, maxSlots } = this.resolveSlotKey(tier, targetCategorySlug);

    const start = startDate ? new Date(startDate) : new Date();
    let end: Date;

    if (endDate) {
      end = new Date(endDate);
    } else {
      const durationHours = SPONSORSHIP_DURATIONS_HOURS[tier] || 24;
      end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
    }

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) {
      throw new ValidationError('Invalid date range specified for slot availability check', [
        { field: 'startDate', code: 'INVALID_DATE', message: 'End date must be after start date' },
      ]);
    }

    const available = await campaignRepository.checkSlotAvailability(slotKey, start, end, maxSlots);
    const priceCents = SPONSORSHIP_PRICES_CENTS[tier];

    let nextAvailableDate: string | undefined = undefined;
    if (!available) {
      // Find the earliest ending active campaign for this slot to project the next opening
      const nextEnding = await Campaign.findOne({
        slotKey,
        status: { $in: ['ACTIVE', 'RESERVED'] },
        endsAt: { $gt: start },
      })
        .sort({ endsAt: 1 })
        .lean();

      if (nextEnding) {
        nextAvailableDate = nextEnding.endsAt.toISOString();
      }
    }

    return {
      available,
      tier,
      slotKey,
      maxSlots,
      priceCents,
      currency: 'USD',
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      nextAvailableDate,
    };
  }

  /**
   * 2. Initiate a 15-minute slot reservation hold and generate hosted MoR checkout session.
   */
  async createCampaignCheckout(
    tier: CampaignTier,
    productId: string,
    founderId: string,
    startDate: Date | string,
    targetCategorySlug?: string,
    provider: string = 'paddle'
  ): Promise<{
    campaignId: string;
    checkoutUrl: string;
    reservationExpiresAt: string;
    amountCents: number;
    currency: string;
  }> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new NotFoundError(`Invalid product ID '${productId}'`);
    }

    // 1. Verify target product exists and requester is the verified founder
    const product = await Product.findById(productId);
    if (!product || product.status === 'DELETED') {
      throw new NotFoundError(`Product '${productId}' not found`);
    }

    if (!product.founderId || product.founderId.toString() !== founderId) {
      throw new AuthorizationError(
        'You do not have administrative permission to create sponsorships for this product',
        'NOT_PRODUCT_OWNER'
      );
    }

    // 2. Compute date boundaries
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      throw new ValidationError('Valid campaign start date is required', [
        { field: 'startDate', code: 'INVALID_DATE', message: 'Invalid start date format' },
      ]);
    }

    const durationHours = SPONSORSHIP_DURATIONS_HOURS[tier] || 24;
    const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

    // 3. Verify slot capacity
    const availability = await this.checkSlotAvailability(tier, targetCategorySlug, start, end);
    if (!availability.available) {
      throw new ConflictError(
        `The requested slot '${availability.slotKey}' is currently booked for the selected date window. Next projected opening: ${availability.nextAvailableDate || 'soon'}.`,
        'SLOT_UNAVAILABLE'
      );
    }

    const amountCents = SPONSORSHIP_PRICES_CENTS[tier];
    const reservationExpiresAt = new Date(Date.now() + SLOT_RESERVATION_TTL_SECONDS * 1000);

    // 4. Create Campaign in MongoDB with status = 'RESERVED'
    const campaign = await campaignRepository.createReservation({
      productId: product._id,
      founderId: new Types.ObjectId(founderId),
      tier,
      status: 'RESERVED',
      slotKey: availability.slotKey,
      startsAt: start,
      endsAt: end,
      amountCents,
      expiresAt: reservationExpiresAt,
      metadata: {
        targetCategorySlug: targetCategorySlug?.toLowerCase().trim() || undefined,
        displayLabel: product.name,
      },
    });

    const campaignId = campaign._id.toString();

    // 5. Generate MoR Checkout Session (Paddle / Lemon Squeezy)
    const paymentProvider = getPaymentProvider(provider);
    const successUrl = `${config.FRONTEND_URL}/dashboard/campaigns?success=true&campaignId=${campaignId}`;
    const cancelUrl = `${config.FRONTEND_URL}/dashboard/campaigns?cancelled=true`;

    const checkout = await paymentProvider.createCheckoutSession({
      tier,
      amountCents,
      campaignId,
      successUrl,
      cancelUrl,
      productName: product.name,
      targetCategorySlug,
    });

    // 6. Update campaign with checkout URL and session reference
    await campaignRepository.updateById(campaignId, {
      providerCheckoutUrl: checkout.checkoutUrl,
      providerSessionId: checkout.sessionId,
    });

    // 7. Acquire 15-minute distributed reservation lock in Redis
    const redisReservationKey = `slot:reserved:${availability.slotKey}:${campaignId}`;
    if (isRedisConnected()) {
      try {
        await redis.set(redisReservationKey, founderId, 'EX', SLOT_RESERVATION_TTL_SECONDS);
      } catch (redisErr: any) {
        logger.warn({ err: redisErr.message }, 'Redis reservation lock registration failed');
      }
    }

    logger.info({ campaignId, slotKey: availability.slotKey, tier, amountCents }, 'Created campaign reservation');

    return {
      campaignId,
      checkoutUrl: checkout.checkoutUrl,
      reservationExpiresAt: reservationExpiresAt.toISOString(),
      amountCents,
      currency: 'USD',
    };
  }

  /**
   * 3. Fetch all campaigns belonging to an authenticated founder
   */
  async getFounderCampaigns(founderId: string): Promise<ICampaign[]> {
    return campaignRepository.findByFounderId(founderId);
  }

  /**
   * 4. Retrieve delivery analytics for a sponsored campaign
   */
  async getCampaignAnalytics(campaignId: string, founderId: string): Promise<CampaignAnalytics> {
    if (!Types.ObjectId.isValid(campaignId)) {
      throw new NotFoundError(`Invalid campaign ID '${campaignId}'`);
    }

    const campaign = await campaignRepository.findById(campaignId);
    if (!campaign) {
      throw new NotFoundError(`Campaign '${campaignId}' not found`);
    }

    if (campaign.founderId.toString() !== founderId) {
      throw new AuthorizationError('You do not have permission to view analytics for this campaign', 'FORBIDDEN');
    }

    // Aggregate SPONSORED click activity events for this campaign window
    const [clickResults] = await ActivityEvent.aggregate([
      {
        $match: {
          productId: campaign.productId,
          eventType: 'OUTBOUND_CLICK',
          eventSource: 'SPONSORED',
          createdAt: { $gte: campaign.startsAt, $lte: campaign.endsAt },
        },
      },
      {
        $facet: {
          daily: [
            {
              $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                clicks: { $sum: 1 },
              },
            },
            { $sort: { _id: 1 as const } },
          ],
          totals: [
            {
              $group: {
                _id: null,
                totalClicks: { $sum: 1 },
                uniqueClicks: {
                  $sum: {
                    $cond: [{ $ne: ['$metadata.isDuplicate', true] }, 1, 0],
                  },
                },
              },
            },
          ],
        },
      } as any,
    ]);

    const totalClicks = clickResults?.totals[0]?.totalClicks || 0;
    const uniqueClicks = clickResults?.totals[0]?.uniqueClicks || 0;

    // Fetch views/impressions during campaign window
    const impressionsCount = await ActivityEvent.countDocuments({
      productId: campaign.productId,
      eventType: 'PRODUCT_VIEW',
      createdAt: { $gte: campaign.startsAt, $lte: campaign.endsAt },
    });

    const effectiveImpressions = Math.max(impressionsCount, totalClicks);
    const ctr = effectiveImpressions > 0
      ? Math.round((uniqueClicks / effectiveImpressions) * 10000) / 10000
      : 0;

    const dailyBreakdown: CampaignDailyItem[] = (clickResults?.daily || []).map((item: any) => ({
      date: item._id,
      impressions: 0,
      clicks: item.clicks,
    }));

    return {
      campaignId: campaign._id.toString(),
      status: campaign.status,
      tier: campaign.tier,
      impressionsDelivered: effectiveImpressions,
      sponsoredClicksDelivered: uniqueClicks,
      ctr,
      spendCents: campaign.amountCents,
      dailyBreakdown,
    };
  }
}

export const campaignService = new CampaignService();
export default campaignService;
