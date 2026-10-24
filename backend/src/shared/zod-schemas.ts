import { z } from 'zod';

/**
 * 24-character hexadecimal MongoDB ObjectId validator
 */
export const ObjectIdSchema = z
  .string({ required_error: 'ID is required' })
  .length(24, 'ID must be exactly 24 characters')
  .regex(/^[0-9a-fA-F]{24}$/, 'Invalid hexadecimal ObjectId format');

/**
 * Validates that a URL:
 * 1. Parses with new URL()
 * 2. Has protocol exactly "http:" or "https:" (rejects javascript:, data:, vbscript:, file:, etc.)
 * 3. Does not exceed 2048 characters
 */
export function isSafeUrl(urlStr: unknown): boolean {
  if (typeof urlStr !== 'string') return false;
  const trimmed = urlStr.trim();
  if (!trimmed || trimmed.length > 2048) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export const safeUrlSchema = z
  .string({ required_error: 'URL is required' })
  .trim()
  .max(2048, 'URL cannot exceed 2048 characters')
  .refine(isSafeUrl, {
    message: 'URL must have a valid protocol (http: or https:) and not exceed 2048 characters',
  });

export const safeOptionalUrlSchema = z
  .string()
  .trim()
  .max(2048, 'URL cannot exceed 2048 characters')
  .refine((val) => !val || val === '' || isSafeUrl(val), {
    message: 'URL must have a valid protocol (http: or https:) and not exceed 2048 characters',
  })
  .optional();

export const ProductPricingSchema = z.object({
  model: z.enum(['free', 'freemium', 'paid', 'open_source'], {
    required_error: 'Pricing model is required',
  }),
  startingPrice: z.number().min(0, 'Starting price cannot be negative').optional(),
  currency: z.string().trim().toUpperCase().optional().default('USD'),
});

export const ProductMediaSchema = z
  .object({
    logoUrl: safeOptionalUrlSchema,
    bannerUrl: safeOptionalUrlSchema,
    screenshotUrls: z.array(safeUrlSchema).max(10).optional(),
  })
  .optional();

export const ProductSearchQuerySchema = z.object({
  q: z.string().trim().optional(),
  categoryId: ObjectIdSchema.optional(),
  pricingType: z.enum(['free', 'freemium', 'paid', 'open_source']).optional(),
  sortBy: z.enum(['trending', 'newest', 'top']).optional().default('trending'),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50, 'Limit cannot exceed 50').optional().default(20),
});

export const ProductSchemas = {
  ProductPricingSchema,
  ProductMediaSchema,
  ProductSearchQuerySchema,
};

export type ProductSearchQueryInput = z.infer<typeof ProductSearchQuerySchema>;

export default {
  ObjectIdSchema,
  safeUrlSchema,
  safeOptionalUrlSchema,
  ProductSchemas,
  ProductPricingSchema,
  ProductMediaSchema,
  ProductSearchQuerySchema,
};
