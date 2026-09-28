import { Types } from 'mongoose';
import { productRepository, ProductSearchParams } from '../repositories/product.repository';
import { Product, IProduct } from '../models/Product.model';
import { ProductRevision, IProductRevision } from '../models/ProductRevision.model';
import { ActivityEvent } from '../models/ActivityEvent.model';
import { ProductStatus, EventSource } from '../shared/constants';
import {
  ConflictError,
  NotFoundError,
  AuthorizationError,
  ValidationError,
} from '../shared/errors';
import { redis, isRedisConnected } from '../shared/redis';
import { scraperQueue } from '../shared/scraper-queue';
import { logger } from '../shared/logger';

export interface ProductDraftInput {
  name: string;
  tagline: string;
  description: string;
  websiteUrl?: string;
  categoryId: string;
  pricing?: {
    model: 'free' | 'freemium' | 'paid' | 'open_source';
    startingPrice?: number;
    currency?: string;
  };
  media?: {
    logoUrl?: string;
    bannerUrl?: string;
    screenshotUrls?: string[];
  };
}

export interface JobStatusResult {
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  jobId: string;
  productId?: string;
  slug?: string;
  data?: Record<string, unknown>;
  error?: string;
  code?: string;
}

/**
 * Normalizes URL and strips extraneous parameters
 */
export function normalizeUrl(urlStr: string): string {
  let cleanUrl = urlStr.trim();
  if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
    cleanUrl = `https://${cleanUrl}`;
  }
  return cleanUrl;
}

/**
 * Extracts canonical apex domain (e.g. 'supasite.io')
 */
export function extractCanonicalDomain(urlStr: string): string {
  const normalized = normalizeUrl(urlStr);
  const parsed = new URL(normalized);
  return parsed.hostname.replace(/^www\./i, '').toLowerCase();
}

