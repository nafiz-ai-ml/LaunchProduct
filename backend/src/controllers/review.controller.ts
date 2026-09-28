import { Request, Response, NextFunction } from 'express';
import { reviewService } from '../services/review.service';
import { ValidationError, AuthenticationError } from '../shared/errors';

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

function getMetadata(req: Request, extra?: Record<string, unknown>) {
  return {
    requestId:
      (req.headers['x-request-id'] as string) ||
      (req as unknown as { id?: string }).id ||
      `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

export class ReviewController {
  /**
   * 1. POST /api/v1/reviews
   * Submit a rating and written commentary for a live product
   */
  async submitReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw new AuthenticationError('Authentication required to submit reviews');
      }

      const { productId, rating, title, body, content, conflictOfInterestDisclosed } = req.body;

      if (!productId) {
        throw new ValidationError('Product ID is required');
      }

      const review = await reviewService.submitReview(productId, req.user.userId, {
        rating: Number(rating),
        title,
        body: body || content,
        conflictOfInterestDisclosed: !!conflictOfInterestDisclosed,
      });

      res.status(201).json({
        success: true,
        data: {
          reviewId: review._id.toString(),
          rating: review.rating,
          status: review.status,
          createdAt: review.createdAt,
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 2. GET /api/v1/products/:id/reviews or GET /api/v1/reviews?productId=:id
   * List paginated approved community reviews with rating distribution
   */
  async getProductReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const productId = getParam(req.params.id) || (req.query.productId as string);
      if (!productId) {
        throw new ValidationError('Product ID is required in URL path or query parameter');
      }

      const page = req.query.page ? Number(req.query.page) : 1;
      const limit = req.query.limit ? Number(req.query.limit) : 10;
      const sortBy = req.query.sortBy as string;

      const result = await reviewService.getProductReviews(productId, { page, limit, sortBy });

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
   * 3. POST /api/v1/reviews/:id/reply
   * Post official founder reply to a community review
   */
  async founderReply(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw new AuthenticationError('Authentication required to post founder replies');
      }

      const reviewId = getParam(req.params.id);
      const replyContent = req.body.content || req.body.body || req.body.replyBody;

      if (!replyContent) {
        throw new ValidationError('Reply content is required');
      }

      const review = await reviewService.founderReplyToReview(
        reviewId,
        req.user.userId,
        replyContent
      );

      res.status(200).json({
        success: true,
        data: {
          reply: {
            content: review.founderReply?.body,
            repliedAt: review.founderReply?.repliedAt,
          },
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 4. POST /api/v1/reviews/:id/flag
   * Report review for spam, harassment, or policy violations
   */
  async flagReview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw new AuthenticationError('Authentication required to report reviews');
      }

      const reviewId = getParam(req.params.id);
      const reason = req.body.reason;

      if (!reason) {
        throw new ValidationError('Reason is required to flag a review');
      }

      await reviewService.flagReview(reviewId, req.user.userId, reason);

      res.status(200).json({
        success: true,
        data: {
          message: 'Review flagged for moderator investigation.',
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 5. GET /api/v1/reviews/:id
   * Fetch single review by ID
   */
  async getReviewById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const reviewId = getParam(req.params.id);
      const review = await reviewService.getReviewById(reviewId);

      res.status(200).json({
        success: true,
        data: review,
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const reviewController = new ReviewController();
export default reviewController;
