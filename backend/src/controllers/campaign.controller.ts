import { Request, Response, NextFunction } from 'express';
import { campaignService } from '../services/campaign.service';
import { CampaignTier } from '../models/Campaign.model';
import { AuthenticationError, ValidationError } from '../shared/errors';

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

export class CampaignController {
  /**
   * 1. GET /api/v1/campaigns/inventory
   * Check slot availability and pricing for a prospective sponsorship
   */
  async checkSlotInventory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tier = (req.query.tier as string)?.toUpperCase() as CampaignTier;
      if (!tier) {
        throw new ValidationError('Sponsorship tier query parameter is required', [
          { field: 'tier', code: 'REQUIRED', message: 'tier must be provided' },
        ]);
      }

      const startDate = (req.query.startDate as string) || (req.query.startsAt as string);
      const targetCategorySlug = (req.query.targetCategorySlug as string) || (req.query.category as string);
      const durationDays = req.query.durationDays ? parseInt(req.query.durationDays as string, 10) : undefined;

      let endDate: Date | undefined = undefined;
      if (startDate && durationDays && !isNaN(durationDays)) {
        const start = new Date(startDate);
        endDate = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);
      }

      const availability = await campaignService.checkSlotAvailability(
        tier,
        targetCategorySlug,
        startDate,
        endDate
      );

      res.status(200).json({
        success: true,
        data: availability,
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 2. POST /api/v1/campaigns/checkout
   * Reserve inventory slot for 15 minutes and create MoR hosted checkout session
   */
  async createCheckout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw new AuthenticationError('Authentication required to create campaign checkout', 'UNAUTHORIZED');
      }

      const { productId, tier, startsAt, startDate, targetCategorySlug, provider } = req.body;

      if (!productId) {
        throw new ValidationError('productId is required in request body', [
          { field: 'productId', code: 'REQUIRED', message: 'productId must be provided' },
        ]);
      }

      if (!tier) {
        throw new ValidationError('tier is required in request body', [
          { field: 'tier', code: 'REQUIRED', message: 'tier must be provided' },
        ]);
      }

      const chosenStartDate = startsAt || startDate || new Date().toISOString();

      const result = await campaignService.createCampaignCheckout(
        tier as CampaignTier,
        productId,
        req.user.userId,
        chosenStartDate,
        targetCategorySlug,
        provider || 'paddle'
      );

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
   * 3. GET /api/v1/campaigns/my-campaigns
   * List all campaigns owned by the authenticated founder
   */
  async getMyCampaigns(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw new AuthenticationError('Authentication required to view founder campaigns', 'UNAUTHORIZED');
      }

      const campaigns = await campaignService.getFounderCampaigns(req.user.userId);

      res.status(200).json({
        success: true,
        data: {
          campaigns,
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 4. GET /api/v1/campaigns/:id
   * Fetch campaign delivery performance metrics
   */
  async getCampaignDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw new AuthenticationError('Authentication required to view campaign analytics', 'UNAUTHORIZED');
      }

      const campaignId = getParam(req.params.id);
      if (!campaignId) {
        throw new ValidationError('Campaign ID is required in URL parameter', [
          { field: 'id', code: 'REQUIRED', message: 'Campaign ID must be provided' },
        ]);
      }

      const analytics = await campaignService.getCampaignAnalytics(campaignId, req.user.userId);

      res.status(200).json({
        success: true,
        data: analytics,
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const campaignController = new CampaignController();
export default campaignController;
