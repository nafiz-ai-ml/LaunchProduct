import mongoose, { Types } from 'mongoose';
import { Category, ICategory } from '../models/Category.model';
import { SystemSettings } from '../models/SystemSettings.model';
import { Product } from '../models/Product.model';
import { connectDB } from './db';
import { logger } from './logger';
import { ProductStatus } from './constants';

export interface SeedResult {
  categoriesCount: number;
  settingsCount: number;
  productsCount: number;
}

/**
 * 1. The 17 Platform Categories in exact order
 */
export const SEED_CATEGORIES = [
  { slug: 'ai-tools', name: 'AI Tools', description: 'Artificial intelligence tools and assistants', sortOrder: 1 },
  { slug: 'ai-agents', name: 'AI Agents', description: 'Autonomous AI agent frameworks and platforms', sortOrder: 2 },
  { slug: 'saas', name: 'SaaS', description: 'Software as a Service applications', sortOrder: 3 },
  { slug: 'developer-tools', name: 'Developer Tools', description: 'Tools for software developers', sortOrder: 4 },
  { slug: 'productivity', name: 'Productivity', description: 'Productivity and workflow tools', sortOrder: 5 },
  { slug: 'marketing-tools', name: 'Marketing Tools', description: 'Marketing and growth tools', sortOrder: 6 },
  { slug: 'seo-tools', name: 'SEO Tools', description: 'SEO and content optimization tools', sortOrder: 7 },
  { slug: 'design-tools', name: 'Design Tools', description: 'Design and creative tools', sortOrder: 8 },
  { slug: 'domains', name: 'Domains', description: 'Domain names, name generators, and domain marketplaces', sortOrder: 9 },
  { slug: 'social', name: 'Social & Community', description: 'Viral networks, social launch, creator & community tools', sortOrder: 10 },
  { slug: 'analytics', name: 'Analytics & Data', description: 'Product metrics, data tracking, and analytics dashboards', sortOrder: 11 },
  { slug: 'finance', name: 'Finance & Payments', description: 'Billing platforms, crypto, fintech apps, and invoicing', sortOrder: 12 },
  { slug: 'security', name: 'Security & Privacy', description: 'Authentication, cyber defense, privacy compliance, and encryption', sortOrder: 13 },
  { slug: 'ecommerce', name: 'E-commerce', description: 'Online storefronts, drop-shipping suites, and checkout engines', sortOrder: 14 },
  { slug: 'writing', name: 'Writing & Content', description: 'Copywriting AI, blogs, documentation, and storytelling tools', sortOrder: 15 },
  { slug: 'education', name: 'Education & Learning', description: 'EdTech platforms, interactive tutorials, and skill trainers', sortOrder: 16 },
  { slug: 'utilities', name: 'Utilities & Code Tools', description: 'CLI utilities, browser extensions, converters, and quick tools', sortOrder: 17 },
];

/**
 * 2. System Settings
 */
export const SEED_SYSTEM_SETTINGS = [
  {
    key: 'rankingRules',
    value: {
      minInitialPaymentCents: 599,
      minIncrementCents: 100,
      currency: 'USD',
      utcResetHour: 0,
      dailyResetUtc: '00:00:00',
      upvotesCountTowardsRank: false,
      reviewsCountTowardsRank: false,
    },
    description: 'Pay-to-Rank rules: $5.99 min initial entry, $1.00 min step-up increment',
  },
];

/**
 * Executes the database seed operation idempotently using upserts
 */
