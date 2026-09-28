import { Request, Response, NextFunction } from 'express';
import { ownershipService } from '../services/ownership.service';
import { VerificationMethod } from '../models/OwnershipVerification.model';
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

export class OwnershipController {
  /**
   * 1. POST /api/v1/products/:id/claim OR POST /api/v1/claims/:productId
   * Initiate ownership verification challenge
   */
  async initiateClaim(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw new AuthenticationError('Authentication required to claim product ownership', 'UNAUTHORIZED');
      }

      const productId = getParam(req.params.id) || getParam(req.params.productId) || req.body.productId;
      if (!productId) {
        throw new ValidationError('Product ID is required', [
          { field: 'productId', code: 'REQUIRED', message: 'Product ID must be provided in path or body' },
        ]);
      }

      const method = (req.body.verificationMethod || req.body.method) as VerificationMethod;
      const validMethods: VerificationMethod[] = ['DNS_TXT', 'HTML_META', 'EMAIL_DOMAIN'];

      if (!method || !validMethods.includes(method)) {
        throw new ValidationError('Invalid verification method', [
          {
            field: 'verificationMethod',
            code: 'INVALID_ENUM',
            message: `Method must be one of: ${validMethods.join(', ')}`,
          },
        ]);
      }

      const result = await ownershipService.initiateOwnershipClaim(
        productId,
        req.user.userId,
        method
      );

      const statusCode = result.status === 'VERIFIED' ? 200 : 201;

      res.status(statusCode).json({
        success: true,
        data: result,
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 2. GET /api/v1/claims/:claimId
   * Check status of an ownership verification challenge
   */
  async getClaimStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw new AuthenticationError('Authentication required to check claim status', 'UNAUTHORIZED');
      }

      const claimId = getParam(req.params.claimId);
      if (!claimId) {
        throw new ValidationError('Claim ID is required', [
          { field: 'claimId', code: 'REQUIRED', message: 'Claim ID parameter is required' },
        ]);
      }

      const claim = await ownershipService.getClaimStatus(claimId, req.user.userId);

      res.status(200).json({
        success: true,
        data: {
          claimId: claim._id.toString(),
          productId: claim.productId.toString(),
          verificationMethod: claim.method,
          status: claim.status,
          expiresAt: claim.expiresAt,
          verifiedAt: claim.verifiedAt,
          revokedAt: claim.revokedAt,
          createdAt: claim.createdAt,
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 3. POST /api/v1/claims/:claimId/verify
   * Trigger automated verification validation (Google DoH / SSRF-hardened HTML fetch)
   */
  async verifyClaim(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw new AuthenticationError('Authentication required to verify ownership claim', 'UNAUTHORIZED');
      }

      const claimId = getParam(req.params.claimId);
      if (!claimId) {
        throw new ValidationError('Claim ID is required', [
          { field: 'claimId', code: 'REQUIRED', message: 'Claim ID parameter is required' },
        ]);
      }

      const verified = await ownershipService.verifyOwnershipClaim(claimId, req.user.userId);

      res.status(200).json({
        success: true,
        data: {
          claimId: verified._id.toString(),
          status: verified.status,
          userRole: 'FOUNDER',
          productId: verified.productId.toString(),
          message: 'Ownership verified successfully! You have been granted Founder access.',
        },
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * 4. GET /api/v1/claims
   * Get all claims submitted by the authenticated user
   */
  async getUserClaims(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user || !req.user.userId) {
        throw new AuthenticationError('Authentication required to list user claims', 'UNAUTHORIZED');
      }

      const claims = await ownershipService.getUserClaims(req.user.userId);

      res.status(200).json({
        success: true,
        data: claims,
        meta: getMetadata(req),
      });
    } catch (error) {
      next(error);
    }
  }
}

export const ownershipController = new OwnershipController();
