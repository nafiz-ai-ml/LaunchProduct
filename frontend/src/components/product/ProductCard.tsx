'use client';

import React from 'react';
import Link from 'next/link';
import { Product } from '@/types';
import { UpvoteButton } from './UpvoteButton';
import {
  ShieldCheck,
  ExternalLink,
  MessageSquare,
  Sparkles,
} from 'lucide-react';

interface ProductCardProps {
  product: Product;
  rank?: number;
  isSponsored?: boolean;
  sponsorBadge?: string;
  onAuthRequired?: () => void;
  className?: string;
}

export function ProductCard({
  product,
  rank,
  isSponsored = false,
  sponsorBadge = 'Featured Launch Boost',
  onAuthRequired,
  className = '',
}: ProductCardProps) {
  const categoryName = typeof product.category === 'object' && product.category !== null
    ? (product.category as any).name
    : product.category || 'Tools';

  const pricingModel = product.pricing?.model || 'Freemium';

  // Format rank string: 1 -> "#01", 12 -> "#12"
  const rankDisplay = rank !== undefined ? (rank < 10 ? `#0${rank}` : `#${rank}`) : null;

  // Click tracking redirect URL via backend (source=organic | sponsored)
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const outboundUrl = `${apiUrl.replace(/\/$/, '')}/api/v1/clicks/${product.id}?source=${isSponsored ? 'sponsored' : 'organic'}`;

  return (
    <div
      className={`group relative rounded-2xl border transition-all duration-200 overflow-hidden ${
        isSponsored
          ? 'bg-sponsored-bg border-sponsored-border shadow-sm hover:shadow-hover'
          : 'bg-surface hover:bg-surface-sunken/40 border-border hover:border-slate-300 dark:hover:border-slate-700 shadow-card hover:shadow-hover'
      } ${className}`}
    >
      {/* Top Banner for Sponsored Cards */}
      {isSponsored && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-400/15 to-transparent px-4 py-1.5 border-b border-sponsored-border flex items-center justify-between text-[11px] font-bold text-sponsored-text">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>{sponsorBadge}</span>
          </div>
          <span className="text-[10px] uppercase tracking-wider text-sponsored-text/80 font-mono">
            Promoted
          </span>
        </div>
      )}

      <div className="p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
        {/* Desktop Rank Number (if organic) */}
        {!isSponsored && rankDisplay && (
          <div className="hidden sm:flex flex-col items-center justify-center pt-2 w-8 text-center flex-shrink-0">
            <span className="font-mono text-sm font-bold text-text-muted group-hover:text-text-primary transition-colors">
              {rankDisplay}
            </span>
          </div>
        )}

        {/* Product Logo (No raster scaling blur on hover; container handles elevation) */}
        <Link
          href={`/products/${product.slug || product.id}`}
          className="flex-shrink-0 relative focus-ring rounded-xl"
        >
          {product.logoUrl ? (
            <img
              src={product.logoUrl}
              alt={product.name}
              className="w-12 h-12 rounded-xl object-cover border border-border shadow-2xs"
            />
          ) : (
            <div className="w-12 h-12 rounded-xl bg-primary-subtle text-primary border border-border flex items-center justify-center font-bold text-lg">
              {product.name.charAt(0)}
            </div>
          )}
        </Link>

        {/* Content Section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            {/* Mobile Rank Badge (<640px) */}
            {!isSponsored && rankDisplay && (
              <span className="sm:hidden font-mono text-[11px] font-bold text-text-muted bg-surface-sunken px-1.5 py-0.5 rounded-md border border-border">
                {rankDisplay}
              </span>
            )}

            <Link
              href={`/products/${product.slug || product.id}`}
              className="text-sm sm:text-base font-bold text-text-primary hover:text-primary transition-colors truncate focus-ring rounded"
            >
              {product.name}
            </Link>

            {product.isVerified && (
              <span title="Verified Founder Ownership via DNS">
                <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              </span>
            )}

            {/* Category Pill */}
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-surface-sunken text-text-secondary border border-border">
              {categoryName}
            </span>

            {/* Pricing Model Badge */}
            <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-primary-subtle text-primary border border-primary/20">
              {pricingModel}
            </span>
          </div>

          {/* Product Tagline */}
          <p className="mt-1 text-xs text-text-secondary line-clamp-2 leading-relaxed">
            {product.tagline}
          </p>

          {/* Bottom Metadata & Outbound Link */}
          <div className="mt-3 flex items-center gap-4 text-[11px] text-text-muted">
            {/* Reviews Count */}
            <span className="flex items-center gap-1 hover:text-text-primary transition-colors">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{product.reviewsCount ?? 0} reviews</span>
            </span>

            {/* Tags (Desktop only) */}
            {product.tags && product.tags.length > 0 && (
              <div className="hidden md:flex items-center gap-1.5">
                {product.tags.slice(0, 3).map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] text-text-muted hover:text-text-secondary transition-colors"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Outbound Website Link with Click Attribution */}
            <a
              href={outboundUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1 font-semibold text-text-secondary hover:text-primary transition-colors py-0.5 focus-ring rounded"
            >
              <span>Visit</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Upvote Button Column */}
        <div className="flex-shrink-0 pl-1 sm:pl-2">
          <UpvoteButton
            productId={product.id}
            initialVotesCount={product.upvotesCount ?? 0}
            size="md"
            onAuthRequired={onAuthRequired}
          />
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
