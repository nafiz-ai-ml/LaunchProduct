import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
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

export class BadgeController {
  /**
   * GET /api/badge/:slug.svg?style=flat|pill&theme=dark|light
   * Dynamic SVG badge generator with rank and vote count.
   */
  async getBadgeSvg(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawSlug = getParam(req.params.slug);
      const slugOrId = rawSlug.replace(/\.svg$/, '').trim();

      const isObjectId = Types.ObjectId.isValid(slugOrId);
      const product = await Product.findOne({
        $or: [
          { slug: slugOrId.toLowerCase() },
          ...(isObjectId ? [{ _id: new Types.ObjectId(slugOrId) }] : []),
        ],
      }).lean();
      if (!product) {
        throw new NotFoundError(`Product '${slugOrId}' not found`);
      }

      const style = req.query.style === 'pill' ? 'pill' : 'flat';
      const theme = req.query.theme === 'light' ? 'light' : 'dark';

      // 1. Determine rank from Redis sorted set or latest snapshot
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
        } catch (redisErr: any) {
          logger.warn({ err: redisErr.message }, 'Failed to read rank from Redis for badge');
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

      // 2. Fetch live vote count
      let voteCount = 0;
      try {
        voteCount = await Vote.countDocuments({
          productId: product._id,
          status: VoteStatus.VALID,
        });
      } catch (err: any) {
        logger.warn({ err: err.message }, 'Failed to fetch vote count for badge');
      }

      // 3. Determine headline based on rank
      let badgeTitle = 'Featured on';
      let badgeSubtitle = 'LaunchProduct';

      if (rank === 1) {
        badgeTitle = '#1 Product of the Day';
        badgeSubtitle = 'LaunchProduct';
      } else if (rank !== null && rank <= 5) {
        badgeTitle = 'Top 5 Daily Launch';
        badgeSubtitle = 'LaunchProduct';
      }

      // 4. Generate SVG XML
      const svg = this.renderBadgeSvg({
        title: badgeTitle,
        subtitle: badgeSubtitle,
        voteCount,
        theme,
        style,
      });

      // 5. Set response headers
      res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');

      res.status(200).send(svg);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Pure SVG XML rendering function
   */
  renderBadgeSvg(options: {
    title: string;
    subtitle: string;
    voteCount: number;
    theme: 'dark' | 'light';
    style: 'flat' | 'pill';
  }): string {
    const { title, subtitle, voteCount, theme, style } = options;
    const isDark = theme === 'dark';
    const borderRadius = style === 'pill' ? 27 : 8;

    const bgColor = isDark ? '#0b0f19' : '#ffffff';
    const borderColor = isDark ? '#272e3f' : '#e2e8f0';
    const titleColor = isDark ? '#f8fafc' : '#0f172a';
    const subtitleColor = isDark ? '#94a3b8' : '#64748b';
    const voteBoxBg = isDark ? '#1a2234' : '#f1f5f9';
    const voteBoxBorder = isDark ? '#2d3748' : '#e2e8f0';
    const voteTextColor = isDark ? '#f1f5f9' : '#0f172a';
    const upvoteColor = '#ff6b00';

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="270" height="54" viewBox="0 0 270 54" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="rocketGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ff7a18" />
      <stop offset="100%" stop-color="#af002d" />
    </linearGradient>
    <filter id="badgeShadow" x="-5%" y="-5%" width="110%" height="115%" filterUnits="userSpaceOnUse">
      <feDropShadow dx="0" dy="2" stdDeviation="3" flood-color="#000000" flood-opacity="${isDark ? '0.35' : '0.08'}" />
    </filter>
  </defs>

  <!-- Outer Container Card -->
  <rect x="1" y="1" width="268" height="52" rx="${borderRadius}" fill="${bgColor}" stroke="${borderColor}" stroke-width="1.5" filter="url(#badgeShadow)" />

  <!-- LaunchProduct Brand Icon (Rocket / Spark Mark) -->
  <g transform="translate(14, 13)">
    <rect width="28" height="28" rx="6" fill="url(#rocketGrad)" />
    <path d="M14 6C14 6 10 9 10 14C10 16.5 11 18.5 12 19.5L14 18L16 19.5C17 18.5 18 16.5 18 14C18 9 14 6 14 6Z" fill="#ffffff" />
    <circle cx="14" cy="12" r="1.5" fill="#ff7a18" />
    <path d="M12.5 20.5L14 19L15.5 20.5L14 22L12.5 20.5Z" fill="#ffffff" opacity="0.9" />
  </g>

  <!-- Text Hierarchy -->
  <g transform="translate(50, 0)">
    <!-- Title / Rank -->
    <text x="0" y="23" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="11.5" font-weight="700" fill="${titleColor}" letter-spacing="-0.2">
      ${escapeXml(title)}
    </text>
    <!-- Subtitle / Brand Name -->
    <text x="0" y="38" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="10.5" font-weight="500" fill="${subtitleColor}">
      ${escapeXml(subtitle)}
    </text>
  </g>

  <!-- Upvote & Count Badge Component (Right aligned) -->
  <g transform="translate(202, 10)">
    <rect width="56" height="34" rx="${style === 'pill' ? 17 : 6}" fill="${voteBoxBg}" stroke="${voteBoxBorder}" stroke-width="1" />
    <!-- Upvote Triangle -->
    <path d="M28 8L22 15H34L28 8Z" fill="${upvoteColor}" />
    <!-- Live Vote Count -->
    <text x="28" y="27" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="10.5" font-weight="700" fill="${voteTextColor}" text-anchor="middle">
      ${voteCount}
    </text>
  </g>
</svg>`;
  }
}

export const badgeController = new BadgeController();
export default badgeController;
