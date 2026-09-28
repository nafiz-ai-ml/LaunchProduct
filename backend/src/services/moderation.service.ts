import { Types } from 'mongoose';
import { Product, IProduct } from '../models/Product.model';
import { Vote, IVote } from '../models/Vote.model';
import {
  OwnershipVerification,
  IOwnershipVerification,
} from '../models/OwnershipVerification.model';
import {
  ModerationAction,
  IModerationAction,
  ModerationTargetType,
} from '../models/ModerationAction.model';
import { User } from '../models/User.model';
import { VerificationToken } from '../models/VerificationToken.model';
import { ProductStatus, VoteStatus, UserRole } from '../shared/constants';
import { redis, isRedisConnected } from '../shared/redis';
import { emailQueue } from '../shared/email-queue';
import { NotFoundError, ValidationError } from '../shared/errors';
import { logger } from '../shared/logger';

export interface ModerationActionInput {
  moderatorId: string;
  targetType: ModerationTargetType;
  targetId: string;
  action: string;
  reason?: string;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
}

export class ModerationService {
  /**
   * 1. Retrieve queue of pending product submissions (FIFO order)
   */
  async getPendingProducts(limit: number = 20, offset: number = 0): Promise<IProduct[]> {
    return Product.find({ status: ProductStatus.PENDING_REVIEW })
      .sort({ createdAt: 1 })
      .skip(offset)
      .limit(limit)
      .populate('submittedById', 'name email')
      .lean();
  }

