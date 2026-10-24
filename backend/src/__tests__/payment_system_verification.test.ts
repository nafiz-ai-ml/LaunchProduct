import crypto from 'crypto';
import mongoose, { Types } from 'mongoose';
import { paymentService } from '../services/payment.service';
import { Product } from '../models/Product.model';
import { Payment } from '../models/Payment.model';
import { RankingLedger } from '../models/RankingLedger.model';
import { PaymentWebhookEvent } from '../models/PaymentWebhookEvent.model';
import { ProductStatus, PaymentStatus } from '../shared/constants';
import { AppError, ValidationError } from '../shared/errors';
import { config } from '../shared/config';

jest.mock('../models/Product.model');
jest.mock('../models/Payment.model');
jest.mock('../models/RankingLedger.model');
jest.mock('../models/PaymentWebhookEvent.model');
jest.mock('../models/ActivityEvent.model');
jest.mock('../models/SystemSettings.model', () => ({
  SystemSettings: {
    findOne: jest.fn().mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        rankingRules: {
          minInitialPaymentCents: 599,
          minIncrementCents: 100,
          enableAccountlessRanking: true,
        },
      }),
    }),
  },
}));
jest.mock('../shared/redis', () => ({
  redis: {
    keys: jest.fn().mockResolvedValue(['leaderboard:cache:today']),
    del: jest.fn().mockResolvedValue(1),
  },
  isRedisConnected: jest.fn().mockReturnValue(true),
}));

// Mock mongoose transactions
jest.spyOn(mongoose, 'startSession').mockImplementation(async () => {
  return {
    startTransaction: jest.fn(),
    commitTransaction: jest.fn().mockResolvedValue(undefined),
    abortTransaction: jest.fn().mockResolvedValue(undefined),
    endSession: jest.fn().mockResolvedValue(undefined),
  } as any;
});

