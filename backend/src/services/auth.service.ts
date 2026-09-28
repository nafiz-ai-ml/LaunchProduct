import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/user.repository';
import { tokenRepository } from '../repositories/token.repository';
import { IUser } from '../models/User.model';
import { ActivityEvent } from '../models/ActivityEvent.model';
import { EventSource, UserRole } from '../shared/constants';
import {
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  UnprocessableError,
  ValidationError,
} from '../shared/errors';
import { config } from '../shared/config';
import { logger } from '../shared/logger';
import { emailQueue } from '../shared/email-queue';
import { isRedisConnected } from '../shared/redis';

/**
 * Common disposable / temporary email domains blacklist
 */
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'mailinator.com',
  'tempmail.com',
  'temp-mail.org',
  '10minutemail.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'sharklasers.com',
  'yopmail.com',
  'yopmail.fr',
  'yopmail.net',
  'throwawaymail.com',
  'trashmail.com',
  'trashmail.net',
  'trashmail.me',
  'getairmail.com',
  'dispostable.com',
  'fakeinbox.com',
  'maildrop.cc',
  'mohmal.com',
  'burnermail.io',
  'nada.ltd',
  'getnada.com',
  'crazymailing.com',
  'mytemp.email',
  'tempail.com',
  'fakemailgenerator.com',
  'armyspy.com',
  'cuvox.de',
  'dayrep.com',
  'fleckens.hu',
  'gustr.com',
  'jourrapide.com',
  'rhyta.com',
  'superrito.com',
  'teleworm.us',
  'tinemail.com',
]);

export interface AuthSessionResult {
  user: IUser;
  sessionToken: string;
}

export class AuthService {
  /**
   * 1. Request passwordless magic link
   */
  async requestMagicLink(email: string, ipAddress: string): Promise<{ rawToken: string; magicLinkUrl: string }> {
    if (!email || typeof email !== 'string') {
      throw new ValidationError('Email address is required', [
        { field: 'email', code: 'REQUIRED', message: 'Email address cannot be empty' },
      ]);
    }

    // Normalize and validate email
    const normalizedEmail = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      throw new ValidationError('Invalid email format', [
        { field: 'email', code: 'INVALID_FORMAT', message: 'Must be a valid RFC 5322 email address' },
      ]);
    }

