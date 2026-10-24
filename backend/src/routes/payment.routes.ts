import { Router } from 'express';
import { z } from 'zod';
import { paymentService } from '../services/payment.service';
import { validate } from '../middleware/validate.middleware';
import { publicRateLimit } from '../middleware/rate-limit.middleware';

const router = Router();

function getMetadata(extra?: Record<string, unknown>) {
  return {
    timestamp: new Date().toISOString(),
    commercialDisclosure:
      'Positions are determined by verified qualifying paid ranking amounts, not independent editorial endorsement.',
    ...extra,
  };
}

const rankCheckoutSchema = z.object({
  productId: z.string({ required_error: 'Product ID is required' }).trim().min(1),
  amountCents: z.number({ required_error: 'Amount in cents is required' }).int().positive(),
  payerEmail: z.string().email().optional(),
  contributionType: z.enum(['INITIAL_ENTRY', 'DAILY', 'ALL_TIME_BOOST']).optional(),
  provider: z.enum(['paddle']).optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

/**
 * 1. POST /api/v1/payments/rank-checkout
 * Initiates Pay-to-Rank checkout session via MoR provider (accountless).
 */
router.post(
  '/rank-checkout',
  publicRateLimit,
  validate(rankCheckoutSchema, 'body'),
  async (req, res, next) => {
    try {
      const { productId, amountCents, payerEmail, contributionType, provider, successUrl, cancelUrl } = req.body;
      const defaultSuccessUrl = successUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/?status=success&paid=true`;
      const defaultCancelUrl = cancelUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/?status=cancelled`;

      const result = await paymentService.createRankingCheckout({
        productId,
        payerEmail,
        contributionType,
        amountCents,
        successUrl: defaultSuccessUrl,
        cancelUrl: defaultCancelUrl,
        provider: provider || 'paddle',
      });

      res.status(200).json({
        success: true,
        data: result,
        meta: getMetadata(),
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
