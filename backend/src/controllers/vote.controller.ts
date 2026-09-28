import { Request, Response, NextFunction } from 'express';
import { votingService } from '../services/voting.service';
import { ValidationError, AuthenticationError } from '../shared/errors';
import { getClientIp } from '../middleware/rate-limit.middleware';

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

export class VoteController {
  /**
   * 1. POST /api/v1/votes
   * Cast product upvote with dynamic risk scoring
   */
  async castVote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw new AuthenticationError('Authentication required to cast upvotes', 'UNAUTHORIZED');
      }

      const productId = req.body.productId;
      if (!productId) {
        throw new ValidationError('Product ID is required', [
          { field: 'productId', code: 'REQUIRED', message: 'productId must be provided' },
        ]);
      }

      const clientIp = getClientIp(req);
      const userAgent = req.headers['user-agent'] as string | undefined;
      const clientFingerprint =
        req.body.clientFingerprint || req.body.deviceFingerprint || undefined;
      const navTelemetryToken = req.body.navTelemetryToken || undefined;

      const result = await votingService.castVote(productId, req.user.userId, {
        ip: clientIp,
        userAgent,
        deviceFingerprint: clientFingerprint,
        navTelemetryToken,
      });

      res.status(200).json({
        success: true,
        data: {
          voteId: result.voteId,
          status: result.status,
          newLiveVoteCount: result.newLiveVoteCount,
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 2. DELETE /api/v1/votes/:productId
   * Retract a previously cast upvote (within 15-minute window)
   */
  async retractVote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw new AuthenticationError('Authentication required to retract upvotes', 'UNAUTHORIZED');
      }

      const productId = getParam(req.params.productId);
      if (!productId) {
        throw new ValidationError('Product ID parameter is required', [
          { field: 'productId', code: 'REQUIRED', message: 'Product ID parameter is required' },
        ]);
      }

      const result = await votingService.retractVote(productId, req.user.userId);

      res.status(200).json({
        success: true,
        data: {
          productId: result.productId,
          status: result.status,
          newLiveVoteCount: result.newLiveVoteCount,
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 3. GET /api/v1/votes/user
   * Fetch all product IDs upvoted by the requesting user
   */
  async getUserVotes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw new AuthenticationError('Authentication required to fetch user upvotes', 'UNAUTHORIZED');
      }

      const upvotedProductIds = await votingService.getUserUpvotedProductIds(req.user.userId);

      res.status(200).json({
        success: true,
        data: {
          upvotedProductIds,
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 4. GET /api/v1/votes/status
   * Batch check user vote status across product IDs
   */
  async getVoteStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw new AuthenticationError('Authentication required to check vote status', 'UNAUTHORIZED');
      }

      const productIdsParam = (req.query.productIds as string) || '';
      const productIds = productIdsParam
        .split(',')
        .map((id) => id.trim())
        .filter((id) => id.length > 0);

      const statusMap = await votingService.getUserVoteStatus(req.user.userId, productIds);
      const statuses: Record<string, string | null> = {};
      statusMap.forEach((status, pid) => {
        statuses[pid] = status;
      });

      res.status(200).json({
        success: true,
        data: statuses,
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const voteController = new VoteController();
