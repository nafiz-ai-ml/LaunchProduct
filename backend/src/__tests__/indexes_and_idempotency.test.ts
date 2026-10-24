import mongoose, { Types } from 'mongoose';
import { Payment } from '../models/Payment.model';
import { PaymentWebhookEvent } from '../models/PaymentWebhookEvent.model';
import { Product } from '../models/Product.model';
import { PaymentStatus } from '../shared/constants';
import { assertCriticalProductionIndexes } from '../server';

const MONGODB_URI_TEST = process.env.MONGODB_URI_TEST;
const describeIntegration = MONGODB_URI_TEST ? describe : describe.skip;

describe('Database Indexes and Schema Invariants (Unit & Schema)', () => {
  it('Payment schema removes default: null and enforces partial unique indexes', () => {
    // 1. Ensure providerPaymentId and providerEventId have no default null
    const providerPaymentIdPath = Payment.schema.path('providerPaymentId') as any;
    const providerEventIdPath = Payment.schema.path('providerEventId') as any;

    expect(providerPaymentIdPath.options.default).toBeUndefined();
    expect(providerEventIdPath.options.default).toBeUndefined();

    // 2. Ensure indexes use partialFilterExpression instead of sparse: true
    const schemaIndexes = Payment.schema.indexes();

    const paymentIdIdx = schemaIndexes.find(
      ([keys]) => keys && (keys as any).providerPaymentId === 1
    );
    expect(paymentIdIdx).toBeDefined();
    expect(paymentIdIdx![1]).toMatchObject({
      unique: true,
      partialFilterExpression: { providerPaymentId: { $type: 'string' } },
    });
    expect((paymentIdIdx![1] as any).sparse).toBeUndefined();

    const eventIdIdx = schemaIndexes.find(
      ([keys]) => keys && (keys as any).providerEventId === 1
    );
    expect(eventIdIdx).toBeDefined();
    expect(eventIdIdx![1]).toMatchObject({
      unique: true,
      partialFilterExpression: { providerEventId: { $type: 'string' } },
    });
    expect((eventIdIdx![1] as any).sparse).toBeUndefined();
  });

  it('PaymentWebhookEvent schema enforces unique index on providerEventId', () => {
    const schemaIndexes = PaymentWebhookEvent.schema.indexes();
    const eventIdIdx = schemaIndexes.find(
      ([keys]) => keys && (keys as any).providerEventId === 1
    );

    expect(eventIdIdx).toBeDefined();
    expect(eventIdIdx![1]).toMatchObject({
      unique: true,
    });
  });

  it('assertCriticalProductionIndexes asserts all required production indexes', async () => {
    const mockIndexesMap: Record<string, any[]> = {
      PaymentWebhookEvent: [{ key: { providerEventId: 1 }, unique: true }],
      Payment: [
        { key: { providerPaymentId: 1 }, unique: true },
        { key: { providerEventId: 1 }, unique: true },
      ],
      Product: [{ key: { slug: 1 }, unique: true }],
    };

    jest.spyOn(PaymentWebhookEvent.collection, 'indexes').mockResolvedValue(mockIndexesMap.PaymentWebhookEvent as any);
    jest.spyOn(Payment.collection, 'indexes').mockResolvedValue(mockIndexesMap.Payment as any);
    jest.spyOn(Product.collection, 'indexes').mockResolvedValue(mockIndexesMap.Product as any);

    await expect(assertCriticalProductionIndexes()).resolves.not.toThrow();

    jest.restoreAllMocks();
  });

  it('assertCriticalProductionIndexes exits process if a critical index is missing', async () => {
    const mockExit = jest.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit(1)');
    }) as any);

    // Mock PaymentWebhookEvent missing unique index
    jest.spyOn(PaymentWebhookEvent.collection, 'indexes').mockResolvedValue([] as any);

    await expect(assertCriticalProductionIndexes()).rejects.toThrow('process.exit(1)');
    expect(mockExit).toHaveBeenCalledWith(1);

    mockExit.mockRestore();
    jest.restoreAllMocks();
  });
});

describeIntegration('Database Indexes Integration Tests (Requires MONGODB_URI_TEST)', () => {
  beforeAll(async () => {
    if (MONGODB_URI_TEST) {
      await mongoose.connect(MONGODB_URI_TEST);
      await Payment.createIndexes();
      await PaymentWebhookEvent.createIndexes();
    }
  });

  afterAll(async () => {
    if (MONGODB_URI_TEST && mongoose.connection.readyState !== 0) {
      await Payment.deleteMany({ payerEmail: 'test-index-integration@example.com' });
      await PaymentWebhookEvent.deleteMany({ providerEventId: { $regex: /^test_evt_/ } });
      await mongoose.disconnect();
    }
  });

  it('Two Payment documents without providerPaymentId can both be saved (the null bug is gone)', async () => {
    const p1 = new Payment({
      productId: new Types.ObjectId(),
      payerEmail: 'test-index-integration@example.com',
      amountCents: 599,
      status: PaymentStatus.SUCCEEDED,
      provider: 'paddle',
      currency: 'USD',
      appliedToRanking: true,
      contributionType: 'DAILY',
      paymentType: 'RANKING',
    });
    await p1.save();

    const p2 = new Payment({
      productId: new Types.ObjectId(),
      payerEmail: 'test-index-integration@example.com',
      amountCents: 1000,
      status: PaymentStatus.SUCCEEDED,
      provider: 'paddle',
      currency: 'USD',
      appliedToRanking: true,
      contributionType: 'DAILY',
      paymentType: 'RANKING',
    });

    await expect(p2.save()).resolves.toBeDefined();
    expect(p1._id).toBeDefined();
    expect(p2._id).toBeDefined();
  });

  it('Two PaymentWebhookEvent documents with the same providerEventId: the second insert throws a duplicate key error', async () => {
    const duplicateEventId = `test_evt_dup_${Date.now()}`;

    const evt1 = new PaymentWebhookEvent({
      provider: 'paddle',
      providerEventId: duplicateEventId,
      eventType: 'payment.succeeded',
      rawPayload: { test: true },
      processingStatus: 'RECEIVED',
    });
    await evt1.save();

    const evt2 = new PaymentWebhookEvent({
      provider: 'paddle',
      providerEventId: duplicateEventId,
      eventType: 'payment.succeeded',
      rawPayload: { test: true },
      processingStatus: 'RECEIVED',
    });

    await expect(evt2.save()).rejects.toThrow(/E11000|duplicate key/i);
  });
});
