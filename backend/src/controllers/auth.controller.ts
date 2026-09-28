import { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { authService } from '../services/auth.service';
import { ActivityEvent } from '../models/ActivityEvent.model';
import { EventSource } from '../shared/constants';
import { config } from '../shared/config';
import { logger } from '../shared/logger';
import { ValidationError, AuthenticationError } from '../shared/errors';

const COOKIE_NAME = 'sessionToken';

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days (2,592,000 seconds)
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
  const protocol = req.protocol || 'http';
  return `${protocol}://${host}`;
}

export class AuthController {
  /**
   * 1. POST /api/v1/auth/magic-link
   */
  async requestMagicLink(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.body;
      const clientIp =
        (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
        req.ip ||
        req.socket.remoteAddress ||
        '127.0.0.1';

      const result = await authService.requestMagicLink(email, clientIp);

      // Security: always return 200 with generic message to prevent email enumeration
      res.status(200).json({
        success: true,
        data: {
          message: 'If eligible, a login link has been dispatched.',
          expiresInSeconds: 900,
          ...(process.env.NODE_ENV !== 'production'
            ? { devMagicLinkUrl: result.magicLinkUrl, rawToken: result.rawToken }
            : {}),
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 2. GET /api/v1/auth/verify?token=<token>
   */
  async verifyMagicLink(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.query.token as string;
      if (!token) {
        throw new ValidationError('Magic link token is required in query parameters', [
          { field: 'token', code: 'REQUIRED', message: 'Token query parameter cannot be empty' },
        ]);
      }

      const { user, sessionToken } = await authService.verifyMagicLink(token);

      // Set HttpOnly, Secure, SameSite=Lax, 30-day signed cookie
      res.cookie(COOKIE_NAME, sessionToken, getCookieOptions());

      // If requested as JSON (API client), return structured response
      const acceptsJson =
        req.headers.accept?.includes('application/json') ||
        req.query.format === 'json';

      if (acceptsJson) {
        res.status(200).json({
          success: true,
          data: {
            user: {
              id: user._id.toString(),
              email: user.email,
              role: user.role,
              founderProfile: user.founderProfile,
              createdAt: user.createdAt,
            },
          },
          meta: getMetadata(req),
        });
        return;
      }

      // Default browser navigation: redirect to frontend dashboard
      const dashboardUrl = `${getFrontendBaseUrl()}/dashboard`;
      res.redirect(302, dashboardUrl);
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
}

export const authController = new AuthController();
export default authController;
