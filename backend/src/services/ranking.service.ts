import { Types } from 'mongoose';
import { Product, IProduct } from '../models/Product.model';
import { Vote } from '../models/Vote.model';
import { ActivityEvent } from '../models/ActivityEvent.model';
import { Review } from '../models/Review.model';
import { SystemSettings } from '../models/SystemSettings.model';
import {
  IDailyLeaderboardSnapshot,
  LeaderboardType,
} from '../models/DailyLeaderboardSnapshot.model';
import { snapshotRepository } from '../repositories/snapshot.repository';
import { RANKING_WEIGHTS, RankingFormulaWeights, ProductStatus } from '../shared/constants';
import { redis, isRedisConnected } from '../shared/redis';
import { logger } from '../shared/logger';

export interface LeaderboardEntry {
  rank: number;
  score: number;
  productId: string;
  product: Partial<IProduct>;
  voteCount: number;
  reviewCount: number;
  qualifiedClickCount: number;
}

export class RankingService {
  private weightsCache: { weights: RankingFormulaWeights; expiresAt: number } | null = null;

  /**
   * Loads ranking weights from SystemSettings (cached 5 min) with fallback to default constants
   */
  async getRankingWeights(): Promise<RankingFormulaWeights> {
    const now = Date.now();
    if (this.weightsCache && this.weightsCache.expiresAt > now) {
      return this.weightsCache.weights;
    }

    try {
      const setting = await SystemSettings.findOne({ key: 'ranking_weights' }).lean();
      if (setting && setting.value) {
        const val = setting.value as Partial<RankingFormulaWeights>;
        const merged: RankingFormulaWeights = {
          W_v: typeof val.W_v === 'number' ? val.W_v : RANKING_WEIGHTS.W_v,
          W_c: typeof val.W_c === 'number' ? val.W_c : RANKING_WEIGHTS.W_c,
          W_r: typeof val.W_r === 'number' ? val.W_r : RANKING_WEIGHTS.W_r,
          W_u: typeof val.W_u === 'number' ? val.W_u : RANKING_WEIGHTS.W_u,
          GAMMA_LAUNCH: typeof val.GAMMA_LAUNCH === 'number' ? val.GAMMA_LAUNCH : RANKING_WEIGHTS.GAMMA_LAUNCH,
          LAMBDA_DECAY: typeof val.LAMBDA_DECAY === 'number' ? val.LAMBDA_DECAY : RANKING_WEIGHTS.LAMBDA_DECAY,
        };
        this.weightsCache = { weights: merged, expiresAt: now + 5 * 60 * 1000 };
        return merged;
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Failed to load ranking weights from DB, using defaults');
    }

    return RANKING_WEIGHTS;
  }

  /**
   * 1. Algorithm 1: Launch-Day Score (S_launch)
   * Target View: /today
   * Formula: (V_valid * W_v + U_organic_clicks * W_c) / (delta_t_hours + 1)^gamma_launch
   */
  async computeLaunchScore(
    productId: string,
    launchDate: Date,
    now: Date = new Date()
  ): Promise<number> {
    if (!Types.ObjectId.isValid(productId)) return 0;

    const launchStart = new Date(
      Date.UTC(launchDate.getUTCFullYear(), launchDate.getUTCMonth(), launchDate.getUTCDate(), 0, 0, 0, 0)
    );

    // V_valid: Count votes where status is VALID and cast on or after launchStart
    const vValid = await Vote.countDocuments({
      productId: new Types.ObjectId(productId),
      status: 'VALID',
      createdAt: { $gte: launchStart },
    });

    // U_organic_clicks: Count unique, deduplicated organic outbound clicks (sponsored/bots strictly excluded)
    const uOrganicClicks = await ActivityEvent.countDocuments({
      productId: new Types.ObjectId(productId),
      eventType: 'OUTBOUND_CLICK',
      eventSource: 'ORGANIC',
      createdAt: { $gte: launchStart },
      'metadata.isDuplicate': { $ne: true },
    });

    // delta_t: Hours elapsed since 00:00:00 UTC of launch date (clamped 0 to 24)
    const elapsedMs = Math.max(0, now.getTime() - launchStart.getTime());
    const deltaTHours = Math.min(24, elapsedMs / (3600 * 1000));

    const weights = await this.getRankingWeights();

    const numerator = vValid * weights.W_v + uOrganicClicks * weights.W_c;
    const denominator = Math.pow(deltaTHours + 1, weights.GAMMA_LAUNCH);

    return Math.round((numerator / denominator) * 10000) / 10000;
  }

  /**
   * 2. Algorithm 2: Trending Score (S_trending)
   * Target View: /trending (Rolling 7-day window)
   * Formula: sum_{d=1..7} [(V_d * W_v + R_d * W_r + log10(U_organic_clicks_d + 1) * W_u) * lambda^(d-1)]
   */
  async computeTrendingScore(productId: string, now: Date = new Date()): Promise<number> {
    if (!Types.ObjectId.isValid(productId)) return 0;

    const weights = await this.getRankingWeights();
    const pid = new Types.ObjectId(productId);
    let totalScore = 0;

    for (let d = 1; d <= 7; d++) {
      const dayEnd = new Date(now.getTime() - (d - 1) * 24 * 3600 * 1000);
      const dayStart = new Date(now.getTime() - d * 24 * 3600 * 1000);

      // Votes on day d
      const vD = await Vote.countDocuments({
        productId: pid,
        status: 'VALID',
        createdAt: { $gte: dayStart, $lt: dayEnd },
      });

      // Reviews on day d (Phase 2, evaluates to 0 if none)
      const rD = await Review.countDocuments({
        productId: pid,
        createdAt: { $gte: dayStart, $lt: dayEnd },
      });

      // Organic qualified clicks on day d
      const uClicksD = await ActivityEvent.countDocuments({
        productId: pid,
        eventType: 'OUTBOUND_CLICK',
        eventSource: 'ORGANIC',
        createdAt: { $gte: dayStart, $lt: dayEnd },
        'metadata.isDuplicate': { $ne: true },
      });

      const dayScore =
        (vD * weights.W_v + rD * weights.W_r + Math.log10(uClicksD + 1) * weights.W_u) *
        Math.pow(weights.LAMBDA_DECAY, d - 1);

      totalScore += dayScore;
    }

    return Math.round(totalScore * 10000) / 10000;
  }

  /**
   * 3. Algorithm 3: All-Time Authority Score (S_alltime)
   * Target View: /hall-of-fame
   * Formula: log10(V_total + 1) * 40 + (avg_rating * N_reviews / (N_reviews + 5)) * 60
   */
  async computeAllTimeScore(productId: string): Promise<number> {
    if (!Types.ObjectId.isValid(productId)) return 0;

    const pid = new Types.ObjectId(productId);

    // Lifetime valid votes
    const vTotal = await Vote.countDocuments({
      productId: pid,
      status: 'VALID',
    });

    // Reviews and ratings aggregation (Bayesian shrinkage K=5)
    let reviewComponent = 0;
    try {
      const [reviewStats] = await Review.aggregate([
        { $match: { productId: pid } },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            avgRating: { $avg: '$rating' },
          },
        },
      ]);

      if (reviewStats && reviewStats.count > 0) {
        const nReviews = reviewStats.count;
        const avgRating = reviewStats.avgRating || 0;
        reviewComponent = (avgRating * (nReviews / (nReviews + 5))) * 60;
      }
    } catch {
      reviewComponent = 0;
    }

