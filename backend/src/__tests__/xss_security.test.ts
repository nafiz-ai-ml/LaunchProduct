jest.mock('../models/Product.model');
jest.mock('../models/DailyLeaderboardSnapshot.model');
jest.mock('../shared/redis', () => ({
  redis: {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue('OK'),
  },
  isRedisConnected: jest.fn().mockReturnValue(false),
}));

import { safeJsonLd, escapeXml } from '../shared/escape';
import { OgController } from '../controllers/og.controller';
import { BadgeController } from '../controllers/badge.controller';
import {
  isSafeUrl,
  safeUrlSchema,
  safeOptionalUrlSchema,
} from '../shared/zod-schemas';

describe('XSS Security & Stored Payload Sanitization Tests', () => {
  const xssPayload = '</script><script>alert(1)</script>';

  describe('1. JSON-LD safeJsonLd escaping', () => {
    it('escapes </script><script>alert(1)</script> in name, tagline, and description', () => {
      const productMetadata = {
        name: xssPayload,
        tagline: xssPayload,
        description: xssPayload,
      };

      const result = safeJsonLd(productMetadata);

      // Must NOT contain literal unescaped </script> or <script>
      expect(result).not.toContain('</script>');
      expect(result).not.toContain('<script>');

      // Must be safely escaped to unicode escapes
      expect(result).toContain('\\u003c/script\\u003e\\u003cscript\\u003ealert(1)\\u003c/script\\u003e');

      // Check parseable as JSON
      const parsed = JSON.parse(result);
      expect(parsed.name).toBe(xssPayload);
      expect(parsed.tagline).toBe(xssPayload);
      expect(parsed.description).toBe(xssPayload);
    });

    it('escapes &, <, >, \\u2028, and \\u2029 characters', () => {
      const obj = {
        title: 'Tom & Jerry <cartoon> \u2028 separator \u2029',
      };
      const result = safeJsonLd(obj);

      expect(result).not.toContain('&');
      expect(result).not.toContain('<');
      expect(result).not.toContain('>');
      expect(result).toContain('\\u0026');
      expect(result).toContain('\\u003c');
      expect(result).toContain('\\u003e');
      expect(result).toContain('\\u2028');
      expect(result).toContain('\\u2029');
    });
  });

  describe('2. OpenGraph & Badge SVG XML escaping', () => {
    const ogController = new OgController();
    const badgeController = new BadgeController();

    it('escapes </script><script>alert(1)</script> in OG card SVG output', () => {
      const svg = ogController.renderOgCardSvg({
        productName: xssPayload,
        tagline: xssPayload,
        rankLabel: '#1 Rank',
        rankColor1: '#ff6b00',
        rankColor2: '#ff8800',
        voteCount: 42,
        slug: 'malicious-slug',
      });

      // SVG must NOT contain raw unescaped script tags
      expect(svg).not.toContain('</script>');
      expect(svg).not.toContain('<script>');

      // Must be converted to XML entities
      expect(svg).toContain('&lt;/script&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('escapes </script><script>alert(1)</script> in Badge SVG output', () => {
      const svg = badgeController.renderBadgeSvg({
        title: xssPayload,
        subtitle: xssPayload,
        voteCount: 10,
        theme: 'dark',
        style: 'flat',
      });

      // SVG must NOT contain raw unescaped script tags
      expect(svg).not.toContain('</script>');
      expect(svg).not.toContain('<script>');

      // Must be converted to XML entities
      expect(svg).toContain('&lt;/script&gt;&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('escapes quotes, ampersands, and tags in shared escapeXml helper', () => {
      const payload = `<div id="xss" data-val='test'>&attack</div>`;
      const escaped = escapeXml(payload);

      expect(escaped).toBe('&lt;div id=&quot;xss&quot; data-val=&apos;test&apos;&gt;&amp;attack&lt;/div&gt;');
      expect(escaped).not.toContain('<');
      expect(escaped).not.toContain('>');
      expect(escaped).not.toContain('"');
      expect(escaped).not.toContain("'");
    });
  });

  describe('3. URL Validation (Zod & isSafeUrl)', () => {
    it('rejects "javascript:alert(1)" as a website URL', () => {
      const jsUrl = 'javascript:alert(1)';

      expect(isSafeUrl(jsUrl)).toBe(false);

      const result = safeUrlSchema.safeParse(jsUrl);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/valid protocol \(http: or https:\)/);
      }
    });

    it('rejects dangerous protocols: data:, vbscript:, file:', () => {
      const dangerousUrls = [
        'data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==',
        'vbscript:MsgBox("XSS")',
        'file:///etc/passwd',
        'javascript:void(0)',
        'jav&#x09;ascript:alert(1);',
      ];

      for (const url of dangerousUrls) {
        expect(isSafeUrl(url)).toBe(false);
        expect(safeUrlSchema.safeParse(url).success).toBe(false);
      }
    });

    it('rejects URLs exceeding 2048 characters', () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(2040);
      expect(longUrl.length).toBeGreaterThan(2048);
      expect(isSafeUrl(longUrl)).toBe(false);
      expect(safeUrlSchema.safeParse(longUrl).success).toBe(false);
    });

    it('accepts valid http and https URLs up to 2048 characters', () => {
      const validUrls = [
        'https://launchproduct.io',
        'http://localhost:3000',
        'https://subdomain.company.com/path/to/resource?param=1&other=2#hash',
      ];

      for (const url of validUrls) {
        expect(isSafeUrl(url)).toBe(true);
        expect(safeUrlSchema.safeParse(url).success).toBe(true);
      }
    });

    it('rejects javascript:alert(1) in websiteUrl and logoUrl schemas', () => {
      const invalidWebsite = safeUrlSchema.safeParse('javascript:alert(1)');
      expect(invalidWebsite.success).toBe(false);

      const invalidLogo = safeOptionalUrlSchema.safeParse('javascript:alert(1)');
      expect(invalidLogo.success).toBe(false);
    });
  });
});
