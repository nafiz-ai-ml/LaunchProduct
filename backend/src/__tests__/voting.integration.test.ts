import request from 'supertest';
import { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createApp } from '../server';
import { votingService } from '../services/voting.service';
import { userRepository } from '../repositories/user.repository';
import { UserRole, VoteStatus } from '../shared/constants';
import { ConflictError, UnprocessableError } from '../shared/errors';

import { config } from '../shared/config';

function signCookie(val: string, secret: string): string {
  return 's:' + val + '.' + crypto.createHmac('sha256', secret).update(val).digest('base64').replace(/=+$/, '');
}

// Mock dependencies
jest.mock('../shared/db', () => ({
  connectDB: jest.fn().mockResolvedValue(undefined),
  isDBConnected: jest.fn().mockReturnValue(true),
}));

jest.mock('../shared/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
    zincrby: jest.fn().mockResolvedValue('1'),
  },
  isRedisConnected: jest.fn().mockReturnValue(false),
}));

jest.mock('../shared/email-queue', () => ({
  emailQueue: {
    add: jest.fn().mockResolvedValue({ id: 'job_123' }),
  },
}));

jest.mock('../models/ActivityEvent.model', () => ({
  ActivityEvent: {
    create: jest.fn().mockResolvedValue({}),
  },
}));

describe('Voting API Integration Tests (supertest)', () => {
  const app = createApp();
  const jwtSecret = config.JWT_SECRET;
  const cookieSecret = config.SESSION_COOKIE_SECRET;

  const mockUserId = new Types.ObjectId().toHexString();
  const mockProductId = new Types.ObjectId().toHexString();

  const regularUser = {
    _id: new Types.ObjectId(mockUserId),
    email: 'voter@launchproduct.io',
    role: UserRole.HUNTER,
    isBanned: false,
    createdAt: new Date(),
  };

  const bannedUser = {
    _id: new Types.ObjectId(),
    email: 'banned@launchproduct.io',
    role: UserRole.HUNTER,
    isBanned: true,
    banReason: 'Sybil voting farm detected',
    createdAt: new Date(),
  };

  const regularToken = jwt.sign(
    { userId: regularUser._id.toHexString(), email: regularUser.email, role: regularUser.role },
    jwtSecret,
    { expiresIn: '30d' }
  );

  const bannedToken = jwt.sign(
    { userId: bannedUser._id.toHexString(), email: bannedUser.email, role: bannedUser.role },
    jwtSecret,
    { expiresIn: '30d' }
  );

  const regularCookie = signCookie(regularToken, cookieSecret);
  const bannedCookie = signCookie(bannedToken, cookieSecret);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // 1. POST /api/v1/votes without auth → 401
  test('1. POST /api/v1/votes without auth → 401', async () => {
    const res = await request(app)
      .post('/api/v1/votes')
      .send({ productId: mockProductId });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // 2. POST /api/v1/votes with banned account → 403 ACCOUNT_BANNED
  test('2. POST /api/v1/votes with banned account → 403 ACCOUNT_BANNED', async () => {
    jest.spyOn(userRepository, 'findById').mockResolvedValue(bannedUser as any);

    const res = await request(app)
      .post('/api/v1/votes')
      .set('Cookie', [`sessionToken=${bannedCookie}`])
      .send({ productId: mockProductId });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('ACCOUNT_BANNED');
  });

  // 3. POST /api/v1/votes for non-LIVE product → 422
  test('3. POST /api/v1/votes for non-LIVE product → 422', async () => {
    jest.spyOn(userRepository, 'findById').mockResolvedValue(regularUser as any);
    jest.spyOn(votingService, 'castVote').mockRejectedValue(
      new UnprocessableError(
        'Votes can only be cast for products with LIVE status',
        'PRODUCT_NOT_LIVE'
      )
    );

    const res = await request(app)
      .post('/api/v1/votes')
      .set('Cookie', [`sessionToken=${regularCookie}`])
      .send({ productId: mockProductId });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('PRODUCT_NOT_LIVE');
  });

  // 4. POST /api/v1/votes → 200 { status: 'VALID', currentVoteCount: 1 }
  test('4. POST /api/v1/votes → 200 { status: \'VALID\', currentVoteCount: 1 }', async () => {
    jest.spyOn(userRepository, 'findById').mockResolvedValue(regularUser as any);
    jest.spyOn(votingService, 'castVote').mockResolvedValue({
      voteId: new Types.ObjectId().toHexString(),
      status: VoteStatus.VALID,
      newLiveVoteCount: 1,
      currentVoteCount: 1,
    });

    const res = await request(app)
      .post('/api/v1/votes')
      .set('Cookie', [`sessionToken=${regularCookie}`])
      .send({ productId: mockProductId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('VALID');
    expect(res.body.data.newLiveVoteCount).toBe(1);
  });

  // 5. POST /api/v1/votes again for same product → 409 VOTE_ALREADY_CAST
  test('5. POST /api/v1/votes again for same product → 409 VOTE_ALREADY_CAST', async () => {
    jest.spyOn(userRepository, 'findById').mockResolvedValue(regularUser as any);
    jest.spyOn(votingService, 'castVote').mockRejectedValue(
      new ConflictError(
        'You have already cast an active upvote for this product',
        'VOTE_ALREADY_CAST'
      )
    );

    const res = await request(app)
      .post('/api/v1/votes')
      .set('Cookie', [`sessionToken=${regularCookie}`])
      .send({ productId: mockProductId });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VOTE_ALREADY_CAST');
  });

  // 6. DELETE /api/v1/votes within 15 minutes → 200
  test('6. DELETE /api/v1/votes within 15 minutes → 200', async () => {
    jest.spyOn(userRepository, 'findById').mockResolvedValue(regularUser as any);
    jest.spyOn(votingService, 'retractVote').mockResolvedValue({
      productId: mockProductId,
      status: VoteStatus.RETRACTED,
      newLiveVoteCount: 0,
    });

    const res = await request(app)
      .delete(`/api/v1/votes/${mockProductId}`)
      .set('Cookie', [`sessionToken=${regularCookie}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('RETRACTED');
    expect(res.body.data.newLiveVoteCount).toBe(0);
  });

  // 7. DELETE /api/v1/votes after 15 minutes → 422
  test('7. DELETE /api/v1/votes after 15 minutes → 422', async () => {
    jest.spyOn(userRepository, 'findById').mockResolvedValue(regularUser as any);
    jest.spyOn(votingService, 'retractVote').mockRejectedValue(
      new UnprocessableError(
        'Votes can only be retracted within 15 minutes of casting',
        'RETRACT_WINDOW_EXPIRED'
      )
    );

    const res = await request(app)
      .delete(`/api/v1/votes/${mockProductId}`)
      .set('Cookie', [`sessionToken=${regularCookie}`]);

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('RETRACT_WINDOW_EXPIRED');
  });
});
