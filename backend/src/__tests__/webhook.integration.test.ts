import request from 'supertest';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { createApp } from '../server';
import { paymentService } from '../services/payment.service';
import { config } from '../shared/config';

// Mock dependencies
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

describe('MoR Webhook Integration Tests (Paddle Provider)', () => {
  const app = createApp();
  const testSecret = config.PADDLE_WEBHOOK_SECRET || 'test-paddle-webhook-key-32-chars-long-valid';

  function createPaddleSignature(bodyStr: string, tsSec: number, secret: string = testSecret): string {
    const hash = crypto
      .createHmac('sha256', secret)
      .update(`${tsSec}:${bodyStr}`)
      .digest('hex');
    return `ts=${tsSec};h1=${hash}`;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // 1. POST with invalid signature → 400 WEBHOOK_SIGNATURE_INVALID
  test('1. POST with invalid signature → 400 WEBHOOK_SIGNATURE_INVALID', async () => {
    const payload = {
      event_id: 'evt_invalid_sig_123',
      event_type: 'transaction.completed',
      data: { id: 'txn_123' },
    };

    const res = await request(app)
      .post('/api/v1/webhooks/payment/paddle')
      .set('paddle-signature', 'ts=1234567890;h1=invalid_hmac_hash_00000000000000000000000000000000')
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('WEBHOOK_SIGNATURE_INVALID');
  });

  // 2. POST with valid signature + idempotent duplicate event → 200 + skipped
  test('2. POST with valid signature + idempotent duplicate event → 200 + skipped', async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const mockProductId = new Types.ObjectId().toHexString();
    const payload = {
      event_id: 'evt_duplicate_123',
      event_type: 'transaction.completed',
      data: {
        id: 'txn_duplicate_123',
        custom_data: { productId: mockProductId },
      },
    };
    const bodyStr = JSON.stringify(payload);
    const validSignature = createPaddleSignature(bodyStr, nowSec);

    jest.spyOn(paymentService, 'handlePaymentWebhook').mockResolvedValue({
      success: true,
      message: 'Webhook event already processed (idempotent duplicate).',
      productId: mockProductId,
    });

    const res = await request(app)
      .post('/api/v1/webhooks/payment/paddle')
      .set('paddle-signature', validSignature)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toMatch(/idempotent duplicate/i);
    expect(res.body.data.productId).toBe(mockProductId);
  });

  // 3. POST with valid signature + new payment event → 200 + product updated
  test('3. POST with valid signature + new event → 200 + product live', async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const mockProductId = new Types.ObjectId().toHexString();
    const payload = {
      event_id: 'evt_new_order_456',
      event_type: 'transaction.completed',
      data: {
        id: 'txn_new_order_456',
        custom_data: { productId: mockProductId },
      },
    };
    const bodyStr = JSON.stringify(payload);
    const validSignature = createPaddleSignature(bodyStr, nowSec);

    jest.spyOn(paymentService, 'handlePaymentWebhook').mockResolvedValue({
      success: true,
      message: 'Ranking payment successfully recorded and product activated.',
      productId: mockProductId,
    });

    const res = await request(app)
      .post('/api/v1/webhooks/payment/paddle')
      .set('paddle-signature', validSignature)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.productId).toBe(mockProductId);
  });

  // 4. POST with valid signature + old timestamp (>300s) → 400 WEBHOOK_TIMESTAMP_EXPIRED
  test('4. POST with valid signature + old timestamp (>300s) → 400 WEBHOOK_TIMESTAMP_EXPIRED', async () => {
    const expiredTimestampSec = Math.floor(Date.now() / 1000) - 400; // 400s ago (> 300s)
    const payload = {
      event_id: 'evt_old_timestamp_789',
      event_type: 'transaction.completed',
      data: { id: 'txn_old_789' },
    };
    const bodyStr = JSON.stringify(payload);
    const validSigOldTimestamp = createPaddleSignature(bodyStr, expiredTimestampSec);

    const res = await request(app)
      .post('/api/v1/webhooks/payment/paddle')
      .set('paddle-signature', validSigOldTimestamp)
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('WEBHOOK_TIMESTAMP_EXPIRED');
  });
});
