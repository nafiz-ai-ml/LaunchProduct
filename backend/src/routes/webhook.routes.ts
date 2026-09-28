import express, { Router } from 'express';
import { webhookController } from '../controllers/webhook.controller';

const router = Router();

// Middleware ensuring raw buffer body is available for signature verification
const rawBodyParser = express.raw({ type: 'application/json', limit: '2mb' });

/**
 * 1. POST /api/v1/webhooks/payment/:provider
 * Inbound Merchant of Record Webhook (Paddle, Lemon Squeezy)
 * Protected by provider cryptographic HMAC-SHA256 signature verification.
 */
router.post(
  '/payment/:provider',
  rawBodyParser,
  (req, res, next) => webhookController.handlePaymentWebhook(req, res, next)
);

/**
 * 2. POST /api/v1/webhooks/payment
 * Alias defaulting to primary MoR provider (Paddle)
 */
router.post(
  '/payment',
  rawBodyParser,
  (req, res, next) => webhookController.handlePaymentWebhook(req, res, next)
);

export default router;
