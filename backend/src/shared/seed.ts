import mongoose, { Types } from 'mongoose';
import { Category, ICategory } from '../models/Category.model';
import { SystemSettings } from '../models/SystemSettings.model';
import { User } from '../models/User.model';
import { Product } from '../models/Product.model';
import { connectDB } from './db';
import { logger } from './logger';
import { ProductStatus, UserRole } from './constants';

export interface SeedResult {
  categoriesCount: number;
  settingsCount: number;
  usersCount: number;
  productsCount: number;
}

/**
 * 1. The 8 MVP Categories in exact order
 */
export const SEED_CATEGORIES = [
  {
    slug: 'ai-tools',
    name: 'AI Tools',
    description: 'Artificial intelligence tools and assistants',
    sortOrder: 1,
  },
  {
    slug: 'ai-agents',
    name: 'AI Agents',
    description: 'Autonomous AI agent frameworks and platforms',
    sortOrder: 2,
  },
  {
    slug: 'saas',
    name: 'SaaS',
    description: 'Software as a Service applications',
    sortOrder: 3,
  },
  {
    slug: 'developer-tools',
    name: 'Developer Tools',
    description: 'Tools for software developers',
    sortOrder: 4,
  },
  {
    slug: 'productivity',
    name: 'Productivity',
    description: 'Productivity and workflow tools',
    sortOrder: 5,
  },
  {
    slug: 'marketing-tools',
    name: 'Marketing Tools',
    description: 'Marketing and growth tools',
    sortOrder: 6,
  },
  {
    slug: 'seo-tools',
    name: 'SEO Tools',
    description: 'SEO and content optimization tools',
    sortOrder: 7,
  },
  {
    slug: 'design-tools',
    name: 'Design Tools',
    description: 'Design and creative tools',
    sortOrder: 8,
  },
];

/**
 * 2. System Settings Default Configurations
 */
export const SEED_SYSTEM_SETTINGS = [
  {
    key: 'antiFraudWeights',
    value: {
      SIG_ACCOUNT_NEW: 20,
      SIG_IP_DATACENTER: 25,
      SIG_SUBNET_CONCENTRATION: 35,
      SIG_BURST_VELOCITY: 25,
      SIG_ZERO_PRIOR_ACTIVITY: 15,
      SIG_DEVICE_COLLISION: 40,
      SIG_HISTORICAL_TRUST: -20,
      THRESHOLD_LOW: 30,
      THRESHOLD_HIGH: 70,
    },
    description: 'Multi-signal vote fraud detection weights and threshold boundaries',
  },
  {
    key: 'rankingWeights',
    value: {
      W_v: 1.0,
      W_c: 0.15,
      W_r: 2.5,
      GAMMA_LAUNCH: 1.2,
      LAMBDA_DECAY: 0.75,
    },
    description: 'Core launch, trending, and all-time leaderboard formula coefficients',
  },
  {
    key: 'voteRetractWindowMinutes',
    value: 15,
    description: 'Window in minutes during which a community vote may be retracted',
  },
  {
    key: 'minAccountAgeHours',
    value: 2,
    description: 'Minimum required account age in hours to cast community votes without high risk',
  },
  {
    key: 'reviewMinAccountAgeDays',
    value: 2,
    description: 'Minimum required account age in days to submit community product reviews',
  },
  {
    key: 'campaignSlotLimits',
    value: {
      HOMEPAGE_SPOTLIGHT: 3,
      CATEGORY_FEATURED: 2,
    },
    description: 'Maximum concurrent active sponsorships allowed per inventory slot',
  },
];

/**
 * 3. Seed Users (Admin & Sample Founders)
 */