    const voteComponent = Math.log10(vTotal + 1) * 40;
    return Math.round((voteComponent + reviewComponent) * 10000) / 10000;
  }

  /**
   * 4. Generate daily ranked leaderboard for a given calendar date and leaderboard type
   */
  async generateDailyLeaderboard(
    date: Date,
    leaderboardType: LeaderboardType = 'LAUNCH_DAY'
  ): Promise<LeaderboardEntry[]> {
    const midnightUtc = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)
    );
    const nextDayUtc = new Date(midnightUtc.getTime() + 24 * 3600 * 1000);

    let products: any[] = [];

    if (leaderboardType === 'LAUNCH_DAY') {
      // Find products launched on this calendar day, or live products
      products = await Product.find({
        status: ProductStatus.LIVE,
        $or: [
          { launchDate: { $gte: midnightUtc, $lt: nextDayUtc } },
          { createdAt: { $gte: midnightUtc, $lt: nextDayUtc } },
          { launchDate: null },
        ],
      })
        .select('name slug tagline logoUrl media websiteUrl canonicalDomain pricing launchDate createdAt')
        .lean();
    } else {
      // TRENDING and ALL_TIME evaluate all LIVE products
      products = await Product.find({ status: ProductStatus.LIVE })
        .select('name slug tagline logoUrl media websiteUrl canonicalDomain pricing launchDate createdAt')
        .lean();
    }

    const scoredEntries: {
      productId: string;
      product: any;
      score: number;
      voteCount: number;
      reviewCount: number;
      qualifiedClickCount: number;
      createdAt: Date;
    }[] = [];

    for (const prod of products) {
      const pidStr = prod._id.toString();
      let score = 0;

      if (leaderboardType === 'LAUNCH_DAY') {
        const lDate = prod.launchDate || midnightUtc;
        score = await this.computeLaunchScore(pidStr, lDate, date);
      } else if (leaderboardType === 'TRENDING') {
        score = await this.computeTrendingScore(pidStr, date);
      } else if (leaderboardType === 'ALL_TIME') {
        score = await this.computeAllTimeScore(pidStr);
      }

      const voteCount = await Vote.countDocuments({
        productId: prod._id,
        status: 'VALID',
        createdAt: { $gte: midnightUtc },
      });

      const clickCount = await ActivityEvent.countDocuments({
        productId: prod._id,
        eventType: 'OUTBOUND_CLICK',
        eventSource: 'ORGANIC',
        createdAt: { $gte: midnightUtc },
        'metadata.isDuplicate': { $ne: true },
      });

      scoredEntries.push({
        productId: pidStr,
        product: prod,
        score,
        voteCount,
        reviewCount: 0,
        qualifiedClickCount: clickCount,
        createdAt: prod.createdAt,
      });
    }

    // Sort descending: highest score first; tiebreakers: vote count, then older product
    scoredEntries.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    // Assign 1-based ranks
    return scoredEntries.map((entry, index) => ({
      rank: index + 1,
      score: entry.score,
      productId: entry.productId,
      product: entry.product,
      voteCount: entry.voteCount,
      reviewCount: entry.reviewCount,
      qualifiedClickCount: entry.qualifiedClickCount,
    }));
  }

  /**
   * 5. Daily Freeze Worker: Freezes 23:59:59 UTC leaderboard into immutable snapshots & warms Redis
   */
  async freezeDailyLeaderboard(date: Date): Promise<void> {
    const midnightUtc = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)
    );
    const dateStr = midnightUtc.toISOString().split('T')[0];

    logger.info({ date: dateStr }, 'Starting daily leaderboard snapshot freeze...');

    // 1. Generate final launch-day ranking
    const entries = await this.generateDailyLeaderboard(midnightUtc, 'LAUNCH_DAY');

    // 2. Map to IDailyLeaderboardSnapshot documents
    const snapshots: Partial<IDailyLeaderboardSnapshot>[] = entries.map((entry) => ({
      snapshotDate: midnightUtc,
      leaderboardType: 'LAUNCH_DAY',
      productId: new Types.ObjectId(entry.productId),
      rank: entry.rank,
      score: entry.score,
      algorithmVersion: '1.0.0',
      voteCount: entry.voteCount,
      reviewCount: entry.reviewCount,
      qualifiedClickCount: entry.qualifiedClickCount,
      generatedAt: new Date(),
    }));

    // 3. Persist snapshots to MongoDB
    await snapshotRepository.insertMany(snapshots);

    // 4. Warm Redis sorted sets with final score state
    if (isRedisConnected() && entries.length > 0) {
      try {
        const redisKey = `leaderboard:today:${dateStr}:votes`;
        const pipeline = redis.pipeline();

        for (const entry of entries) {
          pipeline.zadd(redisKey, entry.score, entry.productId);
        }
        pipeline.expire(redisKey, 86400 * 7); // Retain frozen daily cache for 7 days
        await pipeline.exec();

        logger.info({ dateStr, count: entries.length }, 'Warmed Redis sorted set for frozen leaderboard');
      } catch (redisErr: any) {
        logger.warn({ err: redisErr.message }, 'Failed to warm Redis for frozen leaderboard');
      }
    }

    logger.info({ date: dateStr, count: snapshots.length }, 'Daily leaderboard snapshot freeze completed');
  }
}

export const rankingService = new RankingService();
export default rankingService;
