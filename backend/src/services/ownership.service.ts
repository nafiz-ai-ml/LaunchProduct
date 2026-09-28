import crypto from 'crypto';
import { Types } from 'mongoose';
import {
  OwnershipVerification,
  IOwnershipVerification,
  VerificationMethod,
} from '../models/OwnershipVerification.model';
import { Product, IProduct } from '../models/Product.model';
import { User, IUser } from '../models/User.model';
import { ActivityEvent } from '../models/ActivityEvent.model';
import { EventSource, ProductStatus } from '../shared/constants';
import {
  NotFoundError,
  ConflictError,
  AuthorizationError,
  UnprocessableError,
} from '../shared/errors';
import { logger } from '../shared/logger';
import {
  extractApexDomain,
  resolveTxtRecords,
  fetchHomepageMetaTag,
} from '../shared/domain-verifier';

export interface InitiateClaimResult {
  claimId: string;
  productId: string;
  verificationMethod: VerificationMethod;
  token?: string;
  rawToken?: string;
  instructions: string;
  status: 'PENDING' | 'VERIFIED';
  challenge?: Record<string, unknown>;
  expiresAt: Date;
}

export class OwnershipService {
  /**
   * 1. Initiate ownership verification challenge for a product
   */
  async initiateOwnershipClaim(
    productId: string,
    userId: string,
    method: VerificationMethod
  ): Promise<InitiateClaimResult> {
    if (!Types.ObjectId.isValid(productId)) {
      throw new NotFoundError(`Invalid product ID '${productId}'`);
    }

    const product = await Product.findById(productId);
    if (!product || product.status === ProductStatus.DELETED) {
      throw new NotFoundError(`Product '${productId}' not found`);
    }

    // Verify product is in an eligible state for ownership claim
    const eligibleStates = [ProductStatus.LIVE, ProductStatus.SCHEDULED, ProductStatus.PENDING_REVIEW];
    if (!eligibleStates.includes(product.status)) {
      throw new ConflictError(
        `Product cannot be claimed in its current status: '${product.status}'`,
        'INVALID_PRODUCT_STATUS'
      );
    }

    const domain = product.canonicalDomain || extractApexDomain(product.websiteUrl);

    // Check if product already has a VERIFIED claim
    const existingVerified = await OwnershipVerification.findOne({
      productId: product._id,
      status: 'VERIFIED',
    });

    if (existingVerified) {
      if (existingVerified.userId.toString() === userId) {
        throw new ConflictError(
          'You are already the verified founder of this product',
          'ALREADY_CLAIMED'
        );
      }

      // User B claims a product verified by User A -> Log dispute flow
      try {
        await ActivityEvent.create({
          userId: new Types.ObjectId(userId),
          productId: product._id,
          eventType: 'OWNERSHIP_CLAIM_DISPUTED',
          eventSource: EventSource.ORGANIC,
          metadata: {
            currentFounderId: existingVerified.userId.toString(),
            disputingUserId: userId,
            verificationMethod: method,
            domain,
          },
        });
        logger.warn(
          { productId: product._id, currentFounder: existingVerified.userId, disputant: userId },
          'Ownership dispute detected: claimant disputing existing verified founder'
        );
      } catch (err: any) {
        logger.error({ err }, 'Failed to log OWNERSHIP_CLAIM_DISPUTED event');
      }
    }

    // Check if this user already has an active PENDING claim for this product
    const now = new Date();
    const activeClaim = await OwnershipVerification.findOne({
      productId: product._id,
      userId: new Types.ObjectId(userId),
      status: 'PENDING',
      expiresAt: { $gt: now },
    });

    if (activeClaim) {
      throw new ConflictError(
        'You already have an active pending claim for this product',
        'ACTIVE_CLAIM_EXISTS'
      );
    }

    // Fetch user for email domain validation or profile status
    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError('User account not found');
    }