export const SEED_USERS = [
  {
    email: 'admin@launchproduct.io',
    role: UserRole.ADMIN,
    isBanned: false,
    founderProfile: {
      displayName: 'Platform Admin',
      bio: 'LaunchProduct governance and curation team',
      avatarUrl: 'https://assets.launchproduct.io/avatars/admin.png',
    },
  },
  {
    email: 'alex.founder@supasite.io',
    role: UserRole.FOUNDER,
    isBanned: false,
    founderProfile: {
      displayName: 'Alex Rivera',
      bio: 'Founder at Supasite. Ex-Vercel edge enthusiast.',
      avatarUrl: 'https://assets.launchproduct.io/avatars/alex.png',
      twitterHandle: 'alex_rivera',
      githubHandle: 'alexrivera',
      websiteUrl: 'https://getsupasite.com',
    },
  },
  {
    email: 'elena.ai@agentforge.dev',
    role: UserRole.FOUNDER,
    isBanned: false,
    founderProfile: {
      displayName: 'Elena Rostova',
      bio: 'Building autonomous multi-agent systems.',
      avatarUrl: 'https://assets.launchproduct.io/avatars/elena.png',
      twitterHandle: 'elena_agents',
      githubHandle: 'elenarostova',
      websiteUrl: 'https://agentforge.dev',
    },
  },
  {
    email: 'sarah.maker@devflow.io',
    role: UserRole.FOUNDER,
    isBanned: false,
    founderProfile: {
      displayName: 'Sarah Jenkins',
      bio: 'DevOps engineer & creator of DevFlow.',
      avatarUrl: 'https://assets.launchproduct.io/avatars/sarah.png',
      twitterHandle: 'sarah_devops',
      websiteUrl: 'https://devflow.io',
    },
  },
  {
    email: 'david.code@promptmate.ai',
    role: UserRole.FOUNDER,
    isBanned: false,
    founderProfile: {
      displayName: 'David Chen',
      bio: 'AI prompt engineer & creator of PromptMate.',
      avatarUrl: 'https://assets.launchproduct.io/avatars/david.png',
      websiteUrl: 'https://promptmate.ai',
    },
  },
];

/**
 * Executes the database seed operation idempotently using upserts
 */
