import { Request, Response, NextFunction } from 'express';
import { httpRequestsTotal, deprecatedEndpointHitsTotal } from '../shared/metrics';

/**
 * Express middleware that tracks incoming HTTP requests and latency for Prometheus.
 * Also monitors RFC 8594 Sunset headers for deprecation tracking.
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Exclude Prometheus scrape endpoint itself from self-counting
  if (req.path === '/api/metrics' || req.path === '/api/health/live') {
    return next();
  }

  res.on('finish', () => {
    // 1. Resolve normalized route pattern or path
    const route = req.route ? req.route.path : req.baseUrl ? `${req.baseUrl}${req.path}` : req.path;
    const status = res.statusCode ? res.statusCode.toString() : '500';

    try {
      httpRequestsTotal.inc({
        method: req.method,
        route,
        status,
      });
    } catch {
      // Ignore metric collection error
    }

    // 2. Check for RFC 8594 Sunset header on response
    const sunsetHeader = res.getHeader('Sunset');
    if (sunsetHeader) {
      try {
        deprecatedEndpointHitsTotal.inc({
          endpoint: route,
          sunset_date: String(sunsetHeader),
        });
      } catch {
        // Ignore
      }
    }
  });

  next();
}

export default metricsMiddleware;
