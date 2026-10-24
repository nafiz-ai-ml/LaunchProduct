import { Types } from 'mongoose';
import { Product, IProduct } from '../models/Product.model';
import { ActivityEvent } from '../models/ActivityEvent.model';
import { Category } from '../models/Category.model';
import { SystemSettings } from '../models/SystemSettings.model';
import { RankingLedger } from '../models/RankingLedger.model';
import {
  DailyLeaderboardSnapshot,
  IDailyLeaderboardSnapshot,
  LeaderboardType,
  IProductSnapshotData,
} from '../models/DailyLeaderboardSnapshot.model';
import { snapshotRepository } from '../repositories/snapshot.repository';
import {
  RANKING_WEIGHTS,
  RankingFormulaWeights,
  ProductStatus,
  MIN_INITIAL_RANKING_PAYMENT_CENTS,
  MIN_RANKING_INCREMENT_CENTS,
} from '../shared/constants';
import { redis, isRedisConnected } from '../shared/redis';
import { logger } from '../shared/logger';

export interface LeaderboardEntry {
  rank: number;
  score: number; // Monetary ranking score in USD (e.g. 25.00)
  amountCents: number; // Integer minor units (e.g. 2500)
  formattedAmount: string; // Formatted display string: "$25.00"
  productId: string;
  product: Partial<IProduct>;
  voteCount: number;
  reviewCount: number;
  qualifiedClickCount: number;
  firstPaidAt?: Date | null;
  lastPaidAt?: Date | null;
}

export interface PayToRankRules {
  minInitialPaymentCents: number;
  minIncrementCents: number;
  currency: string;
  utcResetHour: number; // 0 = 00:00:00 UTC
  dailyResetUtc: string; // '00:00:00'
  upvotesCountTowardsRank: boolean; // false
  reviewsCountTowardsRank: boolean; // false
}

export interface OutbidCalculationResult {
  productId: string;
  targetRank: number;
  currentRank: number | null;
  currentAmountCents: number;
  targetProductAmountCents: number;
  minIncrementCents: number;
  requiredPaymentCents: number;
  formattedRequiredPayment: string;
  isInitialPayment: boolean;
}

export class RankingService {
  private weightsCache: { weights: RankingFormulaWeights; expiresAt: number } | null = null;
  private rulesCache: { rules: PayToRankRules; expiresAt: number } | null = null;

