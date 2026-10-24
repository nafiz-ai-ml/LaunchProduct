import sharp from 'sharp';
import { badgeController } from '../controllers/badge.controller';
import { ogController } from '../controllers/og.controller';

describe('Category, Dynamic SVG Badge & OpenGraph Card Tests', () => {
  describe('1. Category Tree Hierarchy Transformation', () => {
    it('constructs category tree hierarchy correctly', () => {
      const mockCategories = [
        { _id: 'cat_ai', name: 'AI Tools', slug: 'ai-tools', parentId: null, sortOrder: 1 },
        { _id: 'cat_agents', name: 'AI Agents', slug: 'ai-agents', parentId: 'cat_ai', sortOrder: 1 },
        { _id: 'cat_llms', name: 'LLMs', slug: 'llms', parentId: 'cat_ai', sortOrder: 2 },
        { _id: 'cat_dev', name: 'Developer Tools', slug: 'developer-tools', parentId: null, sortOrder: 2 },
        { _id: 'cat_db', name: 'Databases', slug: 'databases', parentId: 'cat_dev', sortOrder: 1 },
      ];

      const productCounts = [
        { _id: 'cat_ai', count: 12 },
        { _id: 'cat_agents', count: 8 },
        { _id: 'cat_llms', count: 4 },
        { _id: 'cat_dev', count: 20 },
        { _id: 'cat_db', count: 15 },
      ];

      const countMap = new Map<string, number>();
      for (const pc of productCounts) {
        countMap.set(pc._id, pc.count);
      }

      const hydrated = mockCategories.map((c) => ({
        ...c,
        productCount: countMap.get(c._id) || 0,
      }));

      const roots = hydrated.filter((c) => !c.parentId);
      const children = hydrated.filter((c) => Boolean(c.parentId));

      const tree = roots.map((root) => ({
        ...root,
        children: children.filter((child) => child.parentId === root._id),
      }));

      expect(tree.length).toBe(2);
      expect(tree[0].slug).toBe('ai-tools');
      expect(tree[0].children.length).toBe(2);
      expect(tree[0].children[0].slug).toBe('ai-agents');
      expect(tree[0].children[0].productCount).toBe(8);
      expect(tree[1].slug).toBe('developer-tools');
      expect(tree[1].children.length).toBe(1);
      expect(tree[1].children[0].slug).toBe('databases');
    });

    it('generates category slugs properly', () => {
      function generateCategorySlug(name: string): string {
        return name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      }

      expect(generateCategorySlug('AI & Machine Learning')).toBe('ai-machine-learning');
      expect(generateCategorySlug('Developer Tools / Infrastructure')).toBe('developer-tools-infrastructure');
      expect(generateCategorySlug('  Productivity Apps!  ')).toBe('productivity-apps');
    });
  });

  describe('2. Dynamic SVG Badge Generation', () => {
    it('generates flat dark SVG badge with correct dimensions and texts', () => {
      const svgRank1 = badgeController.renderBadgeSvg({
        title: '#1 Product of the Day',
        subtitle: 'LaunchProduct',
        voteCount: 142,
        theme: 'dark',
        style: 'flat',
      });

      expect(svgRank1.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
      expect(svgRank1).toContain('<svg width="270" height="54"');
      expect(svgRank1).toContain('#1 Product of the Day');
      expect(svgRank1).toContain('LaunchProduct');
      expect(svgRank1).toContain('rx="8"');
      expect(svgRank1).toContain('fill="#0b0f19"');
    });

    it('generates pill light SVG badge', () => {
      const svgTop5 = badgeController.renderBadgeSvg({
        title: 'Top 5 Daily Launch',
        subtitle: 'LaunchProduct',
        voteCount: 78,
        theme: 'light',
        style: 'pill',
      });

      expect(svgTop5).toContain('Top 5 Daily Launch');
      expect(svgTop5).toContain('rx="27"');
      expect(svgTop5).toContain('fill="#ffffff"');
    });
  });

  describe('3. OpenGraph 1200x630 Card & Rasterization', () => {
    it('renders valid SVG card and rasterizes to 1200x630 PNG buffer via sharp', async () => {
      const ogSvg = ogController.renderOgCardSvg({
        productName: 'DevFlow AI',
        tagline: 'Autonomous AI workflow orchestrator for software engineering teams',
        rankLabel: '#1 PRODUCT OF THE DAY',
        rankColor1: '#f59e0b',
        rankColor2: '#d97706',
        voteCount: 284,
        slug: 'devflow-ai',
      });

      expect(ogSvg).toContain('width="1200" height="630"');
      expect(ogSvg).toContain('DevFlow AI');
      expect(ogSvg).toContain('Autonomous AI workflow orchestrator');
      expect(ogSvg).toContain('#1 PRODUCT OF THE DAY');

      const pngBuffer = await sharp(Buffer.from(ogSvg))
        .png({ compressionLevel: 8 })
        .toBuffer();

      expect(pngBuffer.length).toBeGreaterThan(5000);
      expect(pngBuffer[0]).toBe(0x89);
      expect(pngBuffer[1]).toBe(0x50);
      expect(pngBuffer[2]).toBe(0x4e);
      expect(pngBuffer[3]).toBe(0x47);

      const metadata = await sharp(pngBuffer).metadata();
      expect(metadata.width).toBe(1200);
      expect(metadata.height).toBe(630);
      expect(metadata.format).toBe('png');
    });
  });
});
