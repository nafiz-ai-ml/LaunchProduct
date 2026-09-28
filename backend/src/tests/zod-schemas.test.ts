import assert from 'assert';
import {
  AuthSchemas,
  ProductSchemas,
  VoteSchemas,
  ClaimSchemas,
  CampaignSchemas,
  ReviewSchemas,
  ModerationSchemas,
  MagicLinkRequestSchema,
  OAuthCallbackSchema,
  ScrapeSubmitSchema,
  ProductDraftConfirmSchema,
  ProductUpdateSchema,
  ProductSearchQuerySchema,
  CastVoteSchema,
  InitiateClaimSchema,
  CampaignCheckoutSchema,
  SubmitReviewSchema,
  FounderReplySchema,
  ModerationActionSchema,
} from '../shared/zod-schemas';

async function runZodSchemaTests() {
  console.log('=== Starting All Zod Validation Schemas Unit Tests ===');

  // =========================================================================
  // 1. Auth Schemas
  // =========================================================================
  console.log('\n1. Testing AuthSchemas...');

  // 1.1 MagicLinkRequestSchema
  const validMagic = MagicLinkRequestSchema.parse({ email: '  TestUser@Domain.COM  ' });
  assert.strictEqual(validMagic.email, 'testuser@domain.com');

  assert.throws(() => {
    MagicLinkRequestSchema.parse({ email: 'not-an-email' });
  }, /Invalid email/);
  console.log('✓ MagicLinkRequestSchema validated (lowercase, trim, email format)');

  // 1.2 OAuthCallbackSchema
  const validOAuth = OAuthCallbackSchema.parse({ code: 'auth_code_123', state: 'state_xyz' });
  assert.strictEqual(validOAuth.code, 'auth_code_123');
  assert.strictEqual(validOAuth.state, 'state_xyz');

  assert.throws(() => {
    OAuthCallbackSchema.parse({});
  }, /Authorization code is required/);
  console.log('✓ OAuthCallbackSchema validated');

  // =========================================================================
  // 2. Product Schemas
  // =========================================================================
  console.log('\n2. Testing ProductSchemas...');

  // 2.1 ScrapeSubmitSchema
  const validScrape = ScrapeSubmitSchema.parse({ websiteUrl: 'https://supertool.ai' });
  assert.strictEqual(validScrape.websiteUrl, 'https://supertool.ai');

  assert.throws(() => {
    ScrapeSubmitSchema.parse({ websiteUrl: 'http://insecure.com' });
  }, /Website URL must use secure HTTPS protocol/);

  assert.throws(() => {
    ScrapeSubmitSchema.parse({ websiteUrl: 'not-a-url' });
  }, /Invalid URL format/);
  console.log('✓ ScrapeSubmitSchema validated (strict HTTPS URL requirement)');

  // 2.2 ProductDraftConfirmSchema
  const validDraft = {
    name: 'SuperTool AI',
    tagline: 'The ultimate autonomous AI workflow engine for developers',
    description: 'A comprehensive platform for building, deploying, and monitoring autonomous AI agents.',
    websiteUrl: 'https://supertool.ai',
    categoryId: '66ea00001111222233334401',
    pricing: {
      model: 'freemium',
      startingPrice: 29,
    },
    media: {
      logoUrl: 'https://assets.supertool.ai/logo.png',
    },
  };

  const parsedDraft = ProductDraftConfirmSchema.parse(validDraft);
  assert.strictEqual(parsedDraft.name, 'SuperTool AI');
  assert.strictEqual(parsedDraft.pricing.model, 'freemium');

  // Short tagline (< 10 chars)
  assert.throws(() => {
    ProductDraftConfirmSchema.parse({
      ...validDraft,
      tagline: 'Too short',
    });
  }, /Tagline must be at least 10 characters/);

  // Invalid category ObjectId
  assert.throws(() => {
    ProductDraftConfirmSchema.parse({
      ...validDraft,
      categoryId: 'invalid-id',
    });
  }, /Invalid hexadecimal ObjectId format/);
  console.log('✓ ProductDraftConfirmSchema validated (lengths, pricing, ObjectId)');

  // 2.3 ProductUpdateSchema (Partial)
  const validUpdate = ProductUpdateSchema.parse({
    tagline: 'Updated revolutionary AI platform for developers worldwide',
  });
  assert.strictEqual(validUpdate.tagline, 'Updated revolutionary AI platform for developers worldwide');
  console.log('✓ ProductUpdateSchema validated (partial update)');

  // 2.4 ProductSearchQuerySchema
  const parsedSearch = ProductSearchQuerySchema.parse({
    q: 'database',
    sortBy: 'top',
    page: '2',
    limit: '25',
  });
  assert.strictEqual(parsedSearch.q, 'database');
  assert.strictEqual(parsedSearch.sortBy, 'top');
  assert.strictEqual(parsedSearch.page, 2);
  assert.strictEqual(parsedSearch.limit, 25);

  // Limit exceeding 50
  assert.throws(() => {
    ProductSearchQuerySchema.parse({ limit: '100' });
  }, /Limit cannot exceed 50/);
  console.log('✓ ProductSearchQuerySchema validated (coercion, max limit 50)');

  // =========================================================================
  // 3. Vote Schemas
  // =========================================================================
  console.log('\n3. Testing VoteSchemas...');

  const validVote = CastVoteSchema.parse({
    productId: '66ea00001111222233334420',
    deviceFingerprint: 'df_abc123xyz',
  });
  assert.strictEqual(validVote.productId, '66ea00001111222233334420');

  assert.throws(() => {
    CastVoteSchema.parse({ productId: 'short_id' });
  }, /ID must be exactly 24 characters/);
  console.log('✓ CastVoteSchema validated');

  // =========================================================================
  // 4. Claim Schemas
  // =========================================================================
  console.log('\n4. Testing ClaimSchemas...');

  const validClaim = InitiateClaimSchema.parse({
    productId: '66ea00001111222233334420',
    method: 'DNS_TXT',
  });
  assert.strictEqual(validClaim.method, 'DNS_TXT');

  assert.throws(() => {
    InitiateClaimSchema.parse({
      productId: '66ea00001111222233334420',
      method: 'PHONE_CALL', // Invalid enum
    });
  }, /Invalid enum value/);
  console.log('✓ InitiateClaimSchema validated');

  // =========================================================================
  // 5. Campaign Schemas
  // =========================================================================
  console.log('\n5. Testing CampaignSchemas...');

  const validCampaign = CampaignCheckoutSchema.parse({
    tier: 'HOMEPAGE_SPOTLIGHT',
    productId: '66ea00001111222233334420',
    startDate: '2026-10-01T00:00:00.000Z',
    targetCategorySlug: 'developer-tools',
  });
  assert.strictEqual(validCampaign.tier, 'HOMEPAGE_SPOTLIGHT');

  assert.throws(() => {
    CampaignCheckoutSchema.parse({
      tier: 'INVALID_TIER',
      productId: '66ea00001111222233334420',
      startDate: '2026-10-01T00:00:00.000Z',
    });
  }, /Invalid enum value/);

  assert.throws(() => {
    CampaignCheckoutSchema.parse({
      tier: 'LAUNCH_BOOST',
      productId: '66ea00001111222233334420',
      startDate: 'not-a-datetime',
    });
  }, /Start date must be an ISO 8601 datetime string/);
  console.log('✓ CampaignCheckoutSchema validated (tiers & datetime)');

  // =========================================================================
  // 6. Review Schemas
  // =========================================================================
  console.log('\n6. Testing ReviewSchemas...');

  // 6.1 SubmitReviewSchema
  const validReview = SubmitReviewSchema.parse({
    productId: '66ea00001111222233334420',
    rating: 5,
    title: 'Outstanding Developer Tooling Experience',
    body: 'We adopted this in our engineering workflows and immediately saw a 40% reduction in deployment lead time.',
    conflictOfInterestDisclosed: false,
  });
  assert.strictEqual(validReview.rating, 5);

  // Rating out of bounds (> 5)
  assert.throws(() => {
    SubmitReviewSchema.parse({
      productId: '66ea00001111222233334420',
      rating: 6,
      title: 'Valid Title',
      body: 'Valid review body that is over fifty characters long for thorough testing purposes.',
      conflictOfInterestDisclosed: false,
    });
  }, /Rating cannot exceed 5 stars/);

  // Short body (< 50 chars)
  assert.throws(() => {
    SubmitReviewSchema.parse({
      productId: '66ea00001111222233334420',
      rating: 5,
      title: 'Valid Title',
      body: 'Too short',
      conflictOfInterestDisclosed: false,
    });
  }, /Review body must be at least 50 characters/);
  console.log('✓ SubmitReviewSchema validated (rating 1-5, title 5-100, body 50-2000)');

  // 6.2 FounderReplySchema
  const validReply = FounderReplySchema.parse({
    body: 'Thank you for the detailed feedback! We are pushing new presets next week.',
  });
  assert.ok(validReply.body.length >= 10);

  assert.throws(() => {
    FounderReplySchema.parse({ body: 'Thanks' }); // < 10 chars
  }, /Founder reply must be at least 10 characters/);
  console.log('✓ FounderReplySchema validated (min 10 chars)');

  // =========================================================================
  // 7. Moderation Schemas
  // =========================================================================
  console.log('\n7. Testing ModerationSchemas...');

  const validMod = ModerationActionSchema.parse({
    targetType: 'PRODUCT',
    targetId: '66ea00001111222233334420',
    action: 'APPROVE',
    reason: 'Meets platform quality and security guidelines',
  });
  assert.strictEqual(validMod.action, 'APPROVE');

  assert.throws(() => {
    ModerationActionSchema.parse({
      targetType: 'INVALID_TARGET',
      targetId: '66ea00001111222233334420',
      action: 'APPROVE',
    });
  }, /Invalid enum value/);
  console.log('✓ ModerationActionSchema validated');

  // Verify Namespace Exports
  assert.ok(AuthSchemas.MagicLinkRequestSchema);
  assert.ok(ProductSchemas.ProductDraftConfirmSchema);
  assert.ok(VoteSchemas.CastVoteSchema);
  assert.ok(ClaimSchemas.InitiateClaimSchema);
  assert.ok(CampaignSchemas.CampaignCheckoutSchema);
  assert.ok(ReviewSchemas.SubmitReviewSchema);
  assert.ok(ModerationSchemas.ModerationActionSchema);
  console.log('✓ All 7 schema group namespaces exported correctly');

  console.log('\n=== All Zod Validation Schemas Tests Passed Successfully! ===');
}

runZodSchemaTests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Zod schema tests failed:', err);
    process.exit(1);
  });