describe('Payment System & Pay-to-Rank End-to-End Verification Tests', () => {
  const webhookSecret = config.PADDLE_WEBHOOK_SECRET || process.env.PADDLE_WEBHOOK_SECRET || '';

  function generatePaddleSignature(bodyStr: string, timestampSec: number): string {
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

  describe('1. Pay-to-Rank Checkout Session Creation', () => {
    test('enforces $5.99 (599 cents) minimum initial payment for unranked products', async () => {
      const mockProductId = new Types.ObjectId().toHexString();

      // Mock Product.findById
      (Product.findById as jest.Mock).mockResolvedValue({
        _id: mockProductId,
        name: 'Test Platform',
        paidRankingAmountCents: 0,
      });

      // Amount below $5.99 (e.g. $4.00 / 400 cents) should be rejected
      await expect(
        paymentService.createRankingCheckout({
          productId: mockProductId,
          amountCents: 400,
          contributionType: 'INITIAL_ENTRY',
          successUrl: 'http://localhost:3000/success',
          cancelUrl: 'http://localhost:3000/cancel',
        })
      ).rejects.toThrow(ValidationError);
    });

    test('successfully generates Paddle checkout session for qualifying initial entry ($5.99)', async () => {
      const mockProductId = new Types.ObjectId().toHexString();

      (Product.findById as jest.Mock).mockResolvedValue({
        _id: mockProductId,
        name: 'Test Platform',
        paidRankingAmountCents: 0,
      });

      const session = await paymentService.createRankingCheckout({
        productId: mockProductId,
        amountCents: 599,
        contributionType: 'INITIAL_ENTRY',
        payerEmail: 'founder@example.com',
        successUrl: 'http://localhost:3000/success',
        cancelUrl: 'http://localhost:3000/cancel',
        provider: 'paddle',
      });

      expect(session.checkoutUrl).toBeDefined();
      expect(session.checkoutUrl).toContain('paddle.com/checkout');
      expect(session.checkoutUrl).toMatch(/Test(\+|%20)Platform/);
      expect(session.sessionId).toContain(`txn_paddle_rank_${mockProductId}`);
    });
  });

  describe('2. Merchant of Record Webhook Signature Verification', () => {
    test('rejects tampered or forged webhook payloads with 400 WEBHOOK_SIGNATURE_INVALID', async () => {
      const nowSec = Math.floor(Date.now() / 1000);
      const rawBody = JSON.stringify({ event_type: 'transaction.completed', data: {} });
      const invalidSignature = `ts=${nowSec};h1=fake_forged_hash_12345`;

      await expect(
        paymentService.handlePaymentWebhook('paddle', rawBody, invalidSignature)
      ).rejects.toThrow('Invalid webhook HMAC signature');
    });

    test('rejects expired webhook signatures (> 300s timestamp drift)', async () => {
      const expiredTsSec = Math.floor(Date.now() / 1000) - 400; // 400 seconds ago
      const rawBody = JSON.stringify({ event_type: 'transaction.completed', data: {} });
      const signature = generatePaddleSignature(rawBody, expiredTsSec);

      await expect(
        paymentService.handlePaymentWebhook('paddle', rawBody, signature)
      ).rejects.toThrow('Webhook event timestamp is too old');
    });
  });

  describe('3. Webhook Payment Application & Ranking Accounting Invariants', () => {
    test('confirms initial entry payment: marks product LIVE, establishes All-Time and Today amounts, creates immutable ledger', async () => {
      const mockProductId = new Types.ObjectId();
      const mockProduct = {
        _id: mockProductId,
        name: 'VectorPulse Cloud',
        status: ProductStatus.DRAFT,
        paidRankingAmountCents: 0,
        todayPaidAmountCents: 0,
        todayPaidDate: null,
        save: jest.fn().mockResolvedValue(true),
      };

      (Product.findById as jest.Mock).mockResolvedValue(mockProduct);
      (Product.findByIdAndUpdate as jest.Mock).mockResolvedValue(mockProduct);
      (PaymentWebhookEvent.findOne as jest.Mock).mockResolvedValue(null);
      (PaymentWebhookEvent.create as jest.Mock).mockResolvedValue({ _id: new Types.ObjectId() });
      (PaymentWebhookEvent.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      const mockPaymentDoc = { _id: new Types.ObjectId() };
      (Payment.create as jest.Mock).mockResolvedValue([mockPaymentDoc]);
      (RankingLedger.create as jest.Mock).mockResolvedValue([{}]);

      const nowSec = Math.floor(Date.now() / 1000);
      const webhookPayload = {
        event_id: 'evt_paddle_initial_001',
        event_type: 'transaction.completed',
        data: {
          id: 'txn_001',
          status: 'completed',
          custom_data: {
            productId: mockProductId.toString(),
            contributionType: 'INITIAL_ENTRY',
            productName: 'VectorPulse Cloud',
          },
          details: {
            totals: {
              total: '5.99', // $5.99 in major units = 599 cents
              currency_code: 'USD',
            },
          },
        },
      };

      const rawBody = JSON.stringify(webhookPayload);
      const signature = generatePaddleSignature(rawBody, nowSec);

      const result = await paymentService.handlePaymentWebhook('paddle', rawBody, signature);

      expect(result.success).toBe(true);
      expect(result.productId).toBe(mockProductId.toString());

      // 1. Verify Payment was created with correct contributionType and amount
      expect(Payment.create).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            productId: mockProductId,
            contributionType: 'INITIAL_ENTRY',
            amountCents: 599,
            appliedToRanking: true,
            status: PaymentStatus.SUCCEEDED,
          }),
        ]),
        expect.anything()
      );

      // 2. Verify RankingLedger was created with exact accounting deltas
      expect(RankingLedger.create).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            productId: mockProductId,
            contributionType: 'INITIAL_ENTRY',
            amountCents: 599,
            previousAllTimeCents: 0,
            newAllTimeCents: 599,
            previousTodayCents: 0,
            newTodayCents: 599,
            status: 'APPLIED',
          }),
        ]),
        expect.anything()
      );

      // 3. Verify Product was transitioned to LIVE status
      expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
        mockProductId,
        expect.objectContaining({
          $set: expect.objectContaining({
            status: ProductStatus.LIVE,
            paidRankingAmountCents: 599,
            todayPaidAmountCents: 599,
          }),
        }),
        expect.anything()
      );
    });

    test('daily repeat submission does NOT inflate All-Time ranking: only updates Today ranking', async () => {
      const mockProductId = new Types.ObjectId();
      const existingProduct = {
        _id: mockProductId,
        name: 'VectorPulse Cloud',
        status: ProductStatus.LIVE,
        paidRankingAmountCents: 1500, // already has $15.00 All-Time from previous days
        todayPaidAmountCents: 0,
        todayPaidDate: null,
      };

      (Product.findById as jest.Mock).mockResolvedValue(existingProduct);
      (Product.findByIdAndUpdate as jest.Mock).mockResolvedValue(existingProduct);
      (PaymentWebhookEvent.findOne as jest.Mock).mockResolvedValue(null);
      (PaymentWebhookEvent.create as jest.Mock).mockResolvedValue({ _id: new Types.ObjectId() });
      (PaymentWebhookEvent.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

      const mockPaymentDoc = { _id: new Types.ObjectId() };
      (Payment.create as jest.Mock).mockResolvedValue([mockPaymentDoc]);
      (RankingLedger.create as jest.Mock).mockResolvedValue([{}]);

      const nowSec = Math.floor(Date.now() / 1000);
      const webhookPayload = {
        event_id: 'evt_paddle_daily_002',
        event_type: 'transaction.completed',
        data: {
          id: 'txn_daily_002',
          status: 'completed',
          custom_data: {
            productId: mockProductId.toString(),
            contributionType: 'DAILY',
            productName: 'VectorPulse Cloud',
          },
          details: {
            totals: {
              total: '20.00', // $20.00 in major units = 2000 cents
              currency_code: 'USD',
            },
          },
        },
      };

      const rawBody = JSON.stringify(webhookPayload);
      const signature = generatePaddleSignature(rawBody, nowSec);

      await paymentService.handlePaymentWebhook('paddle', rawBody, signature);

      // Verify DAILY Accounting Invariant:
      // previousAllTimeCents: 1500, newAllTimeCents: 1500 (UNCHANGED!)
      // previousTodayCents: 0, newTodayCents: 2000 (UPDATED!)
      expect(RankingLedger.create).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            productId: mockProductId,
            contributionType: 'DAILY',
            amountCents: 2000,
            previousAllTimeCents: 1500,
            newAllTimeCents: 1500, // CRITICAL: Must not inflate All-Time!
            previousTodayCents: 0,
            newTodayCents: 2000,
          }),
        ]),
        expect.anything()
      );

      // Product All-Time remains 1500
      expect(Product.findByIdAndUpdate).toHaveBeenCalledWith(
        mockProductId,
        expect.objectContaining({
          $set: expect.objectContaining({
            paidRankingAmountCents: 1500, // Preserved without inflation!
            todayPaidAmountCents: 2000,
          }),
        }),
        expect.anything()
      );
    });

    test('guarantees webhook idempotency: duplicate webhook event IDs are skipped without double crediting', async () => {
      // Mock existing PROCESSED webhook event
      (PaymentWebhookEvent.findOne as jest.Mock).mockResolvedValue({
        providerEventId: 'evt_paddle_duplicate_003',
        processingStatus: 'PROCESSED',
      });

      const nowSec = Math.floor(Date.now() / 1000);
      const webhookPayload = {
        event_id: 'evt_paddle_duplicate_003',
        event_type: 'transaction.completed',
        data: {
          id: 'txn_dup_003',
          status: 'completed',
          custom_data: {
            productId: new Types.ObjectId().toString(),
          },
        },
      };

      const rawBody = JSON.stringify(webhookPayload);
      const signature = generatePaddleSignature(rawBody, nowSec);

      const result = await paymentService.handlePaymentWebhook('paddle', rawBody, signature);

      expect(result.success).toBe(true);
      expect(result.message).toContain('idempotent duplicate');
      // Payment.create and RankingLedger.create should NEVER be called on duplicate
      expect(Payment.create).not.toHaveBeenCalled();
      expect(RankingLedger.create).not.toHaveBeenCalled();
    });
  });
});
