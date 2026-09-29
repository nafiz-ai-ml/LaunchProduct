import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { userRepository } from '../repositories/user.repository';
import { tokenRepository } from '../repositories/token.repository';
import { User, IUser } from '../models/User.model';
import { ActivityEvent } from '../models/ActivityEvent.model';
import { EventSource, UserRole } from '../shared/constants';

function normalizeEmailForAdmin(email: string): string {
  const clean = email.toLowerCase().trim();
  const [local, domain] = clean.split('@');
  if (domain === 'gmail.com' || domain === 'googlemail.com') {
    return `${local.replace(/\./g, '')}@gmail.com`;
  }
  return clean;
}

/**
 * Ensures user is promoted to ADMIN if strictly listed in ADMIN_EMAILS or matches owner email.
 * Demotes any unauthorized user claiming ADMIN role.
 */
export async function ensureAdminRole(user: IUser): Promise<IUser> {
  try {
    const adminEmailsRaw = process.env.ADMIN_EMAILS || config.ADMIN_EMAILS || '';
    const adminEmails = adminEmailsRaw
      .toLowerCase()
      .split(',')
      .map((e: string) => e.trim())
      .filter(Boolean);

    // Hardcoded owner email safeguards
    adminEmails.push('developersnafiz@gmail.com', 'developers.nafiz@gmail.com');

    const userNormalized = normalizeEmailForAdmin(user.email);
    const isMatch = adminEmails.some(
      (adminEmail) =>
        normalizeEmailForAdmin(adminEmail) === userNormalized ||
        adminEmail.toLowerCase() === user.email.toLowerCase()
    );

    if (isMatch) {
      if (user.role !== UserRole.ADMIN) {
        user.role = UserRole.ADMIN;
        const updated = await userRepository.updateById(user._id.toString(), { role: UserRole.ADMIN });
        logger.info({ email: user.email }, '👑 User promoted to ADMIN via verified owner match');
        return updated || user;
      }
      return user;
    } else {
      // If user is currently marked ADMIN but not in authorized list, demote to HUNTER
      if (user.role === UserRole.ADMIN) {
        user.role = UserRole.HUNTER;
        const updated = await userRepository.updateById(user._id.toString(), { role: UserRole.HUNTER });
        logger.warn({ email: user.email }, '🛡️ Unauthorized ADMIN demoted to HUNTER');
        return updated || user;
      }
    }
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed during ensureAdminRole evaluation');
  }
  return user;
}
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
  rememberMe?: boolean;
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, combinedHash: string): boolean {
  try {
    const [salt, key] = combinedHash.split(':');
    if (!salt || !key) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    const derivedKey = crypto.scryptSync(password, salt, 64);
    return crypto.timingSafeEqual(keyBuffer, derivedKey);
  } catch {
    return false;
  }
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

    let updatedUser = (await userRepository.updateById(user._id.toString(), {
      lastLoginAt: new Date(),
    })) || user;

    updatedUser = await ensureAdminRole(updatedUser);

    // Sign JWT session token (expiresIn: 30d)
    const secret = process.env.JWT_SECRET || config.JWT_SECRET;
    const sessionToken = jwt.sign(
      {
        userId: updatedUser._id.toString(),
        email: updatedUser.email,
        role: updatedUser.role,
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

    const verifiedUser = await ensureAdminRole(user);
    return verifiedUser;
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

    let updatedUser = (await userRepository.updateById(user._id.toString(), {
      lastLoginAt: new Date(),
    })) || user;

    updatedUser = await ensureAdminRole(updatedUser);

    const secret = process.env.JWT_SECRET || config.JWT_SECRET;
    const sessionToken = jwt.sign(
      {
        userId: updatedUser._id.toString(),
        email: updatedUser.email,
        role: updatedUser.role,
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
   * 5. Register user with full name, email and password
   */
  async registerWithPassword(
    name: string,
    email: string,
    password: string,
    termsAccepted: boolean = false
  ): Promise<AuthSessionResult> {
    if (!termsAccepted) {
      throw new ValidationError('You must agree to the Terms of Service and Privacy Policy to create an account', [
        { field: 'termsAccepted', code: 'TERMS_REQUIRED', message: 'Terms and Privacy Policy must be accepted' },
      ]);
    }

    if (!name || name.trim().length < 2) {
      throw new ValidationError('Full name must be at least 2 characters', [
        { field: 'name', code: 'INVALID_LENGTH', message: 'Name must be at least 2 characters long' },
      ]);
    }

    if (!email || !email.includes('@')) {
      throw new ValidationError('Valid email is required', [
        { field: 'email', code: 'INVALID_FORMAT', message: 'Must be a valid RFC 5322 email address' },
      ]);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const domain = normalizedEmail.split('@')[1];
    if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
      throw new ValidationError('Temporary or disposable emails are not permitted', [
        { field: 'email', code: 'DISPOSABLE_EMAIL_REJECTED', message: 'Disposable email addresses are not permitted' },
      ]);
    }

    if (!password || password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters', [
        { field: 'password', code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters long' },
      ]);
    }

    const existingUser = await userRepository.findByEmail(normalizedEmail);
    if (existingUser && existingUser.passwordHash) {
      throw new ValidationError('An account with this email already exists. Please sign in instead.', [
        { field: 'email', code: 'EMAIL_ALREADY_EXISTS', message: 'Account already exists' },
      ]);
    }

    const passwordHash = hashPassword(password);

    let user: IUser;
    if (existingUser) {
      // User existed without password (e.g., from magic link or OAuth)
      user = (await userRepository.updateById(existingUser._id.toString(), {
        name: name.trim(),
        passwordHash,
        lastLoginAt: new Date(),
      })) || existingUser;
    } else {
      user = await userRepository.create({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: UserRole.HUNTER,
        lastLoginAt: new Date(),
      });
    }

    user = await ensureAdminRole(user);

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
      user,
      sessionToken,
      rememberMe: true,
    };
  }

  /**
   * 6. Authenticate user with email and password
   */
  async loginWithPassword(
    email: string,
    password: string,
    rememberMe: boolean = true
  ): Promise<AuthSessionResult> {
    if (!email || !password) {
      throw new ValidationError('Email and password are required', [
        { field: 'credentials', code: 'REQUIRED', message: 'Both email and password must be provided' },
      ]);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await userRepository.findByEmail(normalizedEmail);

    if (!user || !user.passwordHash) {
      throw new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    const isValid = verifyPassword(password, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Invalid email or password', 'INVALID_CREDENTIALS');
    }

    if (user.isBanned) {
      throw new AuthorizationError(
        user.banReason ? `Account is banned: ${user.banReason}` : 'Account is banned',
        'ACCOUNT_BANNED'
      );
    }

    let updatedUser = (await userRepository.updateById(user._id.toString(), {
      lastLoginAt: new Date(),
    })) || user;

    updatedUser = await ensureAdminRole(updatedUser);

    const secret = process.env.JWT_SECRET || config.JWT_SECRET;
    const expiresIn = rememberMe ? '30d' : '1d';
    const sessionToken = jwt.sign(
      {
        userId: updatedUser._id.toString(),
        email: updatedUser.email,
        role: updatedUser.role,
      },
      secret,
      { expiresIn }
    );

    return {
      user: updatedUser,
      sessionToken,
      rememberMe,
    };
  }

  /**
   * 7. Request password reset email
   */
  async requestPasswordReset(
    email: string
  ): Promise<{ success: boolean; devResetToken?: string; devResetLink?: string }> {
    if (!email || !email.includes('@')) {
      throw new ValidationError('Valid email address is required', [
        { field: 'email', code: 'INVALID_FORMAT', message: 'Must be a valid email address' },
      ]);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await userRepository.findByEmail(normalizedEmail);

    // If user does not exist, return success silently to prevent account enumeration
    if (!user) {
      return { success: true };
    }

    // Generate cryptographic reset token
    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    const resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    await userRepository.updateById(user._id.toString(), {
      resetPasswordToken: hashedToken,
      resetPasswordExpires,
    });

    const frontendUrl = (process.env.FRONTEND_URL || config.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const resetLink = `${frontendUrl}/auth/reset-password?token=${rawToken}`;

    // Queue email job if redis is active
    if (isRedisConnected()) {
      await emailQueue.add('send-password-reset-email', {
        to: user.email,
        subject: 'Reset your LaunchProduct password',
        resetLink,
      }).catch((err) => {
        logger.warn({ err: err.message }, 'Failed to queue password reset email');
      });
    }

    logger.info(`[DEV AUTH] Password Reset Link: ${resetLink}`);

    return {
      success: true,
      devResetToken: rawToken,
      devResetLink: resetLink,
    };
  }

  /**
   * 8. Complete password reset with token
   */
  async resetPassword(token: string, newPassword: string): Promise<{ success: boolean }> {
    if (!token || typeof token !== 'string') {
      throw new ValidationError('Reset token is required');
    }

    if (!newPassword || newPassword.length < 8) {
      throw new ValidationError('New password must be at least 8 characters long', [
        { field: 'newPassword', code: 'WEAK_PASSWORD', message: 'Password must be at least 8 characters' },
      ]);
    }

    const hashedToken = crypto.createHash('sha256').update(token.trim()).digest('hex');
    const user = await userRepository.findByResetToken(hashedToken);

    if (!user) {
      throw new ValidationError('Password reset link is invalid or has expired');
    }

    const passwordHash = hashPassword(newPassword);

    await userRepository.updateById(user._id.toString(), {
      passwordHash,
      resetPasswordToken: undefined,
      resetPasswordExpires: undefined,
    });

    return { success: true };
  }
}

export const authService = new AuthService();
export default authService;
