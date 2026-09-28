import { Types } from 'mongoose';
import {
  DailyLeaderboardSnapshot,
  IDailyLeaderboardSnapshot,
} from '../models/DailyLeaderboardSnapshot.model';
import { logger } from '../shared/logger';

export class SnapshotRepository {
  /**
   * 1. Idempotently bulk-upsert daily leaderboard snapshots.
   * Matches on { snapshotDate, leaderboardType, rank } to prevent duplicate key errors.
   */
  async insertMany(snapshots: Partial<IDailyLeaderboardSnapshot>[]): Promise<void> {
    if (!snapshots || snapshots.length === 0) return;

    const operations = snapshots.map((snapshot) => ({
      updateOne: {
        filter: {
          snapshotDate: snapshot.snapshotDate,
          leaderboardType: snapshot.leaderboardType,
          rank: snapshot.rank,
        },
        update: {
          $set: {
            ...snapshot,
            generatedAt: snapshot.generatedAt || new Date(),
          },
        },
        upsert: true,
      },
    }));

    try {
      await DailyLeaderboardSnapshot.bulkWrite(operations, { ordered: false });
      logger.info(
        { count: snapshots.length, date: snapshots[0]?.snapshotDate, type: snapshots[0]?.leaderboardType },
        'Persisted daily leaderboard snapshots'
      );
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to bulk-upsert daily leaderboard snapshots');
      throw err;
    }
  }

  /**
   * 2. Retrieve leaderboard snapshots for a specific calendar date (UTC midnight) and leaderboard type.
   */
  async findByDate(
    date: Date,
    type: string = 'LAUNCH_DAY',
    limit: number = 50
  ): Promise<IDailyLeaderboardSnapshot[]> {
    const midnightUtc = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)
    );

    return DailyLeaderboardSnapshot.find({
      snapshotDate: midnightUtc,
      leaderboardType: type,
    })
      .sort({ rank: 1 })
      .limit(limit)
      .populate('productId', 'name slug tagline logoUrl media websiteUrl canonicalDomain pricing categoryId')
      .lean();
  }

  /**
   * 3. Query historical rank trajectory for a specific product.
   */
  async findByProductAndType(
    productId: string,
    type: string = 'LAUNCH_DAY',
    limit: number = 30
  ): Promise<IDailyLeaderboardSnapshot[]> {
    if (!Types.ObjectId.isValid(productId)) return [];

    return DailyLeaderboardSnapshot.find({
      productId: new Types.ObjectId(productId),
      leaderboardType: type,
    })
      .sort({ snapshotDate: -1 })
      .limit(limit)
      .lean();
  }
}

export const snapshotRepository = new SnapshotRepository();
export default snapshotRepository;
