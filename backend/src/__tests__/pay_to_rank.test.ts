import { Types } from 'mongoose';
import { RankingService } from '../services/ranking.service';
import { Product } from '../models/Product.model';
import { Category } from '../models/Category.model';
import { RankingLedger } from '../models/RankingLedger.model';
import { DailyLeaderboardSnapshot } from '../models/DailyLeaderboardSnapshot.model';
import { Vote } from '../models/Vote.model';
import { Review } from '../models/Review.model';
import { ActivityEvent } from '../models/ActivityEvent.model';
import { SystemSettings } from '../models/SystemSettings.model';
import { ProductStatus } from '../shared/constants';

jest.mock('../models/Product.model');
jest.mock('../models/Category.model');
jest.mock('../models/RankingLedger.model');
jest.mock('../models/DailyLeaderboardSnapshot.model');
jest.mock('../models/Vote.model');
jest.mock('../models/Review.model');
jest.mock('../models/ActivityEvent.model');
jest.mock('../models/SystemSettings.model');
jest.mock('../shared/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    pipeline: jest.fn().mockReturnValue({
      zadd: jest.fn(),
      expire: jest.fn(),
      exec: jest.fn().mockResolvedValue([]),
    }),
  },
  isRedisConnected: jest.fn().mockReturnValue(false),
}));

