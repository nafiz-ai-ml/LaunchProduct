import { z } from 'zod';

/**
 * 24-character hexadecimal MongoDB ObjectId validator
 */
export const ObjectIdSchema = z
  .string({ required_error: 'ID is required' })
  .length(24, 'ID must be exactly 24 characters')
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid hexadecimal ObjectId format');

// ============================================================================
// 1. Auth Schemas
// ============================================================================

export const MagicLinkRequestSchema = z.object({
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .toLowerCase()
    .email('Invalid email address format'),
});

export const OAuthCallbackSchema = z.object({
  code: z.string({ required_error: 'Authorization code is required' }).trim().min(1),
  state: z.string().trim().optional(),
});

export const AuthSchemas = {
  MagicLinkRequestSchema,
  OAuthCallbackSchema,
};

export type MagicLinkRequestInput = z.infer<typeof MagicLinkRequestSchema>;
export type OAuthCallbackInput = z.infer<typeof OAuthCallbackSchema>;

// ============================================================================
// 2. Product Schemas
// ============================================================================

export const ScrapeSubmitSchema = z.object({
  websiteUrl: z
    .string({ required_error: 'Website URL is required' })
    .url('Invalid URL format')
    .startsWith('https://', 'Website URL must use secure HTTPS protocol'),
});

export const ProductPricingSchema = z.object({
  model: z.enum(['free', 'freemium', 'paid', 'open_source'], {
    required_error: 'Pricing model is required',
  }),
  startingPrice: z.number().min(0, 'Starting price cannot be negative').optional(),
  currency: z.string().trim().toUpperCase().optional().default('USD'),
});

export const ProductMediaSchema = z
  .object({
    logoUrl: z.string().url('Invalid logo URL').optional(),
    bannerUrl: z.string().url('Invalid banner URL').optional(),
    screenshotUrls: z.array(z.string().url('Invalid screenshot URL')).max(10).optional(),
  })
  .optional();

