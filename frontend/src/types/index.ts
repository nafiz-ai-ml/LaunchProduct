/**
 * LaunchProduct — Shared TypeScript Interfaces
 * Defines all domain entities, API response wrappers, and UI states.
 */

export type UserRole = 'VISITOR' | 'HUNTER' | 'FOUNDER' | 'MODERATOR' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  role: UserRole;
  name?: string;
  avatarUrl?: string;
  karmaScore?: number;
  isVerified: boolean;
  founderProfile?: {
    displayName?: string;
    avatarUrl?: string;
    bio?: string;
    twitterHandle?: string;
  };
  createdAt?: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon?: string;
  sortOrder: number;
  productCount?: number;
}

export type PricingModel = 'Free' | 'Freemium' | 'Paid' | 'Open Source' | 'free' | 'freemium' | 'paid' | 'open_source';

export interface ProductPricing {
  model: PricingModel;
  startingPrice?: number;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  category: Category | string;
  pricing: ProductPricing;
  websiteUrl: string;
  logoUrl: string;
  screenshots?: string[];
  upvotesCount: number;
  reviewsCount?: number;
  isVerified: boolean;
  isFeatured?: boolean;
  isSponsored?: boolean;
  sponsorTier?: string;
  rank?: number;
  tags?: string[];
  canonicalDomain?: string;
  status?: 'DRAFT' | 'PENDING_REVIEW' | 'SCHEDULED' | 'LIVE' | 'SUSPENDED' | 'ARCHIVED';
  launchDate?: string;
  founder?: {
    id?: string;
    name?: string;
    avatarUrl?: string;
    bio?: string;
    twitterHandle?: string;
  };
  createdAt?: string;
  updatedAt?: string;
}

export interface LeaderboardItem {
  rank: number;
  product: Product;
  score: number;
  votesCount: number;
  movementDelta: number;
}

export interface Review {
  id: string;
  productId: string;
  user: {
    id: string;
    name?: string;
    avatarUrl?: string;
    accountAgeHours?: number;
  };
  rating: number;
  title: string;
  body: string;
  conflictOfInterestDisclosed?: boolean;
  founderReply?: {
    body: string;
    repliedAt: string;
  };
  status?: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
}

export interface Campaign {
  id: string;
  productId: string;
  productName?: string;
  founderId?: string;
  tier: 'LAUNCH_BOOST' | 'CATEGORY_FEATURED' | 'HOMEPAGE_SPOTLIGHT' | 'LAUNCH_PARTNER' | string;
  status: 'RESERVED' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PAUSED';
  slotKey?: string;
  scheduledDate?: string;
  startsAt?: string;
  endsAt?: string;
  impressions?: number;
  clicks?: number;
  priceCents?: number;
  createdAt?: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: any[];
  };
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