describe('Pay-to-Rank Transformation Unit Tests', () => {
  let rankingService: RankingService;

  beforeEach(() => {
    jest.clearAllMocks();
    rankingService = new RankingService();

    // Default system settings mock
    (SystemSettings.findOne as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue(null),
    });

    // Default Category find mock
    (Category.find as jest.Mock).mockReturnValue({
      lean: jest.fn().mockResolvedValue([]),
    });
  });

  describe('1. Platform Ranking Rules', () => {
    test('returns exact commercial Pay-to-Rank settings ($5.99 min initial, $1.00 increment)', async () => {
      const rules = await rankingService.getRankingRules();
      expect(rules.minInitialPaymentCents).toBe(599);
      expect(rules.minIncrementCents).toBe(100);
      expect(rules.currency).toBe('USD');
      expect(rules.dailyResetUtc).toBe('00:00:00');
      expect(rules.upvotesCountTowardsRank).toBe(false);
      expect(rules.reviewsCountTowardsRank).toBe(false);
    });
  });

  describe('2. Outbid and Step-Up Calculations', () => {
    test('unranked product (0 cents) requires at least $5.99 (599 cents) if no competitor', async () => {
      const newProdId = new Types.ObjectId().toHexString();

      // Mock Product.findById
      (Product.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: newProdId, paidRankingAmountCents: 0 }),
      });

      // Mock Product.findOne (targetRank 1 - no competitor)
      (Product.findOne as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue(null),
            }),
          }),
        }),
      });

      (Product.countDocuments as jest.Mock).mockResolvedValue(0);

      const outbid = await rankingService.calculateOutbidAmount(newProdId, 1);
      expect(outbid.isInitialPayment).toBe(true);
      expect(outbid.requiredPaymentCents).toBe(599);
      expect(outbid.formattedRequiredPayment).toBe('$5.99');
    });

    test('unranked product targeting competitor with $10.00 (1000 cents) must pay $11.00 (1100 cents)', async () => {
      const newProdId = new Types.ObjectId().toHexString();

      (Product.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: newProdId, paidRankingAmountCents: 0 }),
      });

      (Product.findOne as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue({
                _id: new Types.ObjectId(),
                paidRankingAmountCents: 1000,
              }),
            }),
          }),
        }),
      });

      (Product.countDocuments as jest.Mock).mockResolvedValue(5);

      const outbid = await rankingService.calculateOutbidAmount(newProdId, 1);
      expect(outbid.isInitialPayment).toBe(true);
      expect(outbid.targetProductAmountCents).toBe(1000);
      expect(outbid.requiredPaymentCents).toBe(1100);
      expect(outbid.formattedRequiredPayment).toBe('$11.00');
    });

    test('already ranked product with $7.00 (700 cents) outbidding $10.00 pays $4.00 delta (400 cents)', async () => {
      const existingProdId = new Types.ObjectId().toHexString();

      (Product.findById as jest.Mock).mockReturnValue({
        lean: jest.fn().mockResolvedValue({ _id: existingProdId, paidRankingAmountCents: 700 }),
      });

      (Product.findOne as jest.Mock).mockReturnValue({
        sort: jest.fn().mockReturnValue({
          skip: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              lean: jest.fn().mockResolvedValue({
                _id: new Types.ObjectId(),
                paidRankingAmountCents: 1000,
              }),
            }),
          }),
        }),
      });

      (Product.countDocuments as jest.Mock).mockResolvedValue(1);

      const outbid = await rankingService.calculateOutbidAmount(existingProdId, 1);
      expect(outbid.isInitialPayment).toBe(false);
      expect(outbid.currentAmountCents).toBe(700);
      // 1000 + 100 (increment) - 700 = 400 cents ($4.00)
      expect(outbid.requiredPaymentCents).toBe(400);
      expect(outbid.formattedRequiredPayment).toBe('$4.00');
    });
  });

  describe('3. All-Time Leaderboard and Decoupled Upvotes', () => {
    test('strictly orders by paidRankingAmountCents descending; upvotes do not affect rank', async () => {
      const prodAId = new Types.ObjectId();
      const prodBId = new Types.ObjectId();

      // Product A has $50.00 paid and 0 upvotes
      // Product B has $10.00 paid and 500 upvotes
      const mockProducts = [
        {
          _id: prodAId,
          name: 'Paid Sponsor A',
          paidRankingAmountCents: 5000,
          firstPaidAt: new Date('2026-01-01T00:00:00Z'),
          status: ProductStatus.LIVE,
        },
        {
          _id: prodBId,
          name: 'Viral Free B',
          paidRankingAmountCents: 1000,
          firstPaidAt: new Date('2026-01-02T00:00:00Z'),
          status: ProductStatus.LIVE,
        },
      ];

      (Product.countDocuments as jest.Mock).mockResolvedValue(2);
      const mockQueryChain: any = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockProducts),
      };
      (Product.find as jest.Mock).mockReturnValue(mockQueryChain);

      // Product B has 500 votes, Product A has 0 votes
      (Vote.aggregate as jest.Mock).mockResolvedValue([
        { _id: prodBId, count: 500 },
        { _id: prodAId, count: 0 },
      ]);
      (ActivityEvent.aggregate as jest.Mock).mockResolvedValue([]);
      (Review.aggregate as jest.Mock).mockResolvedValue([]);

      const result = await rankingService.getAllTimePayToRank(1, 10);

      expect(result.items.length).toBe(2);
      // Product A is Rank 1 despite having 0 upvotes because it has $50.00 paid
      expect(result.items[0].productId).toBe(prodAId.toString());
      expect(result.items[0].rank).toBe(1);
      expect(result.items[0].amountCents).toBe(5000);
      expect(result.items[0].formattedAmount).toBe('$50.00');
      expect(result.items[0].voteCount).toBe(0);

      // Product B is Rank 2 despite 500 upvotes because it has only $10.00 paid
      expect(result.items[1].productId).toBe(prodBId.toString());
      expect(result.items[1].rank).toBe(2);
      expect(result.items[1].amountCents).toBe(1000);
      expect(result.items[1].voteCount).toBe(500);
    });
  });

  describe('4. Daily Leaderboard and Immutable Archive Snapshots', () => {
    test('freezeDailyLeaderboard idempotently deletes previous snapshots and freezes immutable records', async () => {
      const freezeDate = new Date('2026-10-21T00:00:00.000Z');
      const prodId = new Types.ObjectId();

      // Mock getTodayPayToRank returning 1 product
      jest.spyOn(rankingService, 'getTodayPayToRank').mockResolvedValue({
        items: [
          {
            rank: 1,
            score: 25,
            amountCents: 2500,
            formattedAmount: '$25.00',
            productId: prodId.toString(),
            product: {
              _id: prodId,
              name: 'Leader Product',
              tagLine: 'Best SaaS',
              slug: 'best-saas',
              url: 'https://example.com',
            } as any,
            voteCount: 10,
            reviewCount: 2,
            qualifiedClickCount: 5,
          },
        ],
        total: 1,
        dateStr: '2026-10-21',
        rules: {} as any,
      });

      (DailyLeaderboardSnapshot.deleteMany as jest.Mock).mockResolvedValue({ deletedCount: 1 });
      (DailyLeaderboardSnapshot.insertMany as jest.Mock).mockResolvedValue([]);

      await rankingService.freezeDailyLeaderboard(freezeDate);

      // Verify idempotent deletion
      expect(DailyLeaderboardSnapshot.deleteMany).toHaveBeenCalledWith(
        expect.objectContaining({
          snapshotDate: freezeDate,
          leaderboardType: { $in: ['TODAY', 'LAUNCH_DAY'] },
        })
      );

      // Verify immutable snapshot insertion
      expect(DailyLeaderboardSnapshot.insertMany).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            rank: 1,
            paidAmountCents: 2500,
            productId: prodId,
            productSnapshot: expect.objectContaining({
              name: 'Leader Product',
              slug: 'best-saas',
            }),
          }),
        ])
      );
    });
  });
});
