import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { IUser } from '../models/User.model';
import { authService } from '../services/auth.service';
import { ActivityEvent } from '../models/ActivityEvent.model';
import { EventSource } from '../shared/constants';
import { config } from '../shared/config';
import { logger } from '../shared/logger';
import { ValidationError, AuthenticationError } from '../shared/errors';

const COOKIE_NAME = 'sessionToken';

const getCookieOptions = (days: number = 30) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: days * 24 * 60 * 60 * 1000, // days in ms
  path: '/',
  signed: true,
  ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
});

function getMetadata(req: Request) {
  return {
    requestId:
      (req.headers['x-request-id'] as string) ||
      (req as unknown as { id?: string }).id ||
      `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    timestamp: new Date().toISOString(),
  };
}

function getFrontendBaseUrl(): string {
  return (
    process.env.FRONTEND_URL ||
    config.FRONTEND_URL ||
    'http://localhost:3000'
  ).replace(/\/$/, '');
}

function getBackendBaseUrl(req: Request): string {
  if (process.env.BACKEND_URL) {
    return process.env.BACKEND_URL.replace(/\/$/, '');
  }
  const host = req.get('host') || 'localhost:4000';
  const protocol = (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim() || req.protocol || 'http';
  return `${protocol}://${host}`;
}

export class AuthController {
  /**
   * 1. POST /api/v1/auth/verify-email
   * GET /api/v1/auth/verify-email
   * Verify email using 6-digit OTP code or 1-click token
   */
  async verifyEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const email = (req.body?.email || req.query?.email) as string | undefined;
      const code = (req.body?.code || req.query?.code) as string | undefined;
      const token = (req.body?.token || req.query?.token) as string | undefined;

      if (!code && !token) {
        throw new ValidationError('A 6-digit verification code or token is required');
      }

      const { user, sessionToken } = await authService.verifyEmail(email, code, token);

      // Set 30-day HttpOnly cookie
      res.cookie(COOKIE_NAME, sessionToken, getCookieOptions(30));

      const acceptsJson =
        req.headers.accept?.includes('application/json') ||
        req.query?.format === 'json' ||
        req.method === 'POST';

      if (acceptsJson) {
        res.status(200).json({
          success: true,
          data: {
            user: {
              id: user._id.toString(),
              name: user.name,
              email: user.email,
              role: user.role,
              founderProfile: user.founderProfile,
              createdAt: user.createdAt,
            },
            sessionToken,
          },
          meta: getMetadata(req),
        });
        return;
      }

      // Default browser navigation: redirect to frontend dashboard
      const dashboardUrl = `${getFrontendBaseUrl()}/dashboard?verified=true`;
      res.redirect(302, dashboardUrl);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 2. POST /api/v1/auth/resend-verification
   * Resend 6-digit OTP verification code
   */
  async resendVerification(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const result = await authService.resendVerificationCode(email);

      res.status(200).json({
        success: true,
        data: result,
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 3. GET /api/v1/auth/oauth/:provider
   */
  async initiateOAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      throw new ValidationError(
        'OAuth authentication has been retired. LaunchProduct operates as an accountless Pay-to-Rank product discovery platform.'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * 4. GET /api/v1/auth/oauth/:provider/callback
   * Retired: LaunchProduct operates as an accountless Pay-to-Rank platform.
   */
  async handleOAuthCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      throw new ValidationError(
        'OAuth authentication has been retired. LaunchProduct operates as an accountless Pay-to-Rank product discovery platform.'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * 5. GET /api/v1/auth/me
   */
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw new AuthenticationError('Authentication required', 'UNAUTHORIZED');
      }

      const user = await authService.getSessionUser(req.user.userId);

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            founderProfile: user.founderProfile,
            isBanned: user.isBanned,
            lastLoginAt: user.lastLoginAt,
            createdAt: user.createdAt,
          },
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 6. POST /api/v1/auth/logout
   */
  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Clear session token cookie
      res.clearCookie(COOKIE_NAME, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        signed: true,
      });

      // Log activity_event: AUTH_LOGOUT
      if (req.user?.userId) {
        try {
          await ActivityEvent.create({
            userId: req.user.userId,
            eventType: 'AUTH_LOGOUT',
            eventSource: EventSource.INTERNAL,
            metadata: {
              ipAddress: req.ip,
            },
          });
        } catch (err) {
          logger.error({ err }, 'Failed to record AUTH_LOGOUT activity event');
        }
      }

      res.status(200).json({
        success: true,
        data: {
          message: 'Successfully logged out',
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 7. POST /api/v1/auth/register
   * Creates an account with Name, Email, and Password
   */
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { name, email, password, termsAccepted } = req.body;
      const result = await authService.registerWithPassword(
        name,
        email,
        password,
        Boolean(termsAccepted)
      );

      // Log AUTH_REGISTER activity event
      try {
        await ActivityEvent.create({
          userId: result.user._id,
          eventType: 'USER_REGISTERED',
          eventSource: EventSource.INTERNAL,
          metadata: {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            authType: 'PASSWORD',
          },
        });
      } catch (logErr) {
        logger.warn({ err: logErr }, 'Failed to record USER_REGISTERED event');
      }

      // Set 30-day session cookie for frictionless instant login
      res.cookie(COOKIE_NAME, result.sessionToken, getCookieOptions(30));

      res.status(201).json({
        success: true,
        data: {
          user: {
            id: result.user._id.toString(),
            name: result.user.name,
            email: result.user.email,
            role: result.user.role,
            createdAt: result.user.createdAt,
          },
          sessionToken: result.sessionToken,
          message: 'Account created successfully',
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 8. POST /api/v1/auth/login
   * Authenticates with Email and Password
   */
  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email, password, rememberMe } = req.body;
      const isRemembered = rememberMe !== false; // default true
      const { user, sessionToken } = await authService.loginWithPassword(
        email,
        password,
        isRemembered
      );

      const cookieDays = isRemembered ? 30 : 1;
      res.cookie(COOKIE_NAME, sessionToken, getCookieOptions(cookieDays));

      // Log AUTH_LOGIN activity event
      try {
        await ActivityEvent.create({
          userId: user._id,
          eventType: 'AUTH_LOGIN',
          eventSource: EventSource.INTERNAL,
          metadata: {
            ipAddress: req.ip,
            userAgent: req.headers['user-agent'],
            authType: 'PASSWORD',
          },
        });
      } catch (logErr) {
        logger.warn({ err: logErr }, 'Failed to record AUTH_LOGIN event');
      }

      res.status(200).json({
        success: true,
        data: {
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            founderProfile: user.founderProfile,
            createdAt: user.createdAt,
          },
          sessionToken,
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 9. POST /api/v1/auth/forgot-password
   * Generates password reset token
   */
  async forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const result = await authService.requestPasswordReset(email);

      res.status(200).json({
        success: true,
        data: {
          message: 'If an account exists with this email, a password reset link has been dispatched.',
          devResetLink: result.devResetLink,
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 10. POST /api/v1/auth/reset-password
   * Sets new password using reset token
   */
  async resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { token, newPassword } = req.body;
      await authService.resetPassword(token, newPassword);

      res.status(200).json({
        success: true,
        data: {
          message: 'Your password has been successfully reset. You can now sign in with your new password.',
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
export default authController;
