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
      const { provider } = req.params;
      const returnUrl = (req.query.returnUrl as string) || '/dashboard';
      const statePayload = Buffer.from(
        JSON.stringify({ returnUrl, nonce: Math.random().toString(36).substring(2) })
      ).toString('base64');

      const backendUrl = getBackendBaseUrl(req);
      const callbackUrl = `${backendUrl}/api/v1/auth/oauth/${provider}/callback`;

      if (provider === 'google') {
        const clientId = process.env.GOOGLE_CLIENT_ID || config.GOOGLE_CLIENT_ID;
        if (!clientId) {
          throw new ValidationError('Google OAuth is not configured on this server');
        }
        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${encodeURIComponent(
          clientId
        )}&redirect_uri=${encodeURIComponent(
          callbackUrl
        )}&scope=openid%20email%20profile&state=${encodeURIComponent(statePayload)}&access_type=offline&prompt=consent`;

        res.redirect(302, authUrl);
        return;
      }

      if (provider === 'github') {
        const clientId = process.env.GITHUB_CLIENT_ID || config.GITHUB_CLIENT_ID;
        if (!clientId) {
          throw new ValidationError('GitHub OAuth is not configured on this server');
        }
        const authUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
          clientId
        )}&redirect_uri=${encodeURIComponent(
          callbackUrl
        )}&scope=read:user%20user:email&state=${encodeURIComponent(statePayload)}`;

        res.redirect(302, authUrl);
        return;
      }

      throw new ValidationError(`Unsupported OAuth provider: '${provider}'. Must be google or github.`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * 4. GET /api/v1/auth/oauth/:provider/callback
   */
  async handleOAuthCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { provider } = req.params;
      const { code, state } = req.query;

      if (!code || typeof code !== 'string') {
        throw new ValidationError('OAuth authorization code is missing from callback');
      }

      let returnUrl = '/dashboard';
      if (state && typeof state === 'string') {
        try {
          const parsedState = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
          if (parsedState.returnUrl && typeof parsedState.returnUrl === 'string') {
            returnUrl = parsedState.returnUrl.startsWith('/') ? parsedState.returnUrl : '/dashboard';
          }
        } catch {
          // Ignore invalid state decode and use default dashboard
        }
      }

      const backendUrl = getBackendBaseUrl(req);
      const callbackUrl = `${backendUrl}/api/v1/auth/oauth/${provider}/callback`;

      let providerUserId = '';
      let email = '';

      if (provider === 'google') {
        const clientId = process.env.GOOGLE_CLIENT_ID || config.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET || config.GOOGLE_CLIENT_SECRET;

        // Exchange code for Google tokens
        const tokenRes = await axios.post(
          'https://oauth2.googleapis.com/token',
          new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: callbackUrl,
            grant_type: 'authorization_code',
          }),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
        );

        const accessToken = tokenRes.data.access_token;

        // Fetch user info from Google
        const userinfoRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        providerUserId = userinfoRes.data.sub;
        email = userinfoRes.data.email;
      } else if (provider === 'github') {
        const clientId = process.env.GITHUB_CLIENT_ID || config.GITHUB_CLIENT_ID;
        const clientSecret = process.env.GITHUB_CLIENT_SECRET || config.GITHUB_CLIENT_SECRET;

        // Exchange code for GitHub token
        const tokenRes = await axios.post(
          'https://github.com/login/oauth/access_token',
          {
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: callbackUrl,
          },
          { headers: { Accept: 'application/json' } }
        );

        const accessToken = tokenRes.data.access_token;
        if (!accessToken) {
          throw new AuthenticationError('Failed to obtain access token from GitHub', 'UNAUTHORIZED');
        }

        // Fetch GitHub user profile
        const userRes = await axios.get('https://api.github.com/user', {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'User-Agent': 'LaunchProduct-Auth',
          },
        });

        providerUserId = String(userRes.data.id);
        email = userRes.data.email;

        // If email is private, query emails endpoint
        if (!email) {
          const emailsRes = await axios.get('https://api.github.com/user/emails', {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'User-Agent': 'LaunchProduct-Auth',
            },
          });
          const primary = emailsRes.data.find(
            (e: { primary: boolean; verified: boolean; email: string }) => e.primary && e.verified
          );
          email = primary ? primary.email : emailsRes.data[0]?.email;
        }
      } else {
        throw new ValidationError(`Unsupported OAuth provider: '${provider}'`);
      }

      if (!email) {
        throw new AuthenticationError(
          `Unable to retrieve verified email address from ${provider}`,
          'UNAUTHORIZED'
        );
      }

      const { sessionToken } = await authService.oauthCallback(
        provider,
        providerUserId,
        email
      );

      // Set session cookie
      res.cookie(COOKIE_NAME, sessionToken, getCookieOptions());

      // Redirect to target frontend dashboard
      const targetUrl = `${getFrontendBaseUrl()}${returnUrl}`;
      res.redirect(302, targetUrl);
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

      res.status(201).json({
        success: true,
        data: {
          requiresVerification: result.requiresVerification,
          email: result.email,
          message: result.message,
          user: {
            id: result.user._id.toString(),
            name: result.user.name,
            email: result.user.email,
            role: result.user.role,
            createdAt: result.user.createdAt,
          },
          ...(process.env.NODE_ENV !== 'production'
            ? {
                devVerificationCode: result.devVerificationCode,
                devVerificationUrl: result.devVerificationUrl,
              }
            : {}),
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