export async function seedDatabase(): Promise<SeedResult> {
  logger.info('Starting LaunchProduct idempotent database seeding...');

  // 1. Seed Categories
  logger.info('Seeding categories...');
  const categoryMap = new Map<string, Types.ObjectId>();

  for (const cat of SEED_CATEGORIES) {
    const updated = await Category.findOneAndUpdate(
      { slug: cat.slug },
      {
        $set: {
          name: cat.name,
          description: cat.description,
          sortOrder: cat.sortOrder,
          isActive: true,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          productCount: 0,
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    categoryMap.set(cat.slug, updated._id);
  }
  logger.info(`✓ Seeded ${SEED_CATEGORIES.length} categories`);

  // 2. Seed System Settings
  logger.info('Seeding system settings...');
  for (const setting of SEED_SYSTEM_SETTINGS) {
    await SystemSettings.findOneAndUpdate(
      { key: setting.key },
      {
        $set: {
          value: setting.value,
          description: setting.description,
          updatedAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  logger.info(`✓ Seeded ${SEED_SYSTEM_SETTINGS.length} system settings`);

  // 3. Seed Sample LIVE Products
  logger.info('Seeding sample LIVE products with realistic data...');
  const sampleProducts = [
    {
      slug: 'supasite',
      canonicalDomain: 'getsupasite.com',
      name: 'Supasite',
      tagline: 'AI-powered static site builder with instant edge deployments',
      description: 'Supasite analyzes your repository or plain English prompt to generate production-ready Next.js landing pages deployed across 300+ edge locations.',
      websiteUrl: 'https://getsupasite.com',
      categoryId: categoryMap.get('ai-tools') || categoryMap.get('saas')!,
      pricing: {
        model: 'freemium' as const,
        startingPrice: 19,
        currency: 'USD',
      },
      media: {
        logoUrl: 'https://assets.launchproduct.io/logos/supasite-icon.png',
        bannerUrl: 'https://assets.launchproduct.io/banners/supasite-hero.png',
        screenshotUrls: [
          'https://assets.launchproduct.io/shots/supasite-editor.png',
          'https://assets.launchproduct.io/shots/supasite-analytics.png',
        ],
      },
      status: ProductStatus.LIVE,
      paidRankingAmountCents: 5000,
      launchDate: new Date('2026-09-18T00:00:00.000Z'),
      initialVersion: 1,
    },
    {
      slug: 'agentforge',
      canonicalDomain: 'agentforge.dev',
      name: 'AgentForge',
      tagline: 'Enterprise multi-agent framework with human-in-the-loop guardrails',
      description: 'Orchestrate teams of specialized LLM agents with deterministic state machines and compliance audit logs.',
      websiteUrl: 'https://agentforge.dev',
      categoryId: categoryMap.get('ai-agents') || categoryMap.get('developer-tools')!,
      pricing: {
        model: 'open_source' as const,
        startingPrice: 0,
        currency: 'USD',
      },
      media: {
        logoUrl: 'https://assets.launchproduct.io/logos/agentforge-icon.png',
        bannerUrl: 'https://assets.launchproduct.io/banners/agentforge-hero.png',
        screenshotUrls: ['https://assets.launchproduct.io/shots/agentforge-graph.png'],
      },
      status: ProductStatus.LIVE,
      paidRankingAmountCents: 3500,
      launchDate: new Date('2026-09-20T00:00:00.000Z'),
      initialVersion: 1,
    },
  ];

  for (const prod of sampleProducts) {
    await Product.findOneAndUpdate(
      { slug: prod.slug },
      {
        $set: {
          canonicalDomain: prod.canonicalDomain,
          name: prod.name,
          tagline: prod.tagline,
          description: prod.description,
          websiteUrl: prod.websiteUrl,
          categoryId: prod.categoryId,
          pricing: prod.pricing,
          media: prod.media,
          status: prod.status,
          paidRankingAmountCents: prod.paidRankingAmountCents,
          launchDate: prod.launchDate,
          initialVersion: prod.initialVersion,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
  logger.info(`✓ Seeded ${sampleProducts.length} sample LIVE products`);

  // 4. Update category product counts
  for (const [slug, catId] of categoryMap.entries()) {
    const count = await Product.countDocuments({ categoryId: catId, status: ProductStatus.LIVE });
    await Category.findByIdAndUpdate(catId, { $set: { productCount: count } });
  }

  logger.info('LaunchProduct database seeding completed successfully!');
  return {
    categoriesCount: SEED_CATEGORIES.length,
    settingsCount: SEED_SYSTEM_SETTINGS.length,
    productsCount: sampleProducts.length,
  };
}

/**
 * Standalone execution runner
 */
export async function run(): Promise<void> {
  try {
    await connectDB();
    const result = await seedDatabase();
    console.log('✅ Seeding completed:', result);
    await mongoose.disconnect();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Seeding failed:', error);
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }
    process.exit(1);
  }
}

if (require.main === module) {
  run();
}

export default seedDatabase;
