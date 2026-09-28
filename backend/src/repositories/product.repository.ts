import { Types } from 'mongoose';
import { Product, IProduct, User, Category } from '../models';
import { ProductStatus } from '../shared/constants';

export interface ProductSearchParams {
  query?: string;
  categoryId?: string;
  pricingType?: string;
  sortBy?: 'newest' | 'score' | 'trending' | string;
  page?: number;
  limit?: number;
}

/**
 * Utility to generate a clean URL-friendly unique slug from product name
 * 1. Lowercases, removes special characters, replaces spaces/underscores with hyphens
 * 2. Ensures uniqueness by appending -2, -3, etc. if candidate slug already exists in DB
 */
export async function generateSlug(name: string): Promise<string> {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const root = base.length > 0 ? base : 'product';
  let candidate = root;
  let counter = 2;

  while (await Product.exists({ slug: candidate })) {
    candidate = `${root}-${counter}`;
    counter++;
  }

  return candidate;
}

export class ProductRepository {
  /**
   * Helper method to generate a unique slug
   */
  async generateSlug(name: string): Promise<string> {
    return generateSlug(name);
  }

  /**
   * 1. Find product by MongoDB ObjectId
   */
  async findById(id: string | Types.ObjectId): Promise<IProduct | null> {
    if (!id || (typeof id === 'string' && !Types.ObjectId.isValid(id))) {
      return null;
    }
    return Product.findById(id).lean<IProduct>().exec();
  }

  /**
   * 2. Find product by unique slug
   */
  async findBySlug(slug: string): Promise<IProduct | null> {
    if (!slug) return null;
    return Product.findOne({ slug: slug.toLowerCase().trim() })
      .populate('categoryId', 'name slug icon')
      .populate('founderId', 'name email avatarUrl karmaScore isVerified founderProfile')
      .lean<IProduct>()
      .exec();
  }

  /**
   * 3. Find product by normalized canonical domain
   */
  async findByCanonicalDomain(domain: string): Promise<IProduct | null> {
    if (!domain) return null;
    return Product.findOne({ canonicalDomain: domain.toLowerCase().trim() }).lean<IProduct>().exec();
  }

  /**
   * 4. Create a new product document
   */
  async create(data: Partial<IProduct>): Promise<IProduct> {
    // If slug is missing and name is provided, auto-generate unique slug
    let slug = data.slug;
    if (!slug && data.name) {
      slug = await generateSlug(data.name);
    }

    const product = new Product({
      ...data,
      slug,
      canonicalDomain: data.canonicalDomain?.toLowerCase().trim(),
    });

    const saved = await product.save();
    return saved.toObject();
  }

  /**
   * 5. Update product document by ID
   */
  async updateById(id: string | Types.ObjectId, data: Partial<IProduct>): Promise<IProduct | null> {
    if (!id || (typeof id === 'string' && !Types.ObjectId.isValid(id))) {
      return null;
    }
    return Product.findByIdAndUpdate(id, { $set: data }, { new: true }).lean<IProduct>().exec();
  }

  /**
   * 6. Soft delete a product
   */
  async softDelete(id: string | Types.ObjectId, requestedBy: string): Promise<void> {
    if (!id || (typeof id === 'string' && !Types.ObjectId.isValid(id))) {
      return;
    }
    await Product.findByIdAndUpdate(id, {
      $set: {
        status: ProductStatus.DELETED,
        rejectionReason: `Soft deleted by ${requestedBy}`,
      },
    }).exec();
  }

  /**
   * 7. Full-text search with filtering and pagination
   * - Uses MongoDB text index ($text query)
   * - Applies $match filters for categoryId, pricingType, status: 'LIVE'
   * - Uses $skip and $limit for pagination (default limit: 25)
   */
  async search(params: ProductSearchParams): Promise<{ products: IProduct[]; total: number }> {
    const page = Math.max(1, params.page || 1);
    const limit = Math.max(1, Math.min(params.limit || 25, 100));
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {
      status: ProductStatus.LIVE,
    };

    if (params.query && params.query.trim().length > 0) {
      filter.$text = { $search: params.query.trim() };
    }

    if (params.categoryId && Types.ObjectId.isValid(params.categoryId)) {
      filter.categoryId = new Types.ObjectId(params.categoryId);
    }

    if (params.pricingType) {
      filter['pricing.model'] = params.pricingType.toLowerCase().trim();
    }

    let sortOption: Record<string, unknown> = { launchDate: -1, createdAt: -1 };
    let projection: Record<string, unknown> = {};

    if (params.query && params.query.trim().length > 0) {
      projection = { score: { $meta: 'textScore' } };
      if (!params.sortBy || params.sortBy === 'score') {
        sortOption = { score: { $meta: 'textScore' }, launchDate: -1 };
      }
    }

    if (params.sortBy === 'newest') {
      sortOption = { launchDate: -1, createdAt: -1 };
    }

    const [products, total] = await Promise.all([
      Product.find(filter, projection)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .sort(sortOption as any)
        .skip(skip)
        .limit(limit)
        .lean<IProduct[]>()
        .exec(),
      Product.countDocuments(filter).exec(),
    ]);

    return { products, total };
  }

  /**
   * 8. Find products belonging to a founder
   */
  async findByFounderId(founderId: string | Types.ObjectId, status?: string): Promise<IProduct[]> {
    if (!founderId || (typeof founderId === 'string' && !Types.ObjectId.isValid(founderId))) {
      return [];
    }
    const filter: Record<string, unknown> = {
      founderId: new Types.ObjectId(founderId),
    };
    if (status) {
      filter.status = status;
    }
    return Product.find(filter).sort({ createdAt: -1 }).lean<IProduct[]>().exec();
  }

  /**
   * 9. Find products submitted by a user (hunter submissions)
   */
  async findBySubmitterId(submitterId: string | Types.ObjectId): Promise<IProduct[]> {
    if (!submitterId || (typeof submitterId === 'string' && !Types.ObjectId.isValid(submitterId))) {
      return [];
    }
    return Product.find({ submittedById: new Types.ObjectId(submitterId) })
      .sort({ createdAt: -1 })
      .lean<IProduct[]>()
      .exec();
  }

  /**
   * 10. Update product moderation status and reason
   */
  async updateStatus(
    id: string | Types.ObjectId,
    status: string,
    reason?: string
  ): Promise<IProduct | null> {
    if (!id || (typeof id === 'string' && !Types.ObjectId.isValid(id))) {
      return null;
    }

    const updateData: Record<string, unknown> = { status };
    if (reason) {
      updateData.rejectionReason = reason;
    }
    if (status === ProductStatus.LIVE) {
      updateData.launchDate = new Date();
    }

    return Product.findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .lean<IProduct>()
      .exec();
  }

  /**
   * 11. Find products in FIFO moderation review queue
   */
  async findPendingReview(limit: number = 50): Promise<IProduct[]> {
    return Product.find({ status: ProductStatus.PENDING_REVIEW })
      .sort({ createdAt: 1 })
      .limit(limit)
      .lean<IProduct[]>()
      .exec();
  }

  /**
   * 12. Count active live products in a category
   */
  async countByCategory(categoryId: string | Types.ObjectId): Promise<number> {
    if (!categoryId || (typeof categoryId === 'string' && !Types.ObjectId.isValid(categoryId))) {
      return 0;
    }
    return Product.countDocuments({
      categoryId: new Types.ObjectId(categoryId),
      status: ProductStatus.LIVE,
    }).exec();
  }
}

export const productRepository = new ProductRepository();
export default productRepository;
