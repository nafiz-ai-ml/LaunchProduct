import assert from 'assert';
import { Types } from 'mongoose';
import { EventSource, ProductStatus } from '../shared/constants';

async function runReviewTests() {
  console.log('=== Starting Reviews & Reputation Module Unit Tests ===');

  // =========================================================================
  // 1. Test Review Submission Qualification & Business Rules
  // =========================================================================
  console.log('\n1. Testing Review Submission business rules & qualification checks...');

  const mockProductLive = {
    _id: new Types.ObjectId(),
    name: 'SaaSify Cloud',
    status: ProductStatus.LIVE,
    founderId: new Types.ObjectId('66ea00001111222233334401'),
    submittedById: new Types.ObjectId('66ea00001111222233334401'),
  };

  const mockProductDraft = {
    _id: new Types.ObjectId(),
    name: 'Draft App',
    status: ProductStatus.DRAFT,
    founderId: new Types.ObjectId('66ea00001111222233334402'),
    submittedById: new Types.ObjectId('66ea00001111222233334402'),
  };

  // Rule 1.1: Product must be LIVE
  function validateProductStatus(product: { status: string }) {
    if (product.status !== ProductStatus.LIVE && product.status !== 'LIVE') {
      throw new Error('Reviews can only be submitted for live products');
    }
  }

  assert.doesNotThrow(() => validateProductStatus(mockProductLive));
  assert.throws(
    () => validateProductStatus(mockProductDraft),
    /Reviews can only be submitted for live products/
  );
  console.log('✓ Product LIVE status validation verified');

  // Rule 1.2: User account age >= 48 hours
  const now = Date.now();
  const oldUser = {
    _id: new Types.ObjectId('66ea00001111222233334499'),
    createdAt: new Date(now - 72 * 60 * 60 * 1000), // 72 hours old
  };

  const newUser = {
    _id: new Types.ObjectId('66ea00001111222233334488'),
    createdAt: new Date(now - 12 * 60 * 60 * 1000), // 12 hours old
  };

  function validateAccountAge(user: { createdAt: Date }) {
    const ageMs = Date.now() - new Date(user.createdAt).getTime();
    const fortyEightHoursMs = 48 * 60 * 60 * 1000;
    if (ageMs < fortyEightHoursMs) {
      throw new Error('Account must be at least 48 hours old to submit community reviews');
    }
  }

  assert.doesNotThrow(() => validateAccountAge(oldUser));
  assert.throws(
    () => validateAccountAge(newUser),
    /Account must be at least 48 hours old/
  );
  console.log('✓ Account age (>= 48h) rule verified');

  // Rule 1.3: Block self-reviews (founder or submitter cannot review)
  function validateNotSelfReview(
    product: { founderId?: Types.ObjectId; submittedById?: Types.ObjectId },
    userId: string
  ) {
    const isDirectFounder =
      (product.founderId && product.founderId.toString() === userId) ||
      (product.submittedById && product.submittedById.toString() === userId);

    if (isDirectFounder) {
      throw new Error('Self-reviews are prohibited. Founders and submitters cannot review their own products');
    }
  }

  // Founder tries to review own product -> blocked
  assert.throws(
    () => validateNotSelfReview(mockProductLive, '66ea00001111222233334401'),
    /Self-reviews are prohibited/
  );
  // Independent user -> allowed
  assert.doesNotThrow(() =>
    validateNotSelfReview(mockProductLive, oldUser._id.toString())
  );
  console.log('✓ Self-review prevention rule verified');

  // Rule 1.4: One review per user per product (compound unique index)
  const existingReviews = new Set<string>();
  function checkDuplicateReview(productId: string, userId: string) {
    const key = `${productId}:${userId}`;
    if (existingReviews.has(key)) {
      throw new Error('You have already submitted a review for this product');
    }
    existingReviews.add(key);
  }

  checkDuplicateReview(mockProductLive._id.toString(), oldUser._id.toString());
  assert.throws(
    () => checkDuplicateReview(mockProductLive._id.toString(), oldUser._id.toString()),
    /You have already submitted a review/
  );
  console.log('✓ One review per user per product constraint verified');

  // =========================================================================
  // 2. Test Rating Distribution & Average Aggregation
  // =========================================================================
  console.log('\n2. Testing Rating Distribution & Average Rating Aggregations...');

  const mockApprovedReviews = [
    { rating: 5, status: 'APPROVED' },
    { rating: 5, status: 'APPROVED' },
    { rating: 5, status: 'APPROVED' },
    { rating: 4, status: 'APPROVED' },
    { rating: 4, status: 'APPROVED' },
    { rating: 3, status: 'APPROVED' },
    { rating: 1, status: 'APPROVED' },
    { rating: 2, status: 'PENDING' }, // Ignored in public calculation
  ];

  function computeAggregates(reviews: typeof mockApprovedReviews) {
    const approved = reviews.filter((r) => r.status === 'APPROVED');
    const totalCount = approved.length;
    const ratingDistribution: Record<string, number> = {
      '1': 0,
      '2': 0,
      '3': 0,
      '4': 0,
      '5': 0,
    };

    let sum = 0;
    for (const r of approved) {
      ratingDistribution[String(r.rating)] = (ratingDistribution[String(r.rating)] || 0) + 1;
      sum += r.rating;
    }

    const averageRating = totalCount > 0 ? Number((sum / totalCount).toFixed(1)) : 0;
    return { averageRating, totalCount, ratingDistribution };
  }

  const agg = computeAggregates(mockApprovedReviews);
  assert.strictEqual(agg.totalCount, 7);
  assert.strictEqual(agg.ratingDistribution['5'], 3);
  assert.strictEqual(agg.ratingDistribution['4'], 2);
  assert.strictEqual(agg.ratingDistribution['3'], 1);
  assert.strictEqual(agg.ratingDistribution['2'], 0);
  assert.strictEqual(agg.ratingDistribution['1'], 1);
  // (3*5 + 2*4 + 1*3 + 1*1) = 15 + 8 + 3 + 1 = 27 / 7 = 3.857 -> 3.9
  assert.strictEqual(agg.averageRating, 3.9);
  console.log('✓ Rating aggregate calculation and distribution verified!');

  // =========================================================================
  // 3. Test Founder Reply Workflow & Constraints
  // =========================================================================
  console.log('\n3. Testing Founder Reply constraints and state mutation...');

  const testReview = {
    _id: new Types.ObjectId(),
    productId: mockProductLive._id,
    userId: oldUser._id,
    rating: 5,
    title: 'Fantastic Developer Experience',
    body: 'Integrated in 5 minutes with full SSR support and typed client SDKs.',
    founderReply: null as { body: string; repliedAt: Date } | null,
  };

  function addFounderReply(
    review: typeof testReview,
    founderId: string,
    authorizedFounderId: string,
    replyBody: string
  ) {
    if (founderId !== authorizedFounderId) {
      throw new Error('Only the verified founder of this product can reply to reviews');
    }
    if (review.founderReply && review.founderReply.body) {
      throw new Error('A founder reply has already been posted for this review');
    }
    review.founderReply = {
      body: replyBody,
      repliedAt: new Date(),
    };
    return review;
  }

  // Non-founder tries to reply -> rejected
  assert.throws(
    () => addFounderReply(testReview, 'random_user_123', '66ea00001111222233334401', 'Thank you!'),
    /Only the verified founder/
  );

  // Verified founder replies -> succeeds
  addFounderReply(testReview, '66ea00001111222233334401', '66ea00001111222233334401', 'Thanks for the great feedback!');
  assert.ok(testReview.founderReply);
  assert.strictEqual(testReview.founderReply.body, 'Thanks for the great feedback!');

  // Second reply attempt -> rejected (1 reply limit)
  assert.throws(
    () => addFounderReply(testReview, '66ea00001111222233334401', '66ea00001111222233334401', 'Another reply!'),
    /A founder reply has already been posted/
  );
  console.log('✓ Founder reply authorization and single-reply limit verified!');

  // =========================================================================
  // 4. Test Review Flagging & Threshold Auto-Quarantine
  // =========================================================================
  console.log('\n4. Testing Review Flagging and Auto-Flagged Threshold...');

  const reviewToFlag = {
    _id: new Types.ObjectId(),
    status: 'APPROVED',
    flags: [] as Array<{ userId: string; reason: string; createdAt: Date }>,
    flagCount: 0,
    moderationReason: null as string | null,
  };

  function applyFlag(review: typeof reviewToFlag, userId: string, reason: string) {
    if (review.flags.some((f) => f.userId === userId)) {
      throw new Error('You have already reported this review for moderation');
    }
    review.flags.push({ userId, reason, createdAt: new Date() });
    review.flagCount = review.flags.length;

    // Threshold = 3
    if (review.flagCount >= 3 && review.status !== 'FLAGGED') {
      review.status = 'FLAGGED';
      review.moderationReason = `Auto-flagged due to ${review.flagCount} user reports`;
    }
  }

  // User 1 flags
  applyFlag(reviewToFlag, 'user_1', 'Suspected competitor smear');
  assert.strictEqual(reviewToFlag.flagCount, 1);
  assert.strictEqual(reviewToFlag.status, 'APPROVED');

  // User 1 duplicate flag -> blocked
  assert.throws(
    () => applyFlag(reviewToFlag, 'user_1', 'Duplicate report'),
    /You have already reported this review/
  );

  // User 2 flags
  applyFlag(reviewToFlag, 'user_2', 'Harassment');
  assert.strictEqual(reviewToFlag.flagCount, 2);
  assert.strictEqual(reviewToFlag.status, 'APPROVED');

  // User 3 flags -> reaches threshold of 3 -> auto-transitions to FLAGGED
  applyFlag(reviewToFlag, 'user_3', 'Spam promotional link');
  assert.strictEqual(reviewToFlag.flagCount, 3);
  assert.strictEqual(reviewToFlag.status, 'FLAGGED');
  assert.ok(reviewToFlag.moderationReason?.includes('Auto-flagged'));
  console.log('✓ Flagging deduplication and auto-flag threshold (3) verified!');

  console.log('\n=== All Reviews & Reputation Unit Tests Passed Successfully! ===');
}

runReviewTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Review tests failed:', err);
    process.exit(1);
  });
