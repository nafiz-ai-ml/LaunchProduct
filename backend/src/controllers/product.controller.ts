import { Request, Response, NextFunction } from 'express';
import { Types } from 'mongoose';
import { Product, Vote } from '../models';
import { productService } from '../services/product.service';
import { ValidationError, AuthenticationError } from '../shared/errors';

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

export class ProductController {
  /**
   * 1. POST /api/v1/products/scrape-preview
   * Submit website URL for asynchronous background scraping
   */
  async scrapePreview(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw new AuthenticationError('Authentication required to submit products', 'UNAUTHORIZED');
      }

      const url = req.body.url || req.body.websiteUrl;
      if (!url) {
        throw new ValidationError('Website URL is required', [
          { field: 'url', code: 'REQUIRED', message: 'Please provide a valid website URL to scrape' },
        ]);
      }

      const result = await productService.submitProductUrl(url, req.user.userId);

      res.status(202).json({
        success: true,
        data: {
          jobId: result.jobId,
          message: 'Scrape ingestion task queued successfully',
          statusUrl: `/api/v1/products/scrape-status/${result.jobId}`,
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 2. GET /api/v1/products/scrape-status/:jobId
   * Poll status of an active scrape ingestion job
   */
  async getScrapeStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const jobId = getParam(req.params.jobId);
      const status = await productService.getScrapeJobStatus(jobId, req.user?.userId || '');

      res.status(200).json({
        success: true,
        data: status,
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 3. POST /api/v1/products
   * Manual product submission (fallback)
   */
  async manualSubmit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw new AuthenticationError('Authentication required to submit products', 'UNAUTHORIZED');
      }

      const product = await productService.manualSubmitProduct(req.body, req.user.userId);

      res.status(201).json({
        success: true,
        data: {
          product,
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 4. PUT /api/v1/products/:id/confirm
   * Confirm draft product metadata and advance to PENDING_REVIEW
   */
  async confirmDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw new AuthenticationError('Authentication required to confirm draft product', 'UNAUTHORIZED');
      }

      const id = getParam(req.params.id);
      const confirmed = await productService.confirmDraftProduct(id, req.user.userId, req.body);

      res.status(200).json({
        success: true,
        data: {
          product: confirmed,
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 5. GET /api/v1/products
   * Public directory browse and full-text search with pagination
   */
  async search(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const q = (req.query.q as string) || (req.query.query as string);
      const categoryId = (req.query.category as string) || (req.query.categoryId as string);
      const pricingType = (req.query.pricing as string) || (req.query.pricingType as string);
      const sortBy = (req.query.sort as string) || (req.query.sortBy as string);
      const page = req.query.page ? parseInt(req.query.page as string, 10) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 25;

      const result = await productService.searchProducts({
        query: q,
        categoryId,
        pricingType,
        sortBy,
        page,
        limit,
      });

      const totalPages = Math.ceil(result.total / result.limit) || 1;

      res.status(200).json({
        success: true,
        data: {
          products: result.products,
        },
        meta: getMetadata(req, {
          pagination: {
            page: result.page,
            limit: result.limit,
            totalItems: result.total,
            totalPages,
            hasNextPage: result.page < totalPages,
            hasPrevPage: result.page > 1,
          },
        }),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 6. GET /api/v1/products/:slug
   * Public product detail page
   */
  async getBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const slug = getParam(req.params.slug);
      const product = await productService.getProductBySlug(slug);

      res.status(200).json({
        success: true,
        data: {
          product,
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 7. PATCH /api/v1/products/:id
   * Founder update product with revision snapshot
   */
  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw new AuthenticationError('Authentication required to update product', 'UNAUTHORIZED');
      }

      const id = getParam(req.params.id);
      const updated = await productService.updateProduct(id, req.user.userId, req.body);

      res.status(200).json({
        success: true,
        data: {
          product: updated,
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 8. DELETE /api/v1/products/:id
   * Soft delete product
   */
  async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw new AuthenticationError('Authentication required to delete product', 'UNAUTHORIZED');
      }

      const id = getParam(req.params.id);
      await productService.softDeleteProduct(id, req.user.userId);

      res.status(200).json({
        success: true,
        data: {
          message: 'Product successfully deleted',
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 9. GET /api/v1/products/:id/revisions
   * Historical revision audit history
   */
  async getRevisions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = getParam(req.params.id);
      const revisions = await productService.getRevisionHistory(id);

      res.status(200).json({
        success: true,
        data: {
          revisions,
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 10. GET /api/v1/products/me/mine
   * Retrieve products belonging to or submitted by the authenticated founder
   */
  async getMyProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw new AuthenticationError('Authentication required to view your products', 'UNAUTHORIZED');
      }

      const uid = new Types.ObjectId(req.user.userId);
      const products = await Product.find({
        $or: [{ founderId: uid }, { submittedById: uid }],
        status: { $ne: 'DELETED' as any },
      })
        .sort({ createdAt: -1 })
        .populate('categoryId', 'name slug icon')
        .lean();

      // Hydrate vote counts
      const productIds = products.map((p) => p._id);
      const voteAgg = await Vote.aggregate([
        { $match: { productId: { $in: productIds }, status: 'VALID' } },
        { $group: { _id: '$productId', count: { $sum: 1 } } },
      ]);
      const voteMap = new Map(voteAgg.map((v) => [v._id.toString(), v.count]));

      const hydrated = products.map((p) => ({
        ...p,
        id: p._id.toString(),
        upvotesCount: voteMap.get(p._id.toString()) || 0,
      }));

      res.status(200).json({
        success: true,
        data: {
          products: hydrated,
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();
export default productController;
