import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../services/analytics.service';
import { getClientIp } from '../middleware/rate-limit.middleware';
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

export class AnalyticsController {
  /**
   * 1. GET /api/v1/clicks/:productId?source=organic|sponsored
   * Fast-path outbound redirect with sub-25ms p95 latency.
   * Immediately issues HTTP 302 redirect with rel="noopener noreferrer"
   * while logging and BullMQ dispatching happen asynchronously.
   */
  async handleOutboundClick(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = getParam(req.params.productId || req.params.id);
      if (!productId) {
        throw new ValidationError('Product ID is required in URL parameter', [
          { field: 'productId', code: 'REQUIRED', message: 'productId must be provided' },
        ]);
      }

      const rawSource = (req.query.source as string) || 'organic';
      const utmSource = (req.query.utm_source as string) || (req.query.ref as string) || undefined;
      const referrer = (req.get('referrer') || req.headers.referer || undefined) as string | undefined;
      const userAgent = req.headers['user-agent'] as string | undefined;
      const clientIp = getClientIp(req);

      const result = await analyticsService.processOutboundClick(productId, rawSource, {
        ip: clientIp,
        userAgent,
        referrer,
        utmSource,
      });

      // Strict redirect headers (SLA: <= 25ms p95 delivery)
      res.setHeader('Location', result.destinationUrl);
      res.setHeader('rel', 'noopener noreferrer');
      res.setHeader('Referrer-Policy', 'no-referrer-when-downgrade');
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

      res.redirect(302, result.destinationUrl);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 2. GET /api/v1/analytics/products/:id?days=30
   * Retrieve aggregated founder performance analytics, CTR, and referrer breakdown.
   */
  async getFounderAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw new AuthenticationError('Authentication required to view product analytics', 'UNAUTHORIZED');
      }

      const productId = getParam(req.params.id || req.params.productId);
      if (!productId) {
        throw new ValidationError('Product ID is required in URL parameter', [
          { field: 'id', code: 'REQUIRED', message: 'Product ID must be provided' },
        ]);
      }

      const daysParam = req.query.days ? parseInt(req.query.days as string, 10) : 30;
      const days = isNaN(daysParam) ? 30 : daysParam;

      const data = await analyticsService.getFounderAnalytics(productId, req.user.userId, days);

      res.status(200).json({
        success: true,
        data,
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const analyticsController = new AnalyticsController();
