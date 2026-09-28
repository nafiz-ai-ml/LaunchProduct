import { Types } from 'mongoose';
import { Vote, IVote } from '../models/Vote.model';
import { VoteStatus } from '../shared/constants';

export class VoteRepository {
  /**
   * 1. Find vote by user and product
   */
  async findByUserAndProduct(userId: string, productId: string): Promise<IVote | null> {
    if (!Types.ObjectId.isValid(userId) || !Types.ObjectId.isValid(productId)) {
      return null;
    }

    return Vote.findOne({
      userId: new Types.ObjectId(userId),
      productId: new Types.ObjectId(productId),
    });
  }

  /**
   * 2. Insert new vote record
   */
  async create(data: Partial<IVote>): Promise<IVote> {
    return Vote.create(data);
  }

  /**
   * 3. Fetch all active votes cast by a specific user
   */
  async getUserVotes(userId: string): Promise<IVote[]> {
    if (!Types.ObjectId.isValid(userId)) {
      return [];
    }

    return Vote.find({
      userId: new Types.ObjectId(userId),
      status: { $ne: VoteStatus.RETRACTED },
    })
      .sort({ createdAt: -1 })
      .populate('productId', 'name slug canonicalDomain media status launchDate');
  }

  /**
   * 4. Update status and optional moderator notes (used by Moderation Desk)
   */
  async updateStatus(
    voteId: string,
    status: VoteStatus,
    moderatorNote?: string
  ): Promise<IVote | null> {
    if (!Types.ObjectId.isValid(voteId)) {
      return null;
    }

    const updateDoc: Record<string, unknown> = { status };
    if (moderatorNote) {
      updateDoc['riskAssessment.notes'] = moderatorNote;
    }

    return Vote.findByIdAndUpdate(voteId, updateDoc, { new: true });
  }

  /**
   * 5. Get aggregate vote count for a product across specified statuses
   * Defaults to counted states: VALID and FLAGGED
   */
  async getProductVoteCount(
    productId: string,
    statuses: VoteStatus[] = [VoteStatus.VALID, VoteStatus.FLAGGED]
  ): Promise<number> {
    if (!Types.ObjectId.isValid(productId)) {
      return 0;
    }

    return Vote.countDocuments({
      productId: new Types.ObjectId(productId),
      status: { $in: statuses },
    });
  }

  /**
   * 6. Inspect quarantined and flagged votes for moderation triage queue
   */
  async getQuarantinedQueue(limit: number = 50, offset: number = 0): Promise<IVote[]> {
    return Vote.find({
      status: { $in: [VoteStatus.QUARANTINED, VoteStatus.FLAGGED] },
    })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate('userId', 'email role createdAt isBanned')
      .populate('productId', 'name slug canonicalDomain status');
  }

  /**
   * 7. Retract vote within authorized window
   */
  async retractVote(voteId: string, userId: string): Promise<IVote | null> {
    if (!Types.ObjectId.isValid(voteId) || !Types.ObjectId.isValid(userId)) {
      return null;
    }

    return Vote.findOneAndUpdate(
      {
        _id: new Types.ObjectId(voteId),
        userId: new Types.ObjectId(userId),
      },
      {
        status: VoteStatus.RETRACTED,
        retractedAt: new Date(),
      },
      { new: true }
    );
  }

  /**
   * 8. Count votes for a product from a specific /24 subnet since a timestamp
   */
  async getSubnetVoteCount(
    subnetHash: string,
    productId: string,
    since: Date
  ): Promise<number> {
    if (!Types.ObjectId.isValid(productId)) {
      return 0;
    }

    return Vote.countDocuments({
      subnetHash,
      productId: new Types.ObjectId(productId),
      createdAt: { $gt: since },
    });
  }

  /**
   * 9. Calculate product vote arrival velocity (votes per hour over window)
   */
  async getProductVelocity(productId: string, hours: number): Promise<number> {
    if (!Types.ObjectId.isValid(productId) || hours <= 0) {
      return 0;
    }

    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    const count = await Vote.countDocuments({
      productId: new Types.ObjectId(productId),
      status: { $in: [VoteStatus.VALID, VoteStatus.FLAGGED] },
      createdAt: { $gt: since },
    });

    return count / hours;
  }
}

export const voteRepository = new VoteRepository();