export const ProductDraftConfirmSchema = z.object({
  name: z
    .string({ required_error: 'Product name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  tagline: z
    .string({ required_error: 'Tagline is required' })
    .trim()
    .min(10, 'Tagline must be at least 10 characters')
    .max(120, 'Tagline cannot exceed 120 characters'),
  description: z
    .string({ required_error: 'Description is required' })
    .trim()
    .min(10, 'Description must be at least 10 characters')
    .max(5000, 'Description cannot exceed 5000 characters'),
  websiteUrl: z
    .string({ required_error: 'Website URL is required' })
    .url('Invalid website URL')
    .startsWith('https://', 'Website URL must use secure HTTPS protocol'),
  categoryId: ObjectIdSchema,
  pricing: ProductPricingSchema,
  media: ProductMediaSchema,
});

export const ProductUpdateSchema = ProductDraftConfirmSchema.partial();

export const ProductSearchQuerySchema = z.object({
  q: z.string().trim().optional(),
  categoryId: ObjectIdSchema.optional(),
  pricingType: z.enum(['free', 'freemium', 'paid', 'open_source']).optional(),
  sortBy: z.enum(['trending', 'newest', 'top']).optional().default('trending'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50, 'Limit cannot exceed 50').optional().default(20),
});

export const ProductSchemas = {
  ScrapeSubmitSchema,
  ProductPricingSchema,
  ProductMediaSchema,
  ProductDraftConfirmSchema,
  ProductUpdateSchema,
  ProductSearchQuerySchema,
};

export type ScrapeSubmitInput = z.infer<typeof ScrapeSubmitSchema>;
export type ProductDraftConfirmInput = z.infer<typeof ProductDraftConfirmSchema>;
export type ProductUpdateInput = z.infer<typeof ProductUpdateSchema>;
export type ProductSearchQueryInput = z.infer<typeof ProductSearchQuerySchema>;

// ============================================================================
// 3. Vote Schemas
// ============================================================================

export const CastVoteSchema = z.object({
  productId: ObjectIdSchema,
  deviceFingerprint: z.string().max(256, 'Device fingerprint cannot exceed 256 characters').optional(),
  clientFingerprint: z.string().max(256).optional(),
  navTelemetryToken: z.string().optional(),
});

export const VoteSchemas = {
  CastVoteSchema,
};

export type CastVoteInput = z.infer<typeof CastVoteSchema>;

// ============================================================================
// 4. Claim Schemas
// ============================================================================

export const InitiateClaimSchema = z.object({
  productId: ObjectIdSchema,
  method: z.enum(['EMAIL_DOMAIN', 'DNS_TXT', 'HTML_META'], {
    required_error: 'Verification method is required',
  }),
});

export const ClaimSchemas = {
  InitiateClaimSchema,
};

export type InitiateClaimInput = z.infer<typeof InitiateClaimSchema>;

// ============================================================================
// 5. Campaign Schemas
// ============================================================================

export const CampaignCheckoutSchema = z.object({
  tier: z.enum(
    ['LAUNCH_BOOST', 'CATEGORY_FEATURED', 'HOMEPAGE_SPOTLIGHT', 'LAUNCH_PARTNER'],
    { required_error: 'Sponsorship tier is required' }
  ),
  productId: ObjectIdSchema,
  startDate: z
    .string({ required_error: 'Start date is required' })
    .datetime({ message: 'Start date must be an ISO 8601 datetime string' }),
  targetCategorySlug: z.string().trim().toLowerCase().optional(),
  displayLabel: z.string().trim().max(60).optional(),
});

export const CampaignSchemas = {
  CampaignCheckoutSchema,
};

export type CampaignCheckoutInput = z.infer<typeof CampaignCheckoutSchema>;

// ============================================================================
// 6. Review Schemas
// ============================================================================

export const SubmitReviewSchema = z.object({
  productId: ObjectIdSchema,
  rating: z
    .number({ required_error: 'Rating is required' })
    .int('Rating must be an integer between 1 and 5')
    .min(1, 'Rating must be at least 1 star')
    .max(5, 'Rating cannot exceed 5 stars'),
  title: z
    .string({ required_error: 'Review title is required' })
    .trim()
    .min(5, 'Title must be at least 5 characters')
    .max(100, 'Title cannot exceed 100 characters'),
  body: z
    .string({ required_error: 'Review body is required' })
    .trim()
    .min(50, 'Review body must be at least 50 characters')
    .max(2000, 'Review body cannot exceed 2000 characters'),
  conflictOfInterestDisclosed: z.boolean({
    required_error: 'Conflict of interest disclosure is required',
  }),
});

export const FounderReplySchema = z.object({
  body: z
    .string({ required_error: 'Reply body is required' })
    .trim()
    .min(10, 'Founder reply must be at least 10 characters')
    .max(1000, 'Founder reply cannot exceed 1000 characters'),
});

export const ReviewSchemas = {
  SubmitReviewSchema,
  FounderReplySchema,
};

export type SubmitReviewInput = z.infer<typeof SubmitReviewSchema>;
export type FounderReplyInput = z.infer<typeof FounderReplySchema>;

// ============================================================================
// 7. Moderation Schemas
// ============================================================================

export const ModerationActionSchema = z.object({
  targetType: z.enum(['PRODUCT', 'VOTE', 'CLAIM', 'REVIEW', 'USER'], {
    required_error: 'Target type is required',
  }),
  targetId: ObjectIdSchema,
  action: z.enum(
    [
      'APPROVE',
      'REJECT',
      'QUARANTINE',
      'RELEASE',
      'DISMISS',
      'BAN_USER',
      'UNBAN_USER',
      'REVOKE_CLAIM',
      'APPROVE_CLAIM',
    ],
    { required_error: 'Moderation action is required' }
  ),
  reason: z.string().trim().max(1000, 'Reason cannot exceed 1000 characters').optional(),
  moderatorNote: z.string().trim().max(1000).optional(),
});

export const ModerationSchemas = {
  ModerationActionSchema,
};

export type ModerationActionInput = z.infer<typeof ModerationActionSchema>;

export default {
  ObjectIdSchema,
  AuthSchemas,
  ProductSchemas,
  VoteSchemas,
  ClaimSchemas,
  CampaignSchemas,
  ReviewSchemas,
  ModerationSchemas,
  // Direct Exports
  MagicLinkRequestSchema,
  OAuthCallbackSchema,
  ScrapeSubmitSchema,
  ProductPricingSchema,
  ProductMediaSchema,
  ProductDraftConfirmSchema,
  ProductUpdateSchema,
  ProductSearchQuerySchema,
  CastVoteSchema,
  InitiateClaimSchema,
  CampaignCheckoutSchema,
  SubmitReviewSchema,
  FounderReplySchema,
  ModerationActionSchema,
};
