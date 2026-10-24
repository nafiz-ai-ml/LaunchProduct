'use client';

import React from 'react';
import Link from 'next/link';
import { Product } from '@/types';
import { sanitizeImageUrl } from '@/lib/safe-url';
import {
  ShieldCheck,
  ExternalLink,
  Sparkles,
} from 'lucide-react';

interface ProductCardProps {
  product: Product;
  rank?: number;
  isSponsored?: boolean;
  sponsorBadge?: string;
  className?: string;
}

export function ProductCard({
  product,
  rank,
  isSponsored = false,
  sponsorBadge = 'Featured Launch Boost',
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
            Featured
          </span>
        </div>
      )}

      <div className="p-4 sm:p-5 flex items-start gap-3 sm:gap-4">
        {/* Rank Number */}
        {rankDisplay && (
          <div className="flex-shrink-0 flex items-center justify-center pt-1 font-mono text-xs font-bold text-text-muted select-none w-7 text-center">
            {rankDisplay}
          </div>
        )}

        {/* Product Logo */}
        <Link
          href={`/products/${product.slug}`}
          className="flex-shrink-0 relative w-12 h-12 rounded-xl overflow-hidden border border-border bg-surface-sunken hover:opacity-90 transition-opacity"
        >
          <img
            src={sanitizeImageUrl(product.logoUrl || (product as any).media?.logoUrl, '/brand/icon.svg')}
            alt={`${product.name} logo`}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/brand/icon.svg';
            }}
          />
        </Link>

        {/* Product Info Middle Column */}
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <Link
              href={`/products/${product.slug}`}
              className="text-sm sm:text-base font-bold text-text-primary hover:text-primary transition-colors truncate tracking-tight"
            >
              {product.name}
            </Link>

            {product.isVerified && (
              <span
                className="inline-flex items-center text-primary hover:text-primary-hover"
                title="Verified Founder"
              >
                <ShieldCheck className="w-4 h-4 text-emerald-500" />
              </span>
            )}

            {/* Category Tag */}
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-surface-sunken text-text-secondary border border-border-subtle hidden sm:inline-block">
              {categoryName}
            </span>

            {/* Pricing Tag */}
            <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-primary-subtle text-primary border border-primary/20 capitalize">
              {pricingModel}
            </span>
          </div>

          {/* Tagline */}
          <p className="text-xs sm:text-sm text-text-secondary line-clamp-2 leading-relaxed mb-2.5">
            {product.tagline}
          </p>

          {/* Bottom Meta & Tags */}
          <div className="flex items-center gap-3 text-xs text-text-muted">
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

        {/* Action Button */}
        <div className="flex-shrink-0 pl-1 sm:pl-2 flex items-center">
          <a
            href={outboundUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover transition-colors"
          >
            <span>Visit</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;
