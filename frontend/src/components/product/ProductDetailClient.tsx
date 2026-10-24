'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { sanitizeImageUrl, sanitizeUrl } from '@/lib/safe-url';
import { OutbidModal } from '@/components/leaderboard/OutbidModal';
import {
  ExternalLink,
  ChevronRight,
  Bot,
  Copy,
  Check,
  Zap,
  ArrowRight,
  Sparkles,
  MousePointerClick,
  Trophy,
} from 'lucide-react';

interface RelatedProduct {
  id?: string;
  _id?: string;
  name: string;
  slug: string;
  tagline: string;
  logoUrl?: string;
  paidRankingAmountCents?: number;
  formattedAmount?: string;
  categoryRank?: number;
}

interface ProductStats {
  categoryRank: number;
  categoryTotal: number;
  overallRank: number;
  overallTotal: number;
  clicksCount: number;
  raisedCount: number;
  hasRankedToday: boolean;
  todayRank?: number | null;
  categoryTopSpendDollars?: number;
  overallTopSpendDollars?: number;
  outbidCostToBeatCategoryTop: number;
  outbidCostToBeatOverallTop?: number;
}

interface ProductDetailClientProps {
  product: {
    _id?: string;
    id?: string;
    name: string;
    slug: string;
    tagline: string;
    description: string;
    websiteUrl: string;
    canonicalDomain?: string;
    logoUrl?: string;
    media?: {
      logoUrl?: string;
    };
    category?: {
      name?: string;
      slug?: string;
    } | string;
    categoryId?: {
      name?: string;
      slug?: string;
    } | string;
    paidRankingAmountCents?: number;
    createdAt?: string | Date;
    lastPaidAt?: string | Date;
  };
  stats?: ProductStats | null;
  relatedProducts?: RelatedProduct[];
}