export async function seedDatabase(): Promise<SeedResult> {
  logger.info('Starting LaunchProduct idempotent database seeding...');

  // 1. Seed 8 MVP Categories in exact order
  logger.info('Seeding 8 MVP categories...');
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

  // 3. Seed Admin and Founder Users
  logger.info('Seeding platform users (Admin & Founders)...');
  const userMap = new Map<string, Types.ObjectId>();

  for (const u of SEED_USERS) {
    const userDoc = await User.findOneAndUpdate(
      { email: u.email },
      {
        $set: {
          role: u.role,
          isBanned: u.isBanned,
          founderProfile: u.founderProfile,
          updatedAt: new Date(),
        },
        $setOnInsert: {
          createdAt: new Date(),
          oauthProviders: [],
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    userMap.set(u.email, userDoc._id);
  }
  logger.info(`✓ Seeded ${SEED_USERS.length} platform users`);

  // 4. Seed 5-10 Realistic Sample LIVE Products
  logger.info('Seeding sample LIVE products with realistic data...');
  const alexFounderId = userMap.get('alex.founder@supasite.io')!;
  const elenaFounderId = userMap.get('elena.ai@agentforge.dev')!;
  const sarahFounderId = userMap.get('sarah.maker@devflow.io')!;
  const davidFounderId = userMap.get('david.code@promptmate.ai')!;

  const sampleProducts = [
    // 1. Supasite (from database.md sample document)
    {
      slug: 'supasite',
      canonicalDomain: 'getsupasite.com',
      name: 'Supasite',
      tagline: 'AI-powered static site builder with instant edge deployments',
      description:
        'Supasite analyzes your repository or plain English prompt to generate production-ready Next.js landing pages deployed across 300+ edge locations.',
      websiteUrl: 'https://getsupasite.com',
      founderId: alexFounderId,
      submittedById: alexFounderId,
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
      launchDate: new Date('2026-09-18T00:00:00.000Z'),
      initialVersion: 1,
    },
    // 2. AgentForge
    {
      slug: 'agentforge',
      canonicalDomain: 'agentforge.dev',
      name: 'AgentForge',
      tagline: 'Autonomous multi-agent orchestration framework for production engineers',
      description:
        'Build, debug, and monitor hierarchical multi-agent LLM systems with real-time token budgeting and deterministic state transitions.',
      websiteUrl: 'https://agentforge.dev',
      founderId: elenaFounderId,
      submittedById: elenaFounderId,
      categoryId: categoryMap.get('ai-agents')!,
      pricing: {
        model: 'open_source' as const,
        startingPrice: 0,
        currency: 'USD',
      },
      media: {
        logoUrl: 'https://assets.launchproduct.io/logos/agentforge-icon.png',
        bannerUrl: 'https://assets.launchproduct.io/banners/agentforge-hero.png',
        screenshotUrls: ['https://assets.launchproduct.io/shots/agentforge-dashboard.png'],
      },
      status: ProductStatus.LIVE,
      launchDate: new Date('2026-09-20T00:00:00.000Z'),
      initialVersion: 1,
    },
    // 3. DevFlow
    {
      slug: 'devflow',
      canonicalDomain: 'devflow.io',
      name: 'DevFlow',
      tagline: 'Automated PR review and preview environment manager',
      description:
        'Spin up isolated preview environments for every pull request with zero configuration and automated security scanning.',
      websiteUrl: 'https://devflow.io',
      founderId: sarahFounderId,
      submittedById: sarahFounderId,
      categoryId: categoryMap.get('developer-tools')!,
      pricing: {
        model: 'freemium' as const,
        startingPrice: 25,
        currency: 'USD',
      },
      media: {
        logoUrl: 'https://assets.launchproduct.io/logos/devflow-icon.png',
        bannerUrl: 'https://assets.launchproduct.io/banners/devflow-hero.png',
        screenshotUrls: ['https://assets.launchproduct.io/shots/devflow-pipeline.png'],
      },
      status: ProductStatus.LIVE,
      launchDate: new Date('2026-09-21T00:00:00.000Z'),
      initialVersion: 1,
    },
    // 4. PromptMate
    {
      slug: 'promptmate',
      canonicalDomain: 'promptmate.ai',
      name: 'PromptMate',
      tagline: 'Collaborative prompt engineering IDE with regression testing',
      description:
        'Version-control your prompts, run benchmark assertions against multiple models, and eliminate hallucinations in production.',
      websiteUrl: 'https://promptmate.ai',
      founderId: davidFounderId,
      submittedById: davidFounderId,
      categoryId: categoryMap.get('productivity')!,
      pricing: {
        model: 'paid' as const,
        startingPrice: 49,
        currency: 'USD',
      },
      media: {
        logoUrl: 'https://assets.launchproduct.io/logos/promptmate-icon.png',
        bannerUrl: 'https://assets.launchproduct.io/banners/promptmate-hero.png',
        screenshotUrls: ['https://assets.launchproduct.io/shots/promptmate-diff.png'],
      },
      status: ProductStatus.LIVE,
      launchDate: new Date('2026-09-22T00:00:00.000Z'),
      initialVersion: 1,
    },
    // 5. MetricPulse
    {
      slug: 'metricpulse',
      canonicalDomain: 'metricpulse.io',
      name: 'MetricPulse',
      tagline: 'Real-time usage-based billing and churn prediction telemetry',
      description:
        'Empower product-led SaaS companies to calculate customer lifetime value, detect expansion signals, and automate contract renewals.',
      websiteUrl: 'https://metricpulse.io',
      founderId: alexFounderId,
      submittedById: alexFounderId,
      categoryId: categoryMap.get('saas')!,
      pricing: {
        model: 'paid' as const,
        startingPrice: 99,
        currency: 'USD',
      },
      media: {
        logoUrl: 'https://assets.launchproduct.io/logos/metricpulse-icon.png',
        bannerUrl: 'https://assets.launchproduct.io/banners/metricpulse-hero.png',
        screenshotUrls: ['https://assets.launchproduct.io/shots/metricpulse-charts.png'],
      },
      status: ProductStatus.LIVE,
      launchDate: new Date('2026-09-23T00:00:00.000Z'),
      initialVersion: 1,
    },
    // 6. RankWave
    {
      slug: 'rankwave',
      canonicalDomain: 'rankwave.co',
      name: 'RankWave',
      tagline: 'Programmatic SEO pipeline generating intent-matched cluster pages',
      description:
        'Generate thousands of indexable, fact-checked comparison and alternative landing pages with schema markup and automated sitemaps.',
      websiteUrl: 'https://rankwave.co',
      founderId: sarahFounderId,
      submittedById: sarahFounderId,
      categoryId: categoryMap.get('seo-tools')!,
      pricing: {
        model: 'freemium' as const,
        startingPrice: 39,
        currency: 'USD',
      },
      media: {
        logoUrl: 'https://assets.launchproduct.io/logos/rankwave-icon.png',
        bannerUrl: 'https://assets.launchproduct.io/banners/rankwave-hero.png',
        screenshotUrls: ['https://assets.launchproduct.io/shots/rankwave-serp.png'],
      },
      status: ProductStatus.LIVE,
      launchDate: new Date('2026-09-24T00:00:00.000Z'),
      initialVersion: 1,
    },
    // 7. CanvasCraft
    {
      slug: 'canvascraft',
      canonicalDomain: 'canvascraft.design',
      name: 'CanvasCraft',
      tagline: 'Vector-to-code design system engine with automated Figma sync',
      description:
        'Transform Figma components into pixel-perfect Tailwind CSS and React primitives with zero drift between design and code.',
      websiteUrl: 'https://canvascraft.design',
      founderId: davidFounderId,
      submittedById: davidFounderId,
      categoryId: categoryMap.get('design-tools')!,
      pricing: {
        model: 'freemium' as const,
        startingPrice: 19,
        currency: 'USD',
      },
      media: {
        logoUrl: 'https://assets.launchproduct.io/logos/canvascraft-icon.png',
        bannerUrl: 'https://assets.launchproduct.io/banners/canvascraft-hero.png',
        screenshotUrls: ['https://assets.launchproduct.io/shots/canvascraft-ui.png'],
      },
      status: ProductStatus.LIVE,
      launchDate: new Date('2026-09-24T00:00:00.000Z'),
      initialVersion: 1,
    },
    // 8. HyperCopy
    {
      slug: 'hypercopy',
      canonicalDomain: 'hypercopy.ai',
      name: 'HyperCopy',
      tagline: 'High-converting ad copy and email newsletter personalization engine',
      description:
        'Analyze competitor ad libraries and generate multivariate ad creative and nurture sequences that boost return on ad spend.',
      websiteUrl: 'https://hypercopy.ai',
      founderId: elenaFounderId,
      submittedById: elenaFounderId,
      categoryId: categoryMap.get('marketing-tools')!,
      pricing: {
        model: 'freemium' as const,
        startingPrice: 29,
        currency: 'USD',
      },
      media: {
        logoUrl: 'https://assets.launchproduct.io/logos/hypercopy-icon.png',
        bannerUrl: 'https://assets.launchproduct.io/banners/hypercopy-hero.png',
        screenshotUrls: ['https://assets.launchproduct.io/shots/hypercopy-campaigns.png'],
      },
      status: ProductStatus.LIVE,
      launchDate: new Date('2026-09-24T00:00:00.000Z'),
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
          founderId: prod.founderId,
          submittedById: prod.submittedById,
          categoryId: prod.categoryId,
          pricing: prod.pricing,
          media: prod.media,
          status: prod.status,
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

  // 5. Update category product counts
  for (const [slug, catId] of categoryMap.entries()) {
    const count = await Product.countDocuments({ categoryId: catId, status: ProductStatus.LIVE });
    await Category.findByIdAndUpdate(catId, { $set: { productCount: count } });
  }

  logger.info('LaunchProduct database seeding completed successfully!');
  return {
    categoriesCount: SEED_CATEGORIES.length,
    settingsCount: SEED_SYSTEM_SETTINGS.length,
    usersCount: SEED_USERS.length,
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
