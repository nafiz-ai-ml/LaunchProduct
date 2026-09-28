import { Types } from 'mongoose';
import { Review, IReview } from '../models/Review.model';
import { Product } from '../models/Product.model';
import { User } from '../models/User.model';
import { OwnershipVerification } from '../models/OwnershipVerification.model';
import { ActivityEvent } from '../models/ActivityEvent.model';
import { SystemSettings } from '../models/SystemSettings.model';
import { EventSource, ProductStatus } from '../shared/constants';
import {
  ValidationError,
  NotFoundError,
  AuthorizationError,
  ConflictError,
} from '../shared/errors';
import { logger } from '../shared/logger';

export interface SubmitReviewDTO {
  rating: number;
  title?: string;
  body?: string;
  content?: string;
  conflictOfInterestDisclosed?: boolean;
}

export interface GetProductReviewsOptions {
  page?: number;
  limit?: number;
  sortBy?: 'newest' | 'oldest' | 'highest' | 'lowest' | string;
}

export interface ReviewAggregateStats {
  averageRating: number;
  totalCount: number;
  ratingDistribution: Record<string, number>;
}

export class ReviewService {
  /**
   * 1. Submit a product review
   * Business Rules:
   * - Product must be LIVE.
   * - Reviewer account age >= 48 hours.
   * - Reviewer cannot be the verified founder or submitter of the product.
   * - One review per user per product (compound unique index).
   * - Auto-approved or PENDING based on system settings.
   * - Logs activity_event: REVIEW_SUBMITTED.
   */
  async submitReview(
    productId: string,
    userId: string,
    reviewData: SubmitReviewDTO
  ): Promise<IReview> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new ValidationError(`Invalid product ID format: '${productId}'`);
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new ValidationError(`Invalid user ID format: '${userId}'`);
    }

    const { rating, conflictOfInterestDisclosed } = reviewData;
    const body = (reviewData.body || reviewData.content || '').trim();
    const title = (reviewData.title || `Review for product`).trim();

    // 1. Validation
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      throw new ValidationError('Rating must be an integer between 1 and 5');
    }

    if (!body || body.length < 20 || body.length > 2000) {
      throw new ValidationError('Review content must be between 20 and 2000 characters');
    }

    if (title.length < 3 || title.length > 100) {
      throw new ValidationError('Review title must be between 3 and 100 characters');
    }

    // 2. Verify product is LIVE
    const product = await Product.findById(productId);
    if (!product) {
      throw new NotFoundError(`Product '${productId}' not found`);
    }

    if (product.status !== ProductStatus.LIVE && (product.status as string) !== 'LIVE') {
      throw new ValidationError('Reviews can only be submitted for live products');
    }

    // 3. Verify user account age >= 48 hours
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError(`User '${userId}' not found`);
    }

    const userCreatedTime = new Date(user.createdAt).getTime();
    const fortyEightHoursMs = 48 * 60 * 60 * 1000;
    const accountAgeMs = Date.now() - userCreatedTime;

    if (accountAgeMs < fortyEightHoursMs) {
      throw new AuthorizationError(
        'Account must be at least 48 hours old to submit community reviews',
        'ACCOUNT_AGE_INSUFFICIENT'
      );
    }

    // 4. Block self-reviews (founder or submitter cannot review their own product)
    const isDirectFounder =
      (product.founderId && product.founderId.toString() === userId.toString()) ||
      (product.submittedById && product.submittedById.toString() === userId.toString());

    if (isDirectFounder) {
      throw new AuthorizationError(
        'Self-reviews are prohibited. Founders and submitters cannot review their own products',
        'SELF_REVIEW_BLOCKED'
      );
    }

    const verifiedOwnership = await OwnershipVerification.findOne({
      productId: product._id,
      founderId: new Types.ObjectId(userId),
      status: 'VERIFIED',
    });

    if (verifiedOwnership) {
      throw new AuthorizationError(
        'Verified makers are not permitted to review their own products',
        'SELF_REVIEW_BLOCKED'
      );
    }

    // 5. Check no existing review from this user for this product
    const existingReview = await Review.findOne({
      productId: product._id,
      userId: new Types.ObjectId(userId),
    });

    if (existingReview) {
      throw new ConflictError(
        'You have already submitted a review for this product',
        'REVIEW_ALREADY_EXISTS'
      );
    }

    // 6. Check moderation / auto-approve setting
    let reviewStatus: 'PENDING' | 'APPROVED' = 'APPROVED';
    try {
      const autoApproveSetting = await SystemSettings.findOne({ key: 'review_auto_approve' });
      if (
        autoApproveSetting &&
        ((autoApproveSetting.value as any) === false ||
          (autoApproveSetting.value as any)?.enabled === false)
      ) {
        reviewStatus = 'PENDING';
      }
    } catch {
      // Default to APPROVED if settings lookup fails
      reviewStatus = 'APPROVED';
    }

    // 7. Create review
    const review = await Review.create({
      productId: product._id,
      userId: new Types.ObjectId(userId),
      rating,
      title,
      body,
      status: reviewStatus,
      conflictOfInterestDisclosed: !!conflictOfInterestDisclosed,
    });

    // 8. Log activity_event: REVIEW_SUBMITTED
    try {
      await ActivityEvent.create({
        userId: new Types.ObjectId(userId),
        productId: product._id,
        eventType: 'REVIEW_SUBMITTED',
        eventSource: EventSource.ORGANIC,
        metadata: {
          reviewId: review._id.toString(),
          rating: review.rating,
          status: review.status,
          conflictOfInterestDisclosed: !!conflictOfInterestDisclosed,
        },
        createdAt: new Date(),
      });
    } catch (err: any) {
      logger.warn({ err: err.message, reviewId: review._id }, 'Failed to log REVIEW_SUBMITTED activity event');
    }

    logger.info({ reviewId: review._id, productId, userId, rating, status: reviewStatus }, 'Product review created');
    return review;
  }

  /**
   * 2. Get approved product reviews with aggregate statistics
   */
  async getProductReviews(
    productId: string,
    options: GetProductReviewsOptions = {}
  ): Promise<{
    reviews: any[];
    total: number;
    aggregate: ReviewAggregateStats;
    pagination: { page: number; limit: number; totalPages: number };
  }> {
    // Product identifier can be an ObjectId or slug
    let queryProductId: Types.ObjectId | null = null;
    if (Types.ObjectId.isValid(productId)) {
      queryProductId = new Types.ObjectId(productId);
    } else {
      const product = await Product.findOne({ slug: productId }).select('_id');
      if (product) {
        queryProductId = product._id;
      }
    }

    if (!queryProductId) {
      throw new NotFoundError(`Product '${productId}' not found`);
    }

    const page = Math.max(1, Number(options.page) || 1);
    const limit = Math.min(30, Math.max(1, Number(options.limit) || 10));
    const skip = (page - 1) * limit;

    let sortQuery: Record<string, 1 | -1> = { createdAt: -1 };
    switch (options.sortBy) {
      case 'oldest':
        sortQuery = { createdAt: 1 };
        break;
      case 'highest':
        sortQuery = { rating: -1, createdAt: -1 };
        break;
      case 'lowest':
        sortQuery = { rating: 1, createdAt: -1 };
        break;
      case 'newest':
      default:
        sortQuery = { createdAt: -1 };
        break;
    }

    // 1. Fetch only APPROVED reviews
    const [rawReviews, total, aggregateStats] = await Promise.all([
      Review.find({ productId: queryProductId, status: 'APPROVED' })
        .sort(sortQuery)
        .skip(skip)
        .limit(limit)
        .populate('userId', 'email role founderProfile createdAt')
        .lean(),
      Review.countDocuments({ productId: queryProductId, status: 'APPROVED' }),
      Review.aggregate([
        { $match: { productId: queryProductId, status: 'APPROVED' } },
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    // 2. Calculate rating distribution and average
    const ratingDistribution: Record<string, number> = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
    };

    let ratingSum = 0;
    for (const item of aggregateStats) {
      const rKey = String(item._id);
      if (ratingDistribution[rKey] !== undefined) {
        ratingDistribution[rKey] = item.count;
      }
      ratingSum += Number(item._id) * item.count;
    }

    const averageRating = total > 0 ? Number((ratingSum / total).toFixed(1)) : 0;

    // 3. Format review items to match API Specification Module 5.1
    const formattedReviews = rawReviews.map((rev: any) => {
      const authorUser = rev.userId || {};
      const authorProfile = authorUser.founderProfile || {};

      return {
        id: rev._id.toString(),
        productId: rev.productId?.toString(),
        author: {
          id: authorUser._id ? authorUser._id.toString() : 'unknown',
          displayName:
            authorProfile.displayName ||
            (authorUser.email ? authorUser.email.split('@')[0] : 'Community Member'),
          avatarUrl: authorProfile.avatarUrl || null,
        },
        rating: rev.rating,
        title: rev.title,
        content: rev.body,
        body: rev.body,
        conflictOfInterestDisclosed: !!rev.conflictOfInterestDisclosed,
        founderReply: rev.founderReply
          ? {
              content: rev.founderReply.body,
              body: rev.founderReply.body,
              repliedAt: rev.founderReply.repliedAt,
            }
          : null,
        createdAt: rev.createdAt,
      };
    });

    return {
      reviews: formattedReviews,
      total,
      aggregate: {
        averageRating,
        totalCount: total,
        ratingDistribution,
      },
      pagination: {
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * 3. Founder reply to an approved review
   * Business Rules:
   * - Only product owner/verified founder can reply.
   * - Only one founder reply per review.
   */
  async founderReplyToReview(
    reviewId: string,
    founderId: string,
    replyBody: string
  ): Promise<IReview> {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new ValidationError(`Invalid review ID format: '${reviewId}'`);
    }
    if (!Types.ObjectId.isValid(founderId)) {
      throw new ValidationError(`Invalid founder ID format: '${founderId}'`);
    }

    const content = (replyBody || '').trim();
    if (!content || content.length < 2 || content.length > 1000) {
      throw new ValidationError('Founder reply must be between 2 and 1000 characters');
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      throw new NotFoundError(`Review '${reviewId}' not found`);
    }

    const product = await Product.findById(review.productId);
    if (!product) {
      throw new NotFoundError('Associated product for this review was not found');
    }

    // Verify founder ownership
    const isDirectFounder =
      (product.founderId && product.founderId.toString() === founderId.toString()) ||
      (product.submittedById && product.submittedById.toString() === founderId.toString());

    if (!isDirectFounder) {
      const verifiedOwnership = await OwnershipVerification.findOne({
        productId: product._id,
        founderId: new Types.ObjectId(founderId),
        status: 'VERIFIED',
      });

      if (!verifiedOwnership) {
        throw new AuthorizationError(
          'Only the verified founder of this product can reply to reviews',
          'NOT_PRODUCT_FOUNDER'
        );
      }
    }

    // Verify no existing founder reply
    if (review.founderReply && review.founderReply.body) {
      throw new ConflictError(
        'A founder reply has already been posted for this review',
        'FOUNDER_REPLY_ALREADY_EXISTS'
      );
    }

    // Update review with reply
    review.founderReply = {
      body: content,
      repliedAt: new Date(),
    };
    await review.save();

    // Log activity_event: REVIEW_REPLIED
    try {
      await ActivityEvent.create({
        userId: new Types.ObjectId(founderId),
        productId: product._id,
        eventType: 'REVIEW_REPLIED',
        eventSource: EventSource.ORGANIC,
        metadata: {
          reviewId: review._id.toString(),
          replyLength: content.length,
        },
        createdAt: new Date(),
      });
    } catch (err: any) {
      logger.warn({ err: err.message, reviewId: review._id }, 'Failed to log REVIEW_REPLIED activity event');
    }

    logger.info({ reviewId, founderId, productId: product._id }, 'Founder replied to review');
    return review;
  }

  /**
   * 4. Flag review for moderation investigation
   * Business Rules:
   * - User can flag review with a reason.
   * - User cannot duplicate flags on the same review.
   * - If flag count reaches threshold (default 3), review status is set to FLAGGED.
   */
  async flagReview(reviewId: string, userId: string, reason: string): Promise<void> {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new ValidationError(`Invalid review ID format: '${reviewId}'`);
    }
    if (!Types.ObjectId.isValid(userId)) {
      throw new ValidationError(`Invalid user ID format: '${userId}'`);
    }

    const flagReason = (reason || '').trim();
    if (!flagReason || flagReason.length < 5 || flagReason.length > 500) {
      throw new ValidationError('Flag reason must be between 5 and 500 characters');
    }

    const review = await Review.findById(reviewId);
    if (!review) {
      throw new NotFoundError(`Review '${reviewId}' not found`);
    }

    // Check if user already flagged this review
    const alreadyFlagged = review.flags?.some(
      (f) => f.userId.toString() === userId.toString()
    );

    if (alreadyFlagged) {
      throw new ConflictError(
        'You have already reported this review for moderation',
        'REVIEW_ALREADY_FLAGGED'
      );
    }

    // Add flag
    if (!review.flags) review.flags = [];
    review.flags.push({
      userId: new Types.ObjectId(userId),
      reason: flagReason,
      createdAt: new Date(),
    });
    review.flagCount = (review.flagCount || 0) + 1;

    // Threshold check (default: 3 flags auto-quarantines review to FLAGGED)
    const flagThreshold = 3;
    if (review.flagCount >= flagThreshold && review.status !== 'FLAGGED') {
      review.status = 'FLAGGED';
      review.moderationReason = `Auto-flagged due to ${review.flagCount} user reports`;
      logger.warn({ reviewId, flagCount: review.flagCount }, 'Review status transitioned to FLAGGED');
    }

    await review.save();

    // Log activity_event: REVIEW_FLAGGED
    try {
      await ActivityEvent.create({
        userId: new Types.ObjectId(userId),
        productId: review.productId,
        eventType: 'REVIEW_FLAGGED',
        eventSource: EventSource.ORGANIC,
        metadata: {
          reviewId: review._id.toString(),
          reason: flagReason,
          flagCount: review.flagCount,
          newStatus: review.status,
        },
        createdAt: new Date(),
      });
    } catch (err: any) {
      logger.warn({ err: err.message, reviewId: review._id }, 'Failed to log REVIEW_FLAGGED activity event');
    }

    logger.info({ reviewId, userId, flagCount: review.flagCount }, 'Review flagged for moderation');
  }

  /**
   * Helper: Get single review by ID
   */
  async getReviewById(reviewId: string): Promise<IReview> {
    if (!Types.ObjectId.isValid(reviewId)) {
      throw new ValidationError(`Invalid review ID format: '${reviewId}'`);
    }

    const review = await Review.findById(reviewId)
      .populate('userId', 'email role founderProfile')
      .lean();

    if (!review) {
      throw new NotFoundError(`Review '${reviewId}' not found`);
    }

    return review as unknown as IReview;
  }
}

export const reviewService = new ReviewService();
export default reviewService;
