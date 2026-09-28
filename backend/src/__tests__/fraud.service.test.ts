import { Types } from 'mongoose';
import { AntiFraudService, hashTelemetry } from '../services/fraud.service';
import { User } from '../models/User.model';
import { Vote } from '../models/Vote.model';
import { ActivityEvent } from '../models/ActivityEvent.model';
import { SystemSettings } from '../models/SystemSettings.model';
import { VoteStatus, ANTI_FRAUD_WEIGHTS } from '../shared/constants';

// Mock dependencies
jest.mock('../models/User.model');
jest.mock('../models/Vote.model');
jest.mock('../models/ActivityEvent.model');
jest.mock('../models/SystemSettings.model');
jest.mock('../shared/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  },
  isRedisConnected: jest.fn().mockReturnValue(false),
}));

describe('AntiFraudService - evaluateVoteRisk Unit Tests', () => {
  let fraudService: AntiFraudService;
  const mockUserId = new Types.ObjectId().toHexString();
  const mockProductId = new Types.ObjectId().toHexString();

  beforeEach(() => {
    jest.clearAllMocks();
    fraudService = new AntiFraudService();

    // Default mock: SystemSettings fallback to ANTI_FRAUD_WEIGHTS
    (SystemSettings.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        key: 'anti_fraud_weights',
        value: ANTI_FRAUD_WEIGHTS,
      }),
    });

    // Default mock: Clean, mature user (10 hours old, not banned, legitimate email)
    const matureDate = new Date(Date.now() - 10 * 3600 * 1000);
    (User.findById as jest.Mock).mockResolvedValue({
      _id: new Types.ObjectId(mockUserId),
      email: 'verified.user@company.com',
      isBanned: false,
      createdAt: matureDate,
    });

    // Default mock: Non-datacenter IP check
    jest.spyOn(fraudService, 'checkDatacenterIp').mockResolvedValue({ isDatacenter: false });

    // Default mock: 0 subnet votes in last hour
    (Vote.countDocuments as jest.Mock).mockResolvedValue(0);

    // Default mock: 0 votes in last hour and 3 days (no burst)
    (Vote.countDocuments as jest.Mock).mockImplementation((query: any) => {
      if (query?.status === VoteStatus.VALID) return Promise.resolve(0);
      return Promise.resolve(0);
    });

    // Default mock: 1 prior activity event (not zero prior activity)
    (ActivityEvent.countDocuments as jest.Mock).mockResolvedValue(1);

    // Default mock: No device collision
    (Vote.exists as jest.Mock).mockResolvedValue(null);
  });

  // 1. Account age < 2 hours triggers SIG_ACCOUNT_NEW (+20)
  test('1. Account age < 2 hours triggers SIG_ACCOUNT_NEW (+20)', async () => {
    const freshUserDate = new Date(Date.now() - 1 * 3600 * 1000); // 1 hour old
    (User.findById as jest.Mock).mockResolvedValue({
      _id: new Types.ObjectId(mockUserId),
      email: 'newuser@company.com',
      isBanned: false,
      createdAt: freshUserDate,
    });

    const result = await fraudService.evaluateVoteRisk({
      userId: mockUserId,
      productId: mockProductId,
      ip: '203.0.113.15',
    });

    expect(result.triggeredSignals).toContain('SIG_ACCOUNT_NEW');
    expect(result.riskScore).toBe(20);
    expect(result.status).toBe(VoteStatus.VALID);
  });

  // 2. Known datacenter ASN triggers SIG_IP_DATACENTER (+25)
  test('2. Known datacenter ASN triggers SIG_IP_DATACENTER (+25)', async () => {
    jest.spyOn(fraudService, 'checkDatacenterIp').mockResolvedValue({
      isDatacenter: true,
      asn: 16509, // AWS ASN
    });

    const result = await fraudService.evaluateVoteRisk({
      userId: mockUserId,
      productId: mockProductId,
      ip: '54.210.0.1',
    });

    expect(result.triggeredSignals).toContain('SIG_IP_DATACENTER');
    expect(result.riskScore).toBe(25);
    expect(result.status).toBe(VoteStatus.VALID);
  });

  // 3. >3 votes from same /24 subnet in 1 hour triggers SIG_SUBNET_CONCENTRATION (+35)
  test('3. >3 votes from same /24 subnet in 1 hour triggers SIG_SUBNET_CONCENTRATION (+35)', async () => {
    (Vote.countDocuments as jest.Mock).mockImplementation((query: any) => {
      if (query?.subnetHash) {
        return Promise.resolve(4); // 4 votes from same subnet
      }
      return Promise.resolve(0);
    });

    const result = await fraudService.evaluateVoteRisk({
      userId: mockUserId,
      productId: mockProductId,
      ip: '198.51.100.42',
    });

    expect(result.triggeredSignals).toContain('SIG_SUBNET_CONCENTRATION');
    expect(result.riskScore).toBe(35);
    expect(result.status).toBe(VoteStatus.FLAGGED); // 35 is in 30..69
  });

  // 4. Burst velocity > 5x baseline triggers SIG_BURST_VELOCITY (+25)
  test('4. Burst velocity > 5x baseline triggers SIG_BURST_VELOCITY (+25)', async () => {
    (Vote.countDocuments as jest.Mock).mockImplementation((query: any) => {
      if (query?.subnetHash) {
        return Promise.resolve(0); // Not concentrated in same subnet
      }
      if (query?.createdAt?.$gt) {
        const timeDiff = Date.now() - new Date(query.createdAt.$gt).getTime();
        if (timeDiff < 2 * 3600 * 1000) {
          return Promise.resolve(10); // 10 votes in last hour
        }
        return Promise.resolve(10); // 10 votes in last 3 days -> avg = 10/72 = 0.14/hr -> 10 > 5 * 0.14
      }
      return Promise.resolve(0);
    });

    const result = await fraudService.evaluateVoteRisk({
      userId: mockUserId,
      productId: mockProductId,
      ip: '203.0.113.88',
    });

    expect(result.triggeredSignals).toContain('SIG_BURST_VELOCITY');
    expect(result.riskScore).toBe(25);
    expect(result.status).toBe(VoteStatus.VALID);
  });

  // 5. Zero prior activity triggers SIG_ZERO_PRIOR_ACTIVITY (+15)
  test('5. Zero prior activity triggers SIG_ZERO_PRIOR_ACTIVITY (+15)', async () => {
    (ActivityEvent.countDocuments as jest.Mock).mockResolvedValue(0);

    const result = await fraudService.evaluateVoteRisk({
      userId: mockUserId,
      productId: mockProductId,
      ip: '203.0.113.50',
    });

    expect(result.triggeredSignals).toContain('SIG_ZERO_PRIOR_ACTIVITY');
    expect(result.riskScore).toBe(15);
    expect(result.status).toBe(VoteStatus.VALID);
  });

  // 6. Same device fingerprint from different accounts triggers SIG_DEVICE_COLLISION (+40)
  test('6. Same device fingerprint from different accounts triggers SIG_DEVICE_COLLISION (+40)', async () => {
    (Vote.exists as jest.Mock).mockResolvedValue({ _id: new Types.ObjectId() });

    const result = await fraudService.evaluateVoteRisk({
      userId: mockUserId,
      productId: mockProductId,
      ip: '203.0.113.50',
      deviceFingerprint: 'device_fingerprint_abc123',
    });

    expect(result.triggeredSignals).toContain('SIG_DEVICE_COLLISION');
    expect(result.riskScore).toBe(40);
    expect(result.status).toBe(VoteStatus.FLAGGED);
  });

  // 7. Account >30 days with >5 valid votes applies SIG_HISTORICAL_TRUST (-20)
  test('7. Account >30 days with >5 valid votes applies SIG_HISTORICAL_TRUST (-20)', async () => {
    const veteranDate = new Date(Date.now() - 40 * 24 * 3600 * 1000); // 40 days old
    (User.findById as jest.Mock).mockResolvedValue({
      _id: new Types.ObjectId(mockUserId),
      email: 'veteran@company.com',
      isBanned: false,
      createdAt: veteranDate,
    });

    // Subnet concentration (+35) triggered to observe trust discount
    (Vote.countDocuments as jest.Mock).mockImplementation((query: any) => {
      if (query?.subnetHash) return Promise.resolve(4); // +35
      if (query?.status === VoteStatus.VALID) return Promise.resolve(10); // > 5 historical valid votes
      return Promise.resolve(0);
    });

    const result = await fraudService.evaluateVoteRisk({
      userId: mockUserId,
      productId: mockProductId,
      ip: '203.0.113.99',
    });

    expect(result.triggeredSignals).toContain('SIG_SUBNET_CONCENTRATION');
    expect(result.triggeredSignals).toContain('SIG_HISTORICAL_TRUST');
    // 35 - 20 = 15
    expect(result.riskScore).toBe(15);
    expect(result.status).toBe(VoteStatus.VALID);
  });

  // 8. Disposable email returns REJECTED_BOT immediately
  test('8. Disposable email returns REJECTED_BOT immediately', async () => {
    (User.findById as jest.Mock).mockResolvedValue({
      _id: new Types.ObjectId(mockUserId),
      email: 'botuser@mailinator.com',
      isBanned: false,
      createdAt: new Date(),
    });

    const result = await fraudService.evaluateVoteRisk({
      userId: mockUserId,
      productId: mockProductId,
      ip: '203.0.113.1',
    });

    expect(result.status).toBe(VoteStatus.REJECTED_BOT);
    expect(result.riskScore).toBe(100);
    expect(result.triggeredSignals).toContain('SIG_EMAIL_DISPOSABLE');
  });

  // 9. Score < 30: status is VALID
  test('9. Score < 30: status is VALID', async () => {
    // Only SIG_ACCOUNT_NEW (+20)
    const freshUserDate = new Date(Date.now() - 30 * 60 * 1000); // 30 mins old
    (User.findById as jest.Mock).mockResolvedValue({
      _id: new Types.ObjectId(mockUserId),
      email: 'fresh@example.com',
      isBanned: false,
      createdAt: freshUserDate,
    });

    const result = await fraudService.evaluateVoteRisk({
      userId: mockUserId,
      productId: mockProductId,
      ip: '198.51.100.1',
    });

    expect(result.riskScore).toBe(20);
    expect(result.riskScore).toBeLessThan(30);
    expect(result.status).toBe(VoteStatus.VALID);
  });

  // 10. Score 30-69: status is FLAGGED
  test('10. Score 30-69: status is FLAGGED', async () => {
    // SIG_ACCOUNT_NEW (+20) + SIG_ZERO_PRIOR_ACTIVITY (+15) = 35
    const freshUserDate = new Date(Date.now() - 30 * 60 * 1000);
    (User.findById as jest.Mock).mockResolvedValue({
      _id: new Types.ObjectId(mockUserId),
      email: 'fresh@example.com',
      isBanned: false,
      createdAt: freshUserDate,
    });
    (ActivityEvent.countDocuments as jest.Mock).mockResolvedValue(0); // zero prior activity

    const result = await fraudService.evaluateVoteRisk({
      userId: mockUserId,
      productId: mockProductId,
      ip: '198.51.100.1',
    });

    expect(result.riskScore).toBe(35);
    expect(result.riskScore).toBeGreaterThanOrEqual(30);
    expect(result.riskScore).toBeLessThan(70);
    expect(result.status).toBe(VoteStatus.FLAGGED);
  });

  // 11. Score >= 70: status is QUARANTINED
  test('11. Score >= 70: status is QUARANTINED', async () => {
    // SIG_SUBNET_CONCENTRATION (+35) + SIG_BURST_VELOCITY (+25) + SIG_ZERO_PRIOR_ACTIVITY (+15) = 75
    (Vote.countDocuments as jest.Mock).mockImplementation((query: any) => {
      if (query?.subnetHash) return Promise.resolve(5); // subnet
      if (query?.createdAt?.$gt) {
        const diff = Date.now() - new Date(query.createdAt.$gt).getTime();
        if (diff < 2 * 3600 * 1000) return Promise.resolve(10); // burst hour
        return Promise.resolve(10); // burst 3d
      }
      return Promise.resolve(0);
    });
    (ActivityEvent.countDocuments as jest.Mock).mockResolvedValue(0); // zero prior activity

    const result = await fraudService.evaluateVoteRisk({
      userId: mockUserId,
      productId: mockProductId,
      ip: '198.51.100.5',
    });

    expect(result.riskScore).toBe(75);
    expect(result.riskScore).toBeGreaterThanOrEqual(70);
    expect(result.status).toBe(VoteStatus.QUARANTINED);
  });

  // 12. Score combinations of multiple signals sum correctly
  test('12. Score combinations of multiple signals sum correctly', async () => {
    // SIG_DEVICE_COLLISION (+40) + SIG_IP_DATACENTER (+25) + SIG_ACCOUNT_NEW (+20) = 85
    const freshUserDate = new Date(Date.now() - 30 * 60 * 1000);
    (User.findById as jest.Mock).mockResolvedValue({
      _id: new Types.ObjectId(mockUserId),
      email: 'fresh@example.com',
      isBanned: false,
      createdAt: freshUserDate,
    });
    jest.spyOn(fraudService, 'checkDatacenterIp').mockResolvedValue({ isDatacenter: true, asn: 14061 });
    (Vote.exists as jest.Mock).mockResolvedValue({ _id: new Types.ObjectId() });

    const result = await fraudService.evaluateVoteRisk({
      userId: mockUserId,
      productId: mockProductId,
      ip: '104.248.0.1',
      deviceFingerprint: 'colliding_fp_777',
    });

    expect(result.triggeredSignals).toEqual(
      expect.arrayContaining(['SIG_ACCOUNT_NEW', 'SIG_IP_DATACENTER', 'SIG_DEVICE_COLLISION'])
    );
    expect(result.riskScore).toBe(85);
    expect(result.status).toBe(VoteStatus.QUARANTINED);
  });
});
