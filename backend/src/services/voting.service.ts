import { Types } from 'mongoose';
import { voteRepository } from '../repositories/vote.repository';
import { antiFraudService } from './fraud.service';
import { Product } from '../models/Product.model';
import { Vote } from '../models/Vote.model';
import { ActivityEvent } from '../models/ActivityEvent.model';
import { VoteStatus, ProductStatus, EventSource } from '../shared/constants';
import {
  NotFoundError,
  ConflictError,
  UnprocessableError,
} from '../shared/errors';
import { redis, isRedisConnected } from '../shared/redis';
import { logger } from '../shared/logger';

export interface ClientMetadata {
  ip: string;
  userAgent?: string;
  deviceFingerprint?: string;
  navTelemetryToken?: string;
  subnetHash?: string;
}

export interface VoteResult {
  voteId: string;
  status: VoteStatus;
  newLiveVoteCount: number;
  currentVoteCount?: number;
}

export class VotingService {
  /**
   * Derives Redis leaderboard key for today's UTC cycle: leaderboard:today:{YYYY-MM-DD}:votes
   */
  private getLeaderboardRedisKey(date: Date = new Date()): string {
    const dateStr = date.toISOString().split('T')[0]; // 'YYYY-MM-DD'
    return `leaderboard:today:${dateStr}:votes`;
  }

