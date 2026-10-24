'use client';

import React from 'react';
import Link from 'next/link';
import { sanitizeImageUrl, sanitizeUrl } from '@/lib/safe-url';
import {
  ExternalLink,
  ChevronRight,
  Bot,
  Layers,
  Sparkles,
  MousePointerClick,
  Code,
  Flame,
} from 'lucide-react';

export interface ProductShowcaseCardProps {
  rank: number;
  id?: string;
  _id?: string;
  name: string;
  slug: string;
  tagline: string;
  description?: string;
  websiteUrl: string;
  canonicalDomain?: string;
  logoUrl?: string;
  category?: { name?: string; slug?: string } | string;
  amountCents?: number;
  formattedAmount?: string;
  clickCount?: number;
  lastPaidAt?: string | Date | null;
  createdAt?: string | Date;
  onOutbidClick?: () => void;
  isCompact?: boolean;
}

export function ProductShowcaseCard({
  rank,
  id,
  _id,
  name,
  slug,
  tagline,
  description,
  websiteUrl,
  canonicalDomain,
  logoUrl,
  category,
  amountCents = 0,
  formattedAmount,
  clickCount = 0,
  lastPaidAt,
  createdAt,
  onOutbidClick,
  isCompact = false,
}: ProductShowcaseCardProps) {
  const productId = id || _id || '';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const outboundClickUrl = `${apiUrl.replace(/\/$/, '')}/api/v1/clicks/${productId}?source=launchproduct`;

  const categoryName =
    typeof category === 'object' && category !== null
      ? category.name || 'AI Tools'
      : category || 'AI Tools';

  const domain =
    canonicalDomain ||
    (websiteUrl ? websiteUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0] : 'product.com');

  const displayDollars =
    formattedAmount || (amountCents ? `$${Math.round(amountCents / 100).toLocaleString()}` : '$10');

  // Relative time helper
  const dateToFormat = lastPaidAt || createdAt;
  const timeDisplay = formatRelativeTime(dateToFormat);

  const fallbackLogo = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;

  // Compact layout (used in the 30% sidebar)
  if (isCompact) {
    return (
      <div className="group rounded-xl p-2.5 sm:p-3 bg-surface hover:bg-surface-sunken/60 border border-border/70 hover:border-border transition-all flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-mono text-xs font-bold text-text-muted shrink-0 w-5">
            #{rank}
          </span>
          <img
            src={sanitizeImageUrl(logoUrl || fallbackLogo)}
            alt={name}
            className="w-8 h-8 rounded-lg object-cover border border-border shrink-0"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackLogo;
            }}
          />
          <div className="min-w-0">
            <Link
              href={`/products/${slug}`}
              className="font-bold text-xs text-text-primary hover:text-[#e06653] transition-colors truncate block"
            >
              {name}
            </Link>
            <span className="text-[10px] text-text-muted truncate block">{domain}</span>
          </div>
        </div>

        <span className="font-mono text-xs font-bold text-[#e06653] shrink-0">
          {displayDollars}
        </span>
      </div>
    );
  }

  // Full Outbid-style main card
  return (
    <div className="group rounded-2xl bg-[#fffaf8] dark:bg-[#1a1412] hover:bg-[#fff5f0] dark:hover:bg-[#221a17] border border-[#f3e5df] dark:border-[#382620] hover:border-[#e8c8bd] dark:hover:border-[#52372e] p-4 sm:p-5 transition-all duration-200 flex items-start gap-3.5 sm:gap-4 shadow-xs">
      {/* 1. Left Rank Number */}
      <div className="flex items-center justify-center pt-1 font-mono text-base sm:text-lg font-black text-[#e06653] shrink-0 w-7 sm:w-8 text-center select-none">
        #{rank}
      </div>

      {/* 2. Logo */}
      <a
        href={outboundClickUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-2xl overflow-hidden border border-[#f0d8cf] dark:border-[#422c24] bg-white dark:bg-black/40 hover:opacity-90 transition-opacity"
      >
        <img
          src={sanitizeImageUrl(logoUrl || fallbackLogo)}
          alt={name}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.target as HTMLImageElement).src = fallbackLogo;
          }}
        />
      </a>

      {/* 3. Product Content Column */}
      <div className="flex-1 min-w-0 space-y-1">
        {/* Title row & dollar amount */}
        <div className="flex items-baseline justify-between gap-2">
          <div className="min-w-0 pr-2">
            <a
              href={outboundClickUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-base sm:text-lg font-extrabold text-text-primary hover:text-[#e06653] transition-colors tracking-tight truncate inline-block"
            >
              <span className="hover:underline">{name}</span>
              {tagline && <span className="font-medium text-text-muted"> · {tagline}</span>}
            </a>
          </div>

          {/* Right Spend Amount (Coral Accent) */}
          <span className="font-mono text-base sm:text-lg font-black text-[#e06653] shrink-0">
            {displayDollars}
          </span>
        </div>

        {/* Description line (2 lines clamped) */}
        <p className="text-xs sm:text-sm text-text-secondary line-clamp-2 leading-relaxed">
          {description || tagline}
        </p>

        {/* Metadata Bottom Row: [icon] Category · relative date · domain · XX clicks · see details */}
        <div className="pt-1.5 flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-text-muted">
          {/* Category Chip */}
          <span className="inline-flex items-center gap-1 font-semibold text-text-secondary">
            <Bot className="w-3.5 h-3.5 text-text-muted" />
            <span>{categoryName}</span>
          </span>

          <span>·</span>

          {/* Relative Time */}
          <span>{timeDisplay}</span>

          <span>·</span>

          {/* Canonical Domain */}
          <a
            href={outboundClickUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-text-muted hover:text-text-primary hover:underline transition-colors"
          >
            {domain}
          </a>

          <span>·</span>

          {/* Click Count */}
          <span className="font-medium text-text-secondary">
            {clickCount.toLocaleString()} clicks
          </span>

          <span>·</span>

          {/* See Details link */}
          <Link
            href={`/products/${slug}`}
            className="font-semibold text-text-muted hover:text-[#e06653] hover:underline transition-colors inline-flex items-center gap-0.5"
          >
            <span>see details</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function formatRelativeTime(dateInput?: string | Date | null): string {
  if (!dateInput) return 'recently';
  try {
    const date = new Date(dateInput);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffSec < 60) return 'just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 2592000) return `${Math.floor(diffSec / 86400)}d ago`;
    if (diffSec < 31536000) return 'last month';
    return `${Math.floor(diffSec / 31536000)}y ago`;
  } catch {
    return 'recently';
  }
}

export default ProductShowcaseCard;
