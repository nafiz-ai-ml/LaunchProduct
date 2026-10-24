import { Types } from 'mongoose';
import { RankingService } from '../services/ranking.service';
import { ActivityEvent } from '../models/ActivityEvent.model';
import { Product } from '../models/Product.model';
import { SystemSettings } from '../models/SystemSettings.model';
import { RANKING_WEIGHTS, ProductStatus } from '../shared/constants';

jest.mock('../models/ActivityEvent.model');
jest.mock('../models/Product.model');
jest.mock('../models/SystemSettings.model');
jest.mock('../repositories/snapshot.repository');
jest.mock('../shared/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  },
  isRedisConnected: jest.fn().mockReturnValue(false),
}));

describe('RankingService Unit Tests', () => {
  let rankingService: RankingService;
  const mockProductId = new Types.ObjectId().toHexString();
  const launchDate = new Date('2026-09-24T00:00:00.000Z');

  beforeEach(() => {
    jest.clearAllMocks();
    rankingService = new RankingService();

    (SystemSettings.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        key: 'ranking_weights',
        value: RANKING_WEIGHTS,
      }),
    });
  });

  test('computeLaunchScore returns 0 when no organic clicks', async () => {
    (ActivityEvent.countDocuments as jest.Mock).mockResolvedValue(0);

    const score = await rankingService.computeLaunchScore(mockProductId, launchDate, launchDate);
    expect(score).toBe(0);
  });

  test('computeLaunchScore accounts for organic clicks', async () => {
    (ActivityEvent.countDocuments as jest.Mock).mockImplementation((filter: any) => {
      expect(filter.eventSource).toBe('ORGANIC');
      expect(filter.eventType).toBe('OUTBOUND_CLICK');
      return Promise.resolve(20);
    });

    const score = await rankingService.computeLaunchScore(mockProductId, launchDate, launchDate);
    // 20 * 0.15 / (0 + 1)^1.2 = 3.0
    expect(score).toBe(3.0);
  });

  test('computeAllTimeScore computes score based on paidRankingAmountCents', async () => {
    (Product.findById as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({ paidRankingAmountCents: 5000 }),
      }),
    });

    const score = await rankingService.computeAllTimeScore(mockProductId);
    expect(score).toBe(50);
  });

  test('generateDailyLeaderboard returns products sorted by score', async () => {
    const prod1Id = new Types.ObjectId();
    const prod2Id = new Types.ObjectId();

    const mockProducts = [
      { _id: prod1Id, name: 'Product Beta', launchDate, createdAt: launchDate, status: ProductStatus.LIVE },
      { _id: prod2Id, name: 'Product Alpha', launchDate, createdAt: launchDate, status: ProductStatus.LIVE },
    ];

    (Product.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProducts),
      }),
    });

    jest.spyOn(rankingService, 'computeLaunchScore').mockImplementation((pid: string) => {
      if (pid === prod1Id.toString()) return Promise.resolve(10);
      if (pid === prod2Id.toString()) return Promise.resolve(50);
      return Promise.resolve(0);
    });

    const leaderboard = await rankingService.generateDailyLeaderboard(launchDate, 'LAUNCH_DAY');

    expect(leaderboard.length).toBe(2);
    expect(leaderboard[0].rank).toBe(1);
    expect(leaderboard[0].productId).toBe(prod2Id.toString());
    expect(leaderboard[1].rank).toBe(2);
    expect(leaderboard[1].productId).toBe(prod1Id.toString());
  });
});
