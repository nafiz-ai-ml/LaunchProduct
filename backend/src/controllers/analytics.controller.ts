import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';
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

export class AnalyticsController {
  /**
   * 1. GET /api/v1/clicks/:productId
   * Outbound attribution click tracking & 302 redirect
   */
  async handleOutboundClick(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawParam = req.params.productId;
      const productId = getParam(rawParam);
      const isSponsored = req.query.source === 'sponsored';

      const redirectUrl = await analyticsService.recordClickAndGetRedirect(
        productId,
        isSponsored,
        req
      );

      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.redirect(302, redirectUrl);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 2. GET /api/v1/analytics/public-stats
   * Retrieve dynamic platform stats (visitors, revenue, products listed).
   */
  async getPublicStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const stats = await analyticsService.getPublicStats();
      res.status(200).json({
        success: true,
        data: stats,
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 3. POST /api/v1/analytics/track-visit
   * Atomically records a unique page visit.
   */
  async trackVisit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const clientIp = getClientIp(req);
      const userAgent = req.headers['user-agent'] as string | undefined;
      const result = await analyticsService.trackVisit(clientIp, userAgent);
      res.status(200).json({
        success: true,
        data: result,
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
export default analyticsController;
