import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { SystemSettings, ISystemSettings } from '../models/SystemSettings.model';
import { User, IUser } from '../models/User.model';
import { Campaign, ICampaign } from '../models/Campaign.model';
import { ModerationAction } from '../models/ModerationAction.model';
import { ActivityEvent } from '../models/ActivityEvent.model';
import { VerificationToken } from '../models/VerificationToken.model';
import { rankingQueue } from '../shared/ranking-queue';
import { UserRole, RANKING_WEIGHTS, EventSource } from '../shared/constants';
import { redis, isRedisConnected } from '../shared/redis';
import { ValidationError, NotFoundError } from '../shared/errors';
import { logger } from '../shared/logger';
import { getQueuesOverview } from '../workers';

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

export class AdminController {
  /**
   * 1. GET /api/v1/admin/settings
   * Retrieve all platform system settings (anti-fraud weights, ranking weights, platform thresholds)
   */
  async getSettings(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      let settings: any[] = await SystemSettings.find()
        .sort({ key: 1 })
        .populate('updatedById', 'name email role')
        .lean();

      // Seed default settings into response if database has none yet
      if (!settings || settings.length === 0) {
        settings = [
          {
            _id: new Types.ObjectId(),
            key: 'ranking_weights',
            value: RANKING_WEIGHTS as unknown as Record<string, unknown>,
            description: 'Core leaderboard ranking formula dampening and decay coefficients',
            updatedAt: new Date(),
          },
          {
            _id: new Types.ObjectId(),
            key: 'anti_fraud_thresholds',
            value: {
              THRESHOLD_LOW: 30,
              THRESHOLD_HIGH: 70,
              MAX_SUBNET_VOTES_HOUR: 5,
            },
            description: 'Anti-fraud multi-factor risk engine scoring boundaries',
            updatedAt: new Date(),
          },
          {
            _id: new Types.ObjectId(),
            key: 'platform_limits',
            value: {
              HOMEPAGE_SPOTLIGHT_MAX: 3,
              CATEGORY_FEATURED_MAX: 2,
              DAILY_SUBMISSION_MAX: 10,
            },
            description: 'Platform concurrent inventory and submission rate limit parameters',
            updatedAt: new Date(),
          },
        ];
      }

      res.status(200).json({
        success: true,
        data: {
          settings,
        },
        meta: getMetadata(req, { count: settings.length }),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 2. PATCH /api/v1/admin/settings/:key
   * Update a system setting value, invalidate Redis cache, and log activity event
   */
  async updateSetting(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const key = getParam(req.params.key).trim();
      if (!key) {
        throw new ValidationError('Setting key is required in URL parameter');
      }

      const newValue = req.body.value !== undefined ? req.body.value : req.body;
      const description = req.body.description;
      const adminUserId = req.user!.userId;

      const previousSetting = await SystemSettings.findOne({ key }).lean();
      const previousValue = previousSetting ? previousSetting.value : null;

      const updatedSetting = await SystemSettings.findOneAndUpdate(
        { key },
        {
          $set: {
            value: newValue,
            ...(description ? { description: description.trim() } : {}),
            updatedById: new Types.ObjectId(adminUserId),
            updatedAt: new Date(),
          },
        },
        { upsert: true, new: true }
      ).lean();

      // Invalidate relevant Redis caches immediately
      if (isRedisConnected()) {
        try {
          await redis.del(`setting:${key}`);
          if (key === 'ranking_weights') {
            await redis.del('leaderboard:cache:trending');
            await redis.del('leaderboard:cache:all-time');
          }
        } catch (redisErr: any) {
          logger.warn({ err: redisErr.message }, 'Failed to invalidate Redis cache for updated setting');
        }
      }

      // Log activity event: SYSTEM_SETTING_UPDATED
      await ActivityEvent.create({
        userId: new Types.ObjectId(adminUserId),
        eventType: 'SYSTEM_SETTING_UPDATED',
        eventSource: EventSource.INTERNAL || 'SYSTEM',
        metadata: {
          settingKey: key,
          previousValue,
          newValue,
        },
        createdAt: new Date(),
      });

      res.status(200).json({
        success: true,
        data: {
          setting: updatedSetting,
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 3. POST /api/v1/admin/leaderboard/recompute
   * Manually trigger leaderboard recomputation job in BullMQ
   */
  async recomputeLeaderboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const targetDate = req.body.targetDate || new Date().toISOString().split('T')[0];
      const adminUserId = req.user!.userId;

      const job = await rankingQueue.add(
        'MANUAL_RECOMPUTE',
        {
          type: 'MANUAL_RECOMPUTE',
          targetDate,
          requestedBy: adminUserId,
        },
        { removeOnComplete: 100 }
      );

      // Invalidate today's cached trending and all-time leaderboards
      if (isRedisConnected()) {
        await redis.del('leaderboard:cache:trending').catch(() => {});
        await redis.del('leaderboard:cache:all-time').catch(() => {});
      }

      res.status(200).json({
        success: true,
        data: {
          enqueued: true,
          jobId: job.id,
          targetDate,
          requestedBy: adminUserId,
          enqueuedAt: new Date().toISOString(),
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 4. GET /api/v1/admin/audit-logs
   * Paginated audit log combined from moderation_actions and activity_events
   */
  async getAuditLogs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const source = (req.query.source as string) || 'all';

      const [moderationActions, activityEvents] = await Promise.all([
        source !== 'activity'
          ? ModerationAction.find()
              .sort({ createdAt: -1 })
              .limit(limit * 2)
              .populate('moderatorId', 'name email role')
              .lean()
          : [],
        source !== 'moderation'
          ? ActivityEvent.find()
              .sort({ createdAt: -1 })
              .limit(limit * 2)
              .populate('userId', 'email role')
              .populate('productId', 'name slug')
              .lean()
          : [],
      ]);

      const normalizedLogs: Array<{
        id: string;
        source: 'MODERATION' | 'ACTIVITY';
        actor: unknown;
        action: string;
        targetType: string;
        targetId: unknown;
        reason?: string | null;
        metadata?: unknown;
        createdAt: Date;
      }> = [];

      for (const m of moderationActions) {
        normalizedLogs.push({
          id: m._id.toString(),
          source: 'MODERATION',
          actor: m.moderatorId,
          action: m.action,
          targetType: m.targetType,
          targetId: m.targetId,
          reason: m.reason,
          metadata: { previousState: m.previousState, newState: m.newState },
          createdAt: m.createdAt,
        });
      }

      for (const a of activityEvents) {
        normalizedLogs.push({
          id: a._id.toString(),
          source: 'ACTIVITY',
          actor: a.userId,
          action: a.eventType,
          targetType: a.productId ? 'PRODUCT' : 'SYSTEM',
          targetId: a.productId,
          reason: null,
          metadata: a.metadata,
          createdAt: a.createdAt,
        });
      }

      // Sort descending by timestamp
      normalizedLogs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      const total = normalizedLogs.length;
      const offset = (page - 1) * limit;
      const pagedLogs = normalizedLogs.slice(offset, offset + limit);

      res.status(200).json({
        success: true,
        data: {
          logs: pagedLogs,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 5. GET /api/v1/admin/users
   * List users with search, role filter, and banned status filter
   */
  async getUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const offset = (page - 1) * limit;

      const search = (req.query.search as string) || '';
      const role = req.query.role as string | undefined;
      const isBanned = req.query.isBanned;

      const filter: Record<string, unknown> = {};

      if (role && Object.values(UserRole).includes(role as UserRole)) {
        filter.role = role;
      }

      if (isBanned !== undefined) {
        filter.isBanned = isBanned === 'true';
      }

      if (search && search.trim().length > 0) {
        const searchRegex = new RegExp(search.trim(), 'i');
        filter.$or = [
          { email: searchRegex },
          { 'founderProfile.displayName': searchRegex },
        ];
      }

      const [total, users] = await Promise.all([
        User.countDocuments(filter),
        User.find(filter)
          .sort({ createdAt: -1 })
          .skip(offset)
          .limit(limit)
          .select('-oauthProviders')
          .lean(),
      ]);

      res.status(200).json({
        success: true,
        data: {
          users,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
          },
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 6. PATCH /api/v1/admin/users/:id
   * Update user role or ban status
   */
  async updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getParam(req.params.id);
      if (!userId || !Types.ObjectId.isValid(userId)) {
        throw new ValidationError('Valid user ID is required in URL parameter');
      }

      const user = await User.findById(userId);
      if (!user) {
        throw new NotFoundError(`User '${userId}' not found`);
      }

      const previousState = {
        role: user.role,
        isBanned: user.isBanned,
        banReason: user.banReason,
      };

      const { role, isBanned, banReason } = req.body;

      if (role !== undefined) {
        if (!Object.values(UserRole).includes(role)) {
          throw new ValidationError(`Invalid role '${role}'. Supported: ${Object.values(UserRole).join(', ')}`);
        }
        user.role = role;
      }

      if (isBanned !== undefined) {
        user.isBanned = Boolean(isBanned);
        user.banReason = isBanned ? (banReason || 'Banned by platform administrator') : undefined;

        if (isBanned) {
          // Invalidate active tokens & Redis sessions
          await VerificationToken.deleteMany({ userId: user._id });
          if (isRedisConnected()) {
            const stream = redis.scanStream({ match: `session:*:${userId}`, count: 100 });
            stream.on('data', (keys: string[]) => {
              if (keys.length > 0) redis.del(...keys).catch(() => {});
            });
          }
        }
      }

      await user.save();

      const newState = {
        role: user.role,
        isBanned: user.isBanned,
        banReason: user.banReason,
      };

      // Record governance action in ModerationAction collection
      await ModerationAction.create({
        moderatorId: new Types.ObjectId(req.user!.userId),
        targetType: 'USER',
        targetId: user._id,
        action: isBanned ? 'BAN_USER' : 'UPDATE_USER_ATTRIBUTES',
        reason: banReason || 'Admin updated user attributes',
        previousState,
        newState,
        createdAt: new Date(),
      });

      res.status(200).json({
        success: true,
        data: {
          user: {
            _id: user._id,
            email: user.email,
            role: user.role,
            isBanned: user.isBanned,
            banReason: user.banReason,
            updatedAt: user.updatedAt,
          },
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 7. GET /api/v1/admin/campaigns
   * Campaign inventory overview with slot utilization statistics
   */
  async getCampaignsOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const [activeCampaigns, reservedCampaigns, expiredCount] = await Promise.all([
        Campaign.find({ status: 'ACTIVE' })
          .populate('productId', 'name slug canonicalDomain media')
          .populate('founderId', 'email')
          .sort({ endsAt: 1 })
          .lean(),
        Campaign.find({ status: 'RESERVED' })
          .populate('productId', 'name slug')
          .lean(),
        Campaign.countDocuments({ status: 'EXPIRED' }),
      ]);

      // Calculate slot utilization
      const activeSpotlightCount = activeCampaigns.filter(
        (c) => c.tier === 'HOMEPAGE_SPOTLIGHT' || c.tier === 'LAUNCH_PARTNER'
      ).length;

      const activeBoostCount = activeCampaigns.filter(
        (c) => c.tier === 'LAUNCH_BOOST'
      ).length;

      // Group category featured by targetCategorySlug
      const categoryFeaturedMap = new Map<string, number>();
      for (const camp of activeCampaigns) {
        if (camp.tier === 'CATEGORY_FEATURED' || camp.tier === 'LAUNCH_PARTNER') {
          const cat = camp.metadata?.targetCategorySlug || 'uncategorized';
          categoryFeaturedMap.set(cat, (categoryFeaturedMap.get(cat) || 0) + 1);
        }
      }

      const categorySlotBreakdown: Array<{
        categorySlug: string;
        activeCount: number;
        maxSlots: number;
        utilizationPercent: number;
      }> = [];

      categoryFeaturedMap.forEach((count, catSlug) => {
        categorySlotBreakdown.push({
          categorySlug: catSlug,
          activeCount: count,
          maxSlots: 2,
          utilizationPercent: Math.min(100, Math.round((count / 2) * 100)),
        });
      });

      // Total revenue in cents from active and expired campaigns
      const revenueAgg = await Campaign.aggregate([
        { $match: { status: { $in: ['ACTIVE', 'EXPIRED'] } } },
        { $group: { _id: null, totalCents: { $sum: '$amountCents' } } },
      ]);
      const totalRevenueCents = revenueAgg[0]?.totalCents || 0;

      res.status(200).json({
        success: true,
        data: {
          inventory: {
            homepageSpotlight: {
              activeCount: activeSpotlightCount,
              maxSlots: 3,
              utilizationPercent: Math.min(100, Math.round((activeSpotlightCount / 3) * 100)),
            },
            launchBoost: {
              activeCount: activeBoostCount,
            },
            categoryFeatured: categorySlotBreakdown,
          },
          summary: {
            activeCount: activeCampaigns.length,
            reservedCount: reservedCampaigns.length,
            expiredCount,
            totalRevenueCents,
            totalRevenueUsd: totalRevenueCents / 100,
          },
          activeCampaigns,
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 6. GET /api/v1/admin/queues
   * Background task queues inspection and real-time job counts
   */
  async getQueues(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const queues = await getQueuesOverview();
      res.status(200).json({
        success: true,
        data: queues,
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const adminController = new AdminController();
export default adminController;
