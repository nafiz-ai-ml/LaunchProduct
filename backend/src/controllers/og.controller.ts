import { Request, Response, NextFunction } from 'express';
import sharp from 'sharp';
import { Product } from '../models/Product.model';
import { Vote } from '../models/Vote.model';
import { DailyLeaderboardSnapshot } from '../models/DailyLeaderboardSnapshot.model';
import { VoteStatus } from '../shared/constants';
import { redis, isRedisConnected } from '../shared/redis';
import { NotFoundError } from '../shared/errors';
import { logger } from '../shared/logger';

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export class OgController {
  /**
   * GET /api/og/:slug
   * Dynamic 1200x630 OpenGraph card generator.
   */
  async getOgImage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawSlug = getParam(req.params.slug);
      const slug = rawSlug.replace(/\.png$/, '').toLowerCase().trim();

      // Fast-path: Check Redis binary cache
      const cacheKey = `og:cache:${slug}`;
      if (isRedisConnected()) {
        try {
          const cachedBase64 = await redis.get(cacheKey);
          if (cachedBase64) {
            const pngBuf = Buffer.from(cachedBase64, 'base64');
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, s-maxage=86400');
            res.setHeader('X-Cache', 'HIT');
            res.status(200).send(pngBuf);
            return;
          }
        } catch (err: any) {
          logger.warn({ err: err.message }, 'Failed to read OG card from Redis cache');
        }
      }

      // 1. Fetch product
      const product = await Product.findOne({ slug }).lean();
      if (!product) {
        throw new NotFoundError(`Product '${slug}' not found`);
      }

      // 2. Fetch latest rank (from today's Redis sorted set or latest snapshot)
      let rank: number | null = null;
      const dateStr = new Date().toISOString().split('T')[0];

      if (isRedisConnected()) {
        try {
          const launchKey = `leaderboard:today:${dateStr}:launch`;
          const votesKey = `leaderboard:today:${dateStr}:votes`;

          let zrank = await redis.zrevrank(launchKey, product._id.toString());
          if (zrank === null) {
            zrank = await redis.zrevrank(votesKey, product._id.toString());
          }
          if (zrank !== null) {
            rank = zrank + 1;
          }
        } catch (err: any) {
          logger.warn({ err: err.message }, 'Failed to query Redis rank for OG card');
        }
      }

      if (rank === null) {
        const latestSnapshot = await DailyLeaderboardSnapshot.findOne({
          productId: product._id,
          leaderboardType: 'LAUNCH_DAY',
        })
          .sort({ snapshotDate: -1 })
          .lean();

        if (latestSnapshot) {
          rank = latestSnapshot.rank;
        }
      }

      // 3. Fetch live vote count
      let voteCount = 0;
      try {
        voteCount = await Vote.countDocuments({
          productId: product._id,
          status: VoteStatus.VALID,
        });
      } catch (err: any) {
        logger.warn({ err: err.message }, 'Failed to fetch vote count for OG card');
      }

      // 4. Determine rank badge text
      let rankLabel = 'FEATURED PRODUCT';
      let rankColor1 = '#3b82f6';
      let rankColor2 = '#1d4ed8';

      if (rank === 1) {
        rankLabel = '#1 PRODUCT OF THE DAY';
        rankColor1 = '#f59e0b';
        rankColor2 = '#d97706';
      } else if (rank !== null && rank <= 5) {
        rankLabel = `TOP 5 DAILY LAUNCH • #${rank}`;
        rankColor1 = '#ec4899';
        rankColor2 = '#be185d';
      }

      // 5. Generate 1200x630 SVG template
      const svg = this.renderOgCardSvg({
        productName: product.name,
        tagline: product.tagline || 'Discover and scale with LaunchProduct',
        logoUrl: product.media?.logoUrl,
        rankLabel,
        rankColor1,
        rankColor2,
        voteCount,
        slug: product.slug,
      });

      // 6. Rasterize SVG to PNG buffer using sharp
      const pngBuffer = await sharp(Buffer.from(svg))
        .png({ compressionLevel: 8 })
        .toBuffer();

      // Cache in Redis for 24 hours (86,400s)
      if (isRedisConnected()) {
        try {
          await redis.set(cacheKey, pngBuffer.toString('base64'), 'EX', 86400);
        } catch (cacheErr: any) {
          logger.warn({ err: cacheErr.message }, 'Failed to cache OG PNG in Redis');
        }
      }

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, s-maxage=86400');
      res.setHeader('X-Cache', 'MISS');
      res.status(200).send(pngBuffer);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Pure 1200x630 SVG generator for OG Image
   */
  renderOgCardSvg(options: {
    productName: string;
    tagline: string;
    logoUrl?: string;
    rankLabel: string;
    rankColor1: string;
    rankColor2: string;
    voteCount: number;
    slug: string;
  }): string {
    const { productName, tagline, rankLabel, rankColor1, rankColor2, voteCount, slug } = options;

    const initial = productName.charAt(0).toUpperCase();
    const cleanTagline = tagline.length > 90 ? tagline.substring(0, 87) + '...' : tagline;

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- Background Gradients -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#070a13" />
      <stop offset="50%" stop-color="#0c1222" />
      <stop offset="100%" stop-color="#05080f" />
    </linearGradient>

    <!-- Radial Glow Behind Card -->
    <radialGradient id="centerGlow" cx="50%" cy="30%" r="60%">
      <stop offset="0%" stop-color="#ff6b00" stop-opacity="0.14" />
      <stop offset="50%" stop-color="#7c3aed" stop-opacity="0.08" />
      <stop offset="100%" stop-color="#000000" stop-opacity="0" />
    </radialGradient>

    <!-- Rank Badge Gradient -->
    <linearGradient id="rankGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${rankColor1}" />
      <stop offset="100%" stop-color="${rankColor2}" />
    </linearGradient>

    <!-- Logo Monogram Gradient -->
    <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff7a18" />
      <stop offset="100%" stop-color="#af002d" />
    </linearGradient>

    <!-- Brand Flame Gradient -->
    <linearGradient id="brandFlame" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff7a18" />
      <stop offset="100%" stop-color="#ea580c" />
    </linearGradient>

    <filter id="cardShadow" x="-5%" y="-5%" width="110%" height="110%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="16" stdDeviation="32" flood-color="#000000" flood-opacity="0.6" />
    </filter>
  </defs>

  <!-- 1. Background Fill -->
  <rect width="1200" height="630" fill="url(#bgGrad)" />
  <rect width="1200" height="630" fill="url(#centerGlow)" />

  <!-- 2. Decorative Top Edge Gradient Line -->
  <rect x="0" y="0" width="1200" height="4" fill="url(#logoGrad)" />

  <!-- 3. Main Glassmorphic Card Container -->
  <rect x="70" y="65" width="1060" height="500" rx="24" fill="#0f172a" fill-opacity="0.75" stroke="#334155" stroke-width="1.5" filter="url(#cardShadow)" />

  <!-- Top-Left: Product Logo & Monogram -->
  <g transform="translate(120, 115)">
    <rect width="84" height="84" rx="20" fill="url(#logoGrad)" />
    <text x="42" y="58" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="44" font-weight="800" fill="#ffffff" text-anchor="middle">
      ${escapeXml(initial)}
    </text>
  </g>

  <!-- Top-Right: Rank Badge -->
  <g transform="translate(730, 125)">
    <rect width="350" height="54" rx="27" fill="url(#rankGrad)" />
    <!-- Trophy / Star Icon -->
    <path d="M35 27L28 20H42L35 27Z" fill="#ffffff" opacity="0.9" />
    <text x="175" y="34" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="800" fill="#ffffff" letter-spacing="1.2" text-anchor="middle">
      ${escapeXml(rankLabel)}
    </text>
  </g>

  <!-- Center Content: Product Name -->
  <text x="120" y="270" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="56" font-weight="800" fill="#ffffff" letter-spacing="-1">
    ${escapeXml(productName)}
  </text>

  <!-- Center Content: Tagline -->
  <text x="120" y="325" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="26" font-weight="400" fill="#94a3b8" letter-spacing="-0.3">
    ${escapeXml(cleanTagline)}
  </text>

  <!-- Live Vote Pill -->
  <g transform="translate(120, 365)">
    <rect width="180" height="48" rx="12" fill="#1e293b" stroke="#475569" stroke-width="1" />
    <!-- Upvote Arrow -->
    <path d="M36 21L28 29H44L36 21Z" fill="#ff7a18" />
    <text x="56" y="32" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="700" fill="#f8fafc">
      ${voteCount} Upvotes
    </text>
  </g>

  <!-- Bottom Divider Line -->
  <line x1="120" y1="465" x2="1080" y2="465" stroke="#1e293b" stroke-width="1.5" />

  <!-- Bottom Left: LaunchProduct Brand Footer -->
  <g transform="translate(120, 495)">
    <!-- Small Flame / Rocket Mark -->
    <rect width="24" height="24" rx="6" fill="url(#brandFlame)" />
    <path d="M12 5C12 5 8.5 7.5 8.5 12C8.5 14 9.5 15.5 10.5 16.5L12 15L13.5 16.5C14.5 15.5 15.5 14 15.5 12C15.5 7.5 12 5 12 5Z" fill="#ffffff" />
    <text x="36" y="17" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="17" font-weight="700" fill="#ffffff" letter-spacing="-0.4">
      LaunchProduct
    </text>
    <text x="165" y="17" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="500" fill="#64748b">
      • Product Discovery &amp; Growth Platform
    </text>
  </g>

  <!-- Bottom Right: Canonical URL Watermark -->
  <text x="1080" y="512" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="600" fill="#64748b" text-anchor="end">
    launchproduct.com/p/${escapeXml(slug)}
  </text>
</svg>`;
  }
}

export const ogController = new OgController();
export default ogController;
