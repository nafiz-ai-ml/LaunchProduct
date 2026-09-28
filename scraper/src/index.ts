import { Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import mongoose, { Types } from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

import { secureProductFetch, SsrfBlockedError, ScraperDisallowedError } from './fetcher';
import { extractMetadata, ScrapedMetadata } from './parser';
import { enrichWithAI, AIEnrichedMetadata } from './llm';
import { ScraperProduct, ScraperCategory } from './models';

// Load environment configuration
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const MONGODB_URI =
  process.env.MONGODB_URI || 'mongodb://localhost:27017/launchproduct';

// Dedicated Redis client for job status reporting
export const redisClient = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

export interface ScraperJobData {
  url: string;
  userId: string;
  jobId: string;
}

/**
 * Generate a unique slug in MongoDB for newly scraped drafts
 */
async function generateUniqueSlug(name: string): Promise<string> {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const root = base.length > 0 ? base : 'product';
  let candidate = root;
  let counter = 2;

  while (await ScraperProduct.exists({ slug: candidate })) {
    candidate = `${root}-${counter}`;
    counter++;
  }

  return candidate;
}

/**
 * Connect to MongoDB Atlas
 */
async function initDatabase(): Promise<void> {
  if (mongoose.connection.readyState === 0) {
    try {
      await mongoose.connect(MONGODB_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log('[Scraper] MongoDB connected successfully');
    } catch (err: any) {
      console.error('[Scraper] MongoDB connection error:', err.message);
    }
  }
}

/**
 * Process a single scrape ingestion job
 */
export async function processScrapeJob(data: ScraperJobData): Promise<void> {
  const { url, userId, jobId } = data;

  try {
    console.log(`[Scraper] Processing job ${jobId} for target URL: ${url}`);

    // Update job status to PROCESSING in Redis
    try {
      await redisClient.setex(
        `scraper:job:${jobId}`,
        3600,
        JSON.stringify({
          status: 'PROCESSING',
          jobId,
          url,
          startedAt: new Date().toISOString(),
        })
      );
    } catch (redisErr) {
      console.warn('[Scraper] Redis status update warning:', redisErr);
    }

    // 1. Fetch URL with SSRF protection, DNS resolution, and robots.txt check
    const html = await secureProductFetch(url);

    // 2. Extract OpenGraph and HTML content
    const scraped: ScrapedMetadata = extractMetadata(html, url);

    // 3. AI enrichment via GPT-4o JSON mode (or heuristic fallback)
    const enriched: AIEnrichedMetadata = await enrichWithAI(scraped, url);

    // 4. Resolve category from MongoDB
    await initDatabase();
    let category = await ScraperCategory.findOne({ slug: enriched.categorySlug }).exec();
    if (!category) {
      category = await ScraperCategory.findOne().exec();
    }

    // 5. Generate unique slug
    const slug = await generateUniqueSlug(enriched.suggestedName);

    // 6. Write DRAFT product document to MongoDB with status: 'DRAFT'
    const draftProduct = new ScraperProduct({
      slug,
      canonicalDomain: scraped.canonicalDomain,
      name: enriched.suggestedName,
      tagline: enriched.tagline,
      description: enriched.description,
      websiteUrl: url,
      submittedById: new Types.ObjectId(userId),
      categoryId: category ? category._id : null,
      pricing: {
        model: enriched.pricingModel,
        startingPrice: enriched.startingPrice || 0,
        currency: 'USD',
      },
      media: {
        logoUrl: scraped.imageUrl || '',
        bannerUrl: '',
        screenshotUrls: scraped.imageUrl ? [scraped.imageUrl] : [],
      },
      status: 'DRAFT',
      initialVersion: 1,
    });

    const saved = await draftProduct.save();
    console.log(`[Scraper] Successfully created DRAFT product ${saved._id} (${saved.slug})`);

    // 7. Emit job completion event to Redis for frontend polling
    const resultPayload = {
      status: 'COMPLETED',
      jobId,
      productId: saved._id.toString(),
      slug: saved.slug,
      data: {
        name: saved.name,
        tagline: saved.tagline,
        description: saved.description,
        categorySlug: enriched.categorySlug,
        pricingModel: enriched.pricingModel,
        startingPrice: enriched.startingPrice,
        bulletPoints: enriched.bulletPoints,
        logoUrl: saved.media.logoUrl,
        canonicalDomain: saved.canonicalDomain,
        websiteUrl: saved.websiteUrl,
      },
      completedAt: new Date().toISOString(),
    };

    try {
      await redisClient.setex(`scraper:job:${jobId}`, 3600, JSON.stringify(resultPayload));
    } catch (redisErr) {
      console.warn('[Scraper] Redis completion event warning:', redisErr);
    }
  } catch (error: any) {
    console.error(`[Scraper Error] Failed to scrape job ${jobId}:`, error.message);

    // 8. On any SSRF or scraper error: write failed job result to Redis
    const errorPayload = {
      status: 'FAILED',
      jobId,
      url,
      error: error.message,
      code:
        error instanceof SsrfBlockedError
          ? 'SSRF_ATTEMPT_BLOCKED'
          : error instanceof ScraperDisallowedError
          ? 'SCRAPER_DISALLOWED'
          : 'SCRAPER_FAILED',
      failedAt: new Date().toISOString(),
    };

    try {
      await redisClient.setex(`scraper:job:${jobId}`, 3600, JSON.stringify(errorPayload));
    } catch (redisErr) {
      console.warn('[Scraper] Redis failure event warning:', redisErr);
    }

    throw error;
  }
}

/**
 * BullMQ Worker Initialization
 */
export function startScraperWorker(): Worker {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(REDIS_URL);
  } catch {
    parsedUrl = new URL('redis://localhost:6379');
  }

  const connection = {
    host: parsedUrl.hostname || 'localhost',
    port: Number(parsedUrl.port) || 6379,
    password: parsedUrl.password || undefined,
    maxRetriesPerRequest: null,
  };

  const worker = new Worker(
    'scraper-jobs',
    async (job: Job<ScraperJobData>) => {
      await processScrapeJob(job.data);
    },
    {
      connection,
      concurrency: 2,
    }
  );

  worker.on('completed', (job: Job) => {
    console.log(`[Scraper Worker] Job ${job.id} completed successfully`);
  });

  worker.on('failed', (job: Job | undefined, err: Error) => {
    console.warn(`[Scraper Worker] Job ${job?.id} failed:`, err.message);
  });

  console.log('[Scraper Worker] Listening for jobs on queue "scraper-jobs"...');
  return worker;
}

// Start worker when executed directly
if (require.main === module) {
  initDatabase()
    .then(() => {
      startScraperWorker();
    })
    .catch((err) => {
      console.error('[Scraper Worker Fatal]', err);
    });
}

export { secureProductFetch, extractMetadata, enrichWithAI };
