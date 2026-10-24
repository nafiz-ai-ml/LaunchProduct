import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Category, ICategory } from '../models/Category.model';
import { Product } from '../models/Product.model';
import { ProductStatus } from '../shared/constants';
import { redis, isRedisConnected } from '../shared/redis';
import {
  ValidationError,
  NotFoundError,
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


}

export const categoryController = new CategoryController();
export default categoryController;
