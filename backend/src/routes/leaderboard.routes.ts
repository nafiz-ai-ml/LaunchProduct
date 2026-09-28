import { Router } from 'express';
import { leaderboardController } from '../controllers/leaderboard.controller';
import { publicRateLimit } from '../middleware/rate-limit.middleware';

const router = Router();

// Apply public sliding-window rate limiting to all public leaderboard routes (60 req/min/IP)
router.use(publicRateLimit);

/**
 * 1. GET /api/v1/leaderboards (and /today)
 * Real-time active launch-day leaderboard
 * Reads from Redis sorted set 'leaderboard:today:{date}:launch' (fast-path < 5ms).
 * Cold cache fallback computes scores dynamically and warms Redis.
 */
router.get('/', (req, res, next) => leaderboardController.getActiveLeaderboard(req, res, next));
router.get('/today', (req, res, next) => leaderboardController.getActiveLeaderboard(req, res, next));

/**
 * 2. GET /api/v1/leaderboards/all-time
 * All-time authority scores (S_alltime)
 * Cached in Redis with 1-hour TTL.
 */
router.get('/all-time', (req, res, next) => leaderboardController.getAllTimeLeaderboard(req, res, next));

/**
 * 3. GET /api/v1/leaderboards/trending
 * 7-day rolling decayed scores (S_trending)
 * Cached in Redis with 15-minute TTL.
 */
router.get('/trending', (req, res, next) => leaderboardController.getTrendingLeaderboard(req, res, next));

/**
 * 4. GET /api/v1/leaderboards/historical (query param ?date=YYYY-MM-DD)
 * Historical frozen snapshots
 */
router.get('/historical', (req, res, next) =>
  leaderboardController.getHistoricalDailyLeaderboard(req, res, next)
);

/**
 * 5. GET /api/v1/leaderboards/daily/:date
 * Historical frozen daily snapshots (enforces YYYY-MM-DD format)
 */
router.get('/daily/:date', (req, res, next) =>
  leaderboardController.getHistoricalDailyLeaderboard(req, res, next)
);

export default router;