    // Check disposable email blacklist
    const domain = normalizedEmail.split('@')[1];
    if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
      throw new UnprocessableError(
        'Disposable or temporary email addresses are not permitted',
        [
          {
            field: 'email',
            code: 'DISPOSABLE_EMAIL_REJECTED',
            message: `Domain '${domain}' is on the temporary email blacklist`,
          },
        ],
        'DISPOSABLE_EMAIL_REJECTED'
      );
    }

    // Find or create user in DB
    let user = await userRepository.findByEmail(normalizedEmail);
    if (!user) {
      user = await userRepository.create({
        email: normalizedEmail,
        role: UserRole.HUNTER,
      });
    }

    // Reject banned accounts
    if (user.isBanned) {
      throw new AuthorizationError(
        user.banReason ? `Account is banned: ${user.banReason}` : 'Account is banned',
        'ACCOUNT_BANNED'
      );
    }

    // Generate 32-byte cryptographically secure random token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Invalidate any existing MAGIC_LINK tokens for this user
    await tokenRepository.deleteByUserId(user._id.toString(), 'MAGIC_LINK');

    // Store token with 15-minute expiration
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    await tokenRepository.createToken(user._id.toString(), 'MAGIC_LINK', expiresAt, tokenHash);

    // Build raw magic link URL
    const baseUrl = process.env.FRONTEND_URL || config.FRONTEND_URL || 'https://launchproduct.io';
    const magicLinkUrl = `${baseUrl.replace(/\/$/, '')}/auth/verify?token=${rawToken}`;

    // Enqueue email job to BullMQ if Redis is available
    if (isRedisConnected()) {
      try {
        await emailQueue.add('send-magic-link', {
          to: normalizedEmail,
          magicLinkUrl,
          expiresInMinutes: 15,
        });
      } catch (err) {
        logger.warn({ err, email: normalizedEmail }, 'Failed to enqueue email to BullMQ, falling back to logger');
      }
    } else {
      logger.info({ email: normalizedEmail, magicLinkUrl }, 'Redis standby: direct dev magic link ready');
    }

    // In non-production, log magic link for easy manual testing
    if (process.env.NODE_ENV !== 'production') {
      logger.info({ email: normalizedEmail, magicLinkUrl }, '🔐 [DEV AUTH] Magic Link Generated');
    }

    // Log activity_event: AUTH_MAGIC_LINK_REQUESTED
    try {
      await ActivityEvent.create({
        userId: user._id,
        eventType: 'AUTH_MAGIC_LINK_REQUESTED',
        eventSource: EventSource.ORGANIC,
        metadata: {
          email: normalizedEmail,
          ipAddress,
        },
      });
    } catch (err) {
      logger.error({ err }, 'Failed to record AUTH_MAGIC_LINK_REQUESTED activity event');
    }

    return { rawToken, magicLinkUrl };
  }

  /**
   * 2. Verify magic link token and establish authenticated session
   */
  async verifyMagicLink(rawToken: string): Promise<AuthSessionResult> {
    if (!rawToken || typeof rawToken !== 'string') {
      throw new AuthenticationError('Verification token is missing', 'TOKEN_EXPIRED');
    }

    // Compute tokenHash from rawToken
    const computedHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    // Find token by hash in DB
    const tokenDoc = await tokenRepository.findByHash(computedHash, 'MAGIC_LINK');
    if (!tokenDoc || tokenDoc.isUsed || new Date(tokenDoc.expiresAt) <= new Date()) {
      throw new AuthenticationError('Magic link token is invalid or has expired', 'TOKEN_EXPIRED');
    }

    // Constant-time comparison using crypto.timingSafeEqual to prevent timing attacks
    const bufComputed = Buffer.from(computedHash, 'hex');
    const bufStored = Buffer.from(tokenDoc.tokenHash, 'hex');

    if (
      bufComputed.length !== bufStored.length ||
      !crypto.timingSafeEqual(bufComputed, bufStored)
    ) {
      throw new AuthenticationError('Invalid authentication credentials', 'INVALID_CREDENTIALS');
    }

    // Mark token as consumed
    await tokenRepository.markUsed(tokenDoc._id.toString());

    // Fetch user and update lastLoginAt
    const user = await userRepository.findById(tokenDoc.userId.toString());
    if (!user) {
      throw new AuthenticationError('User account not found', 'UNAUTHORIZED');
    }

    if (user.isBanned) {
      throw new AuthorizationError(
        user.banReason ? `Account is banned: ${user.banReason}` : 'Account is banned',
        'ACCOUNT_BANNED'
      );
    }

    const updatedUser = (await userRepository.updateById(user._id.toString(), {
      lastLoginAt: new Date(),
    })) || user;

    // Sign JWT session token (expiresIn: 30d)
    const secret = process.env.JWT_SECRET || config.JWT_SECRET;
    const sessionToken = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      secret,
      { expiresIn: '30d' }
    );

    return {
      user: updatedUser,
      sessionToken,
    };
  }

  /**
   * 3. Retrieve authenticated session user profile
   */
  async getSessionUser(userId: string): Promise<IUser> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new NotFoundError('User profile not found');
    }

    if (user.isBanned) {
      throw new AuthorizationError(
        user.banReason ? `Account is banned: ${user.banReason}` : 'Account is banned',
        'ACCOUNT_BANNED'
      );
    }

    return user;
  }

  /**
   * 4. Handle OAuth identity callback and establish authenticated session
   */
  async oauthCallback(
    provider: string,
    providerUserId: string,
    email: string
  ): Promise<AuthSessionResult> {
    if (!['google', 'github'].includes(provider)) {
      throw new ValidationError('Invalid OAuth provider', [
        { field: 'provider', code: 'INVALID_ENUM', message: 'Provider must be google or github' },
      ]);
    }

    const user = await userRepository.findOrCreateByOAuth(
      provider as 'google' | 'github',
      providerUserId,
      email
    );

    if (user.isBanned) {
      throw new AuthorizationError(
        user.banReason ? `Account is banned: ${user.banReason}` : 'Account is banned',
        'ACCOUNT_BANNED'
      );
    }

    const updatedUser = (await userRepository.updateById(user._id.toString(), {
      lastLoginAt: new Date(),
    })) || user;

    const secret = process.env.JWT_SECRET || config.JWT_SECRET;
    const sessionToken = jwt.sign(
      {
        userId: user._id.toString(),
        email: user.email,
        role: user.role,
      },
      secret,
      { expiresIn: '30d' }
    );

    return {
      user: updatedUser,
      sessionToken,
    };
  }
}

export const authService = new AuthService();
export default authService;
