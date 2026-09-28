import { Types } from 'mongoose';
import { RankingService } from '../services/ranking.service';
import { Vote } from '../models/Vote.model';
import { ActivityEvent } from '../models/ActivityEvent.model';
import { Review } from '../models/Review.model';
import { Product } from '../models/Product.model';
import { SystemSettings } from '../models/SystemSettings.model';
import { RANKING_WEIGHTS, ProductStatus } from '../shared/constants';

jest.mock('../models/Vote.model');
jest.mock('../models/ActivityEvent.model');
jest.mock('../models/Review.model');
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

    // Default: Return default ranking weights
    (SystemSettings.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue({
        key: 'ranking_weights',
        value: RANKING_WEIGHTS,
      }),
    });
  });

  // 1. computeLaunchScore returns 0 when no votes or clicks
  test('1. computeLaunchScore returns 0 when no votes or clicks', async () => {
    (Vote.countDocuments as jest.Mock).mockResolvedValue(0);
    (ActivityEvent.countDocuments as jest.Mock).mockResolvedValue(0);

    const score = await rankingService.computeLaunchScore(mockProductId, launchDate, launchDate);
    expect(score).toBe(0);
  });

  // 2. computeLaunchScore increases with more valid votes
  test('2. computeLaunchScore increases with more valid votes', async () => {
    (ActivityEvent.countDocuments as jest.Mock).mockResolvedValue(0);

    // 10 votes
    (Vote.countDocuments as jest.Mock).mockResolvedValue(10);
    const score10 = await rankingService.computeLaunchScore(mockProductId, launchDate, launchDate);

    // 50 votes
    (Vote.countDocuments as jest.Mock).mockResolvedValue(50);
    const score50 = await rankingService.computeLaunchScore(mockProductId, launchDate, launchDate);

    expect(score50).toBeGreaterThan(score10);
    expect(score10).toBe(10); // 10 * 1.0 / (0 + 1)^1.2 = 10
    expect(score50).toBe(50); // 50 * 1.0 / (0 + 1)^1.2 = 50
  });

  // 3. computeLaunchScore gravity dampening increases as hours elapse
  test('3. computeLaunchScore gravity dampening increases as hours elapse', async () => {
    (Vote.countDocuments as jest.Mock).mockResolvedValue(100);
    (ActivityEvent.countDocuments as jest.Mock).mockResolvedValue(20);

    // At hour 0: (100 * 1.0 + 20 * 0.15) / (0 + 1)^1.2 = 103
    const score0h = await rankingService.computeLaunchScore(mockProductId, launchDate, launchDate);

    // At hour 4: delta_t = 4
    const date4h = new Date(launchDate.getTime() + 4 * 3600 * 1000);
    const score4h = await rankingService.computeLaunchScore(mockProductId, launchDate, date4h);

    // At hour 12: delta_t = 12
    const date12h = new Date(launchDate.getTime() + 12 * 3600 * 1000);
    const score12h = await rankingService.computeLaunchScore(mockProductId, launchDate, date12h);

    // At hour 24: delta_t = 24
    const date24h = new Date(launchDate.getTime() + 24 * 3600 * 1000);
    const score24h = await rankingService.computeLaunchScore(mockProductId, launchDate, date24h);

    expect(score0h).toBe(103);
    expect(score4h).toBeLessThan(score0h);
    expect(score12h).toBeLessThan(score4h);
    expect(score24h).toBeLessThan(score12h);
  });

  // 4. Sponsored clicks do NOT contribute to S_launch
  test('4. Sponsored clicks do NOT contribute to S_launch', async () => {
    (Vote.countDocuments as jest.Mock).mockResolvedValue(20);

    // ActivityEvent filter in ranking.service.ts strictly searches for eventSource: 'ORGANIC'
    (ActivityEvent.countDocuments as jest.Mock).mockImplementation((filter: any) => {
      expect(filter.eventSource).toBe('ORGANIC');
      expect(filter.eventType).toBe('OUTBOUND_CLICK');
      // Return only organic count (5), ignoring sponsored clicks
      return Promise.resolve(5);
    });

    const score = await rankingService.computeLaunchScore(mockProductId, launchDate, launchDate);
    // (20 * 1.0 + 5 * 0.15) / 1 = 20.75
    expect(score).toBe(20.75);
  });

  // 5. Quarantined votes do NOT contribute to S_launch
  test('5. Quarantined votes do NOT contribute to S_launch', async () => {
    (ActivityEvent.countDocuments as jest.Mock).mockResolvedValue(0);

    // Vote filter in ranking.service.ts strictly queries { status: 'VALID' }
    (Vote.countDocuments as jest.Mock).mockImplementation((filter: any) => {
      expect(filter.status).toBe('VALID');
      // Only valid votes return 15; quarantined votes are not matched
      return Promise.resolve(15);
    });

    const score = await rankingService.computeLaunchScore(mockProductId, launchDate, launchDate);
    expect(score).toBe(15);
  });

  // 6. computeAllTimeScore uses Bayesian shrinkage (K=5) correctly
  test('6. computeAllTimeScore uses Bayesian shrinkage (K=5) correctly', async () => {
    // 99 valid votes: log10(99 + 1) * 40 = 2 * 40 = 80
    (Vote.countDocuments as jest.Mock).mockResolvedValue(99);

    // 5 reviews with average rating 4.0
    // Bayesian weight = 5 / (5 + 5) = 0.5
    // Review score = 4.0 * 0.5 * 60 = 120
    (Review.aggregate as jest.Mock).mockResolvedValue([
      { count: 5, avgRating: 4.0 },
    ]);

    const score = await rankingService.computeAllTimeScore(mockProductId);
    // Total = 80 + 120 = 200
    expect(score).toBe(200);
  });

  // 7. computeAllTimeScore handles zero reviews gracefully
  test('7. computeAllTimeScore handles zero reviews gracefully', async () => {
    (Vote.countDocuments as jest.Mock).mockResolvedValue(99);
    (Review.aggregate as jest.Mock).mockResolvedValue([]);

    const score = await rankingService.computeAllTimeScore(mockProductId);
    // When 0 reviews, reviewComponent is 0, score = voteComponent (80)
    expect(score).toBe(80);
    expect(Number.isFinite(score)).toBe(true);
  });

  // 8. generateDailyLeaderboard returns products sorted by descending score
  test('8. generateDailyLeaderboard returns products sorted by descending score', async () => {
    const prod1Id = new Types.ObjectId();
    const prod2Id = new Types.ObjectId();
    const prod3Id = new Types.ObjectId();

    const mockProducts = [
      { _id: prod1Id, name: 'Product Beta', launchDate, createdAt: launchDate, status: ProductStatus.LIVE },
      { _id: prod2Id, name: 'Product Alpha', launchDate, createdAt: launchDate, status: ProductStatus.LIVE },
      { _id: prod3Id, name: 'Product Gamma', launchDate, createdAt: launchDate, status: ProductStatus.LIVE },
    ];

    (Product.find as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockProducts),
      }),
    });

    // Mock computeLaunchScore to return distinct scores: Alpha=95, Beta=60, Gamma=12
    jest.spyOn(rankingService, 'computeLaunchScore').mockImplementation((pid: string) => {
      if (pid === prod1Id.toString()) return Promise.resolve(60);
      if (pid === prod2Id.toString()) return Promise.resolve(95);
      if (pid === prod3Id.toString()) return Promise.resolve(12);
      return Promise.resolve(0);
    });

    const leaderboard = await rankingService.generateDailyLeaderboard(launchDate, 'LAUNCH_DAY');

    expect(leaderboard.length).toBe(3);
    // Alpha (95) should be rank 1
    expect(leaderboard[0].rank).toBe(1);
    expect(leaderboard[0].score).toBe(95);
    expect(leaderboard[0].productId).toBe(prod2Id.toString());

    // Beta (60) should be rank 2
    expect(leaderboard[1].rank).toBe(2);
    expect(leaderboard[1].score).toBe(60);
    expect(leaderboard[1].productId).toBe(prod1Id.toString());

    // Gamma (12) should be rank 3
    expect(leaderboard[2].rank).toBe(3);
    expect(leaderboard[2].score).toBe(12);
    expect(leaderboard[2].productId).toBe(prod3Id.toString());
  });
});