export function ProductDetailClient({
  product,
  stats,
  relatedProducts = [],
}: ProductDetailClientProps) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isOutbidModalOpen, setIsOutbidModalOpen] = useState(false);

  const productId = product.id || product._id || '';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const outboundUrl = `${apiUrl.replace(/\/$/, '')}/api/v1/clicks/${productId}?source=launchproduct`;

  const categoryObj = product.categoryId || product.category;
  const categoryName =
    typeof categoryObj === 'object' && categoryObj !== null
      ? (categoryObj as any).name || 'AI Agents & Infrastructure'
      : (categoryObj as string) || 'AI Agents & Infrastructure';
  const categorySlug =
    typeof categoryObj === 'object' && categoryObj !== null
      ? (categoryObj as any).slug || 'ai-agents'
      : 'ai-agents';

  const domain =
    product.canonicalDomain ||
    (product.websiteUrl
      ? product.websiteUrl.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0]
      : 'product.com');

  const fallbackLogo = `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
  const logo = product.logoUrl || product.media?.logoUrl || fallbackLogo;

  // Fallback stats if not computed
  const resolvedStats: ProductStats = stats || {
    categoryRank: 1,
    categoryTotal: 166,
    overallRank: 1,
    overallTotal: 3147,
    clicksCount: 68064,
    raisedCount: 4,
    hasRankedToday: false,
    todayRank: null,
    outbidCostToBeatCategoryTop: Math.max(10, Math.round((product.paidRankingAmountCents || 1700100) / 100) + 1),
  };

  const paidDollars = Math.round((product.paidRankingAmountCents || 1700100) / 100);

  const handleCopyLink = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* 1. Breadcrumb Navigation */}
      <nav className="flex items-center gap-1.5 text-xs text-text-muted">
        <Link href="/" className="hover:text-text-primary transition-colors">
          Leaderboard
        </Link>
        <span>/</span>
        <Link
          href={`/?category=${categorySlug}`}
          className="hover:text-primary font-bold transition-colors"
        >
          {categoryName}
        </Link>
      </nav>

      {/* 2. Main Product Hero Box (LaunchProduct Design) */}
      <div className="rounded-3xl border border-border bg-surface p-6 sm:p-8 space-y-5 shadow-card hover:border-primary/40 transition-colors">
        <div className="flex items-start gap-4 sm:gap-5">
          <img
            src={sanitizeImageUrl(logo)}
            alt={product.name}
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border border-border shrink-0 bg-surface-sunken shadow-sm"
            onError={(e) => {
              (e.target as HTMLImageElement).src = fallbackLogo;
            }}
          />

          <div className="min-w-0 flex-1 space-y-1.5">
            <h1 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
              {product.name}
              {product.tagline && (
                <span className="font-semibold text-text-secondary"> · {product.tagline}</span>
              )}
            </h1>

            {/* Meta Row */}
            <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-text-muted">
              <span className="inline-flex items-center gap-1 font-semibold text-text-secondary px-2 py-0.5 rounded-md bg-surface-sunken border border-border">
                <Bot className="w-3.5 h-3.5 text-primary" />
                <span>{categoryName}</span>
              </span>

              <span>·</span>

              <a
                href={outboundUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-primary hover:underline font-medium text-text-secondary transition-colors"
              >
                {domain}
              </a>

              <span>·</span>

              <span>last month</span>

              <span>·</span>

              <span className="font-semibold text-text-secondary inline-flex items-center gap-1">
                <MousePointerClick className="w-3 h-3 text-text-muted" />
                <span>{resolvedStats.clicksCount.toLocaleString()} clicks</span>
              </span>
            </div>
          </div>
        </div>

        {/* Description paragraph */}
        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed pt-1">
          {product.description || product.tagline}
        </p>

        {/* Buttons Row: [Visit >] and [Copy link] */}
        <div className="flex items-center gap-3 pt-2">
          <a
            href={outboundUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-bold shadow-md shadow-primary/20 transition-all inline-flex items-center gap-1.5 cursor-pointer"
          >
            <span>Visit site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={handleCopyLink}
            className="px-4 py-2.5 rounded-xl bg-surface-sunken hover:bg-border text-text-secondary hover:text-text-primary text-xs sm:text-sm font-semibold border border-border transition-colors inline-flex items-center gap-1.5 cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 3. Dual Rank Stat Cards (Category Rank & Overall Rank) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Category Rank Card */}
        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 space-y-2 shadow-card hover:border-primary/40 transition-colors">
          <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">
            Category Rank
          </span>
          <div className="text-3xl sm:text-4xl font-black font-mono text-primary tracking-tight">
            #{resolvedStats.categoryRank}
          </div>
          <p className="text-xs text-text-muted">
            of {resolvedStats.categoryTotal.toLocaleString()} in {categoryName}
          </p>
          <Link
            href={`/?category=${categorySlug}`}
            className="text-xs font-bold text-primary hover:text-primary-hover hover:underline inline-block pt-1"
          >
            See category ranking &rarr;
          </Link>
        </div>

        {/* Overall Rank Card */}
        <div className="rounded-2xl border border-border bg-surface p-5 sm:p-6 space-y-2 shadow-card hover:border-primary/40 transition-colors">
          <span className="text-[10px] font-black uppercase tracking-wider text-text-muted block">
            Overall Rank
          </span>
          <div className="text-3xl sm:text-4xl font-black font-mono text-text-primary tracking-tight">
            #{resolvedStats.overallRank}
          </div>
          <p className="text-xs text-text-muted">
            of {resolvedStats.overallTotal.toLocaleString()} on the board
          </p>
          <Link
            href="/?tab=all-time"
            className="text-xs font-bold text-primary hover:text-primary-hover hover:underline inline-block pt-1"
          >
            See overall ranking &rarr;
          </Link>
        </div>
      </div>

      {/* 4. "About this ranking" Commercial Transparency Section */}
      <div className="rounded-2xl border border-border bg-surface p-6 sm:p-7 space-y-5 shadow-card">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-black text-text-primary">About this ranking</h2>
        </div>

        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
          The listing has been raised {resolvedStats.raisedCount} times, most recently last month.{' '}
          <span className="font-semibold text-text-primary">
            {resolvedStats.clicksCount.toLocaleString()} visitors
          </span>{' '}
          have opened {domain}.
        </p>

        {/* Q&A 1 */}
        <div className="space-y-1">
          <h3 className="text-xs sm:text-sm font-bold text-text-primary">
            What rank does {product.name} hold on LaunchProduct?
          </h3>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            {product.name} has spent ${paidDollars.toLocaleString()} on LaunchProduct to rank #
            {resolvedStats.categoryRank} of {resolvedStats.categoryTotal.toLocaleString()} in{' '}
            {categoryName} and #{resolvedStats.overallRank} of{' '}
            {resolvedStats.overallTotal.toLocaleString()} overall.
          </p>
        </div>

        {/* Q&A 2 */}
        <div className="space-y-1">
          <h3 className="text-xs sm:text-sm font-bold text-text-primary">
            Has {product.name} ranked today?
          </h3>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            {resolvedStats.hasRankedToday
              ? `${product.name} is currently ranked #${resolvedStats.todayRank} on today's board.`
              : `${product.name} has not added spend since midnight UTC, so they are not on today's board.`}
          </p>
        </div>

        {/* Q&A 3 with Outbid Button */}
        <div className="space-y-2 pt-3 border-t border-border">
          <h3 className="text-xs sm:text-sm font-bold text-text-primary">
            How do I outrank {product.name}?
          </h3>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            Anyone can take this rank for{' '}
            <span className="font-bold font-mono text-primary">
              ${resolvedStats.outbidCostToBeatCategoryTop.toLocaleString()}
            </span>{' '}
            on the {categoryName} board.
          </p>

          <button
            onClick={() => setIsOutbidModalOpen(true)}
            className="mt-1 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md shadow-primary/20 transition-all inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>
              Outbid &amp; Claim Rank for $
              {resolvedStats.outbidCostToBeatCategoryTop.toLocaleString()}
            </span>
          </button>
        </div>
      </div>

      {/* 5. "Also in <Category>" Competing Products Widget */}
      {relatedProducts.length > 0 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm sm:text-base font-extrabold text-text-primary">
              Also in {categoryName}
            </h2>
            <Link
              href={`/?category=${categorySlug}`}
              className="text-xs font-bold text-primary hover:text-primary-hover hover:underline flex items-center gap-0.5"
            >
              <span>See all</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-2">
            {relatedProducts.map((p) => {
              const relAmount =
                p.formattedAmount ||
                (p.paidRankingAmountCents
                  ? `$${Math.round(p.paidRankingAmountCents / 100).toLocaleString()}`
                  : '$10');
              const relLogo =
                p.logoUrl || `https://www.google.com/s2/favicons?domain=${p.slug}.com&sz=128`;

              return (
                <div
                  key={p.id || p._id || p.slug}
                  className="rounded-xl border border-border bg-surface p-3.5 flex items-center justify-between gap-3 hover:border-primary/40 transition-colors shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-xs font-bold text-text-muted shrink-0 w-6">
                      #{p.categoryRank}
                    </span>
                    <img
                      src={sanitizeImageUrl(relLogo)}
                      alt={p.name}
                      className="w-9 h-9 rounded-xl object-cover border border-border shrink-0 bg-surface-sunken"
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/products/${p.slug}`}
                        className="font-bold text-xs sm:text-sm text-text-primary hover:text-primary transition-colors truncate block"
                      >
                        {p.name}
                        {p.tagline && (
                          <span className="font-normal text-text-muted"> · {p.tagline}</span>
                        )}
                      </Link>
                    </div>
                  </div>

                  <span className="font-mono text-xs sm:text-sm font-black text-primary shrink-0">
                    {relAmount}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Outbid Modal */}
      {isOutbidModalOpen && (
        <OutbidModal
          isOpen={true}
          onClose={() => setIsOutbidModalOpen(false)}
          productId={productId}
          productName={product.name}
          currentRank={resolvedStats.categoryRank}
          currentAmountCents={product.paidRankingAmountCents || 1700100}
        />
      )}
    </div>
  );
}

export default ProductDetailClient;
