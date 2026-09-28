import mongoose, { Types } from 'mongoose';
import { Campaign, ICampaign } from '../models/Campaign.model';
import { Payment, IPayment } from '../models/Payment.model';
import { PaymentStatus } from '../shared/constants';
import { logger } from '../shared/logger';
import { NotFoundError } from '../shared/errors';

export class CampaignRepository {
  /**
   * 1. Check if a given slot key has available inventory for the requested date window.
   * Filters out expired 15-minute reservations.
   */
  async checkSlotAvailability(
    slotKey: string,
    startDate: Date,
    endDate: Date,
    maxSlots: number = 1
  ): Promise<boolean> {
    const now = new Date();

    // Query overlapping campaigns that are either ACTIVE or actively RESERVED (within 15-min TTL)
    const activeOrReservedCount = await Campaign.countDocuments({
      slotKey,
      startsAt: { $lt: endDate },
      endsAt: { $gt: startDate },
      $or: [
        { status: 'ACTIVE' },
        {
          status: 'RESERVED',
          $or: [
            { expiresAt: { $gt: now } },
            { createdAt: { $gt: new Date(now.getTime() - 15 * 60 * 1000) } },
          ],
        },
      ],
    });

    return activeOrReservedCount < maxSlots;
  }

  /**
   * 2. Create a new 15-minute inventory reservation hold.
   */
  async createReservation(data: Partial<ICampaign>): Promise<ICampaign> {
    const expiresAt = data.expiresAt || new Date(Date.now() + 15 * 60 * 1000);
    const campaign = await Campaign.create({
      ...data,
      status: 'RESERVED',
      expiresAt,
    });
    return campaign.toObject ? campaign.toObject() : campaign;
  }

  /**
   * 3. Atomically activate campaign and record successful payment (ACID transaction).
   */
  async activateCampaign(campaignId: string, paymentData: Partial<IPayment>): Promise<void> {
    if (!Types.ObjectId.isValid(campaignId)) {
      throw new NotFoundError(`Invalid campaign ID '${campaignId}'`);
    }

    const campaign = await Campaign.findById(campaignId);
    if (!campaign) {
      throw new NotFoundError(`Campaign '${campaignId}' not found for activation`);
    }

    // Attempt MongoDB multi-document ACID transaction
    let session: mongoose.ClientSession | null = null;
    try {
      session = await mongoose.startSession();
      session.startTransaction();

      // a. Mark campaign as ACTIVE
      await Campaign.findByIdAndUpdate(
        campaignId,
        {
          $set: {
            status: 'ACTIVE',
            providerPaymentId: paymentData.providerPaymentId,
            providerSessionId: paymentData.providerPaymentId || campaign.providerSessionId,
            updatedAt: new Date(),
          },
        },
        { session }
      );

      // b. Record payment ledger entry
      await Payment.create(
        [
          {
            campaignId: campaign._id,
            founderId: campaign.founderId,
            provider: paymentData.provider || 'paddle',
            providerCustomerId: paymentData.providerCustomerId || null,
            providerPaymentId: paymentData.providerPaymentId || null,
            providerOrderId: paymentData.providerOrderId || null,
            providerEventId: paymentData.providerEventId || null,
            amountCents: paymentData.amountCents || campaign.amountCents,
            currency: paymentData.currency || 'USD',
            status: PaymentStatus.SUCCEEDED,
          },
        ],
        { session }
      );

      await session.commitTransaction();
      logger.info({ campaignId, paymentId: paymentData.providerPaymentId }, 'Activated campaign via ACID transaction');
    } catch (err: any) {
      if (session) {
        try {
          await session.abortTransaction();
        } catch {
          // ignore abort error
        }
      }

      // Standalone MongoDB fallback (when replica set transactions are unavailable in local testing)
      if (err.message && err.message.includes('replica set')) {
        logger.warn({ campaignId }, 'MongoDB replica set not detected, activating sequentially');
        await Campaign.findByIdAndUpdate(campaignId, {
          $set: {
            status: 'ACTIVE',
            providerPaymentId: paymentData.providerPaymentId,
            updatedAt: new Date(),
          },
        });

        await Payment.create({
          campaignId: campaign._id,
          founderId: campaign.founderId,
          provider: paymentData.provider || 'paddle',
          providerCustomerId: paymentData.providerCustomerId || null,
          providerPaymentId: paymentData.providerPaymentId || null,
          providerOrderId: paymentData.providerOrderId || null,
          providerEventId: paymentData.providerEventId || null,
          amountCents: paymentData.amountCents || campaign.amountCents,
          currency: paymentData.currency || 'USD',
          status: PaymentStatus.SUCCEEDED,
        });
        return;
      }

      throw err;
    } finally {
      if (session) {
        await session.endSession();
      }
    }
  }

  /**
   * 4. Retrieve currently live active campaigns for a slot key.
   */
  async findActiveBySlot(slotKey: string): Promise<ICampaign[]> {
    const now = new Date();
    return Campaign.find({
      slotKey,
      status: 'ACTIVE',
      startsAt: { $lte: now },
      endsAt: { $gte: now },
    })
      .populate('productId', 'name slug tagline logoUrl websiteUrl canonicalDomain')
      .lean();
  }

  /**
   * 5. Retrieve all campaigns created by a founder, sorted descending.
   */
  async findByFounderId(founderId: string): Promise<ICampaign[]> {
    if (!Types.ObjectId.isValid(founderId)) return [];
    return Campaign.find({ founderId: new Types.ObjectId(founderId) })
      .sort({ createdAt: -1 })
      .populate('productId', 'name slug tagline logoUrl websiteUrl')
      .lean();
  }

  /**
   * 6. Mark an individual campaign as expired.
   */
  async expireCampaign(campaignId: string): Promise<void> {
    if (!Types.ObjectId.isValid(campaignId)) return;
    await Campaign.findByIdAndUpdate(campaignId, {
      $set: { status: 'EXPIRED', updatedAt: new Date() },
    });
  }

  /**
   * 7. Find all active campaigns whose scheduled end date has passed.
   */
  async findExpiredActive(): Promise<ICampaign[]> {
    return Campaign.find({
      status: 'ACTIVE',
      endsAt: { $lte: new Date() },
    }).lean();
  }

  /**
   * 8. Lookup campaign by ID.
   */
  async findById(id: string): Promise<ICampaign | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return Campaign.findById(id).populate('productId', 'name slug tagline logoUrl').lean();
  }

  /**
   * 9. Update campaign document by ID.
   */
  async updateById(id: string, data: Partial<ICampaign>): Promise<ICampaign | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return Campaign.findByIdAndUpdate(id, { $set: data }, { new: true }).lean();
  }
}

export const campaignRepository = new CampaignRepository();
export default campaignRepository;