  /**
   * 2. Approve product submission
   * Updates status: PENDING_REVIEW → SCHEDULED (or LIVE if no future launchDate)
   * Dispatches email notification to submitter
   * Logs immutable ModerationAction audit record
   */
  async approveProduct(productId: string, moderatorId: string): Promise<void> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new ValidationError('Invalid productId format');
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new NotFoundError(`Product '${productId}' not found`);
    }

    const previousState = {
      status: product.status,
      launchDate: product.launchDate,
    };

    const now = new Date();
    // If launchDate is in future, transition to SCHEDULED; otherwise transition directly to LIVE
    if (product.launchDate && new Date(product.launchDate) > now) {
      product.status = ProductStatus.SCHEDULED;
    } else {
      product.status = ProductStatus.LIVE;
      if (!product.launchDate) {
        product.launchDate = now;
      }
    }

    await product.save();

    const newState = {
      status: product.status,
      launchDate: product.launchDate,
    };

    // Log immutable moderation audit action
    await this.submitModerationAction({
      moderatorId,
      targetType: 'PRODUCT',
      targetId: productId,
      action: 'APPROVE',
      reason: 'Product submission approved by moderator',
      previousState,
      newState,
    });

    // Notify submitter via email queue
    if (product.submittedById) {
      try {
        const submitter = await User.findById(product.submittedById).lean();
        if (submitter && submitter.email) {
          await emailQueue.add('send-notification', {
            type: 'PRODUCT_APPROVED',
            to: submitter.email,
            productName: product.name,
            slug: product.slug,
            status: product.status,
          });
        }
      } catch (emailErr: any) {
        logger.warn({ err: emailErr.message }, 'Failed to queue approval notification email');
      }
    }
  }

  /**
   * 3. Reject product submission
   * Updates status: REJECTED with rejectionReason
   * Logs immutable ModerationAction audit record
   */
  async rejectProduct(productId: string, moderatorId: string, reason: string): Promise<void> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new ValidationError('Invalid productId format');
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new NotFoundError(`Product '${productId}' not found`);
    }

    const previousState = {
      status: product.status,
      rejectionReason: product.rejectionReason,
    };

    product.status = ProductStatus.REJECTED;
    product.rejectionReason = reason;
    await product.save();

    const newState = {
      status: product.status,
      rejectionReason: reason,
    };

    await this.submitModerationAction({
      moderatorId,
      targetType: 'PRODUCT',
      targetId: productId,
      action: 'REJECT',
      reason,
      previousState,
      newState,
    });
  }

  /**
   * 4. Retrieve queue of quarantined / flagged anti-fraud votes
   */
  async getQuarantinedVotes(limit: number = 20, offset: number = 0): Promise<IVote[]> {
    return Vote.find({
      status: { $in: [VoteStatus.QUARANTINED, VoteStatus.FLAGGED] },
    })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('userId', 'email role')
      .populate('productId', 'name slug')
      .lean();
  }

  /**
   * 5. Approve quarantined vote (overturn fraud risk verdict)
   * Updates status: QUARANTINED → VALID
   * Increments Redis leaderboard score by +1
   * Logs immutable ModerationAction audit record
   */
  async approveVote(voteId: string, moderatorId: string): Promise<void> {
    if (!Types.ObjectId.isValid(voteId)) {
      throw new ValidationError('Invalid voteId format');
    }

    const vote = await Vote.findById(voteId);
    if (!vote) {
      throw new NotFoundError(`Vote '${voteId}' not found`);
    }

    const previousState = {
      status: vote.status,
      moderatorNote: vote.moderatorNote,
    };

    vote.status = VoteStatus.VALID;
    vote.moderatorNote = 'Overturned by moderator to VALID';
    await vote.save();

    const newState = {
      status: vote.status,
      moderatorNote: vote.moderatorNote,
    };

    // Increment Redis sorted set score for today's leaderboard
    if (isRedisConnected()) {
      try {
        const dateStr = vote.createdAt
          ? vote.createdAt.toISOString().split('T')[0]
          : new Date().toISOString().split('T')[0];

        const launchKey = `leaderboard:today:${dateStr}:launch`;
        const votesKey = `leaderboard:today:${dateStr}:votes`;

        await redis.zincrby(launchKey, 1, vote.productId.toString());
        await redis.zincrby(votesKey, 1, vote.productId.toString());
      } catch (redisErr: any) {
        logger.warn({ err: redisErr.message }, 'Failed to increment Redis score for overturned vote');
      }
    }

    await this.submitModerationAction({
      moderatorId,
      targetType: 'VOTE',
      targetId: voteId,
      action: 'OVERTURN_VOTE',
      reason: 'Overturned by moderator: vote confirmed valid',
      previousState,
      newState,
    });
  }

  /**
   * 6. Reject quarantined vote
   * Updates status: QUARANTINED → REJECTED_BOT
   * Logs immutable ModerationAction audit record
   */
  async rejectVote(voteId: string, moderatorId: string, reason: string): Promise<void> {
    if (!Types.ObjectId.isValid(voteId)) {
      throw new ValidationError('Invalid voteId format');
    }

    const vote = await Vote.findById(voteId);
    if (!vote) {
      throw new NotFoundError(`Vote '${voteId}' not found`);
    }

    const previousState = {
      status: vote.status,
      moderatorNote: vote.moderatorNote,
    };

    vote.status = VoteStatus.REJECTED_BOT;
    vote.moderatorNote = reason;
    await vote.save();

    const newState = {
      status: vote.status,
      moderatorNote: reason,
    };

    await this.submitModerationAction({
      moderatorId,
      targetType: 'VOTE',
      targetId: voteId,
      action: 'REJECT_VOTE',
      reason,
      previousState,
      newState,
    });
  }

  /**
   * 7. Retrieve queue of disputed domain ownership claims
   */
  async getDisputedClaims(
    limit: number = 20,
    offset: number = 0
  ): Promise<IOwnershipVerification[]> {
    return OwnershipVerification.find({
      status: { $in: ['PENDING', 'REVOKED'] },
    })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('productId', 'name slug canonicalDomain founderId')
      .populate('userId', 'email role')
      .lean();
  }

  /**
   * 8. Resolve domain ownership claim dispute
   * Decision APPROVE: sets claim VERIFIED, assigns Product.founderId, upgrades user to FOUNDER role
   * Decision REJECT: sets claim REVOKED with admin note
   * Logs immutable ModerationAction audit record
   */
  async resolveClaimDispute(
    claimId: string,
    moderatorId: string,
    decision: 'APPROVE' | 'REJECT',
    note: string
  ): Promise<void> {
    if (!Types.ObjectId.isValid(claimId)) {
      throw new ValidationError('Invalid claimId format');
    }

    const claim = await OwnershipVerification.findById(claimId);
    if (!claim) {
      throw new NotFoundError(`Ownership claim '${claimId}' not found`);
    }

    const previousState = {
      status: claim.status,
      adminNote: claim.adminNote,
    };

    if (decision === 'APPROVE') {
      claim.status = 'VERIFIED';
      claim.verifiedAt = new Date();
      claim.adminNote = note;
      await claim.save();

      // Bind product founder reference and upgrade claimant to FOUNDER
      await Product.findByIdAndUpdate(claim.productId, {
        founderId: claim.userId,
      });

      await User.findByIdAndUpdate(claim.userId, {
        role: UserRole.FOUNDER,
      });
    } else {
      claim.status = 'REVOKED';
      claim.revokedAt = new Date();
      claim.adminNote = note;
      await claim.save();
    }

    const newState = {
      status: claim.status,
      adminNote: note,
    };

    await this.submitModerationAction({
      moderatorId,
      targetType: 'CLAIM',
      targetId: claimId,
      action: `RESOLVE_CLAIM_${decision}`,
      reason: note,
      previousState,
      newState,
    });
  }

  /**
   * 9. Submit generic immutable ModerationAction audit entry
   */
  async submitModerationAction(action: ModerationActionInput): Promise<IModerationAction> {
    if (!Types.ObjectId.isValid(action.moderatorId)) {
      throw new ValidationError('Invalid moderatorId format');
    }
    if (!Types.ObjectId.isValid(action.targetId)) {
      throw new ValidationError('Invalid targetId format');
    }

    const doc = await ModerationAction.create({
      moderatorId: new Types.ObjectId(action.moderatorId),
      targetType: action.targetType,
      targetId: new Types.ObjectId(action.targetId),
      action: action.action,
      reason: action.reason || null,
      previousState: action.previousState || {},
      newState: action.newState || {},
      createdAt: new Date(),
    });

    logger.info(
      {
        actionId: doc._id,
        action: action.action,
        targetType: action.targetType,
        targetId: action.targetId,
      },
      'Recorded immutable moderation governance action'
    );

    return doc;
  }

  /**
   * 10. Ban abusive user or bad actor
   * Updates user: { isBanned: true, banReason: reason }
   * Invalidates all user session tokens and active verification tokens
   * Logs immutable ModerationAction audit record
   */
  async banUser(userId: string, moderatorId: string, reason: string): Promise<void> {
    if (!Types.ObjectId.isValid(userId)) {
      throw new ValidationError('Invalid userId format');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError(`User '${userId}' not found`);
    }

    const previousState = {
      isBanned: user.isBanned,
      banReason: user.banReason,
    };

    user.isBanned = true;
    user.banReason = reason;
    await user.save();

    const newState = {
      isBanned: true,
      banReason: reason,
    };

    // Invalidate active verification tokens
    await VerificationToken.deleteMany({ userId: user._id });

    // Invalidate cached user sessions in Redis if any
    if (isRedisConnected()) {
      try {
        const stream = redis.scanStream({
          match: `session:*:${userId}`,
          count: 100,
        });
        stream.on('data', (keys: string[]) => {
          if (keys.length > 0) {
            redis.del(...keys).catch(() => {});
          }
        });
      } catch (redisErr: any) {
        logger.warn({ err: redisErr.message }, 'Failed to clear banned user Redis sessions');
      }
    }

    await this.submitModerationAction({
      moderatorId,
      targetType: 'USER',
      targetId: userId,
      action: 'BAN_USER',
      reason,
      previousState,
      newState,
    });
  }
}

export const moderationService = new ModerationService();
export default moderationService;
