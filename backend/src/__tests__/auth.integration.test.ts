import request from 'supertest';
import { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createApp } from '../server';
import { authService } from '../services/auth.service';
import { userRepository } from '../repositories/user.repository';
import { UserRole } from '../shared/constants';
import { AuthenticationError } from '../shared/errors';

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

describe('Auth Integration Tests (supertest)', () => {
  const app = createApp();
  const jwtSecret = config.JWT_SECRET;
  const cookieSecret = config.SESSION_COOKIE_SECRET;

  const mockUserId = new Types.ObjectId().toHexString();
  const mockUser = {
    _id: new Types.ObjectId(mockUserId),
    email: 'alex.founder@supasite.io',
    role: UserRole.FOUNDER,
    isBanned: false,
    founderProfile: { displayName: 'Alex Rivera' },
    createdAt: new Date(),
  };

  const validSessionToken = jwt.sign(
    { userId: mockUserId, email: mockUser.email, role: mockUser.role },
    jwtSecret,
    { expiresIn: '30d' }
  );

  const signedCookieValue = signCookie(validSessionToken, cookieSecret);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // 1. POST /api/v1/auth/magic-link with valid email → 200 + generic message
  test('1. POST /api/v1/auth/magic-link with valid email → 200 + generic message', async () => {
    jest.spyOn(authService, 'requestMagicLink').mockResolvedValue({
      rawToken: 'mock_token_123',
      magicLinkUrl: 'http://localhost:3000/auth/verify?token=mock_token_123',
    });

    const res = await request(app)
      .post('/api/v1/auth/magic-link')
      .send({ email: 'alex.founder@supasite.io' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toMatch(/login link has been dispatched/i);
    expect(res.body.data.expiresInSeconds).toBe(900);
  });

  // 2. POST /api/v1/auth/magic-link with invalid email → 400 VALIDATION_FAILED
  test('2. POST /api/v1/auth/magic-link with invalid email → 400 VALIDATION_FAILED', async () => {
    const res = await request(app)
      .post('/api/v1/auth/magic-link')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  // 3. POST /api/v1/auth/magic-link with disposable email domain → 422 DISPOSABLE_EMAIL_REJECTED
  test('3. POST /api/v1/auth/magic-link with disposable email domain → 422 DISPOSABLE_EMAIL_REJECTED', async () => {
    const res = await request(app)
      .post('/api/v1/auth/magic-link')
      .send({ email: 'spammer@mailinator.com' });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('DISPOSABLE_EMAIL_REJECTED');
  });

  // 4. GET /api/v1/auth/verify?token=validToken → 200 + Set-Cookie header
  test('4. GET /api/v1/auth/verify?token=validToken → 200 + Set-Cookie header', async () => {
    jest.spyOn(authService, 'verifyMagicLink').mockResolvedValue({
      user: mockUser as any,
      sessionToken: validSessionToken,
    });

    const res = await request(app)
      .get('/api/v1/auth/verify?token=validToken&format=json')
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(mockUser.email);

    // Verify Set-Cookie header is present with sessionToken
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(Array.isArray(setCookie)).toBe(true);
    expect(setCookie[0]).toContain('sessionToken=');
    expect(setCookie[0]).toContain('HttpOnly');
  });

  // 5. GET /api/v1/auth/verify?token=expiredToken → 401 TOKEN_EXPIRED
  test('5. GET /api/v1/auth/verify?token=expiredToken → 401 TOKEN_EXPIRED', async () => {
    jest.spyOn(authService, 'verifyMagicLink').mockRejectedValue(
      new AuthenticationError('Magic link token has expired', 'TOKEN_EXPIRED')
    );

    const res = await request(app)
      .get('/api/v1/auth/verify?token=expiredToken')
      .set('Accept', 'application/json');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('TOKEN_EXPIRED');
  });

  // 6. GET /api/v1/auth/verify?token=usedToken → 401 MAGIC_LINK_ALREADY_USED
  test('6. GET /api/v1/auth/verify?token=usedToken → 401 MAGIC_LINK_ALREADY_USED', async () => {
    jest.spyOn(authService, 'verifyMagicLink').mockRejectedValue(
      new AuthenticationError('Magic link token has already been used', 'MAGIC_LINK_ALREADY_USED')
    );

    const res = await request(app)
      .get('/api/v1/auth/verify?token=usedToken')
      .set('Accept', 'application/json');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('MAGIC_LINK_ALREADY_USED');
  });

  // 7. GET /api/v1/auth/me without cookie → 401 UNAUTHORIZED
  test('7. GET /api/v1/auth/me without cookie → 401 UNAUTHORIZED', async () => {
    const res = await request(app).get('/api/v1/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // 8. GET /api/v1/auth/me with valid cookie → 200 + user data
  test('8. GET /api/v1/auth/me with valid cookie → 200 + user data', async () => {
    jest.spyOn(userRepository, 'findById').mockResolvedValue(mockUser as any);
    jest.spyOn(authService, 'getSessionUser').mockResolvedValue(mockUser as any);

    const res = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', [`sessionToken=${signedCookieValue}`]);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(mockUser.email);
    expect(res.body.data.user.id).toBe(mockUserId);
  });

  // 9. POST /api/v1/auth/logout → 200 + clears cookie
  test('9. POST /api/v1/auth/logout → 200 + clears cookie', async () => {
    const res = await request(app).post('/api/v1/auth/logout');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toMatch(/logged out/i);

    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    // Cookie is cleared with max-age=0 or expires in past (Thu, 01 Jan 1970)
    expect(setCookie[0]).toContain('sessionToken=');
    expect(setCookie[0]).toContain('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  });
});
