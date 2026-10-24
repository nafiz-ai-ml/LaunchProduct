import { Types } from 'mongoose';
import { productRepository, ProductSearchParams } from '../repositories/product.repository';
import { Product, IProduct } from '../models/Product.model';
import { Category } from '../models/Category.model';
import { ActivityEvent } from '../models/ActivityEvent.model';
import { RankingLedger } from '../models/RankingLedger.model';
import { ProductStatus } from '../shared/constants';
import {
  NotFoundError,
  ValidationError,
} from '../shared/errors';
import { isSafeUrl } from '../shared/zod-schemas';
import { rankingService } from './ranking.service';
import { paymentService } from './payment.service';
import { scrapeAndSynthesizeMetadata } from './scraper.service';

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
   * 1. Public directory browse and full-text search with pagination
   */
  async searchProducts(params: ProductSearchParams): Promise<{
    products: IProduct[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(params.limit || 25, 100));

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
   * 2. Retrieve product by slug
   */
  async getProductBySlug(slug: string): Promise<IProduct> {
    if (!slug) {
      throw new ValidationError('Product slug is required');
    }

    const product = await productRepository.findBySlug(slug);
    if (!product || product.status === ProductStatus.DELETED) {
      throw new NotFoundError(`Product '${slug}' not found`);
    }

    return product;
  }

  /**
   * 3. Public Accountless Product Submission & Pay-to-Rank entry point.
   * Anonymous product submission: public POST, zod validated, rate limited per IP using req.ip.
   * New products enter in status DRAFT.
   * SUSPENDED, REJECTED, DELETED and ARCHIVED products must never become LIVE through a payment,
   * and rank-checkout must reject those statuses.
   */
  async publicAccountlessSubmit(data: {
    name: string;
    tagline: string;
    description: string;
    websiteUrl: string;
    categoryId: string;
    contactEmail?: string;
    logoUrl?: string;
    initialPaymentCents?: number;
    provider?: string;
    successUrl?: string;
    cancelUrl?: string;
  }): Promise<{
    product: IProduct;
    isExistingProduct: boolean;
    checkoutUrl: string;
    sessionId: string;
    amountCents: number;
    formattedAmount: string;
    contributionType: 'INITIAL_ENTRY' | 'DAILY';
  }> {
    if (!data.websiteUrl || !isSafeUrl(data.websiteUrl)) {
      throw new ValidationError('Website URL must have a valid protocol (http: or https:) and not exceed 2048 characters');
    }
    if (data.logoUrl && !isSafeUrl(data.logoUrl)) {
      throw new ValidationError('Logo URL must have a valid protocol (http: or https:) and not exceed 2048 characters');
    }
    if (!data.name || data.name.trim().length < 2) {
      throw new ValidationError('Product name must be at least 2 characters');
    }
    if (!data.tagline || data.tagline.trim().length < 10) {
      throw new ValidationError('Product tagline must be at least 10 characters');
    }

    const normalizedUrl = normalizeUrl(data.websiteUrl);
    const domain = extractCanonicalDomain(normalizedUrl);
    const rules = await rankingService.getRankingRules();

    // Check if product with this canonical domain already exists in the permanent directory
    const existing = await productRepository.findByCanonicalDomain(domain);

    if (existing) {
      const disallowedStatuses = [
        ProductStatus.SUSPENDED,
        ProductStatus.REJECTED,
        ProductStatus.DELETED,
        ProductStatus.ARCHIVED,
      ];
      if (disallowedStatuses.includes(existing.status)) {
        throw new ValidationError(`Product '${domain}' is in status '${existing.status}' and cannot receive ranking payments`, [
          { field: 'websiteUrl', code: 'INVALID_STATUS', message: `Cannot submit or checkout for product in status ${existing.status}` },
        ]);
      }

      // Repeat submission for an existing product: register daily participation
      const amountToPay = Math.max(
        rules.minIncrementCents,
        data.initialPaymentCents || rules.minIncrementCents
      );

      const checkout = await paymentService.createRankingCheckout({
        productId: existing._id.toString(),
        amountCents: amountToPay,
        payerEmail: data.contactEmail,
        contributionType: 'DAILY',
        provider: (data.provider as any) || 'paddle',
        successUrl: data.successUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/?status=success&paid=true`,
        cancelUrl: data.cancelUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/?status=cancelled`,
      });

      return {
        product: existing,
        isExistingProduct: true,
        checkoutUrl: checkout.checkoutUrl,
        sessionId: checkout.sessionId,
        amountCents: amountToPay,
        formattedAmount: checkout.formattedAmount,
        contributionType: 'DAILY',
      };
    }

    // Initial Submission: create new product in status DRAFT
    const slug = await productRepository.generateSlug(data.name);

    const product = await productRepository.create({
      name: data.name.trim(),
      tagline: data.tagline.trim(),
      description: data.description.trim(),
      websiteUrl: normalizedUrl,
      canonicalDomain: domain,
      contactEmail: data.contactEmail?.trim().toLowerCase() || undefined,
      categoryId: new Types.ObjectId(data.categoryId),
      pricing: {
        model: 'freemium',
        startingPrice: 0,
        currency: 'USD',
      },
      media: {
        logoUrl: data.logoUrl?.trim() || '',
        bannerUrl: '',
        screenshotUrls: [],
      },
      slug,
      status: ProductStatus.DRAFT,
      paidRankingAmountCents: 0,
      todayPaidAmountCents: 0,
      initialVersion: 1,
    });

    const amountToPay = Math.max(
      rules.minInitialPaymentCents,
      data.initialPaymentCents || rules.minInitialPaymentCents
    );

    const checkout = await paymentService.createRankingCheckout({
      productId: product._id.toString(),
      amountCents: amountToPay,
      payerEmail: data.contactEmail,
      contributionType: 'INITIAL_ENTRY',
      provider: (data.provider as any) || 'paddle',
      successUrl: data.successUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/?status=success&paid=true`,
      cancelUrl: data.cancelUrl || `${process.env.FRONTEND_URL || 'http://localhost:3000'}/?status=cancelled`,
    });

      return {
      product,
      isExistingProduct: false,
      checkoutUrl: checkout.checkoutUrl,
      sessionId: checkout.sessionId,
      amountCents: amountToPay,
      formattedAmount: checkout.formattedAmount,
      contributionType: 'INITIAL_ENTRY',
    };
  }

  /**
   * 4. Fast Domain & URL Preview for Claim Rank Hero
   * Automatically extracts favicon logo, metadata, checks existing status,
   * and computes live rank simulations.
   */
  async previewDomain(inputUrl: string): Promise<any> {
    if (!inputUrl || typeof inputUrl !== 'string') {
      throw new ValidationError('A website URL or domain is required');
    }

    const cleanInput = inputUrl.trim().replace(/^@/, '');
    const domain = extractCanonicalDomain(cleanInput);
    const normalizedUrl = normalizeUrl(cleanInput);

    const categories = await Category.find({ isActive: true }).sort({ sortOrder: 1 }).lean();
    const defaultCategory = categories[0] || null;

    // Check if domain exists in database
    const existing = await Product.findOne({ canonicalDomain: domain })
      .populate('categoryId')
      .lean();

    let name = '';
    let tagline = '';
    let description = '';
    let logoUrl = '';
    let categoryId = defaultCategory?._id?.toString() || '';
    let categoryName = defaultCategory?.name || 'General';
    let categorySlug = defaultCategory?.slug || 'general';

    if (existing) {
      name = existing.name;
      tagline = existing.tagline;
      description = existing.description;
      logoUrl = existing.media?.logoUrl || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      const cat = existing.categoryId as any;
      if (cat && cat._id) {
        categoryId = cat._id.toString();
        categoryName = cat.name || categoryName;
        categorySlug = cat.slug || categorySlug;
      }
    } else {
      // Scrape web metadata
      try {
        const scraped = await scrapeAndSynthesizeMetadata(normalizedUrl);
        name = scraped.name;
        tagline = scraped.tagline;
        description = scraped.description;
        logoUrl = scraped.logoUrl || `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
        if (scraped.suggestedCategorySlug) {
          const matchedCat = categories.find((c) => c.slug === scraped.suggestedCategorySlug);
          if (matchedCat) {
            categoryId = matchedCat._id.toString();
            categoryName = matchedCat.name;
            categorySlug = matchedCat.slug;
          }
        }
      } catch {
        const domainName = domain.split('.')[0];
        name = domainName.charAt(0).toUpperCase() + domainName.slice(1);
        tagline = `The modern platform for ${domain}`;
        description = `${name} provides streamlined tools and solutions for users.`;
        logoUrl = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
      }
    }

    const catObjId = Types.ObjectId.isValid(categoryId) ? new Types.ObjectId(categoryId) : null;

    // Dynamic calculations:
    const testSpendCents = (existing?.paidRankingAmountCents || 0) + 1000; // +$10 simulation

    const [
      higherAllTime,
      higherCat,
      totalAllTime,
      totalCategory,
      overallTop,
      categoryTop,
      todayTop
    ] = await Promise.all([
      Product.countDocuments({ status: ProductStatus.LIVE, paidRankingAmountCents: { $gt: testSpendCents } }),
      catObjId ? Product.countDocuments({ status: ProductStatus.LIVE, categoryId: catObjId, paidRankingAmountCents: { $gt: testSpendCents } }) : Promise.resolve(0),
      Product.countDocuments({ status: ProductStatus.LIVE }),
      catObjId ? Product.countDocuments({ status: ProductStatus.LIVE, categoryId: catObjId }) : Promise.resolve(0),
      Product.findOne({ status: ProductStatus.LIVE }).sort({ paidRankingAmountCents: -1 }).lean(),
      catObjId ? Product.findOne({ status: ProductStatus.LIVE, categoryId: catObjId }).sort({ paidRankingAmountCents: -1 }).lean() : Promise.resolve(null),
      Product.findOne({ status: ProductStatus.LIVE, todayPaidDate: new Date().toISOString().split('T')[0], todayPaidAmountCents: { $gt: 0 } }).sort({ todayPaidAmountCents: -1 }).lean(),
    ]);

    const allTimeTopBidDollars = Math.round((overallTop?.paidRankingAmountCents || 0) / 100);
    const categoryTopBidDollars = Math.round((categoryTop?.paidRankingAmountCents || 0) / 100);
    const todayTopBidDollars = Math.round((todayTop?.todayPaidAmountCents || 0) / 100);

    return {
      domain,
      websiteUrl: normalizedUrl,
      name,
      tagline,
      description,
      logoUrl,
      categoryId,
      categoryName,
      categorySlug,
      categories: categories.map((c) => ({ id: c._id.toString(), name: c.name, slug: c.slug })),
      isExisting: Boolean(existing),
      existingProductId: existing?._id?.toString() || null,
      existingSlug: existing?.slug || null,
      existingPaidAmountCents: existing?.paidRankingAmountCents || 0,
      allTimeEstimatedRank: higherAllTime + 1,
      categoryEstimatedRank: higherCat + 1,
      totalAllTimeProducts: totalAllTime,
      totalCategoryProducts: totalCategory,
      categoryTopBidDollars,
      categoryOutbidCostDollars: Math.max(10, categoryTopBidDollars + 1),
      todayTopBidDollars,
      todayOutbidCostDollars: Math.max(10, todayTopBidDollars + 1),
      allTimeTopBidDollars,
      allTimeOutbidCostDollars: Math.max(10, allTimeTopBidDollars + 1),
    };
  }

  /**
   * 5. Comprehensive Product Detail for Public Product Page
   * Returns ranking positions (category & overall), transparent stats, outbid calculators,
   * and related competing products in the same category.
   */
  async getProductDetailsBySlug(slug: string): Promise<any> {
    if (!slug) {
      throw new ValidationError('Product slug is required');
    }

    const product = await productRepository.findBySlug(slug);
    if (!product || product.status === ProductStatus.DELETED) {
      throw new NotFoundError(`Product '${slug}' not found`);
    }

    const catId = (product.categoryId as any)?._id || product.categoryId;
    const currentPaidCents = product.paidRankingAmountCents || 0;
    const todayStr = new Date().toISOString().split('T')[0];

    const [
      higherOverall,
      totalOverall,
      higherCategory,
      totalCategory,
      categoryTopProduct,
      overallTopProduct,
      clickCount,
      raisedCount,
      relatedProductsRaw
    ] = await Promise.all([
      Product.countDocuments({
        status: ProductStatus.LIVE,
        $or: [
          { paidRankingAmountCents: { $gt: currentPaidCents } },
          { paidRankingAmountCents: currentPaidCents, firstPaidAt: { $lt: product.firstPaidAt || product.createdAt } }
        ]
      }),
      Product.countDocuments({ status: ProductStatus.LIVE }),
      catId ? Product.countDocuments({
        status: ProductStatus.LIVE,
        categoryId: catId,
        $or: [
          { paidRankingAmountCents: { $gt: currentPaidCents } },
          { paidRankingAmountCents: currentPaidCents, firstPaidAt: { $lt: product.firstPaidAt || product.createdAt } }
        ]
      }) : Promise.resolve(0),
      catId ? Product.countDocuments({ status: ProductStatus.LIVE, categoryId: catId }) : Promise.resolve(0),
      catId ? Product.findOne({ status: ProductStatus.LIVE, categoryId: catId }).sort({ paidRankingAmountCents: -1, firstPaidAt: 1 }).lean() : Promise.resolve(null),
      Product.findOne({ status: ProductStatus.LIVE }).sort({ paidRankingAmountCents: -1, firstPaidAt: 1 }).lean(),
      ActivityEvent.countDocuments({ productId: product._id, eventType: 'OUTBOUND_CLICK' }),
      RankingLedger.countDocuments({ productId: product._id, status: 'APPLIED' }),
      catId ? Product.find({ status: ProductStatus.LIVE, categoryId: catId, _id: { $ne: product._id } })
        .sort({ paidRankingAmountCents: -1, firstPaidAt: 1 })
        .limit(5)
        .lean() : Promise.resolve([]),
    ]);

    const categoryRank = higherCategory + 1;
    const overallRank = higherOverall + 1;

    // Check if ranked today
    let todayRank: number | null = null;
    if (product.todayPaidDate === todayStr && (product.todayPaidAmountCents || 0) > 0) {
      const higherToday = await Product.countDocuments({
        status: ProductStatus.LIVE,
        todayPaidDate: todayStr,
        todayPaidAmountCents: { $gt: product.todayPaidAmountCents }
      });
      todayRank = higherToday + 1;
    }

    const categoryTopSpendDollars = Math.round((categoryTopProduct?.paidRankingAmountCents || 0) / 100);
    const overallTopSpendDollars = Math.round((overallTopProduct?.paidRankingAmountCents || 0) / 100);
    const outbidCostToBeatCategoryTop = Math.max(10, categoryTopSpendDollars + 1);
    const outbidCostToBeatOverallTop = Math.max(10, overallTopSpendDollars + 1);

    // Format top 5 related products with their rank
    const relatedProducts = relatedProductsRaw.map((p, idx) => ({
      _id: p._id.toString(),
      id: p._id.toString(),
      name: p.name,
      slug: p.slug,
      tagline: p.tagline,
      logoUrl: p.media?.logoUrl || `https://www.google.com/s2/favicons?domain=${p.canonicalDomain}&sz=128`,
      canonicalDomain: p.canonicalDomain,
      websiteUrl: p.websiteUrl,
      paidRankingAmountCents: p.paidRankingAmountCents || 0,
      formattedAmount: `$${Math.round((p.paidRankingAmountCents || 0) / 100).toLocaleString()}`,
      categoryRank: idx + (categoryRank <= idx + 1 ? 2 : 1),
    }));

    return {
      product,
      stats: {
        categoryRank,
        categoryTotal: totalCategory,
        overallRank,
        overallTotal: totalOverall,
        clicksCount: clickCount || 0,
        raisedCount: Math.max(1, raisedCount),
        hasRankedToday: todayRank !== null,
        todayRank,
        categoryTopSpendDollars,
        overallTopSpendDollars,
        outbidCostToBeatCategoryTop,
        outbidCostToBeatOverallTop,
      },
      relatedProducts,
    };
  }
}

export const productService = new ProductService();
export default productService;
