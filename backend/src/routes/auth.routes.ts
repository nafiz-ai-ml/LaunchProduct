import { Router } from 'express';
import { z } from 'zod';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { magicLinkRateLimit } from '../middleware/rate-limit.middleware';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// Validation Schemas
const magicLinkBodySchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address format'),
});

const verifyQuerySchema = z.object({
  token: z
    .string({ required_error: 'Verification token is required' })
    .min(1, 'Token cannot be empty'),
  format: z.string().optional(),
});

/**
 * 1. POST /api/v1/auth/magic-link
 * Request passwordless magic link email.
 * Guarded by magicLinkRateLimit (5 req/hour) & input validation.
 */
router.post(
  '/magic-link',
  magicLinkRateLimit,
  validate(magicLinkBodySchema, 'body'),
  (req, res, next) => authController.requestMagicLink(req, res, next)
);

/**
 * 2. GET /api/v1/auth/verify?token=<token>
 * Verify token from magic link email, set session cookie, and redirect to dashboard.
 */
router.get(
  '/verify',
  validate(verifyQuerySchema, 'query'),
  (req, res, next) => authController.verifyMagicLink(req, res, next)
);

/**
 * 3. GET /api/v1/auth/oauth/:provider
 * Initiate OAuth 2.0 social login flow (google | github).
 */
router.get('/oauth/:provider', (req, res, next) =>
  authController.initiateOAuth(req, res, next)
);

/**
 * 4. GET /api/v1/auth/oauth/:provider/callback
 * Process OAuth identity callback and exchange tokens.
 */
router.get('/oauth/:provider/callback', (req, res, next) =>
  authController.handleOAuthCallback(req, res, next)
);

/**
 * 5. GET /api/v1/auth/me
 * Retrieve profile of currently authenticated session user.
 * Guarded by requireAuth.
 */
router.get('/me', requireAuth, (req, res, next) =>
  authController.getMe(req, res, next)
);

/**
 * 6. POST /api/v1/auth/logout
 * Invalidate session cookie and log logout event.
 */
router.post('/logout', optionalAuth, (req, res, next) =>
  authController.logout(req, res, next)
);

/**
 * 7. POST /api/v1/auth/register
 * Register with name, email, password, and terms acceptance.
 */
router.post('/register', (req, res, next) =>
  authController.register(req, res, next)
);

/**
 * 8. POST /api/v1/auth/login
 * Log in with email, password, and rememberMe.
 */
router.post('/login', (req, res, next) =>
  authController.login(req, res, next)
);

/**
 * 9. POST /api/v1/auth/forgot-password
 * Request password reset link.
 */
router.post('/forgot-password', (req, res, next) =>
  authController.forgotPassword(req, res, next)
);

/**
 * 10. POST /api/v1/auth/reset-password
 * Complete password reset with token.
 */
router.post('/reset-password', (req, res, next) =>
  authController.resetPassword(req, res, next)
);

/**
 * 11. POST /api/v1/auth/claim-admin
 * Elevate current user to ADMIN
 */
router.post('/claim-admin', requireAuth, (req, res, next) =>
  authController.claimAdmin(req, res, next)
);

export default router;
