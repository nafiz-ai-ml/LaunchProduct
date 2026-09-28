import { Request, Response, NextFunction } from 'express';
import { moderationService } from '../services/moderation.service';
import { ValidationError } from '../shared/errors';

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

export class ModerationController {
  /**
   * 1. GET /api/v1/moderation/queue/products
   * Retrieve product triage queue (status: PENDING_REVIEW)
   */
  async getPendingProductsQueue(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const offset = Math.max(0, parseInt(req.query.offset as string, 10) || 0);

      const products = await moderationService.getPendingProducts(limit, offset);

      const queue = products.map((p) => ({
        productId: p._id.toString(),
        name: p.name,
        slug: p.slug,
        canonicalDomain: p.canonicalDomain,
        tagline: p.tagline,
        description: p.description,
        websiteUrl: p.websiteUrl,
        submittedById: p.submittedById,
        status: p.status,
        submittedAt: p.createdAt,
        media: p.media,
      }));

      res.status(200).json({
        success: true,
        data: {
          queue,
        },
        meta: getMetadata(req, { count: queue.length }),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 2. GET /api/v1/moderation/queue/votes
   * Retrieve flagged anti-fraud votes queue
   */
  async getQuarantinedVotesQueue(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const offset = Math.max(0, parseInt(req.query.offset as string, 10) || 0);

      const votes = await moderationService.getQuarantinedVotes(limit, offset);

      const flaggedVotes = votes.map((v) => ({
        voteId: v._id.toString(),
        productId: v.productId,
        voterUserId: v.userId,
        status: v.status,
        riskAssessment: {
          riskScore: v.riskScore,
          riskSignals: v.riskAssessment?.triggeredSignals || [],
          asnNumber: v.riskAssessment?.asnNumber,
          notes: v.riskAssessment?.notes,
        },
        createdAt: v.createdAt,
      }));

      res.status(200).json({
        success: true,
        data: {
          flaggedVotes,
        },
        meta: getMetadata(req, { count: flaggedVotes.length }),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 3. GET /api/v1/moderation/queue/claims
   * Retrieve disputed ownership claims queue
   */
  async getDisputedClaimsQueue(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
      const offset = Math.max(0, parseInt(req.query.offset as string, 10) || 0);

      const claims = await moderationService.getDisputedClaims(limit, offset);

      const disputedClaims = claims.map((c) => ({
        claimId: c._id.toString(),
        productId: c.productId,
        claimantUserId: c.userId,
        method: c.method,
        status: c.status,
        expiresAt: c.expiresAt,
        createdAt: c.createdAt,
      }));

      res.status(200).json({
        success: true,
        data: {
          disputedClaims,
        },
        meta: getMetadata(req, { count: disputedClaims.length }),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 4. POST /api/v1/moderation/action
   * Unified moderation decision endpoint per API Spec Section 14.4
   */
  async submitUnifiedModerationAction(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const moderatorId = req.user!.userId;
      const { targetEntity, targetEntityId, actionType, reason, meta } = req.body;

      if (!targetEntityId) {
        throw new ValidationError('targetEntityId is required');
      }
      if (!actionType) {
        throw new ValidationError('actionType is required');
      }

      const noteReason = reason || meta?.note || 'Executed via moderation action';

      switch (actionType) {
        case 'APPROVE_PRODUCT':
          await moderationService.approveProduct(targetEntityId, moderatorId);
          break;

        case 'REJECT_PRODUCT':
          await moderationService.rejectProduct(targetEntityId, moderatorId, noteReason);
          break;

        case 'OVERTURN_VOTE':
          await moderationService.approveVote(targetEntityId, moderatorId);
          break;

        case 'REJECT_VOTE':
          await moderationService.rejectVote(targetEntityId, moderatorId, noteReason);
          break;

        case 'RESOLVE_CLAIM':
          const decision = meta?.decision === 'REJECT' ? 'REJECT' : 'APPROVE';
          await moderationService.resolveClaimDispute(
            targetEntityId,
            moderatorId,
            decision,
            noteReason
          );
          break;

        case 'BAN_USER':
          await moderationService.banUser(targetEntityId, moderatorId, noteReason);
          break;

        default:
          throw new ValidationError(`Unsupported actionType '${actionType}'`);
      }

      res.status(200).json({
        success: true,
        data: {
          actionType,
          targetEntityId,
          executedAt: new Date().toISOString(),
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 5. POST /api/v1/moderation/products/:id/approve
   */
  async approveProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = getParam(req.params.id);
      const moderatorId = req.user!.userId;

      await moderationService.approveProduct(productId, moderatorId);

      res.status(200).json({
        success: true,
        data: {
          productId,
          status: 'APPROVED',
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 6. POST /api/v1/moderation/products/:id/reject
   */
  async rejectProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = getParam(req.params.id);
      const moderatorId = req.user!.userId;
      const reason = req.body.reason || 'Submission does not meet quality guidelines';

      await moderationService.rejectProduct(productId, moderatorId, reason);

      res.status(200).json({
        success: true,
        data: {
          productId,
          status: 'REJECTED',
          reason,
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 7. POST /api/v1/moderation/votes/:id/approve
   */
  async approveVote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const voteId = getParam(req.params.id);
      const moderatorId = req.user!.userId;

      await moderationService.approveVote(voteId, moderatorId);

      res.status(200).json({
        success: true,
        data: {
          voteId,
          status: 'VALID',
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 8. POST /api/v1/moderation/votes/:id/reject
   */
  async rejectVote(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const voteId = getParam(req.params.id);
      const moderatorId = req.user!.userId;
      const reason = req.body.reason || 'Confirmed fraudulent voting activity';

      await moderationService.rejectVote(voteId, moderatorId, reason);

      res.status(200).json({
        success: true,
        data: {
          voteId,
          status: 'REJECTED_BOT',
          reason,
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 9. POST /api/v1/moderation/claims/:id/resolve
   */
  async resolveClaim(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const claimId = getParam(req.params.id);
      const moderatorId = req.user!.userId;
      const decision = req.body.decision === 'REJECT' ? 'REJECT' : 'APPROVE';
      const note = req.body.note || req.body.reason || 'Resolved by moderator';

      await moderationService.resolveClaimDispute(claimId, moderatorId, decision, note);

      res.status(200).json({
        success: true,
        data: {
          claimId,
          decision,
          status: decision === 'APPROVE' ? 'VERIFIED' : 'REVOKED',
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 10. POST /api/v1/moderation/users/:id/ban
   */
  async banUser(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = getParam(req.params.id);
      const moderatorId = req.user!.userId;
      const reason = req.body.reason || 'Violation of platform policies';

      await moderationService.banUser(userId, moderatorId, reason);

      res.status(200).json({
        success: true,
        data: {
          userId,
          isBanned: true,
          reason,
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const moderationController = new ModerationController();
export default moderationController;
