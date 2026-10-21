import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Product } from '../models/Product.model';
import { DailyLeaderboardSnapshot } from '../models/DailyLeaderboardSnapshot.model';
import { rankingService } from '../services/ranking.service';
import { redis, isRedisConnected } from '../shared/redis';
import { ValidationError, NotFoundError } from '../shared/errors';
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
    commercialDisclosure: 'Positions are determined by verified qualifying paid ranking amounts, not independent editorial endorsement.',
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
   * Today's Real-time Pay-to-Rank Leaderboard
   * Current UTC day boundary: 00:00:00 UTC to 23:59:59 UTC.
   */
  async getActiveLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      const queryDateStr = (req.query.date as string) || '';

      // If client requests a past calendar date, delegate to historical snapshot archive
      if (queryDateStr && queryDateStr !== todayStr) {
        return this.getHistoricalDailyLeaderboard(req, res, next);
      }

      // Fast-path: Check Redis sorted cache for today
      const cacheKey = `leaderboard:cache:today:${todayStr}:${page}:${limit}`;
      if (isRedisConnected()) {
        try {
          const cachedJson = await redis.get(cacheKey);
          if (cachedJson) {
            const data = JSON.parse(cachedJson);
            res.status(200).json({
              success: true,
              data,
              meta: getMetadata(req, { cached: true, source: 'redis' }),
            });
            return;
          }
        } catch (err: any) {
          logger.warn({ err: err.message }, 'Redis read failed for today leaderboard');
        }
      }

      const { items, total, dateStr, rules } = await rankingService.getTodayPayToRank(now, page, limit);

      const responsePayload = {
        date: dateStr,
        leaderboardType: 'TODAY',
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
        rules,
      };

      // Cache in Redis with 15-second TTL for fast sub-millisecond dynamic refreshes
      if (isRedisConnected()) {
        try {
          await redis.set(cacheKey, JSON.stringify(responsePayload), 'EX', 15);
        } catch {
          // ignore cache error
        }
      }

      res.status(200).json({
        success: true,
        data: responsePayload,
        meta: getMetadata(req, { cached: false, source: 'database' }),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 2. GET /api/v1/leaderboards/all-time
   * All-Time Pay-to-Rank Leaderboard
   * Strict qualifying cumulative paid ranking amounts determine position.
   */
  async getAllTimeLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

      const cacheKey = `leaderboard:cache:all-time:${page}:${limit}`;
      if (isRedisConnected()) {
        try {
          const cachedJson = await redis.get(cacheKey);
          if (cachedJson) {
            const data = JSON.parse(cachedJson);
            res.status(200).json({
              success: true,
              data,
              meta: getMetadata(req, { cached: true }),
            });
            return;
          }
        } catch (err: any) {
          logger.warn({ err: err.message }, 'Redis read failed for all-time leaderboard');
        }
      }

      const { items, total, rules } = await rankingService.getAllTimePayToRank(page, limit);

      const responsePayload = {
        leaderboardType: 'ALL_TIME',
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
        rules,
      };

      if (isRedisConnected()) {
        try {
          await redis.set(cacheKey, JSON.stringify(responsePayload), 'EX', 30);
        } catch {
          // ignore cache error
        }
      }

      res.status(200).json({
        success: true,
        data: responsePayload,
        meta: getMetadata(req, { cached: false }),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 3. GET /api/v1/leaderboards/category/:slug
   * Category-Specific Pay-to-Rank Leaderboard
   */
  async getCategoryLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const slug = getParam(req.params.slug);
      if (!slug) {
        throw new ValidationError('Category slug parameter is required', [
          { field: 'slug', code: 'REQUIRED', message: 'Category slug is required' },
        ]);
      }

      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));

      const { items, total, category, rules } = await rankingService.getCategoryPayToRank(slug, page, limit);

      if (!category) {
        throw new NotFoundError(`Category '${slug}' not found`);
      }

      res.status(200).json({
        success: true,
        data: {
          leaderboardType: 'CATEGORY',
          category,
          items,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
          },
          rules,
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 4. GET /api/v1/leaderboards/daily/:date (and /historical)
   * Historical Frozen Daily Archive
   * Reads from immutable DailyLeaderboardSnapshot with embedded product snapshot data.
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
        leaderboardType: { $in: ['TODAY', 'LAUNCH_DAY'] },
      });

      const snapshots = await DailyLeaderboardSnapshot.find({
        snapshotDate: targetDate,
        leaderboardType: { $in: ['TODAY', 'LAUNCH_DAY'] },
      })
        .sort({ rank: 1 })
        .skip(offset)
        .limit(limit)
        .populate('productId', 'name slug tagline logoUrl media websiteUrl canonicalDomain pricing categoryId status')
        .lean();

      // Hydrate from embedded product snapshot first to guarantee immutability, falling back to referenced product
      const items = snapshots.map((s) => {
        const prodData = s.productSnapshot
          ? {
              name: s.productSnapshot.name,
              slug: s.productSnapshot.slug,
              tagline: s.productSnapshot.tagline,
              logoUrl: s.productSnapshot.logoUrl,
              websiteUrl: s.productSnapshot.websiteUrl,
              canonicalDomain: s.productSnapshot.canonicalDomain,
              category: s.productSnapshot.categoryName || 'Tools',
            }
          : s.productId || {};

        const amountCents = s.paidAmountCents || Math.round((s.score || 0) * 100);

        return {
          rank: s.rank,
          score: Math.round((amountCents / 100) * 100) / 100,
          amountCents,
          formattedAmount: `$${(amountCents / 100).toFixed(2)}`,
          voteCount: s.voteCount,
          organicClicks: s.qualifiedClickCount,
          product: prodData,
          isHistoricalSnapshot: true,
        };
      });

      res.status(200).json({
        success: true,
        data: {
          date: rawDate,
          leaderboardType: 'DAILY_ARCHIVE',
          items,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
          },
        },
        meta: getMetadata(req, { frozen: true, historical: true }),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 5. GET /api/v1/leaderboards/outbid-calc
   * Query cost needed to outbid or reach target rank
   */
  async calculateOutbid(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = req.query.productId as string;
      const targetRank = parseInt(req.query.targetRank as string, 10) || 1;

      if (!productId) {
        throw new ValidationError('productId query parameter is required', [
          { field: 'productId', code: 'REQUIRED', message: 'productId must be provided' },
        ]);
      }

      const result = await rankingService.calculateOutbidAmount(productId, targetRank);

      res.status(200).json({
        success: true,
        data: result,
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 6. GET /api/v1/leaderboards/rules
   * Public Pay-to-Rank Rules and Thresholds
   */
  async getRules(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rules = await rankingService.getRankingRules();
      res.status(200).json({
        success: true,
        data: {
          rules: {
            ...rules,
            formattedMinInitialPayment: `$${(rules.minInitialPaymentCents / 100).toFixed(2)}`,
            formattedMinIncrement: `$${(rules.minIncrementCents / 100).toFixed(2)}`,
            rankingPrinciple: 'Rankings are determined strictly by verified qualifying paid ranking amounts in minor units (cents). Upvotes and reviews are community social signals and never influence ranking order.',
            utcReset: 'Daily rankings run 00:00:00 UTC to 23:59:59 UTC, freezing into permanent daily archives at midnight UTC.',
            tieBreaker: 'Equal amounts are resolved by first-mover confirmation timestamp (FIFO).',
          },
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 7. GET /api/v1/leaderboards/trending
   * Legacy 7-day rolling decayed scores (preserved for backward compatibility)
   */
  async getTrendingLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const offset = (page - 1) * limit;

      const { items, total } = await rankingService.getAllTimePayToRank(page, limit);

      res.status(200).json({
        success: true,
        data: {
          leaderboardType: 'TRENDING',
          items,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
          },
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const leaderboardController = new LeaderboardController();
export default leaderboardController;
