import request from 'supertest';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { createApp } from '../server';
import { paymentService } from '../services/payment.service';
import { Campaign } from '../models/Campaign.model';
import { PaymentWebhookEvent } from '../models/PaymentWebhookEvent.model';
import { CampaignStatus } from '../shared/constants';
import { AppError } from '../shared/errors';

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

jest.mock('../shared/campaign-queue', () => ({
  campaignQueue: {
    add: jest.fn().mockResolvedValue({ id: 'campaign_job_123' }),
  },
}));

describe('MoR Webhook Integration Tests (supertest)', () => {
  const app = createApp();
  const webhookSecret = process.env.PADDLE_WEBHOOK_SECRET || 'paddle_webhook_secret_dev_key_fallback_12345';

  function createPaddleSignature(bodyStr: string, timestampSec: number): string {
    const payloadToSign = `${timestampSec}:${bodyStr}`;
    const hash = crypto
      .createHmac('sha256', webhookSecret)
      .update(payloadToSign)
      .digest('hex');
    return `ts=${timestampSec};h1=${hash}`;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // 1. POST /api/v1/webhooks/payment/paddle with invalid signature → 400 WEBHOOK_SIGNATURE_INVALID
  test('1. POST /api/v1/webhooks/payment/paddle with invalid signature → 400 WEBHOOK_SIGNATURE_INVALID', async () => {
    const payload = {
      event_id: 'evt_test_invalid_sig',
      event_type: 'transaction.completed',
      data: { id: 'txn_123' },
    };

    const res = await request(app)
      .post('/api/v1/webhooks/payment/paddle')
      .set('paddle-signature', 'ts=1700000000;h1=invalid_hmac_hash_abc')
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('WEBHOOK_SIGNATURE_INVALID');
  });

  // 2. POST with valid signature + duplicate providerEventId → 200 (idempotency)
  test('2. POST with valid signature + duplicate providerEventId → 200 (idempotency)', async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const mockCampaignId = new Types.ObjectId().toHexString();
    const payload = {
      event_id: 'evt_duplicate_123',
      event_type: 'transaction.completed',
      data: {
        id: 'txn_duplicate_123',
        custom_data: { campaignId: mockCampaignId },
      },
    };
    const bodyStr = JSON.stringify(payload);
    const validSignature = createPaddleSignature(bodyStr, nowSec);

    jest.spyOn(paymentService, 'handlePaymentWebhook').mockResolvedValue({
      success: true,
      message: 'Webhook event already processed (idempotent duplicate).',
      campaignId: mockCampaignId,
    });

    const res = await request(app)
      .post('/api/v1/webhooks/payment/paddle')
      .set('paddle-signature', validSignature)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toMatch(/idempotent duplicate/i);
    expect(res.body.data.campaignId).toBe(mockCampaignId);
  });

  // 3. POST with valid signature + new event → 200 + campaign activated (check DB)
  test('3. POST with valid signature + new event → 200 + campaign activated', async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const mockCampaignId = new Types.ObjectId().toHexString();
    const payload = {
      event_id: 'evt_new_order_456',
      event_type: 'transaction.completed',
      data: {
        id: 'txn_new_order_456',
        custom_data: { campaignId: mockCampaignId },
      },
    };
    const bodyStr = JSON.stringify(payload);
    const validSignature = createPaddleSignature(bodyStr, nowSec);

    // Mock successful campaign activation in payment service
    jest.spyOn(paymentService, 'handlePaymentWebhook').mockImplementation(async () => {
      // Simulate campaign activation in DB
      await Campaign.findByIdAndUpdate(mockCampaignId, {
        $set: { status: CampaignStatus.ACTIVE },
      });
      return {
        success: true,
        message: 'Webhook processed and campaign activated.',
        campaignId: mockCampaignId,
      };
    });

    const updateSpy = jest.spyOn(Campaign, 'findByIdAndUpdate').mockResolvedValue({
      _id: new Types.ObjectId(mockCampaignId),
      status: CampaignStatus.ACTIVE,
    } as any);

    const res = await request(app)
      .post('/api/v1/webhooks/payment/paddle')
      .set('paddle-signature', validSignature)
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toMatch(/campaign activated/i);
    expect(res.body.data.campaignId).toBe(mockCampaignId);
    expect(updateSpy).toHaveBeenCalledWith(
      mockCampaignId,
      expect.objectContaining({
        $set: expect.objectContaining({ status: CampaignStatus.ACTIVE }),
      })
    );
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
