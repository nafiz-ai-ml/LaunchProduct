import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Product } from '../models/Product.model';
import { Vote } from '../models/Vote.model';
import { ActivityEvent } from '../models/ActivityEvent.model';
import { DailyLeaderboardSnapshot } from '../models/DailyLeaderboardSnapshot.model';
import { rankingService } from '../services/ranking.service';
import { snapshotRepository } from '../repositories/snapshot.repository';
import { redis, isRedisConnected } from '../shared/redis';
import { ValidationError } from '../shared/errors';
import { logger } from '../shared/logger';

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

function getMetadata(req: Request, extra?: Record<string, unknown>) {
  return {
    requestId:
      (req.headers['x-request-id'] as string) ||
      (req as unknown as { id?: string }).id ||
      `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

function parseAndValidateDate(dateStr: string): Date {
  if (!dateStr || !DATE_REGEX.test(dateStr)) {
    throw new ValidationError('Date must be in YYYY-MM-DD format', [
      { field: 'date', code: 'INVALID_FORMAT', message: 'Date must be formatted as YYYY-MM-DD' },
    ]);
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new ValidationError('Invalid calendar date', [
      { field: 'date', code: 'INVALID_DATE', message: 'The provided date is not a valid calendar date' },
    ]);
  }

  const targetDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  if (
    targetDate.getUTCFullYear() !== year ||
    targetDate.getUTCMonth() !== month - 1 ||
    targetDate.getUTCDate() !== day
  ) {
    throw new ValidationError('Invalid calendar date', [
      { field: 'date', code: 'INVALID_DATE', message: 'The provided date is not a valid calendar date' },
    ]);
  }

  return targetDate;
}

export class LeaderboardController {
  /**
   * 1. GET /api/v1/leaderboards (and /api/v1/leaderboards/today)
   * Active real-time launch-day leaderboard
   * - Read from Redis sorted set 'leaderboard:today:{date}:launch' (or fallback '...:votes') (< 5ms fast-path).
   * - If Redis miss or cache cold: fallback to rankingService.generateDailyLeaderboard().
   * - Hydrate product details for top N results from MongoDB.
   * - Return paginated list with rank, score, voteCount, organicClicks.
   */
  async getActiveLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const offset = (page - 1) * limit;

      let dateStr = (req.query.date as string) || '';
      let targetDate: Date;
      if (dateStr) {
        targetDate = parseAndValidateDate(dateStr);
      } else {
        dateStr = new Date().toISOString().split('T')[0];
        targetDate = parseAndValidateDate(dateStr);
      }

      // Fast-path: Check Redis sorted set
      let hitRedis = false;
      let total = 0;
      let redisEntries: { productId: string; score: number }[] = [];

      if (isRedisConnected()) {
        try {
          const launchKey = `leaderboard:today:${dateStr}:launch`;
          const votesKey = `leaderboard:today:${dateStr}:votes`;

          let activeKey = launchKey;
          let count = await redis.zcard(launchKey);

          if (count === 0) {
            const votesCount = await redis.zcard(votesKey);
            if (votesCount > 0) {
              activeKey = votesKey;
              count = votesCount;
            }
          }

          if (count > 0) {
            total = count;
            const rawMembers = await redis.zrevrange(
              activeKey,
              offset,
              offset + limit - 1,
              'WITHSCORES'
            );

            if (rawMembers && rawMembers.length > 0) {
              hitRedis = true;
              for (let i = 0; i < rawMembers.length; i += 2) {
                redisEntries.push({
                  productId: rawMembers[i],
                  score: parseFloat(rawMembers[i + 1]),
                });
              }
            }
          }
        } catch (redisErr: any) {
          logger.warn({ err: redisErr.message }, 'Redis lookup failed, falling back to compute');
        }
      }

      // Fast path hydration
      if (hitRedis && redisEntries.length > 0) {
        const productIds = redisEntries.map((e) => e.productId).filter((id) => Types.ObjectId.isValid(id));
        const objIds = productIds.map((id) => new Types.ObjectId(id));

        const nextDayUtc = new Date(targetDate.getTime() + 24 * 3600 * 1000);

        const [products, voteCounts, clickCounts] = await Promise.all([
          Product.find({ _id: { $in: objIds } })
            .select('name slug tagline logoUrl media websiteUrl canonicalDomain pricing categoryId status launchDate createdAt')
            .lean(),
          Vote.aggregate([
            {
              $match: {
                productId: { $in: objIds },
                status: 'VALID',
                createdAt: { $gte: targetDate, $lt: nextDayUtc },
              },
            },
            { $group: { _id: '$productId', count: { $sum: 1 } } },
          ]),
          ActivityEvent.aggregate([
            {
              $match: {
                productId: { $in: objIds },
                eventType: 'OUTBOUND_CLICK',
                eventSource: 'ORGANIC',
                createdAt: { $gte: targetDate, $lt: nextDayUtc },
                'metadata.isDuplicate': { $ne: true },
              },
            },
            { $group: { _id: '$productId', count: { $sum: 1 } } },
          ]),
        ]);

        const productMap = new Map(products.map((p) => [p._id.toString(), p]));
        const voteMap = new Map(voteCounts.map((v) => [v._id.toString(), v.count]));
        const clickMap = new Map(clickCounts.map((c) => [c._id.toString(), c.count]));

        const items = redisEntries
          .map((entry, idx) => {
            const product = productMap.get(entry.productId);
            if (!product) return null;
            return {
              rank: offset + idx + 1,
              score: entry.score,
              voteCount: voteMap.get(entry.productId) || 0,
              organicClicks: clickMap.get(entry.productId) || 0,
              product,
            };
          })
          .filter((item) => item !== null);

        res.status(200).json({
          success: true,
          data: {
            date: dateStr,
            leaderboardType: 'LAUNCH_DAY',
            items,
            pagination: {
              page,
              limit,
              total,
              totalPages: Math.ceil(total / limit),
            },
          },
          meta: getMetadata(req, { cached: true, source: 'redis' }),
        });
        return;
      }

      // Fallback: Compute real-time leaderboard
      const fullEntries = await rankingService.generateDailyLeaderboard(targetDate, 'LAUNCH_DAY');

      // Warm Redis cache for future fast-path hits
      if (isRedisConnected() && fullEntries.length > 0) {
        try {
          const launchKey = `leaderboard:today:${dateStr}:launch`;
          const votesKey = `leaderboard:today:${dateStr}:votes`;
          const pipeline = redis.pipeline();

          for (const e of fullEntries) {
            pipeline.zadd(launchKey, e.score, e.productId);
            pipeline.zadd(votesKey, e.score, e.productId);
          }
          pipeline.expire(launchKey, 86400 * 2);
          pipeline.expire(votesKey, 86400 * 2);
          await pipeline.exec();
        } catch (warmErr: any) {
          logger.warn({ err: warmErr.message }, 'Failed to warm Redis from leaderboard controller');
        }
      }

      const totalItems = fullEntries.length;
      const paged = fullEntries.slice(offset, offset + limit);

      const items = paged.map((entry) => ({
        rank: entry.rank,
        score: entry.score,
        voteCount: entry.voteCount,
        organicClicks: entry.qualifiedClickCount,
        product: entry.product,
      }));

      res.status(200).json({
        success: true,
        data: {
          date: dateStr,
          leaderboardType: 'LAUNCH_DAY',
          items,
          pagination: {
            page,
            limit,
            total: totalItems,
            totalPages: Math.ceil(totalItems / limit),
          },
        },
        meta: getMetadata(req, { cached: false, source: 'database' }),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 2. GET /api/v1/leaderboards/daily/:date (and /api/v1/leaderboards/historical)
   * Historical frozen snapshots
   * - Validate date format YYYY-MM-DD.
   * - Query DailyLeaderboardSnapshot by { snapshotDate: date, leaderboardType: 'LAUNCH_DAY' }.
   * - Hydrate product details.
   * - Return frozen historical ranking.
   */
  async getHistoricalDailyLeaderboard(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const rawDate = getParam(req.params.date) || (req.query.date as string) || '';
      const targetDate = parseAndValidateDate(rawDate);

      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const offset = (page - 1) * limit;

      const total = await DailyLeaderboardSnapshot.countDocuments({
        snapshotDate: targetDate,
        leaderboardType: 'LAUNCH_DAY',
      });

      const snapshots = await DailyLeaderboardSnapshot.find({
        snapshotDate: targetDate,
        leaderboardType: 'LAUNCH_DAY',
      })
        .sort({ rank: 1 })
        .skip(offset)
        .limit(limit)
        .populate('productId', 'name slug tagline logoUrl media websiteUrl canonicalDomain pricing categoryId status launchDate createdAt')
        .lean();

      const items = snapshots.map((s) => ({
        rank: s.rank,
        score: s.score,
        voteCount: s.voteCount,
        organicClicks: s.qualifiedClickCount,
        product: s.productId,
      }));

      res.status(200).json({
        success: true,
        data: {
          date: rawDate,
          leaderboardType: 'LAUNCH_DAY',
          items,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
        meta: getMetadata(req, { frozen: true }),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 3. GET /api/v1/leaderboards/all-time
   * All-time authority scores
   * - Query recent ALL_TIME snapshots or compute from products collection.
   * - Cache results in Redis with 1-hour TTL.
   */
  async getAllTimeLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const offset = (page - 1) * limit;

      const cacheKey = 'leaderboard:cache:all-time';
      let allEntries: any[] | null = null;
      let cached = false;

      if (isRedisConnected()) {
        try {
          const cachedJson = await redis.get(cacheKey);
          if (cachedJson) {
            allEntries = JSON.parse(cachedJson);
            cached = true;
          }
        } catch (err: any) {
          logger.warn({ err: err.message }, 'Failed to read all-time leaderboard from Redis cache');
        }
      }

      if (!allEntries) {
        // Query recent ALL_TIME snapshots or compute from products collection
        const latestSnapshot = await DailyLeaderboardSnapshot.findOne({
          leaderboardType: 'ALL_TIME',
        })
          .sort({ snapshotDate: -1 })
          .lean();

        if (latestSnapshot) {
          const snapshots = await DailyLeaderboardSnapshot.find({
            snapshotDate: latestSnapshot.snapshotDate,
            leaderboardType: 'ALL_TIME',
          })
            .sort({ rank: 1 })
            .limit(100)
            .populate('productId', 'name slug tagline logoUrl media websiteUrl canonicalDomain pricing categoryId status launchDate createdAt')
            .lean();

          allEntries = snapshots.map((s) => ({
            rank: s.rank,
            score: s.score,
            voteCount: s.voteCount,
            organicClicks: s.qualifiedClickCount,
            product: s.productId,
          }));
        }

        if (!allEntries || allEntries.length === 0) {
          const generated = await rankingService.generateDailyLeaderboard(new Date(), 'ALL_TIME');
          allEntries = generated.map((e) => ({
            rank: e.rank,
            score: e.score,
            voteCount: e.voteCount,
            organicClicks: e.qualifiedClickCount,
            product: e.product,
          }));
        }

        // Cache in Redis with 1-hour TTL (3600 seconds)
        if (isRedisConnected() && allEntries && allEntries.length > 0) {
          try {
            await redis.set(cacheKey, JSON.stringify(allEntries), 'EX', 3600);
          } catch (cacheErr: any) {
            logger.warn({ err: cacheErr.message }, 'Failed to cache all-time leaderboard in Redis');
          }
        }
      }

      const total = allEntries.length;
      const items = allEntries.slice(offset, offset + limit);

      res.status(200).json({
        success: true,
        data: {
          leaderboardType: 'ALL_TIME',
          items,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
        meta: getMetadata(req, { cached }),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 4. GET /api/v1/leaderboards/trending
   * 7-day rolling decayed scores
   * - Cache results in Redis with 15-minute TTL.
   */
  async getTrendingLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const offset = (page - 1) * limit;

      const cacheKey = 'leaderboard:cache:trending';
      let allEntries: any[] | null = null;
      let cached = false;

      if (isRedisConnected()) {
        try {
          const cachedJson = await redis.get(cacheKey);
          if (cachedJson) {
            allEntries = JSON.parse(cachedJson);
            cached = true;
          }
        } catch (err: any) {
          logger.warn({ err: err.message }, 'Failed to read trending leaderboard from Redis cache');
        }
      }

      if (!allEntries) {
        const generated = await rankingService.generateDailyLeaderboard(new Date(), 'TRENDING');
        allEntries = generated.map((e) => ({
          rank: e.rank,
          score: e.score,
          voteCount: e.voteCount,
          organicClicks: e.qualifiedClickCount,
          product: e.product,
        }));

        // Cache in Redis with 15-minute TTL (900 seconds)
        if (isRedisConnected() && allEntries.length > 0) {
          try {
            await redis.set(cacheKey, JSON.stringify(allEntries), 'EX', 900);
          } catch (cacheErr: any) {
            logger.warn({ err: cacheErr.message }, 'Failed to cache trending leaderboard in Redis');
          }
        }
      }

      const total = allEntries.length;
      const items = allEntries.slice(offset, offset + limit);

      res.status(200).json({
        success: true,
        data: {
          leaderboardType: 'TRENDING',
          items,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
        meta: getMetadata(req, { cached }),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const leaderboardController = new LeaderboardController();
export default leaderboardController;