    // Case 1: EMAIL_DOMAIN Verification Method
    if (method === 'EMAIL_DOMAIN') {
      const userEmailDomain = extractApexDomain(user.email.split('@')[1] || '');
      const productDomain = domain.toLowerCase();

      if (userEmailDomain.toLowerCase() === productDomain) {
        // Auto-verify immediately without requiring a token
        const rawToken = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
        const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000);

        const verifiedClaim = await OwnershipVerification.create({
          productId: product._id,
          userId: new Types.ObjectId(userId),
          method: 'EMAIL_DOMAIN',
          tokenHash,
          status: 'VERIFIED',
          expiresAt,
          verifiedAt: now,
          adminNote: `Auto-verified via authenticated email domain match: ${user.email}`,
        });

        // Update product founderId
        await Product.findByIdAndUpdate(product._id, { founderId: new Types.ObjectId(userId) });

        // Promote user role to FOUNDER if currently VISITOR or HUNTER
        if (user.role === 'VISITOR' || user.role === 'HUNTER') {
          await User.findByIdAndUpdate(userId, { role: 'FOUNDER' });
        }

        // If resolving a dispute, revoke the previous verified claim
        if (existingVerified && existingVerified.userId.toString() !== userId) {
          await OwnershipVerification.findByIdAndUpdate(existingVerified._id, {
            status: 'REVOKED',
            revokedAt: now,
            adminNote: `Revoked due to successful email domain verification by user ${userId}`,
          });
        }

        // Log OWNERSHIP_VERIFIED event
        try {
          await ActivityEvent.create({
            userId: new Types.ObjectId(userId),
            productId: product._id,
            eventType: 'OWNERSHIP_VERIFIED',
            eventSource: EventSource.ORGANIC,
            metadata: {
              method: 'EMAIL_DOMAIN',
              claimId: verifiedClaim._id.toString(),
              autoVerified: true,
              email: user.email,
            },
          });
        } catch (err: any) {
          logger.error({ err }, 'Failed to record OWNERSHIP_VERIFIED event');
        }

        return {
          claimId: verifiedClaim._id.toString(),
          productId: product._id.toString(),
          verificationMethod: 'EMAIL_DOMAIN',
          status: 'VERIFIED',
          rawToken,
          token: rawToken,
          instructions: `Ownership verified immediately! Authenticated email domain matches ${domain}.`,
          challenge: {
            method: 'EMAIL_DOMAIN',
            emailDomain: userEmailDomain,
            status: 'AUTO_VERIFIED',
          },
          expiresAt,
        };
      } else {
        throw new UnprocessableError(
          `User email domain (${userEmailDomain || 'unknown'}) does not match product canonical domain (${productDomain})`,
          'EMAIL_DOMAIN_MISMATCH'
        );
      }
    }

    // Case 2 & 3: DNS_TXT or HTML_META Verification Methods
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(now.getTime() + 72 * 60 * 60 * 1000); // 72 hours

    const newClaim = await OwnershipVerification.create({
      productId: product._id,
      userId: new Types.ObjectId(userId),
      method,
      tokenHash,
      status: 'PENDING',
      expiresAt,
    });

    let instructions = '';
    let challenge: Record<string, unknown> = {};

    if (method === 'DNS_TXT') {
      instructions = `Add TXT record _launchproduct.${domain} with value: launchproduct-verify=${rawToken}`;
      challenge = {
        dnsRecordType: 'TXT',
        host: `_launchproduct.${domain}`,
        name: `_launchproduct.${domain}`,
        expectedValue: `launchproduct-verify=${rawToken}`,
      };
    } else if (method === 'HTML_META') {
      instructions = `Add <meta name='launchproduct-site-verification' content='${rawToken}'> to your homepage <head>`;
      challenge = {
        metaTagName: 'launchproduct-site-verification',
        metaTagContent: rawToken,
        expectedTag: `<meta name="launchproduct-site-verification" content="${rawToken}">`,
      };
    }

    // Log OWNERSHIP_CLAIM_INITIATED event
    try {
      await ActivityEvent.create({
        userId: new Types.ObjectId(userId),
        productId: product._id,
        eventType: 'OWNERSHIP_CLAIM_INITIATED',
        eventSource: EventSource.ORGANIC,
        metadata: {
          claimId: newClaim._id.toString(),
          method,
          isDispute: !!existingVerified,
        },
      });
    } catch (err: any) {
      logger.error({ err }, 'Failed to record OWNERSHIP_CLAIM_INITIATED event');
    }

    return {
      claimId: newClaim._id.toString(),
      productId: product._id.toString(),
      verificationMethod: method,
      status: 'PENDING',
      rawToken,
      token: rawToken,
      instructions,
      challenge,
      expiresAt,
    };
  }

  /**
   * 2. Verify active ownership claim challenge
   */
  async verifyOwnershipClaim(claimId: string, userId: string): Promise<IOwnershipVerification> {
    if (!Types.ObjectId.isValid(claimId)) {
      throw new NotFoundError(`Invalid claim ID '${claimId}'`);
    }

    const claim = await OwnershipVerification.findById(claimId);
    if (!claim) {
      throw new NotFoundError('Ownership claim challenge not found');
    }

    if (claim.userId.toString() !== userId) {
      throw new AuthorizationError(
        'You do not have permission to verify this ownership claim',
        'FORBIDDEN'
      );
    }

    if (claim.status === 'VERIFIED') {
      return claim;
    }

    const now = new Date();

    // Check expiration
    if (claim.expiresAt <= now) {
      await OwnershipVerification.findByIdAndUpdate(claimId, { status: 'FAILED_EXPIRED' });
      throw new UnprocessableError(
        'Verification challenge has expired. Please initiate a new claim challenge.',
        'CLAIM_EXPIRED'
      );
    }

    if (claim.status !== 'PENDING') {
      throw new UnprocessableError(
        `Claim status is '${claim.status}', expected 'PENDING'`,
        'INVALID_CLAIM_STATUS'
      );
    }

    const product = await Product.findById(claim.productId);
    if (!product) {
      throw new NotFoundError('Associated product for this claim was not found');
    }

    const domain = product.canonicalDomain || extractApexDomain(product.websiteUrl);

    // Execute verification based on selected method
    if (claim.method === 'DNS_TXT') {
      const records = await resolveTxtRecords(domain);
      let matched = false;

      for (const record of records) {
        // Look for launchproduct-verify=... prefix
        const match = record.match(/launchproduct-verify=([a-f0-9]+)/i);
        const candidateToken = match ? match[1] : record.trim();
        const candidateHash = crypto.createHash('sha256').update(candidateToken).digest('hex');

        if (candidateHash === claim.tokenHash) {
          matched = true;
          break;
        }
      }

      if (!matched) {
        throw new UnprocessableError(
          `DNS TXT record matching 'launchproduct-verify=<token>' not detected for domain ${domain}`,
          'CLAIM_DNS_MISMATCH'
        );
      }
    } else if (claim.method === 'HTML_META') {
      const tagContent = await fetchHomepageMetaTag(product.websiteUrl);
      let matched = false;

      if (tagContent) {
        const candidateHash = crypto.createHash('sha256').update(tagContent).digest('hex');
        if (candidateHash === claim.tokenHash) {
          matched = true;
        }
      }

      if (!matched) {
        throw new UnprocessableError(
          'Verification HTML meta tag not found on product homepage or token mismatched',
          'CLAIM_DNS_MISMATCH'
        );
      }
    } else if (claim.method === 'EMAIL_DOMAIN') {
      const user = await User.findById(userId);
      const userApex = extractApexDomain(user?.email.split('@')[1] || '');
      if (userApex.toLowerCase() !== domain.toLowerCase()) {
        throw new UnprocessableError(
          `User email domain (${userApex}) does not match product canonical domain (${domain})`,
          'EMAIL_DOMAIN_MISMATCH'
        );
      }
    }

    // Verification Succeeded!
    const verifiedClaim = await OwnershipVerification.findByIdAndUpdate(
      claimId,
      {
        status: 'VERIFIED',
        verifiedAt: now,
      },
      { new: true }
    );

    if (!verifiedClaim) {
      throw new NotFoundError('Failed to update verification claim');
    }

    // Update product founderId
    await Product.findByIdAndUpdate(claim.productId, { founderId: new Types.ObjectId(userId) });

    // Promote user role to FOUNDER if currently VISITOR or HUNTER
    const user = await User.findById(userId);
    if (user && (user.role === 'VISITOR' || user.role === 'HUNTER')) {
      await User.findByIdAndUpdate(userId, { role: 'FOUNDER' });
    }

    // Revoke any prior verified claims from other users on this product (dispute resolution)
    await OwnershipVerification.updateMany(
      {
        productId: claim.productId,
        _id: { $ne: claim._id },
        status: 'VERIFIED',
      },
      {
        status: 'REVOKED',
        revokedAt: now,
        adminNote: `Revoked due to successful re-verification challenge by user ${userId}`,
      }
    );

    // Log OWNERSHIP_VERIFIED event
    try {
      await ActivityEvent.create({
        userId: new Types.ObjectId(userId),
        productId: claim.productId,
        eventType: 'OWNERSHIP_VERIFIED',
        eventSource: EventSource.ORGANIC,
        metadata: {
          claimId: claim._id.toString(),
          method: claim.method,
          verifiedAt: now.toISOString(),
        },
      });
    } catch (err: any) {
      logger.error({ err }, 'Failed to record OWNERSHIP_VERIFIED event');
    }

    return verifiedClaim;
  }

  /**
   * 3. Get claim status by claimId
   */
  async getClaimStatus(claimId: string, userId: string): Promise<IOwnershipVerification> {
    if (!Types.ObjectId.isValid(claimId)) {
      throw new NotFoundError(`Invalid claim ID '${claimId}'`);
    }

    const claim = await OwnershipVerification.findById(claimId);
    if (!claim) {
      throw new NotFoundError('Ownership claim challenge not found');
    }

    if (claim.userId.toString() !== userId) {
      const user = await User.findById(userId);
      if (!user || !['ADMIN', 'MODERATOR'].includes(user.role)) {
        throw new AuthorizationError(
          'You do not have permission to view this claim challenge',
          'FORBIDDEN'
        );
      }
    }

    return claim;
  }

  /**
   * 4. List user's claim history
   */
  async getUserClaims(userId: string): Promise<IOwnershipVerification[]> {
    return OwnershipVerification.find({
      userId: new Types.ObjectId(userId),
    })
      .sort({ createdAt: -1 })
      .populate('productId', 'name slug canonicalDomain media status');
  }
}

export const ownershipService = new OwnershipService();
