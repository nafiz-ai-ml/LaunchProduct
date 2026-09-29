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

export interface RegisterResult {
  requiresVerification: boolean;
  email: string;
  message: string;
  devVerificationCode?: string;
  devVerificationUrl?: string;
  user: IUser;
}

export class AuthService {
  /**
   * Helper: Dispatch 6-digit OTP and 1-click verification link to user inbox
   */
  async dispatchVerificationEmail(user: IUser, verificationCode: string, rawToken: string): Promise<string> {
    const frontendUrl = (process.env.FRONTEND_URL || config.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
    const verificationUrl = `${frontendUrl}/auth/verify-email?token=${rawToken}&email=${encodeURIComponent(user.email)}`;

    if (isRedisConnected()) {
      try {
        await emailQueue.add('send-verification-email', {
          to: user.email,
          verificationCode,
          verificationUrl,
          expiresInHours: 24,
        });
      } catch (err: any) {
        logger.warn({ err: err.message, email: user.email }, 'Failed to enqueue verification email to BullMQ');
      }
    } else {
      logger.info({ email: user.email, verificationCode, verificationUrl }, '📧 Verification dispatched (local dev log)');
    }

    if (process.env.NODE_ENV !== 'production') {
      logger.info(
        { email: user.email, verificationCode, verificationUrl },
        '🔐 [DEV AUTH] Email Verification Code & Link Generated'
      );
    }

    return verificationUrl;
  }

  /**
   * 1. Verify email using either 6-digit numeric OTP code or 1-click token
   */
  async verifyEmail(email?: string, code?: string, token?: string): Promise<AuthSessionResult> {
    if (!email && !token) {
      throw new ValidationError('Email address or verification token is required');
    }

    let user: IUser | null = null;
    const normalizedEmail = email ? email.toLowerCase().trim() : '';

    if (normalizedEmail) {
      user = await userRepository.findByEmail(normalizedEmail);
    } else if (token) {
      const hashed = crypto.createHash('sha256').update(token.trim()).digest('hex');
      user = await userRepository.findByVerificationToken(hashed);
    }

    if (!user) {
      throw new ValidationError('No account found for the provided email or verification token.');
    }

    if (user.isBanned) {
      throw new AuthorizationError(
        user.banReason ? `Account is banned: ${user.banReason}` : 'Account is banned',
        'ACCOUNT_BANNED'
      );
    }

    // If already verified, allow login
    if (user.isEmailVerified) {
      let updatedUser = await ensureAdminRole(user);
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
      return { user: updatedUser, sessionToken };
    }

    // Check expiry
    if (!user.emailVerificationExpires || new Date(user.emailVerificationExpires) <= new Date()) {
      throw new ValidationError('Verification code has expired. Please request a new verification code.', [
        { field: 'code', code: 'EXPIRED', message: 'Verification code has expired' },
      ]);
    }

    let isMatch = false;

    // Validate 6-digit code if provided
    if (code && user.emailVerificationCode) {
      if (user.emailVerificationCode.trim() === code.trim()) {
        isMatch = true;
      }
    }

    // Validate token if provided
    if (!isMatch && token && user.emailVerificationToken) {
      const hashed = crypto.createHash('sha256').update(token.trim()).digest('hex');
      if (crypto.timingSafeEqual(Buffer.from(hashed, 'hex'), Buffer.from(user.emailVerificationToken, 'hex'))) {
        isMatch = true;
      }
    }

    if (!isMatch) {
      throw new ValidationError('Invalid verification code or link. Please check the code and try again.', [
        { field: 'code', code: 'INVALID_CODE', message: 'Invalid verification code' },
      ]);
    }

    // Mark as verified and clear verification tokens
    let updatedUser = (await userRepository.updateById(user._id.toString(), {
      isEmailVerified: true,
      emailVerificationCode: undefined,
      emailVerificationToken: undefined,
      emailVerificationExpires: undefined,
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
   * 2. Resend 6-digit verification code to user email
   */
  async resendVerificationCode(email: string): Promise<{ success: boolean; message: string; devVerificationCode?: string }> {
    if (!email || !email.includes('@')) {
      throw new ValidationError('Valid email address is required');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await userRepository.findByEmail(normalizedEmail);

    if (!user) {
      // Return success silently to prevent enumeration
      return { success: true, message: 'If an account exists, a new verification code has been dispatched.' };
    }

    if (user.isEmailVerified) {
      return { success: true, message: 'This email is already verified. You can sign in immediately.' };
    }

    // Generate fresh OTP code and token
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await userRepository.updateById(user._id.toString(), {
      emailVerificationCode: verificationCode,
      emailVerificationToken: tokenHash,
      emailVerificationExpires,
    });

    await this.dispatchVerificationEmail(user, verificationCode, rawToken);

    return {
      success: true,
      message: 'A new 6-digit verification code has been sent to your email.',
      ...(process.env.NODE_ENV !== 'production' ? { devVerificationCode: verificationCode } : {}),
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
   * 5. Register user with full name, email and password (requires email verification)
   */
  async registerWithPassword(
    name: string,
    email: string,
    password: string,
    termsAccepted: boolean = false
  ): Promise<RegisterResult> {
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
    if (existingUser && existingUser.passwordHash && existingUser.isEmailVerified) {
      throw new ValidationError('An account with this email already exists. Please sign in instead.', [
        { field: 'email', code: 'EMAIL_ALREADY_EXISTS', message: 'Account already exists' },
      ]);
    }

    const passwordHash = hashPassword(password);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    let user: IUser;
    if (existingUser) {
      user = (await userRepository.updateById(existingUser._id.toString(), {
        name: name.trim(),
        passwordHash,
        isEmailVerified: false,
        emailVerificationCode: verificationCode,
        emailVerificationToken: tokenHash,
        emailVerificationExpires,
      })) || existingUser;
    } else {
      user = await userRepository.create({
        name: name.trim(),
        email: normalizedEmail,
        passwordHash,
        role: UserRole.HUNTER,
        isEmailVerified: false,
        emailVerificationCode: verificationCode,
        emailVerificationToken: tokenHash,
        emailVerificationExpires,
      });
    }

    user = await ensureAdminRole(user);

    const devVerificationUrl = await this.dispatchVerificationEmail(user, verificationCode, rawToken);

    return {
      requiresVerification: true,
      email: user.email,
      message: 'Please enter the 6-digit verification code sent to your email to activate your account.',
      devVerificationCode: process.env.NODE_ENV !== 'production' ? verificationCode : undefined,
      devVerificationUrl: process.env.NODE_ENV !== 'production' ? devVerificationUrl : undefined,
      user,
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

    // Verify email enforcement
    if (user.isEmailVerified === false) {
      // Automatically send a fresh code if expired or missing
      if (!user.emailVerificationCode || !user.emailVerificationExpires || new Date(user.emailVerificationExpires) <= new Date()) {
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

        await userRepository.updateById(user._id.toString(), {
          emailVerificationCode: verificationCode,
          emailVerificationToken: tokenHash,
          emailVerificationExpires,
        });

        await this.dispatchVerificationEmail(user, verificationCode, rawToken);
      }

      throw new AuthenticationError(
        'Your email address is not verified. Please enter the 6-digit verification code sent to your email.',
        'EMAIL_NOT_VERIFIED'
      );
    }

    // For legacy users created without the isEmailVerified flag, auto-mark verified
    if (user.isEmailVerified === undefined) {
      await userRepository.updateById(user._id.toString(), { isEmailVerified: true });
      user.isEmailVerified = true;
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