  /**
   * Retrieves configurable Pay-to-Rank commercial rules from SystemSettings with fallback
   */
  async getRankingRules(): Promise<PayToRankRules> {
    const now = Date.now();
    if (this.rulesCache && this.rulesCache.expiresAt > now) {
      return this.rulesCache.rules;
    }

    try {
      const setting = await SystemSettings.findOne({ key: 'pay_to_rank_rules' }).lean();
      if (setting && setting.value) {
        const val = setting.value as Partial<PayToRankRules>;
        const rules: PayToRankRules = {
          minInitialPaymentCents:
            typeof val.minInitialPaymentCents === 'number'
              ? val.minInitialPaymentCents
              : MIN_INITIAL_RANKING_PAYMENT_CENTS,
          minIncrementCents:
            typeof val.minIncrementCents === 'number'
              ? val.minIncrementCents
              : MIN_RANKING_INCREMENT_CENTS,
          currency: val.currency || 'USD',
          utcResetHour: 0,
          dailyResetUtc: '00:00:00',
          upvotesCountTowardsRank: false,
          reviewsCountTowardsRank: false,
        };
        this.rulesCache = { rules, expiresAt: now + 5 * 60 * 1000 };
        return rules;
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Failed to load Pay-to-Rank rules from DB, using defaults');
    }

    const defaultRules: PayToRankRules = {
      minInitialPaymentCents: MIN_INITIAL_RANKING_PAYMENT_CENTS,
      minIncrementCents: MIN_RANKING_INCREMENT_CENTS,
      currency: 'USD',
      utcResetHour: 0,
      dailyResetUtc: '00:00:00',
      upvotesCountTowardsRank: false,
      reviewsCountTowardsRank: false,
    };
    this.rulesCache = { rules: defaultRules, expiresAt: now + 5 * 60 * 1000 };
    return defaultRules;
  }

  /**
   * Helper: format cents into USD currency string (e.g. 599 -> "$5.99")
   */
  formatCents(cents: number): string {
    const dollars = (cents / 100).toFixed(2);
    return `$${dollars}`;
  }

  /**
   * 1. All-Time Pay-to-Rank Leaderboard
   * Strict qualifying paid ranking amounts determine position.
   * Higher qualifying amounts receive higher positions.
   * Tie-breaker: First-mover FIFO (earlier firstPaidAt ASC, then createdAt ASC).
   */
  async getAllTimePayToRank(page: number = 1, limit: number = 20): Promise<{
    items: LeaderboardEntry[];
    total: number;
    rules: PayToRankRules;
  }> {
    const rules = await this.getRankingRules();
    const skip = (Math.max(1, page) - 1) * limit;

    const filter = {
      status: ProductStatus.LIVE,
    };

    // Sort: qualifying paid cents DESC, then earlier first payment date ASC, then earlier created ASC
    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('categoryId', 'name slug iconUrl')
        .sort({ paidRankingAmountCents: -1, firstPaidAt: 1, createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    const productIds = products.map((p) => p._id);

    // Fetch outbound clicks for social proof (never affects ranking)
    const clickCounts = await ActivityEvent.aggregate([
      {
        $match: {
          productId: { $in: productIds },
          eventType: 'OUTBOUND_CLICK',
          'metadata.isDuplicate': { $ne: true },
        },
      },
      { $group: { _id: '$productId', count: { $sum: 1 } } },
    ]);

    const clickMap = new Map<string, number>(clickCounts.map((c: any) => [c._id.toString(), c.count]));

    const items: LeaderboardEntry[] = products.map((p, idx) => {
      const pidStr = p._id.toString();
      const amountCents = p.paidRankingAmountCents || 0;
      return {
        rank: skip + idx + 1,
        score: Math.round((amountCents / 100) * 100) / 100,
        amountCents,
        formattedAmount: this.formatCents(amountCents),
        productId: pidStr,
        product: p as any,
        voteCount: 0,
        reviewCount: 0,
        qualifiedClickCount: clickMap.get(pidStr) || 0,
        firstPaidAt: p.firstPaidAt || null,
        lastPaidAt: p.lastPaidAt || null,
      };
    });

    return { items, total, rules };
  }

  /**
   * 2. Today's Pay-to-Rank Leaderboard
   * Runs for the current UTC calendar day (00:00:00.000Z to 23:59:59.999Z).
   * Aggregates verified qualifying payments from RankingLedger for target UTC date.
   */
  async getTodayPayToRank(
    targetDate: Date = new Date(),
    page: number = 1,
    limit: number = 20
  ): Promise<{ items: LeaderboardEntry[]; total: number; dateStr: string; rules: PayToRankRules }> {
    const rules = await this.getRankingRules();
    const dateStr = targetDate.toISOString().split('T')[0];
    const skip = (Math.max(1, page) - 1) * limit;

    // Aggregate confirmed ledger entries for today's UTC calendar date
    const ledgerAgg = await RankingLedger.aggregate([
      {
        $match: {
          targetDailyDate: dateStr,
          status: 'APPLIED',
        },
      },
      {
        $group: {
          _id: '$productId',
          todayCents: { $sum: '$qualifyingAmountCents' },
          firstPaidAt: { $min: '$appliedAt' },
          lastPaidAt: { $max: '$appliedAt' },
        },
      },
      { $sort: { todayCents: -1, firstPaidAt: 1 } },
    ]);

    const rankedProductIds = ledgerAgg.map((l) => l._id);
    const ledgerMap = new Map(ledgerAgg.map((l) => [l._id.toString(), l]));

    // Query live products matching ledger
    let products: any[] = [];
    if (rankedProductIds.length > 0) {
      products = await Product.find({
        _id: { $in: rankedProductIds },
        status: ProductStatus.LIVE,
      })
        .populate('categoryId', 'name slug iconUrl')
        .lean();
    }

    // Sort products according to ledger aggregate order
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));
    const sortedProducts: any[] = [];
    for (const item of ledgerAgg) {
      const prod = productMap.get(item._id.toString());
      if (prod) {
        sortedProducts.push({
          ...prod,
          todayPaidAmountCents: item.todayCents,
          firstPaidAtToday: item.firstPaidAt,
          lastPaidAtToday: item.lastPaidAt,
        });
      }
    }

    const total = sortedProducts.length;
    const paginatedProducts = sortedProducts.slice(skip, skip + limit);

    const pagedIds = paginatedProducts.map((p) => p._id);
    const clickCounts = await ActivityEvent.aggregate([
      {
        $match: {
          productId: { $in: pagedIds },
          eventType: 'OUTBOUND_CLICK',
          'metadata.isDuplicate': { $ne: true },
        },
      },
      { $group: { _id: '$productId', count: { $sum: 1 } } },
    ]);

    const clickMap = new Map<string, number>(clickCounts.map((c: any) => [c._id.toString(), c.count]));

    const items: LeaderboardEntry[] = paginatedProducts.map((p, idx) => {
      const pidStr = p._id.toString();
      const amountCents = p.todayPaidAmountCents || 0;
      return {
        rank: skip + idx + 1,
        score: Math.round((amountCents / 100) * 100) / 100,
        amountCents,
        formattedAmount: this.formatCents(amountCents),
        productId: pidStr,
        product: p,
        voteCount: 0,
        reviewCount: 0,
        qualifiedClickCount: clickMap.get(pidStr) || 0,
        firstPaidAt: p.firstPaidAtToday || null,
        lastPaidAt: p.lastPaidAtToday || null,
      };
    });

    return { items, total, dateStr, rules };
  }

  /**
   * 3. Category Pay-to-Rank Leaderboard
   * Filtered by category slug or ObjectId; strictly ranked by qualifying paid amount.
   */
  async getCategoryPayToRank(
    categorySlugOrId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ items: LeaderboardEntry[]; total: number; category: any; rules: PayToRankRules }> {
    const rules = await this.getRankingRules();
    const skip = (Math.max(1, page) - 1) * limit;

    let category: any = null;
    if (Types.ObjectId.isValid(categorySlugOrId)) {
      category = await Category.findById(categorySlugOrId).lean();
    }
    if (!category) {
      category = await Category.findOne({ slug: categorySlugOrId.toLowerCase().trim() }).lean();
    }

    if (!category) {
      return { items: [], total: 0, category: null, rules };
    }

    const filter = {
      categoryId: category._id,
      status: ProductStatus.LIVE,
    };

    const [products, total] = await Promise.all([
      Product.find(filter)
        .populate('categoryId', 'name slug iconUrl')
        .sort({ paidRankingAmountCents: -1, firstPaidAt: 1, createdAt: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Product.countDocuments(filter),
    ]);

    const productIds = products.map((p) => p._id);
    const clickCounts = await ActivityEvent.aggregate([
      {
        $match: {
          productId: { $in: productIds },
          eventType: 'OUTBOUND_CLICK',
          'metadata.isDuplicate': { $ne: true },
        },
      },
      { $group: { _id: '$productId', count: { $sum: 1 } } },
    ]);

    const clickMap = new Map<string, number>(clickCounts.map((c: any) => [c._id.toString(), c.count]));

    const items: LeaderboardEntry[] = products.map((p, idx) => {
      const pidStr = p._id.toString();
      const amountCents = p.paidRankingAmountCents || 0;
      return {
        rank: skip + idx + 1,
        score: Math.round((amountCents / 100) * 100) / 100,
        amountCents,
        formattedAmount: this.formatCents(amountCents),
        productId: pidStr,
        product: p as any,
        voteCount: 0,
        reviewCount: 0,
        qualifiedClickCount: clickMap.get(pidStr) || 0,
        firstPaidAt: p.firstPaidAt || null,
        lastPaidAt: p.lastPaidAt || null,
      };
    });

    return { items, total, category, rules };
  }

  /**
   * 4. Calculate Outbid / Step-Up Payment Amount
   * Calculates the exact incremental payment needed for a product to achieve a desired rank.
   */
  async calculateOutbidAmount(
    productId: string,
    targetRank: number = 1
  ): Promise<OutbidCalculationResult> {
    const rules = await this.getRankingRules();
    const product = await Product.findById(productId).lean();
    const currentAmountCents = product?.paidRankingAmountCents || 0;

    // Find the product currently occupying targetRank on the All-Time board
    const targetProduct = await Product.findOne({ status: ProductStatus.LIVE })
      .sort({ paidRankingAmountCents: -1, firstPaidAt: 1, createdAt: 1 })
      .skip(Math.max(0, targetRank - 1))
      .limit(1)
      .lean();

    const targetProductAmountCents = targetProduct?.paidRankingAmountCents || 0;

    let requiredPaymentCents: number;
    let isInitialPayment = false;

    if (currentAmountCents === 0) {
      isInitialPayment = true;
      // Initial entry: Must pay at least minInitialPaymentCents ($5.99)
      // And must outbid target product if targetProduct has an amount
      const outbidTarget = targetProductAmountCents + rules.minIncrementCents;
      requiredPaymentCents = Math.max(rules.minInitialPaymentCents, outbidTarget);
    } else {
      // Incremental step-up: pay the difference to beat target product
      if (currentAmountCents <= targetProductAmountCents) {
        const delta = targetProductAmountCents + rules.minIncrementCents - currentAmountCents;
        requiredPaymentCents = Math.max(rules.minIncrementCents, delta);
      } else {
        // Already higher than target rank: minimum step-up is minIncrementCents
        requiredPaymentCents = rules.minIncrementCents;
      }
    }

    // Determine current rank
    let currentRank: number | null = null;
    if (product) {
      const higherCount = await Product.countDocuments({
        status: ProductStatus.LIVE,
        $or: [
          { paidRankingAmountCents: { $gt: currentAmountCents } },
          {
            paidRankingAmountCents: currentAmountCents,
            firstPaidAt: { $lt: product.firstPaidAt || new Date() },
          },
        ],
      });
      currentRank = higherCount + 1;
    }

    return {
      productId,
      targetRank,
      currentRank,
      currentAmountCents,
      targetProductAmountCents,
      minIncrementCents: rules.minIncrementCents,
      requiredPaymentCents,
      formattedRequiredPayment: this.formatCents(requiredPaymentCents),
      isInitialPayment,
    };
  }

  /**
   * 5. Daily Freeze Worker: Freezes 23:59:59 UTC leaderboard into immutable snapshots & warms Redis
   * Idempotent: deletes previous run for the same date & regenerates cleanly.
   */
  async freezeDailyLeaderboard(date: Date): Promise<void> {
    const midnightUtc = new Date(
      Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)
    );
    const dateStr = midnightUtc.toISOString().split('T')[0];

    logger.info({ date: dateStr }, 'Starting Pay-to-Rank daily leaderboard snapshot freeze...');

    // 1. Generate final Today's pay-to-rank leaderboard for this UTC date
    const { items } = await this.getTodayPayToRank(midnightUtc, 1, 100);

    // 2. Fetch category details for product snapshots
    const categoryIds = items
      .map((i) => (i.product as any)?.categoryId)
      .filter((id) => Boolean(id));

    const categories = await Category.find({ _id: { $in: categoryIds } }).lean();
    const categoryMap = new Map(categories.map((c) => [c._id.toString(), c.name]));

    // 3. Map to IDailyLeaderboardSnapshot documents with immutable embedded product snapshot
    const snapshots: Partial<IDailyLeaderboardSnapshot>[] = items.map((entry) => {
      const prod = entry.product;
      const catIdStr = prod.categoryId?.toString();
      const productSnapshot: IProductSnapshotData = {
        name: prod.name || 'Unknown Product',
        slug: prod.slug || 'unknown',
        tagline: prod.tagline || '',
        logoUrl: (prod as any)?.logoUrl || (prod as any)?.media?.logoUrl || null,
        websiteUrl: prod.websiteUrl || '',
        canonicalDomain: prod.canonicalDomain || '',
        categoryId: prod.categoryId as any,
        categoryName: catIdStr ? categoryMap.get(catIdStr) || 'Tools' : 'Tools',
      };

      return {
        snapshotDate: midnightUtc,
        leaderboardType: 'TODAY',
        productId: new Types.ObjectId(entry.productId),
        rank: entry.rank,
        score: entry.score,
        paidAmountCents: entry.amountCents,
        productSnapshot,
        algorithmVersion: 'pay-to-rank-1.0',
        voteCount: entry.voteCount,
        reviewCount: entry.reviewCount,
        qualifiedClickCount: entry.qualifiedClickCount,
        generatedAt: new Date(),
      };
    });

    // 4. Idempotently persist snapshots to MongoDB (replace any prior run for that UTC date)
    await DailyLeaderboardSnapshot.deleteMany({
      snapshotDate: midnightUtc,
      leaderboardType: { $in: ['TODAY', 'LAUNCH_DAY'] },
    });

    if (snapshots.length > 0) {
      await DailyLeaderboardSnapshot.insertMany(snapshots);
    }

    // 5. Warm Redis sorted sets with frozen leaderboard
    if (isRedisConnected() && items.length > 0) {
      try {
        const redisKey = `leaderboard:frozen:${dateStr}`;
        const pipeline = redis.pipeline();

        for (const entry of items) {
          pipeline.zadd(redisKey, entry.amountCents, entry.productId);
        }
        pipeline.expire(redisKey, 86400 * 30); // Retain frozen daily cache for 30 days
        await pipeline.exec();

        logger.info({ dateStr, count: items.length }, 'Warmed Redis sorted set for frozen Pay-to-Rank archive');
      } catch (redisErr: any) {
        logger.warn({ err: redisErr.message }, 'Failed to warm Redis for frozen leaderboard');
      }
    }

    logger.info({ date: dateStr, count: snapshots.length }, 'Pay-to-Rank daily freeze completed');
  }

  // ==========================================
  // Backward-Compatibility Helpers (Legacy)
  // ==========================================

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

  async computeLaunchScore(productId: string, launchDate: Date, now: Date = new Date()): Promise<number> {
    if (!Types.ObjectId.isValid(productId)) return 0;
    const launchStart = new Date(
      Date.UTC(launchDate.getUTCFullYear(), launchDate.getUTCMonth(), launchDate.getUTCDate(), 0, 0, 0, 0)
    );
    const uOrganicClicks = await ActivityEvent.countDocuments({
      productId: new Types.ObjectId(productId),
      eventType: 'OUTBOUND_CLICK',
      eventSource: 'ORGANIC',
      createdAt: { $gte: launchStart },
      'metadata.isDuplicate': { $ne: true },
    });
    const elapsedMs = Math.max(0, now.getTime() - launchStart.getTime());
    const deltaTHours = Math.min(24, elapsedMs / (3600 * 1000));
    const weights = await this.getRankingWeights();
    const numerator = uOrganicClicks * weights.W_c;
    const denominator = Math.pow(deltaTHours + 1, weights.GAMMA_LAUNCH);
    return Math.round((numerator / denominator) * 10000) / 10000;
  }

  async computeTrendingScore(productId: string, now: Date = new Date()): Promise<number> {
    if (!Types.ObjectId.isValid(productId)) return 0;
    const weights = await this.getRankingWeights();
    const pid = new Types.ObjectId(productId);
    let totalScore = 0;
    for (let d = 1; d <= 7; d++) {
      const dayEnd = new Date(now.getTime() - (d - 1) * 24 * 3600 * 1000);
      const dayStart = new Date(now.getTime() - d * 24 * 3600 * 1000);
      const uClicksD = await ActivityEvent.countDocuments({
        productId: pid,
        eventType: 'OUTBOUND_CLICK',
        eventSource: 'ORGANIC',
        createdAt: { $gte: dayStart, $lt: dayEnd },
        'metadata.isDuplicate': { $ne: true },
      });
      const dayScore =
        (Math.log10(uClicksD + 1) * weights.W_u) *
        Math.pow(weights.LAMBDA_DECAY, d - 1);
      totalScore += dayScore;
    }
    return Math.round(totalScore * 10000) / 10000;
  }

  async computeAllTimeScore(productId: string): Promise<number> {
    if (!Types.ObjectId.isValid(productId)) return 0;
    const prod = await Product.findById(productId).select('paidRankingAmountCents').lean();
    const cents = prod?.paidRankingAmountCents || 0;
    return Math.round((cents / 100) * 100) / 100;
  }

  async generateDailyLeaderboard(
    date: Date,
    leaderboardType: LeaderboardType = 'LAUNCH_DAY'
  ): Promise<LeaderboardEntry[]> {
    // If legacy LAUNCH_DAY or TRENDING formula is explicitly requested, compute via legacy scores
    if (leaderboardType === 'LAUNCH_DAY' || leaderboardType === 'TRENDING') {
      const launchStart = new Date(
        Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0, 0)
      );
      const launchEnd = new Date(launchStart.getTime() + 24 * 3600 * 1000);

      const filter: any = { status: ProductStatus.LIVE };
      if (leaderboardType === 'LAUNCH_DAY') {
        filter.launchDate = { $gte: launchStart, $lt: launchEnd };
      }

      const products = await Product.find(filter)
        .select('_id name tagLine slug launchDate')
        .lean();

      const scoredEntries: LeaderboardEntry[] = [];
      for (const prod of products) {
        const score =
          leaderboardType === 'LAUNCH_DAY'
            ? await this.computeLaunchScore(prod._id.toString(), date)
            : await this.computeTrendingScore(prod._id.toString(), date);

        const amountCents = (prod as any).paidRankingAmountCents || 0;
        scoredEntries.push({
          rank: 0,
          score,
          amountCents,
          formattedAmount: this.formatCents(amountCents),
          productId: prod._id.toString(),
          product: prod as any,
          voteCount: 0,
          reviewCount: 0,
          qualifiedClickCount: 0,
        });
      }

      scoredEntries.sort((a, b) => b.score - a.score);
      return scoredEntries.map((entry, idx) => ({ ...entry, rank: idx + 1 }));
    }

    // Modern Pay-to-Rank boards
    if (leaderboardType === 'ALL_TIME') {
      const { items } = await this.getAllTimePayToRank(1, 100);
      return items;
    }
    const { items } = await this.getTodayPayToRank(date, 1, 100);
    return items;
  }
}

export const rankingService = new RankingService();
export default rankingService;
