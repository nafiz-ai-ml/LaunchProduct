import request from 'supertest';
import { Types } from 'mongoose';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { createApp } from '../server';
import { authService } from '../services/auth.service';
import { userRepository } from '../repositories/user.repository';
import { UserRole } from '../shared/constants';
import { AuthenticationError, ValidationError } from '../shared/errors';

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

  // 1. POST /api/v1/auth/resend-verification with valid email → 200
  test('1. POST /api/v1/auth/resend-verification with valid email → 200', async () => {
    jest.spyOn(authService, 'resendVerificationCode').mockResolvedValue({
      success: true,
      message: 'A new 6-digit verification code has been sent to your email.',
    });

    const res = await request(app)
      .post('/api/v1/auth/resend-verification')
      .send({ email: 'alex.founder@supasite.io' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.message).toMatch(/verification code has been sent/i);
  });

  // 2. POST /api/v1/auth/resend-verification with invalid email → 400 VALIDATION_FAILED
  test('2. POST /api/v1/auth/resend-verification with invalid email → 400 VALIDATION_FAILED', async () => {
    const res = await request(app)
      .post('/api/v1/auth/resend-verification')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_FAILED');
  });

  // 3. POST /api/v1/auth/verify-email with valid 6-digit code → 200 + Set-Cookie header
  test('3. POST /api/v1/auth/verify-email with valid 6-digit code → 200 + Set-Cookie header', async () => {
    jest.spyOn(authService, 'verifyEmail').mockResolvedValue({
      user: mockUser as any,
      sessionToken: validSessionToken,
    });

    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ email: 'alex.founder@supasite.io', code: '123456' });

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

  // 4. GET /api/v1/auth/verify-email?token=validToken → 200 (JSON)
  test('4. GET /api/v1/auth/verify-email?token=validToken → 200 (JSON)', async () => {
    jest.spyOn(authService, 'verifyEmail').mockResolvedValue({
      user: mockUser as any,
      sessionToken: validSessionToken,
    });

    const res = await request(app)
      .get('/api/v1/auth/verify-email?token=validToken&format=json')
      .set('Accept', 'application/json');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(mockUser.email);
  });

  // 5. POST /api/v1/auth/verify-email with expired code → 400
  test('5. POST /api/v1/auth/verify-email with expired code → 400', async () => {
    jest.spyOn(authService, 'verifyEmail').mockRejectedValue(
      new ValidationError('Verification code has expired')
    );

    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ email: 'alex.founder@supasite.io', code: '999999' });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
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
