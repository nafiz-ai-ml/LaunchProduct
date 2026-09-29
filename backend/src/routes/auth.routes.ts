import { Router } from 'express';
import { z } from 'zod';
import { authController } from '../controllers/auth.controller';
import { validate } from '../middleware/validate.middleware';
import { magicLinkRateLimit } from '../middleware/rate-limit.middleware';
import { requireAuth, optionalAuth } from '../middleware/auth.middleware';

const router = Router();

// Validation Schemas
const verifyEmailSchema = z.object({
  email: z.string().trim().email().optional(),
  code: z.string().trim().optional(),
  token: z.string().trim().optional(),
});

const resendVerificationSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Invalid email address format'),
});

/**
 * 1. POST /api/v1/auth/verify-email
 * Verify user email with 6-digit OTP code or 1-click token
 */
router.post(
  '/verify-email',
  validate(verifyEmailSchema, 'body'),
  (req, res, next) => authController.verifyEmail(req, res, next)
);

/**
 * 2. GET /api/v1/auth/verify-email
 * 1-click email verification via query parameters (?token=...&email=...)
 */
router.get('/verify-email', (req, res, next) =>
  authController.verifyEmail(req, res, next)
);

/**
 * Legacy /verify redirect for backward compatibility
 */
router.get('/verify', (req, res, next) =>
  authController.verifyEmail(req, res, next)
);

/**
 * 3. POST /api/v1/auth/resend-verification
 * Resend 6-digit OTP email verification code
 */
router.post(
  '/resend-verification',
  magicLinkRateLimit,
  validate(resendVerificationSchema, 'body'),
  (req, res, next) => authController.resendVerification(req, res, next)
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

export default router;

