import { Router } from 'express';
import { z } from 'zod';
import { paymentService } from '../services/payment.service';
import { Payment } from '../models/Payment.model';
import { RankingLedger } from '../models/RankingLedger.model';
import { Product } from '../models/Product.model';
import { validate } from '../middleware/validate.middleware';
import { requireAuth } from '../middleware/auth.middleware';
import { authRateLimit } from '../middleware/rate-limit.middleware';
import { AuthenticationError, NotFoundError, ValidationError } from '../shared/errors';
import { Types } from 'mongoose';

const router = Router();

function getMetadata(extra?: Record<string, unknown>) {
  return {
    timestamp: new Date().toISOString(),
    commercialDisclosure: 'Positions are determined by verified qualifying paid ranking amounts, not independent editorial endorsement.',
    ...extra,
  };
}

const rankCheckoutSchema = z.object({
  productId: z.string({ required_error: 'Product ID is required' }).trim().min(1),
  amountCents: z.number({ required_error: 'Amount in cents is required' }).int().positive(),
  provider: z.enum(['paddle', 'lemonsqueezy']).optional(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

/**
 * 1. POST /api/v1/payments/rank-checkout
 * Initiates Pay-to-Rank checkout session via MoR provider
 */
router.post(
  '/rank-checkout',
  requireAuth,
  authRateLimit,
  validate(rankCheckoutSchema, 'body'),
  async (req, res, next) => {
    try {
      if (!req.user?.userId) {
        throw new AuthenticationError('Authentication required to purchase rank', 'UNAUTHORIZED');
      }

      const { productId, amountCents, provider, successUrl, cancelUrl } = req.body;
      const defaultSuccessUrl = successUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?status=success&paid=true`;
      const defaultCancelUrl = cancelUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard?status=cancelled`;

      const result = await paymentService.createRankingCheckout({
        productId,
        founderId: req.user.userId,
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

/**
 * 2. GET /api/v1/payments/history
 * List all payments and ledger entries for the authenticated founder
 */
router.get('/history', requireAuth, authRateLimit, async (req, res, next) => {
  try {
    if (!req.user?.userId) {
      throw new AuthenticationError('Authentication required to view payment history', 'UNAUTHORIZED');
    }

    const founderId = new Types.ObjectId(req.user.userId);
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string, 10) || 20));
    const skip = (page - 1) * limit;

    const [payments, total, ledgerEntries] = await Promise.all([
      Payment.find({ founderId })
        .populate('productId', 'name slug logoUrl')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Payment.countDocuments({ founderId }),
      RankingLedger.find({ founderId })
        .sort({ appliedAt: -1 })
        .limit(50)
        .lean(),
    ]);

    const formattedPayments = payments.map((p) => ({
      id: p._id,
      paymentType: p.paymentType || 'RANKING',
      productId: p.productId,
      amountCents: p.amountCents,
      rankingContributionCents: p.rankingContributionCents || 0,
      formattedAmount: `$${(p.amountCents / 100).toFixed(2)}`,
      currency: p.currency,
      status: p.status,
      provider: p.provider,
      providerPaymentId: p.providerPaymentId,
      targetDailyDate: p.targetDailyDate,
      appliedToRanking: p.appliedToRanking,
      createdAt: p.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: {
        payments: formattedPayments,
        recentLedger: ledgerEntries,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
      meta: getMetadata(),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * 3. GET /api/v1/payments/product/:productId
 * Retrieve Pay-to-Rank audit ledger history for a specific product
 */
router.get('/product/:productId', requireAuth, authRateLimit, async (req, res, next) => {
  try {
    if (!req.user?.userId) {
      throw new AuthenticationError('Authentication required', 'UNAUTHORIZED');
    }

    const rawParam = req.params.productId;
    const productId = Array.isArray(rawParam) ? rawParam[0] : (rawParam as string);
    if (!productId || !Types.ObjectId.isValid(productId)) {
      throw new ValidationError('Valid productId parameter is required', [
        { field: 'productId', code: 'INVALID', message: 'Valid productId is required' },
      ]);
    }

    const product = await Product.findById(productId).lean();
    if (!product) {
      throw new NotFoundError(`Product '${productId}' not found`);
    }

    // Tenant authorization check
    const isOwner =
      (product.founderId && product.founderId.toString() === req.user.userId) ||
      (product.submittedById && product.submittedById.toString() === req.user.userId) ||
      req.user.role === 'ADMIN';

    if (!isOwner) {
      throw new AuthenticationError('You are not authorized to view this product payment history', 'FORBIDDEN');
    }

    const ledger = await RankingLedger.find({ productId: new Types.ObjectId(productId) })
      .sort({ appliedAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: {
        productId,
        productName: product.name,
        allTimePaidCents: product.paidRankingAmountCents || 0,
        formattedAllTimePaid: `$${((product.paidRankingAmountCents || 0) / 100).toFixed(2)}`,
        todayPaidCents: product.todayPaidAmountCents || 0,
        formattedTodayPaid: `$${((product.todayPaidAmountCents || 0) / 100).toFixed(2)}`,
        todayPaidDate: product.todayPaidDate,
        ledger,
      },
      meta: getMetadata(),
    });
  } catch (error) {
    next(error);
  }
});

export default router;
