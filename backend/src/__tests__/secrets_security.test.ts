import request from 'supertest';
import { loadConfig, config } from '../shared/config';
import { PaddleProvider } from '../services/payment.service';
import { createApp } from '../server';
import { AppError } from '../shared/errors';

// Mock DB, Redis, and queues
jest.mock('../shared/db', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
  isDBConnected: jest.fn().mockReturnValue(true),
}));

jest.mock('../shared/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  },
  isRedisConnected: jest.fn().mockReturnValue(false),
}));

jest.mock('../shared/email-queue', () => ({
  emailQueue: {
    add: jest.fn().mockResolvedValue({ id: 'job_123' }),
  },
}));

// Mock bullmq Queue and Worker
jest.mock('../shared/email-queue', () => ({
  emailQueue: {
    add: jest.fn().mockResolvedValue({ id: 'job_123' }),
  },
}));

describe('Secrets Security & Production Hardening Tests', () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  describe('1. Production/Staging Config Validation', () => {
    it('throws at startup when NODE_ENV=production and secrets are missing', () => {
      const mockEnv: NodeJS.ProcessEnv = {
        NODE_ENV: 'production',
        PORT: '4000',
        MONGODB_URI: 'mongodb://localhost:27017/prod',
        REDIS_URL: 'redis://localhost:6379',
      };

      expect(() => loadConfig(mockEnv)).toThrow(
        /Required production\/staging secrets missing or under 32 characters/
      );

      try {
        loadConfig(mockEnv);
      } catch (err: any) {
        // Must clearly list missing variable names
        expect(err.message).toContain('PADDLE_WEBHOOK_SECRET');
      }
    });

    it('throws at startup when NODE_ENV=staging and secrets are missing', () => {
      const mockEnv: NodeJS.ProcessEnv = {
        NODE_ENV: 'staging',
        PORT: '4000',
        MONGODB_URI: 'mongodb://localhost:27017/staging',
        REDIS_URL: 'redis://localhost:6379',
      };

      expect(() => loadConfig(mockEnv)).toThrow(
        /Required production\/staging secrets missing or under 32 characters/
      );
    });

    it('throws when secrets are shorter than 32 characters in production', () => {
      const mockEnv: NodeJS.ProcessEnv = {
        NODE_ENV: 'production',
        PORT: '4000',
        MONGODB_URI: 'mongodb://localhost:27017/prod',
        REDIS_URL: 'redis://localhost:6379',
        PADDLE_WEBHOOK_SECRET: 'short_key',
      };

      expect(() => loadConfig(mockEnv)).toThrow(
        /Required production\/staging secrets missing or under 32 characters/
      );
    });

    it('succeeds in production when all secrets are at least 32 characters', () => {
      const mockEnv: NodeJS.ProcessEnv = {
        NODE_ENV: 'production',
        PORT: '4000',
        MONGODB_URI: 'mongodb://localhost:27017/prod',
        REDIS_URL: 'redis://localhost:6379',
        PADDLE_WEBHOOK_SECRET: 'prod_paddle_secret_valid_min_32_characters_ok',
      };

      const parsed = loadConfig(mockEnv);
      expect(parsed.PADDLE_WEBHOOK_SECRET).toBe(mockEnv.PADDLE_WEBHOOK_SECRET);
    });

    it('allows development mode without fallback default secrets in config schema', () => {
      const mockEnv: NodeJS.ProcessEnv = {
        NODE_ENV: 'development',
        PORT: '4000',
        MONGODB_URI: 'mongodb://localhost:27017/dev',
      };

      const parsed = loadConfig(mockEnv);
      expect(parsed.NODE_ENV).toBe('development');
      expect(parsed.PADDLE_WEBHOOK_SECRET).toBeUndefined();
    });
  });

  describe('2. PaddleProvider Webhook Secret Behavior', () => {
    it('returns false from verifyWebhookSignature when webhook secret is empty', () => {
      const provider = new PaddleProvider('');

      expect(provider.hasWebhookSecret()).toBe(false);

      const result = provider.verifyWebhookSignature('{}', 'ts=12345;h1=fake_signature');
      expect(result).toBe(false);
    });

    it('returns 503 and never 200 from webhook endpoint when webhook secret is missing', async () => {
      // Temporarily clear config webhook secret
      const originalSecret = config.PADDLE_WEBHOOK_SECRET;
      (config as any).PADDLE_WEBHOOK_SECRET = '';

      try {
        const app = createApp();

        const response = await request(app)
          .post('/api/v1/webhooks/payment/paddle')
          .set('Content-Type', 'application/json')
          .set('paddle-signature', 'ts=1234567890;h1=abcdef1234567890')
          .send({
            event_id: 'evt_test_unconfigured_001',
            event_type: 'transaction.completed',
            data: { id: 'txn_001' },
          });

        expect(response.status).toBe(503);
        expect(response.status).not.toBe(200);
        expect(response.body.success).toBe(false);
        expect(response.body.error.code).toBe('WEBHOOK_SECRET_NOT_CONFIGURED');
      } finally {
        (config as any).PADDLE_WEBHOOK_SECRET = originalSecret;
      }
    });

    it('throws 503 AppError when handlePaymentWebhook is called without configured secret', async () => {
      const { paymentService } = await import('../services/payment.service');
      const originalSecret = config.PADDLE_WEBHOOK_SECRET;
      (config as any).PADDLE_WEBHOOK_SECRET = '';

      try {
        await expect(
          paymentService.handlePaymentWebhook('paddle', Buffer.from('{}'), 'signature')
        ).rejects.toThrow(AppError);

        try {
          await paymentService.handlePaymentWebhook('paddle', Buffer.from('{}'), 'signature');
        } catch (err: any) {
          expect(err.statusCode).toBe(503);
        }
      } finally {
        (config as any).PADDLE_WEBHOOK_SECRET = originalSecret;
      }
    });
  });
});
