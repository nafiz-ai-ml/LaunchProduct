import request from 'supertest';
import { createApp } from '../server';
import {
  isBullBoardEnabled,
  constantTimeCompare,
  resetBullBoardRateLimit,
} from '../middleware/ops-auth.middleware';

describe('Operational Endpoints Security (Bull Board & Metrics)', () => {
  const originalEnv = { ...process.env };
  const VALID_USER = 'ops-operator';
  const VALID_PASSWORD = 'a_very_long_secure_password_at_least_24_chars';

  beforeEach(() => {
    jest.clearAllMocks();
    resetBullBoardRateLimit();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('isBullBoardEnabled helper', () => {
    it('returns false when variables are missing', () => {
      delete process.env.BULL_BOARD_USER;
      delete process.env.BULL_BOARD_PASSWORD;
      expect(isBullBoardEnabled()).toBe(false);
    });

    it('returns false when password is under 24 characters', () => {
      process.env.BULL_BOARD_USER = VALID_USER;
      process.env.BULL_BOARD_PASSWORD = 'short_password_1234';
      expect(isBullBoardEnabled()).toBe(false);
    });

    it('returns true when both user and password (>= 24 chars) are set', () => {
      process.env.BULL_BOARD_USER = VALID_USER;
      process.env.BULL_BOARD_PASSWORD = VALID_PASSWORD;
      expect(isBullBoardEnabled()).toBe(true);
    });
  });

  describe('constantTimeCompare', () => {
    it('returns true for matching strings regardless of length', () => {
      expect(constantTimeCompare('secretToken123', 'secretToken123')).toBe(true);
    });

    it('returns false for mismatched strings without leaking length', () => {
      expect(constantTimeCompare('secretToken123', 'secretToken124')).toBe(false);
      expect(constantTimeCompare('short', 'longerStringWithDifferentLength')).toBe(false);
    });
  });

  describe('Bull Board (/admin/queues)', () => {
    it('Board env not set -> GET /admin/queues returns 404', async () => {
      delete process.env.BULL_BOARD_USER;
      delete process.env.BULL_BOARD_PASSWORD;

      const app = createApp();
      const res = await request(app).get('/admin/queues');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('Board enabled, no credentials -> 401 with WWW-Authenticate: Basic realm="queues"', async () => {
      process.env.BULL_BOARD_USER = VALID_USER;
      process.env.BULL_BOARD_PASSWORD = VALID_PASSWORD;

      const app = createApp();
      const res = await request(app).get('/admin/queues');

      expect(res.status).toBe(401);
      expect(res.headers['www-authenticate']).toBe('Basic realm="queues"');
      expect(res.headers['cache-control']).toBe('no-store');
      expect(res.text).toBe('');
    });

    it('Wrong password -> 401 with WWW-Authenticate', async () => {
      process.env.BULL_BOARD_USER = VALID_USER;
      process.env.BULL_BOARD_PASSWORD = VALID_PASSWORD;

      const app = createApp();
      const res = await request(app)
        .get('/admin/queues')
        .auth(VALID_USER, 'invalid_incorrect_password_123');

      expect(res.status).toBe(401);
      expect(res.headers['www-authenticate']).toBe('Basic realm="queues"');
      expect(res.headers['cache-control']).toBe('no-store');
    });

    it('Wrong username -> 401 with WWW-Authenticate', async () => {
      process.env.BULL_BOARD_USER = VALID_USER;
      process.env.BULL_BOARD_PASSWORD = VALID_PASSWORD;

      const app = createApp();
      const res = await request(app)
        .get('/admin/queues')
        .auth('wrong-user', VALID_PASSWORD);

      expect(res.status).toBe(401);
      expect(res.headers['www-authenticate']).toBe('Basic realm="queues"');
    });

    it('Correct credentials -> 200 with Cache-Control: no-store', async () => {
      process.env.BULL_BOARD_USER = VALID_USER;
      process.env.BULL_BOARD_PASSWORD = VALID_PASSWORD;

      const app = createApp();
      const res = await request(app)
        .get('/admin/queues')
        .auth(VALID_USER, VALID_PASSWORD);

      expect(res.status).toBe(200);
      expect(res.headers['cache-control']).toBe('no-store');
    });

    it('11th failed attempt in one minute -> 429', async () => {
      process.env.BULL_BOARD_USER = VALID_USER;
      process.env.BULL_BOARD_PASSWORD = VALID_PASSWORD;

      const app = createApp();

      // Send 10 failed attempts
      for (let i = 0; i < 10; i++) {
        const res = await request(app)
          .get('/admin/queues')
          .auth(VALID_USER, `wrong_password_${i}`);
        expect(res.status).toBe(401);
      }

      // 11th attempt should be rate limited with 429
      const res11 = await request(app)
        .get('/admin/queues')
        .auth(VALID_USER, 'wrong_password_11');

      expect(res11.status).toBe(429);
      expect(res11.headers['retry-after']).toBeDefined();
    });
  });

  describe('Prometheus Metrics (/api/metrics)', () => {
    it('/api/metrics without METRICS_TOKEN configured -> 404', async () => {
      delete process.env.METRICS_TOKEN;

      const app = createApp();
      const res = await request(app).get('/api/metrics');

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('RESOURCE_NOT_FOUND');
    });

    it('/api/metrics with METRICS_TOKEN configured but missing Bearer token -> 401', async () => {
      process.env.METRICS_TOKEN = 'secret-test-metrics-token-12345';

      const app = createApp();
      const res = await request(app).get('/api/metrics');

      expect(res.status).toBe(401);
      expect(res.body.error).toContain('Unauthorized metrics scrape');
    });

    it('/api/metrics with invalid Bearer token -> 401', async () => {
      process.env.METRICS_TOKEN = 'secret-test-metrics-token-12345';

      const app = createApp();
      const res = await request(app)
        .get('/api/metrics')
        .set('Authorization', 'Bearer invalid-token-xyz');

      expect(res.status).toBe(401);
    });

    it('/api/metrics with correct Bearer token -> 200', async () => {
      process.env.METRICS_TOKEN = 'secret-test-metrics-token-12345';

      const app = createApp();
      const res = await request(app)
        .get('/api/metrics')
        .set('Authorization', 'Bearer secret-test-metrics-token-12345');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/text\/plain/);
    });
  });

  describe('Health Probes (/api/health)', () => {
    it('Liveness (/api/health/live) is public and does not leak environment names or versions', async () => {
      const app = createApp();
      const res = await request(app).get('/api/health/live');

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('alive');
      expect(res.body.version).toBeUndefined();
      expect(res.body.env).toBeUndefined();
      expect(res.body.environment).toBeUndefined();
      expect(res.body.mongoUri).toBeUndefined();
    });
  });
});
