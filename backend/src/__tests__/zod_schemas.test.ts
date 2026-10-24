import {
  ObjectIdSchema,
  safeUrlSchema,
  safeOptionalUrlSchema,
  ProductPricingSchema,
  ProductMediaSchema,
  ProductSearchQuerySchema,
} from '../shared/zod-schemas';

describe('Zod Validation Schemas Unit Tests', () => {
  describe('ObjectIdSchema', () => {
    it('validates 24-character hexadecimal IDs', () => {
      const validId = '66ea00001111222233334420';
      expect(ObjectIdSchema.parse(validId)).toBe(validId);
    });

    it('rejects invalid ObjectId formats', () => {
      expect(() => ObjectIdSchema.parse('invalid-id')).toThrow(/ID must be exactly 24 characters/);
      expect(() => ObjectIdSchema.parse('66ea0000111122223333442z')).toThrow(/Invalid hexadecimal ObjectId format/);
    });
  });

  describe('safeUrlSchema', () => {
    it('accepts valid http and https URLs', () => {
      expect(safeUrlSchema.parse('https://example.com')).toBe('https://example.com');
      expect(safeUrlSchema.parse('http://example.com/path?query=1')).toBe('http://example.com/path?query=1');
    });

    it('rejects unsafe protocols like javascript: or data:', () => {
      expect(() => safeUrlSchema.parse('javascript:alert(1)')).toThrow();
      expect(() => safeUrlSchema.parse('data:text/html;base64,PHNjcmlwdD4=')).toThrow();
      expect(() => safeUrlSchema.parse('not-a-url')).toThrow();
    });
  });

  describe('ProductPricingSchema', () => {
    it('validates standard pricing models', () => {
      const pricing = ProductPricingSchema.parse({
        model: 'freemium',
        startingPrice: 29,
        currency: 'usd',
      });
      expect(pricing.model).toBe('freemium');
      expect(pricing.startingPrice).toBe(29);
      expect(pricing.currency).toBe('USD');
    });

    it('rejects negative prices', () => {
      expect(() =>
        ProductPricingSchema.parse({
          model: 'paid',
          startingPrice: -10,
        })
      ).toThrow(/Starting price cannot be negative/);
    });
  });

  describe('ProductSearchQuerySchema', () => {
    it('coerces and validates query parameters', () => {
      const parsed = ProductSearchQuerySchema.parse({
        q: 'ai tool',
        page: '2',
        limit: '25',
        sortBy: 'trending',
      });
      expect(parsed.q).toBe('ai tool');
      expect(parsed.page).toBe(2);
      expect(parsed.limit).toBe(25);
      expect(parsed.sortBy).toBe('trending');
    });

    it('clamps limit to maximum 50', () => {
      expect(() =>
        ProductSearchQuerySchema.parse({
          limit: '100',
        })
      ).toThrow(/Limit cannot exceed 50/);
    });
  });
});
