/**
 * LaunchProduct Shared Invariants & Constants
 * Source of truth: PRD.md, System Architecture.md, database-schema.md
 */

// 1. All RBAC Role Enums
export enum UserRole {
  VISITOR = 'VISITOR',
  HUNTER = 'HUNTER',
  FOUNDER = 'FOUNDER',
  MODERATOR = 'MODERATOR',
  ADMIN = 'ADMIN',
}
export type UserRoleType = `${UserRole}`;

// 2. Product Status Enums
export enum ProductStatus {
  DRAFT = 'DRAFT',
  PENDING_REVIEW = 'PENDING_REVIEW',
  SCHEDULED = 'SCHEDULED',
  LIVE = 'LIVE',
  SUSPENDED = 'SUSPENDED',
  REJECTED = 'REJECTED',
  ARCHIVED = 'ARCHIVED',
  DELETED = 'DELETED',
}
export type ProductStatusType = `${ProductStatus}`;

// 3. Vote Status Enums
export enum VoteStatus {
  VALID = 'VALID',
  FLAGGED = 'FLAGGED',
  QUARANTINED = 'QUARANTINED',
  REJECTED_BOT = 'REJECTED_BOT',
  RETRACTED = 'RETRACTED',
}
export type VoteStatusType = `${VoteStatus}`;

// 4. Ownership Verification Status Enums
export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REVOKED = 'REVOKED',
  FAILED_EXPIRED = 'FAILED_EXPIRED',
}
export type VerificationStatusType = `${VerificationStatus}`;

// 5. Campaign Status Enums
export enum CampaignStatus {
  RESERVED = 'RESERVED',
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
  PAUSED = 'PAUSED',
}
export type CampaignStatusType = `${CampaignStatus}`;

// 6. Payment Status Enums
export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  DISPUTED = 'DISPUTED',
}
export type PaymentStatusType = `${PaymentStatus}`;

// 7. Event Source Enums
export enum EventSource {
  ORGANIC = 'ORGANIC',
  SPONSORED = 'SPONSORED',
  INTERNAL = 'INTERNAL',
  BOT = 'BOT',
  FRAUD = 'FRAUD',
  TEST = 'TEST',
}
export type EventSourceType = `${EventSource}`;

// 8. Anti-Fraud Risk Thresholds
export const THRESHOLD_LOW = 30;   // Score < 30 => VALID
export const THRESHOLD_HIGH = 70;  // 30 <= Score < 70 => FLAGGED, Score >= 70 => QUARANTINED

export const RISK_THRESHOLDS = {
  THRESHOLD_LOW,
  THRESHOLD_HIGH,
} as const;

// 9. Anti-Fraud Default Signal Weights as a typed object
export interface AntiFraudSignalWeights {
  readonly SIG_ACCOUNT_NEW: number;
  readonly SIG_IP_DATACENTER: number;
  readonly SIG_SUBNET_CONCENTRATION: number;
  readonly SIG_BURST_VELOCITY: number;
  readonly SIG_ZERO_PRIOR_ACTIVITY: number;
  readonly SIG_DEVICE_COLLISION: number;
  readonly SIG_HISTORICAL_TRUST: number;
}

export const ANTI_FRAUD_WEIGHTS: AntiFraudSignalWeights = {
  SIG_ACCOUNT_NEW: 20,
  SIG_IP_DATACENTER: 25,
  SIG_SUBNET_CONCENTRATION: 35,
  SIG_BURST_VELOCITY: 25,
  SIG_ZERO_PRIOR_ACTIVITY: 15,
  SIG_DEVICE_COLLISION: 40,
  SIG_HISTORICAL_TRUST: -20,
} as const;

// 10. Ranking Formula Default Weights
export interface RankingFormulaWeights {
  readonly W_v: number;
  readonly W_c: number;
  readonly W_r: number;
  readonly W_u: number;
  readonly GAMMA_LAUNCH: number;
  readonly LAMBDA_DECAY: number;
}

export const RANKING_WEIGHTS: RankingFormulaWeights = {
  W_v: 1.0,           // Vote weight
  W_c: 0.15,          // Click weight (launch formula)
  W_r: 2.5,           // Review weight
  W_u: 0.5,           // Click weight (trending formula)
  GAMMA_LAUNCH: 1.2,  // Gravity exponent
  LAMBDA_DECAY: 0.75, // Daily score decay factor
} as const;

// 11. MVP Sponsorship Tier Prices in Cents (USD)
export interface SponsorshipTierPricing {
  readonly LAUNCH_BOOST: number;
  readonly CATEGORY_FEATURED: number;
  readonly HOMEPAGE_SPOTLIGHT: number;
  readonly LAUNCH_PARTNER: number;
}

export const SPONSORSHIP_PRICES_CENTS: SponsorshipTierPricing = {
  LAUNCH_BOOST: 1900,        // $19.00
  CATEGORY_FEATURED: 4900,   // $49.00
  HOMEPAGE_SPOTLIGHT: 14900, // $149.00
  LAUNCH_PARTNER: 29900,     // $299.00
} as const;

// 12. Sponsorship Tier Durations (Hours)
export const SPONSORSHIP_DURATIONS_HOURS = {
  LAUNCH_BOOST: 48,
  CATEGORY_FEATURED: 168,   // 7 days
  HOMEPAGE_SPOTLIGHT: 24,
  LAUNCH_PARTNER: 168,      // 7 days
} as const;

// 13. Slot Inventory Concurrency Limits
export const SLOT_LIMITS = {
  HOMEPAGE_SPOTLIGHT: 3,    // Max 3 concurrent on homepage
  CATEGORY_FEATURED: 2,     // Max 2 concurrent per category
  LAUNCH_BOOST: 50,         // Unconstrained launch-day boost slots
  LAUNCH_PARTNER: 3,        // Limited by homepage hero capacity
} as const;

// 14. 15-Minute Checkout Reservation TTL
export const SLOT_RESERVATION_TTL_SECONDS = 900; // 15 minutes