export class ProductService {
  /**
   * 1. Submit product website URL for background scraping
   */
  async submitProductUrl(url: string, userId: string): Promise<{ jobId: string }> {
    if (!url || typeof url !== 'string') {
      throw new ValidationError('A valid website URL is required', [
        { field: 'url', code: 'REQUIRED', message: 'URL cannot be empty' },
      ]);
    }

    const normalizedUrl = normalizeUrl(url);
    const domain = extractCanonicalDomain(normalizedUrl);

    // Check domain uniqueness across existing products
    const existing = await productRepository.findByCanonicalDomain(domain);
    if (existing && existing.status !== ProductStatus.DELETED) {
      throw new ConflictError(
        `A product with canonical domain '${domain}' has already been submitted`,
        'DUPLICATE_RESOURCE'
      );
    }

    // Generate unique scrape job identifier
    const jobId = `job_scr_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Set initial PENDING job status in Redis cache
    try {
      if (isRedisConnected()) {
        await redis.setex(
          `scraper:job:${jobId}`,
          3600,
          JSON.stringify({
            status: 'PENDING',
            jobId,
            url: normalizedUrl,
            userId,
            createdAt: new Date().toISOString(),
          })
        );
      }
    } catch (redisErr) {
      logger.warn({ redisErr, jobId }, 'Failed to set initial job state in Redis');
    }

    // Enqueue job to BullMQ 'scraper-jobs' queue
    try {
      await scraperQueue.add('scrape-product', {
        url: normalizedUrl,
        userId,
        jobId,
      });
      logger.info({ jobId, url: normalizedUrl }, 'Scrape job enqueued to BullMQ');
    } catch (queueErr) {
      logger.error({ queueErr, jobId }, 'Failed to enqueue scrape job to BullMQ');
    }

    return { jobId };
  }

  /**
   * 2. Poll status of a background scrape ingestion job
   */
  async getScrapeJobStatus(jobId: string, _userId: string): Promise<JobStatusResult> {
    if (!jobId) {
      throw new ValidationError('Job ID is required');
    }

    try {
      if (isRedisConnected()) {
        const cached = await redis.get(`scraper:job:${jobId}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          return {
            status: parsed.status,
            jobId,
            productId: parsed.productId,
            slug: parsed.slug,
            data: parsed.data,
            error: parsed.error,
            code: parsed.code,
          };
        }
      }
    } catch (err) {
      logger.warn({ err, jobId }, 'Error querying Redis scrape job status');
    }

    // Default to PENDING if not yet resolved
    return {
      status: 'PENDING',
      jobId,
    };
  }

  /**
   * 3. Confirm draft product metadata and transition to PENDING_REVIEW
   */
  async confirmDraftProduct(
    productId: string,
    userId: string,
    editedData: ProductDraftInput
  ): Promise<IProduct> {
    const product = await productRepository.findById(productId);
    if (!product) {
      throw new NotFoundError('Draft product was not found');
    }

    if (product.status !== ProductStatus.DRAFT) {
      throw new ConflictError(
        `Product cannot be confirmed because status is '${product.status}', expected 'DRAFT'`,
        'CONFLICT'
      );
    }

    if (product.submittedById.toString() !== userId) {
      throw new AuthorizationError(
        'You do not have permission to confirm this draft product',
        'FORBIDDEN'
      );
    }

    // Auto-generate unique slug from edited name
    const slug = await productRepository.generateSlug(editedData.name);

    // Update product document
    const updated = await productRepository.updateById(productId, {
      name: editedData.name.trim(),
      tagline: editedData.tagline.trim(),
      description: editedData.description.trim(),
      categoryId: new Types.ObjectId(editedData.categoryId),
      pricing: editedData.pricing || product.pricing,
      media: {
        logoUrl: editedData.media?.logoUrl || product.media?.logoUrl || '',
        bannerUrl: editedData.media?.bannerUrl || product.media?.bannerUrl || '',
        screenshotUrls: editedData.media?.screenshotUrls || product.media?.screenshotUrls || [],
      },
      websiteUrl: editedData.websiteUrl || product.websiteUrl,
      slug,
      status: ProductStatus.PENDING_REVIEW,
    });

    if (!updated) {
      throw new NotFoundError('Failed to confirm draft product');
    }

    // Create initial ProductRevision document (version 1)
    await ProductRevision.create({
      productId: updated._id,
      editorId: new Types.ObjectId(userId),
      versionNumber: 1,
      snapshot: {
        name: updated.name,
        tagline: updated.tagline,
        description: updated.description,
        websiteUrl: updated.websiteUrl,
        categoryId: updated.categoryId,
        pricing: updated.pricing,
        media: updated.media,
      },
      changeReason: 'Initial submission after draft confirmation',
    });

    // Log activity_event: PRODUCT_SUBMITTED
    try {
      await ActivityEvent.create({
        userId: new Types.ObjectId(userId),
        productId: updated._id,
        eventType: 'PRODUCT_SUBMITTED',
        eventSource: EventSource.ORGANIC,
        metadata: {
          slug: updated.slug,
          name: updated.name,
        },
      });
    } catch (eventErr) {
      logger.error({ eventErr }, 'Failed to record PRODUCT_SUBMITTED activity event');
    }

    return updated;
  }

  /**
   * 4. Retrieve public product detail by slug or ObjectId
   */
  async getProductBySlug(slugOrId: string): Promise<IProduct> {
    let product: IProduct | null = null;

    if (Types.ObjectId.isValid(slugOrId)) {
      product = await productRepository.findById(slugOrId);
    }
    if (!product) {
      product = await productRepository.findBySlug(slugOrId);
    }

    if (!product || product.status === ProductStatus.DELETED) {
      throw new NotFoundError(`Product '${slugOrId}' not found`);
    }

    return product;
  }

  /**
   * 5. Search directory products with pagination
   */
  async searchProducts(
    params: ProductSearchParams
  ): Promise<{ products: IProduct[]; total: number; page: number; limit: number }> {
    const page = Math.max(1, Number(params.page) || 1);
    const limit = Math.max(1, Math.min(Number(params.limit) || 25, 100));

    const { products, total } = await productRepository.search({
      ...params,
      page,
      limit,
    });

    return {
      products,
      total,
      page,
      limit,
    };
  }

  /**
   * 6. Update product details (founder update) with revision snapshot tracking
   */
  async updateProduct(
    productId: string,
    founderId: string,
    updates: Partial<IProduct> & { changeReason?: string }
  ): Promise<IProduct> {
    const product = await productRepository.findById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    // Verify user is verified founder of the product
    if (!product.founderId || product.founderId.toString() !== founderId) {
      throw new AuthorizationError(
        'Only the verified founder can update this product',
        'NOT_PRODUCT_FOUNDER'
      );
    }

    // Save ProductRevision snapshot BEFORE applying changes
    const latestRevision = await ProductRevision.findOne({ productId: product._id })
      .sort({ versionNumber: -1 })
      .lean();

    const nextVersion = (latestRevision?.versionNumber || product.initialVersion || 1) + 1;

    await ProductRevision.create({
      productId: product._id,
      editorId: new Types.ObjectId(founderId),
      versionNumber: nextVersion,
      snapshot: {
        name: product.name,
        tagline: product.tagline,
        description: product.description,
        websiteUrl: product.websiteUrl,
        categoryId: product.categoryId,
        pricing: product.pricing,
        media: product.media,
      },
      changeReason: updates.changeReason || 'Product updated by founder',
    });

    // Remove changeReason from Mongoose document updates
    const { changeReason, ...cleanUpdates } = updates;

    const updated = await productRepository.updateById(productId, cleanUpdates);
    if (!updated) {
      throw new NotFoundError('Failed to apply product updates');
    }

    // Log activity_event: PRODUCT_UPDATED
    try {
      await ActivityEvent.create({
        userId: new Types.ObjectId(founderId),
        productId: product._id,
        eventType: 'PRODUCT_UPDATED',
        eventSource: EventSource.ORGANIC,
        metadata: {
          version: nextVersion,
          updatedFields: Object.keys(cleanUpdates),
        },
      });
    } catch (eventErr) {
      logger.error({ eventErr }, 'Failed to record PRODUCT_UPDATED activity event');
    }

    return updated;
  }

  /**
   * 7. Retrieve historical product revision audit logs
   */
  async getRevisionHistory(productId: string): Promise<IProductRevision[]> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new ValidationError('Invalid product ID');
    }

    return ProductRevision.find({ productId: new Types.ObjectId(productId) })
      .sort({ versionNumber: -1 })
      .lean<IProductRevision[]>()
      .exec();
  }

  /**
   * 8. Soft delete product
   */
  async softDeleteProduct(productId: string, userId: string): Promise<void> {
    const product = await productRepository.findById(productId);
    if (!product) {
      throw new NotFoundError('Product not found');
    }

    await productRepository.softDelete(productId, userId);

    try {
      await ActivityEvent.create({
        userId: new Types.ObjectId(userId),
        productId: product._id,
        eventType: 'PRODUCT_DELETED',
        eventSource: EventSource.INTERNAL,
        metadata: { requestedBy: userId },
      });
    } catch (eventErr) {
      logger.error({ eventErr }, 'Failed to record PRODUCT_DELETED activity event');
    }
  }

  /**
   * 9. Manual fallback product submission
   */
  async manualSubmitProduct(
    data: ProductDraftInput,
    userId: string
  ): Promise<IProduct> {
    if (!data.websiteUrl) {
      throw new ValidationError('Website URL is required for manual submission');
    }

    const normalizedUrl = normalizeUrl(data.websiteUrl);
    const domain = extractCanonicalDomain(normalizedUrl);

    // Check duplicate domain
    const existing = await productRepository.findByCanonicalDomain(domain);
    if (existing && existing.status !== ProductStatus.DELETED) {
      throw new ConflictError(
        `A product with canonical domain '${domain}' already exists`,
        'DUPLICATE_RESOURCE'
      );
    }

    const slug = await productRepository.generateSlug(data.name);

    const product = await productRepository.create({
      name: data.name.trim(),
      tagline: data.tagline.trim(),
      description: data.description.trim(),
      websiteUrl: normalizedUrl,
      canonicalDomain: domain,
      submittedById: new Types.ObjectId(userId),
      categoryId: new Types.ObjectId(data.categoryId),
      pricing: {
        model: data.pricing?.model || 'freemium',
        startingPrice: data.pricing?.startingPrice || 0,
        currency: data.pricing?.currency || 'USD',
      },
      media: {
        logoUrl: data.media?.logoUrl || '',
        bannerUrl: data.media?.bannerUrl || '',
        screenshotUrls: data.media?.screenshotUrls || [],
      },
      slug,
      status: ProductStatus.PENDING_REVIEW,
      initialVersion: 1,
    });

    // Create initial revision
    await ProductRevision.create({
      productId: product._id,
      editorId: new Types.ObjectId(userId),
      versionNumber: 1,
      snapshot: {
        name: product.name,
        tagline: product.tagline,
        description: product.description,
        websiteUrl: product.websiteUrl,
        categoryId: product.categoryId,
        pricing: product.pricing,
        media: product.media,
      },
      changeReason: 'Manual product submission',
    });

    // Log activity_event
    try {
      await ActivityEvent.create({
        userId: new Types.ObjectId(userId),
        productId: product._id,
        eventType: 'PRODUCT_SUBMITTED',
        eventSource: EventSource.ORGANIC,
        metadata: { slug: product.slug, name: product.name, manual: true },
      });
    } catch (eventErr) {
      logger.error({ eventErr }, 'Failed to record PRODUCT_SUBMITTED activity event');
    }

    return product;
  }
}

export const productService = new ProductService();
export default productService;
