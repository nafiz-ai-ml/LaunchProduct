import { Request, Response, NextFunction } from 'express';
import { productService } from '../services/product.service';

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
   * 1. GET /api/v1/products
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
   * 2. GET /api/v1/products/:slug
   * Public product detail page with rank metrics, outbid calculators, and related products
   */
  async getBySlug(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const slug = getParam(req.params.slug);
      const details = await productService.getProductDetailsBySlug(slug);

      res.status(200).json({
        success: true,
        data: details,
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 2.5 GET /api/v1/products/preview-domain
   * Real-time website favicon logo extraction and ranking simulation
   */
  async previewDomain(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const url = (req.query.url as string) || (req.query.domain as string) || '';
      const preview = await productService.previewDomain(url);

      res.status(200).json({
        success: true,
        data: preview,
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 3. POST /api/v1/products and POST /api/v1/products/public-submit
   * Anonymous public product submission & Pay-to-Rank entry point.
   */
  async publicSubmit(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await productService.publicAccountlessSubmit({
        name: req.body.name,
        tagline: req.body.tagline,
        description: req.body.description,
        websiteUrl: req.body.websiteUrl,
        categoryId: req.body.categoryId,
        contactEmail: req.body.contactEmail,
        logoUrl: req.body.logoUrl,
        initialPaymentCents: req.body.initialPaymentCents,
        provider: req.body.provider,
        successUrl: req.body.successUrl,
        cancelUrl: req.body.cancelUrl,
      });

      res.status(result.isExistingProduct ? 200 : 201).json({
        success: true,
        data: result,
        meta: getMetadata(req, {
          commercialDisclosure:
            'Positions are determined by verified qualifying paid ranking amounts, not independent editorial endorsement.',
        }),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const productController = new ProductController();
export default productController;
