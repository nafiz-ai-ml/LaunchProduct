import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Category, ICategory } from '../models/Category.model';
import { Product } from '../models/Product.model';
import { ProductStatus, UserRole } from '../shared/constants';
import { redis, isRedisConnected } from '../shared/redis';
import {
  ValidationError,
  NotFoundError,
  ConflictError,
  AuthorizationError,
} from '../shared/errors';
import { logger } from '../shared/logger';

function getParam(param: string | string[] | undefined): string {
  if (Array.isArray(param)) return param[0] || '';
  return param || '';
}

function getMetadata(req: Request, extra?: Record<string, unknown>) {
  return {
    requestId:
      (req.headers['x-request-id'] as string) ||
      (req as unknown as { id?: string }).id ||
      `req_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    timestamp: new Date().toISOString(),
    ...extra,
  };
}

export interface CategoryTreeNode extends Partial<ICategory> {
  children: Partial<ICategory>[];
}

export class CategoryController {
  /**
   * 1. GET /api/v1/categories
   * Return full category hierarchy tree (parent + children).
   * Cached in Redis with 1-hour TTL (3,600s).
   */
  async getCategoryTree(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const cacheKey = 'category:hierarchy:tree';
      let tree: CategoryTreeNode[] | null = null;
      let cached = false;

      if (isRedisConnected()) {
        try {
          const cachedJson = await redis.get(cacheKey);
          if (cachedJson) {
            tree = JSON.parse(cachedJson);
            cached = true;
          }
        } catch (err: any) {
          logger.warn({ err: err.message }, 'Failed to read category tree from Redis cache');
        }
      }

      if (!tree) {
        // Query all active categories sorted by sortOrder then name
        const categories = await Category.find({ isActive: true })
          .sort({ sortOrder: 1, name: 1 })
          .lean();

        // Calculate live product count for each category
        const productCounts = await Product.aggregate([
          { $match: { status: ProductStatus.LIVE } },
          { $group: { _id: '$categoryId', count: { $sum: 1 } } },
        ]);

        const countMap = new Map<string, number>();
        for (const pc of productCounts) {
          if (pc._id) {
            countMap.set(pc._id.toString(), pc.count);
          }
        }

        // Map categories with accurate productCount
        const hydratedCategories = categories.map((cat) => ({
          ...cat,
          productCount: countMap.get(cat._id.toString()) || 0,
        }));

        // Build hierarchy tree: root categories (parentId == null) with children array
        const rootCategories = hydratedCategories.filter((c) => !c.parentId);
        const childCategories = hydratedCategories.filter((c) => Boolean(c.parentId));

        tree = rootCategories.map((root) => {
          const children = childCategories.filter(
            (c) => c.parentId && c.parentId.toString() === root._id.toString()
          );
          return {
            ...root,
            children,
          };
        });

        // Cache result in Redis with 1-hour TTL (3,600s)
        if (isRedisConnected() && tree.length > 0) {
          try {
            await redis.set(cacheKey, JSON.stringify(tree), 'EX', 3600);
          } catch (cacheErr: any) {
            logger.warn({ err: cacheErr.message }, 'Failed to cache category tree in Redis');
          }
        }
      }

      res.status(200).json({
        success: true,
        data: {
          categories: tree,
        },
        meta: getMetadata(req, { cached }),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 2. GET /api/v1/categories/:slug
   * Category detail with live product count and subcategories.
   */
  async getCategoryBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const slug = getParam(req.params.slug).toLowerCase().trim();
      if (!slug) {
        throw new ValidationError('Category slug is required', [
          { field: 'slug', code: 'REQUIRED', message: 'Category slug must be provided' },
        ]);
      }

      const category = await Category.findOne({ slug, isActive: true }).lean();
      if (!category) {
        throw new NotFoundError(`Category with slug '${slug}' not found`);
      }

      // Live product count
      const liveProductCount = await Product.countDocuments({
        categoryId: category._id,
        status: ProductStatus.LIVE,
      });

      // Child subcategories if this is a parent category
      const children = await Category.find({
        parentId: category._id,
        isActive: true,
      })
        .sort({ sortOrder: 1, name: 1 })
        .lean();

      res.status(200).json({
        success: true,
        data: {
          category: {
            ...category,
            productCount: liveProductCount,
            children,
          },
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 3. POST /api/v1/categories
   * Create taxonomy category (requires ADMIN role).
   */
  async createCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        throw new AuthorizationError('Admin privileges required to create categories', 'FORBIDDEN');
      }

      const { name, description, iconUrl, sortOrder, parentId } = req.body;
      if (!name || typeof name !== 'string' || name.trim().length < 2) {
        throw new ValidationError('Category name must be at least 2 characters', [
          { field: 'name', code: 'INVALID_LENGTH', message: 'Name must be at least 2 characters' },
        ]);
      }

      // Generate or normalize slug
      let slug = req.body.slug;
      if (!slug || typeof slug !== 'string') {
        slug = name
          .toLowerCase()
          .trim()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
      } else {
        slug = slug.toLowerCase().trim();
      }

      // Check unique slug
      const existing = await Category.findOne({ slug });
      if (existing) {
        throw new ConflictError(`A category with slug '${slug}' already exists`);
      }

      // Validate parentId if provided
      let parentObjectId: Types.ObjectId | null = null;
      if (parentId) {
        if (!Types.ObjectId.isValid(parentId)) {
          throw new ValidationError('Invalid parentId format', [
            { field: 'parentId', code: 'INVALID_ID', message: 'parentId must be a valid ObjectId' },
          ]);
        }
        const parentCategory = await Category.findById(parentId);
        if (!parentCategory) {
          throw new NotFoundError('Parent category not found');
        }
        parentObjectId = new Types.ObjectId(parentId);
      }

      const newCategory = await Category.create({
        name: name.trim(),
        slug,
        description: description ? description.trim() : null,
        parentId: parentObjectId,
        iconUrl: iconUrl ? iconUrl.trim() : null,
        sortOrder: typeof sortOrder === 'number' ? sortOrder : 0,
        isActive: true,
      });

      // Invalidate Redis category hierarchy cache
      if (isRedisConnected()) {
        await redis.del('category:hierarchy:tree').catch(() => {});
      }

      res.status(201).json({
        success: true,
        data: {
          category: newCategory,
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 4. PATCH /api/v1/categories/:id
   * Update category (requires ADMIN role).
   */
  async updateCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || req.user.role !== UserRole.ADMIN) {
        throw new AuthorizationError('Admin privileges required to update categories', 'FORBIDDEN');
      }

      const id = getParam(req.params.id);
      if (!id || !Types.ObjectId.isValid(id)) {
        throw new ValidationError('Valid category ID is required in URL parameter', [
          { field: 'id', code: 'INVALID_ID', message: 'Category id must be a valid ObjectId' },
        ]);
      }

      const category = await Category.findById(id);
      if (!category) {
        throw new NotFoundError(`Category with id '${id}' not found`);
      }

      const { name, slug, description, iconUrl, sortOrder, isActive, parentId } = req.body;

      if (name !== undefined) {
        if (typeof name !== 'string' || name.trim().length < 2) {
          throw new ValidationError('Category name must be at least 2 characters', [
            { field: 'name', code: 'INVALID_LENGTH', message: 'Name must be at least 2 characters' },
          ]);
        }
        category.name = name.trim();
      }

      if (slug !== undefined) {
        const cleanSlug = slug.toLowerCase().trim();
        if (cleanSlug !== category.slug) {
          const existing = await Category.findOne({ slug: cleanSlug, _id: { $ne: category._id } });
          if (existing) {
            throw new ConflictError(`Category with slug '${cleanSlug}' already exists`);
          }
          category.slug = cleanSlug;
        }
      }

      if (description !== undefined) category.description = description ? description.trim() : undefined;
      if (iconUrl !== undefined) category.iconUrl = iconUrl ? iconUrl.trim() : undefined;
      if (typeof sortOrder === 'number') category.sortOrder = sortOrder;
      if (typeof isActive === 'boolean') category.isActive = isActive;

      if (parentId !== undefined) {
        if (parentId === null || parentId === '') {
          category.parentId = undefined;
        } else {
          if (!Types.ObjectId.isValid(parentId)) {
            throw new ValidationError('Invalid parentId format', [
              { field: 'parentId', code: 'INVALID_ID', message: 'parentId must be a valid ObjectId' },
            ]);
          }
          if (parentId.toString() === category._id.toString()) {
            throw new ValidationError('Category cannot be its own parent', [
              { field: 'parentId', code: 'SELF_PARENT', message: 'Cannot set parentId to self' },
            ]);
          }
          const parentCategory = await Category.findById(parentId);
          if (!parentCategory) {
            throw new NotFoundError('Parent category not found');
          }
          category.parentId = new Types.ObjectId(parentId);
        }
      }

      await category.save();

      // Invalidate Redis category hierarchy cache
      if (isRedisConnected()) {
        await redis.del('category:hierarchy:tree').catch(() => {});
      }

      res.status(200).json({
        success: true,
        data: {
          category,
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const categoryController = new CategoryController();
export default categoryController;