  /**
   * 1. Cast an upvote on a product with dynamic risk scoring
   */
  async castVote(
    productId: string,
    userId: string,
    clientMetadata: ClientMetadata
  ): Promise<VoteResult> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new NotFoundError(`Invalid product ID '${productId}'`);
    }

    const product = await Product.findById(productId);
    if (!product || product.status === ProductStatus.DELETED) {
      throw new NotFoundError(`Product '${productId}' not found`);
    }

    // Verify product is currently LIVE
    if (product.status !== ProductStatus.LIVE) {
      throw new UnprocessableError(
        `Votes can only be cast for products with LIVE status (current status: '${product.status}')`,
        'PRODUCT_NOT_LIVE'
      );
    }

    // Check idempotency: one active vote per user per product
    const existingVote = await voteRepository.findByUserAndProduct(userId, productId);
    if (existingVote && existingVote.status !== VoteStatus.RETRACTED) {
      throw new ConflictError(
        'You have already cast an active upvote for this product',
        'VOTE_ALREADY_CAST'
      );
    }

    // Evaluate anti-fraud risk signals
    const riskEval = await antiFraudService.evaluateVoteRisk({
      userId,
      productId,
      ip: clientMetadata.ip,
      userAgent: clientMetadata.userAgent,
      deviceFingerprint: clientMetadata.deviceFingerprint,
      subnetHash: clientMetadata.subnetHash,
    });

    const currentVoteCount = await voteRepository.getProductVoteCount(productId);

    // Hard-Reject / Bot Honeypot: Return HTTP 200 silently with 0 score contribution
    if (riskEval.status === VoteStatus.REJECTED_BOT) {
      try {
        await voteRepository.create({
          productId: product._id,
          userId: new Types.ObjectId(userId),
          status: VoteStatus.REJECTED_BOT,
          riskScore: riskEval.riskScore,
          riskAssessment: {
            triggeredSignals: riskEval.triggeredSignals,
            ipHash: riskEval.ipHash,
            subnetHash: riskEval.subnetHash,
            accountAgeHours: riskEval.accountAgeHours,
            asnNumber: riskEval.asnNumber,
            notes: 'Honeypot silent rejection',
          },
          ipHash: riskEval.ipHash,
          subnetHash: riskEval.subnetHash,
          deviceFingerprint: clientMetadata.deviceFingerprint,
        });

        await ActivityEvent.create({
          userId: new Types.ObjectId(userId),
          productId: product._id,
          eventType: 'VOTE_REJECTED_BOT',
          eventSource: EventSource.BOT,
          metadata: {
            triggeredSignals: riskEval.triggeredSignals,
          },
        });
      } catch (err: any) {
        logger.warn({ err: err.message }, 'Failed to record REJECTED_BOT audit record');
      }

      return {
        voteId: `bot_${Date.now()}`,
        status: VoteStatus.REJECTED_BOT,
        newLiveVoteCount: currentVoteCount,
        currentVoteCount,
      };
    }

    // Insert or reactivate vote document
    let vote;
    if (existingVote && existingVote.status === VoteStatus.RETRACTED) {
      vote = await Vote.findByIdAndUpdate(
        existingVote._id,
        {
          status: riskEval.status,
          riskScore: riskEval.riskScore,
          riskAssessment: {
            triggeredSignals: riskEval.triggeredSignals,
            ipHash: riskEval.ipHash,
            subnetHash: riskEval.subnetHash,
            accountAgeHours: riskEval.accountAgeHours,
            asnNumber: riskEval.asnNumber,
          },
          ipHash: riskEval.ipHash,
          subnetHash: riskEval.subnetHash,
          deviceFingerprint: clientMetadata.deviceFingerprint,
          retractedAt: null,
          createdAt: new Date(),
        },
        { new: true }
      );
      if (!vote) {
        throw new NotFoundError('Failed to reactivate retracted vote');
      }
    } else {
      vote = await voteRepository.create({
        productId: product._id,
        userId: new Types.ObjectId(userId),
        status: riskEval.status,
        riskScore: riskEval.riskScore,
        riskAssessment: {
          triggeredSignals: riskEval.triggeredSignals,
          ipHash: riskEval.ipHash,
          subnetHash: riskEval.subnetHash,
          accountAgeHours: riskEval.accountAgeHours,
          asnNumber: riskEval.asnNumber,
        },
        ipHash: riskEval.ipHash,
        subnetHash: riskEval.subnetHash,
        deviceFingerprint: clientMetadata.deviceFingerprint,
      });
    }

    const redisKey = this.getLeaderboardRedisKey();

    // If VALID or FLAGGED: atomically increment Redis leaderboard score
    if (riskEval.status === VoteStatus.VALID || riskEval.status === VoteStatus.FLAGGED) {
      if (isRedisConnected()) {
        try {
          await redis.zincrby(redisKey, 1, productId);
        } catch (redisErr: any) {
          logger.warn({ err: redisErr.message, redisKey }, 'Failed to atomically increment Redis leaderboard score');
        }
      }

      // Record VOTE_CAST activity event
      try {
        await ActivityEvent.create({
          userId: new Types.ObjectId(userId),
          productId: product._id,
          eventType: 'VOTE_CAST',
          eventSource: EventSource.ORGANIC,
          metadata: {
            voteId: vote._id.toString(),
            status: riskEval.status,
            riskScore: riskEval.riskScore,
            triggeredSignals: riskEval.triggeredSignals,
          },
        });
      } catch (eventErr: any) {
        logger.error({ eventErr }, 'Failed to log VOTE_CAST activity event');
      }
    } else if (riskEval.status === VoteStatus.QUARANTINED) {
      // Record VOTE_QUARANTINED event (held in queue, counter NOT incremented)
      try {
        await ActivityEvent.create({
          userId: new Types.ObjectId(userId),
          productId: product._id,
          eventType: 'VOTE_QUARANTINED',
          eventSource: EventSource.FRAUD,
          metadata: {
            voteId: vote._id.toString(),
            riskScore: riskEval.riskScore,
            triggeredSignals: riskEval.triggeredSignals,
          },
        });
      } catch (eventErr: any) {
        logger.error({ eventErr }, 'Failed to log VOTE_QUARANTINED activity event');
      }
    }

    const newLiveVoteCount = await voteRepository.getProductVoteCount(productId);

    return {
      voteId: vote._id.toString(),
      status: vote.status,
      newLiveVoteCount,
      currentVoteCount: newLiveVoteCount,
    };
  }

  /**
   * 2. Retract a previously cast upvote within the 15-minute window
   */
  async retractVote(
    productId: string,
    userId: string
  ): Promise<{ productId: string; status: VoteStatus; newLiveVoteCount: number }> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new NotFoundError(`Invalid product ID '${productId}'`);
    }

    const vote = await voteRepository.findByUserAndProduct(userId, productId);
    if (!vote || vote.status === VoteStatus.RETRACTED) {
      throw new NotFoundError('Active upvote for this product not found');
    }

    // Check 15-minute retraction window
    const now = new Date();
    const voteTime = new Date(vote.createdAt).getTime();
    const elapsedMinutes = (now.getTime() - voteTime) / (1000 * 60);

    if (elapsedMinutes > 15) {
      throw new UnprocessableError(
        'Votes can only be retracted within 15 minutes of casting',
        'RETRACT_WINDOW_EXPIRED'
      );
    }

    const previousStatus = vote.status;

    // Soft-retract vote document
    await voteRepository.retractVote(vote._id.toString(), userId);

    // Atomically decrement Redis sorted set if vote was counted
    if (previousStatus === VoteStatus.VALID || previousStatus === VoteStatus.FLAGGED) {
      const redisKey = this.getLeaderboardRedisKey(new Date(vote.createdAt));
      if (isRedisConnected()) {
        try {
          await redis.zincrby(redisKey, -1, productId);
        } catch (redisErr: any) {
          logger.warn({ err: redisErr.message, redisKey }, 'Failed to decrement Redis leaderboard score on retraction');
        }
      }
    }

    // Log VOTE_RETRACTED activity event
    try {
      await ActivityEvent.create({
        userId: new Types.ObjectId(userId),
        productId: new Types.ObjectId(productId),
        eventType: 'VOTE_RETRACTED',
        eventSource: EventSource.ORGANIC,
        metadata: {
          voteId: vote._id.toString(),
          elapsedMinutes: Math.round(elapsedMinutes * 10) / 10,
        },
      });
    } catch (eventErr: any) {
      logger.error({ eventErr }, 'Failed to log VOTE_RETRACTED activity event');
    }

    const newLiveVoteCount = await voteRepository.getProductVoteCount(productId);

    return {
      productId,
      status: VoteStatus.RETRACTED,
      newLiveVoteCount,
    };
  }

  /**
   * 3. Batch retrieve user vote status across multiple product IDs
   */
  async getUserVoteStatus(
    userId: string,
    productIds: string[]
  ): Promise<Map<string, VoteStatus | null>> {
    const statusMap = new Map<string, VoteStatus | null>();
    if (!Types.ObjectId.isValid(userId) || !productIds.length) {
      return statusMap;
    }

    const validProductIds = productIds
      .filter((id) => Types.ObjectId.isValid(id))
      .map((id) => new Types.ObjectId(id));

    const votes = await voteRepository.getUserVotes(userId);

    // Default each requested product to null
    for (const pid of productIds) {
      statusMap.set(pid, null);
    }

    for (const v of votes) {
      const pidStr = v.productId._id ? v.productId._id.toString() : v.productId.toString();
      if (statusMap.has(pidStr) && v.status !== VoteStatus.RETRACTED) {
        statusMap.set(pidStr, v.status);
      }
    }

    return statusMap;
  }

  /**
   * 4. Fetch list of product IDs currently upvoted by the user
   */
  async getUserUpvotedProductIds(userId: string): Promise<string[]> {
    if (!Types.ObjectId.isValid(userId)) {
      return [];
    }

    const votes = await voteRepository.getUserVotes(userId);
    return votes
      .filter((v) => v.status === VoteStatus.VALID || v.status === VoteStatus.FLAGGED)
      .map((v) => (v.productId._id ? v.productId._id.toString() : v.productId.toString()));
  }
}

export const votingService = new VotingService();
