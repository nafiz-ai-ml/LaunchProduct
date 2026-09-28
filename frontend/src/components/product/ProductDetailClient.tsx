'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { UpvoteButton } from '@/components/product/UpvoteButton';
import { MediaGallery } from '@/components/product/MediaGallery';
import { ReviewList } from '@/components/reviews/ReviewList';
import { AuthModal } from '@/components/auth/AuthModal';
import {
  ExternalLink,
  ShieldCheck,
  Share2,
  Bookmark,
  Calendar,
  Sparkles,
  ChevronRight,
  Layers,
  Cpu,
  BadgeCheck,
  Globe,
  Twitter,
  Linkedin,
  Copy,
  Check,
  Code,
  ShieldAlert,
  User,
} from 'lucide-react';

interface ProductDetailProps {
  product: {
    _id?: string;
    id?: string;
    name: string;
    slug: string;
    tagline: string;
    description: string;
    websiteUrl: string;
    canonicalDomain?: string;
    isVerified?: boolean;
    pricing?: {
      model?: string;
      startingPrice?: number;
      currency?: string;
    };
    category?: {
      _id?: string;
      name?: string;
      slug?: string;
    } | string;
    categoryId?: {
      _id?: string;
      name?: string;
      slug?: string;
    } | string;
    media?: {
      logoUrl?: string;
      bannerUrl?: string;
      screenshotUrls?: string[];
    };
    logoUrl?: string;
    upvotesCount?: number;
    reviewsCount?: number;
    launchDate?: string;
    createdAt?: string;
    tags?: string[];
    founderId?: {
      _id?: string;
      name?: string;
      email?: string;
      avatarUrl?: string;
      founderProfile?: {
        displayName?: string;
        bio?: string;
        avatarUrl?: string;
        twitterHandle?: string;
        githubHandle?: string;
        websiteUrl?: string;
      };
    };
    founder?: {
      name?: string;
      avatarUrl?: string;
      bio?: string;
      twitterHandle?: string;
    };
    rank?: number;
  };
}

export function ProductDetailClient({ product }: ProductDetailProps) {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedBadge, setCopiedBadge] = useState(false);

  const productId = product.id || product._id || '';
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
  const outboundUrl = `${apiUrl.replace(/\/$/, '')}/api/v1/clicks/${productId}?source=product_detail`;

  const categoryObj = product.categoryId || product.category;
  const categoryName =
    typeof categoryObj === 'object' && categoryObj !== null
      ? categoryObj.name || 'Tools'
      : (typeof categoryObj === 'string' && categoryObj) || 'Developer Tools';

  const categorySlug =
    typeof categoryObj === 'object' && categoryObj !== null
      ? categoryObj.slug || 'developer-tools'
      : 'tools';

  const logoUrl =
    product.logoUrl || product.media?.logoUrl || '/brand/icon.svg';

  const pricingModel = product.pricing?.model || 'Freemium';

  // Founder Profile resolution
  const founderName =
    product.founderId?.founderProfile?.displayName ||
    product.founderId?.name ||
    product.founder?.name ||
    (product.isVerified ? 'Verified Founder' : 'Community Hunter');

  const founderBio =
    product.founderId?.founderProfile?.bio ||
    product.founder?.bio ||
    `Builder of ${product.name}. Empowering developers and creators with high-velocity tools.`;

  const founderTwitter =
    product.founderId?.founderProfile?.twitterHandle ||
    product.founder?.twitterHandle;

  const founderAvatar =
    product.founderId?.founderProfile?.avatarUrl ||
    product.founderId?.avatarUrl ||
    product.founder?.avatarUrl ||
    null;

  const shareUrl = typeof window !== 'undefined' ? window.location.href : `https://launchproduct.com/products/${product.slug || productId}`;
  const shareText = `Check out ${product.name} — ${product.tagline} on LaunchProduct!`;

  // Native Web Share or Share Popover
  const handleShareTrigger = async () => {
    if (typeof navigator !== 'undefined' && navigator.share && /mobile/i.test(navigator.userAgent)) {
      try {
        await navigator.share({
          title: `${product.name} on LaunchProduct`,
          text: product.tagline,
          url: shareUrl,
        });
        return;
      } catch (err) {
        // User cancelled or unsupported
      }
    }
    setIsShareMenuOpen(!isShareMenuOpen);
  };

  const copyUrlToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch (err) {
      console.warn('Copy error:', err);
    }
  };

  const copyEmbedBadge = async () => {
    const badgeMarkdown = `[![${product.name} on LaunchProduct](https://launchproduct.com/brand/badge.svg)](https://launchproduct.com/products/${product.slug || productId})`;
    try {
      await navigator.clipboard.writeText(badgeMarkdown);
      setCopiedBadge(true);
      setTimeout(() => setCopiedBadge(false), 2000);
    } catch (err) {
      console.warn('Badge copy error:', err);
    }
  };

  const formattedLaunchDate = product.launchDate || product.createdAt
    ? new Date(product.launchDate || product.createdAt!).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Recently Launched';

  const tagsList = product.tags && product.tags.length > 0
    ? product.tags
    : ['AI', 'SaaS', 'Developer Tools', 'Productivity'];

  return (
    <div className="min-h-screen bg-bg text-text-primary pb-24">
      {/* Breadcrumb Navigation */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-text-muted">
          <Link href="/" className="hover:text-primary transition-colors focus-ring rounded">
            Home
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <Link href={`/?category=${encodeURIComponent(categoryName)}`} className="hover:text-primary transition-colors focus-ring rounded">
            {categoryName}
          </Link>
          <ChevronRight className="w-3.5 h-3.5" />
          <span className="text-text-primary font-semibold truncate">{product.name}</span>
        </nav>
      </div>

      {/* HERO HEADER SECTION */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-2 pb-8">
        <div className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-card relative">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 sm:gap-8">
            {/* Left: 80x80px Logo + Title + Tagline */}
            <div className="flex items-start gap-4 sm:gap-5 min-w-0">
              {/* Product Logo (No raster scaling blur) */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border border-border overflow-hidden bg-surface-sunken shrink-0 flex items-center justify-center p-1 shadow-2xs">
                <img
                  src={logoUrl}
                  alt={product.name}
                  className="w-full h-full object-cover rounded-xl"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.endsWith('/brand/icon.svg')) {
                      target.src = '/brand/icon.svg';
                    }
                  }}
                />
              </div>

              {/* Title & Badges */}
              <div className="min-w-0 space-y-2">
                <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
                    {product.name}
                  </h1>

                  {product.isVerified ? (
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      title="Cryptographic DNS Verified Domain Ownership"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" /> Verified
                    </span>
                  ) : (
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                      title="Community Listed (Domain unverified)"
                    >
                      <ShieldAlert className="w-3.5 h-3.5" /> Unclaimed
                    </span>
                  )}

                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-surface-sunken text-text-secondary border border-border">
                    {categoryName}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary-subtle text-primary border border-primary/20">
                    {pricingModel}
                  </span>
                </div>

                {/* Tagline */}
                <p className="text-sm sm:text-base font-normal text-text-secondary leading-relaxed">
                  {product.tagline}
                </p>

                {/* Launch Date */}
                <div className="flex items-center gap-1.5 text-xs text-text-muted pt-0.5">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Launched on {formattedLaunchDate}</span>
                </div>
              </div>
            </div>

            {/* Right: Action Bar */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 self-start lg:self-center shrink-0">
              {/* Upvote Button */}
              <UpvoteButton
                productId={productId}
                initialVotesCount={product.upvotesCount ?? 0}
                size="lg"
                onAuthRequired={() => setAuthModalOpen(true)}
              />

              {/* Outbound "Visit Website ↗" Button */}
              <a
                href={outboundUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary-hover shadow-sm transition-motion-base focus-ring"
              >
                <span>Visit Website</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              {/* Share Button & Popover */}
              <div className="relative">
                <button
                  type="button"
                  onClick={handleShareTrigger}
                  className="p-2.5 rounded-xl border border-border bg-surface hover:bg-surface-sunken text-text-secondary hover:text-text-primary transition-motion-fast focus-ring"
                  title="Share product"
                  aria-label="Share product"
                >
                  <Share2 className="w-4 h-4" />
                </button>

                {/* Accessible Share Dropdown Popover */}
                {isShareMenuOpen && (
                  <div
                    className="absolute right-0 top-12 z-40 w-64 p-3 rounded-2xl bg-surface border border-border shadow-popover space-y-2 animate-in fade-in zoom-in-95 duration-150"
                  >
                    <div className="text-xs font-bold text-text-primary px-1">Share this launch</div>
                    
                    <a
                      href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors"
                    >
                      <Twitter className="w-4 h-4 text-sky-500" />
                      <span>Share on X (Twitter)</span>
                    </a>

                    <a
                      href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors"
                    >
                      <Linkedin className="w-4 h-4 text-blue-600" />
                      <span>Share on LinkedIn</span>
                    </a>

                    <button
                      type="button"
                      onClick={copyUrlToClipboard}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        {copiedUrl ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                        <span>{copiedUrl ? 'URL Copied!' : 'Copy Launch URL'}</span>
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={copyEmbedBadge}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors"
                    >
                      <span className="flex items-center gap-2.5">
                        {copiedBadge ? <Check className="w-4 h-4 text-emerald-500" /> : <Code className="w-4 h-4" />}
                        <span>{copiedBadge ? 'Badge Markdown Copied!' : 'Copy Embed Badge'}</span>
                      </span>
                    </button>
                  </div>
                )}
              </div>

              {/* Bookmark Trigger */}
              <button
                type="button"
                onClick={() => setIsBookmarked(!isBookmarked)}
                className={`p-2.5 rounded-xl border transition-motion-fast focus-ring ${
                  isBookmarked
                    ? 'border-primary bg-primary-subtle text-primary'
                    : 'border-border bg-surface hover:bg-surface-sunken text-text-secondary hover:text-text-primary'
                }`}
                title={isBookmarked ? 'Saved to bookmarks' : 'Bookmark launch'}
                aria-label="Bookmark launch"
              >
                <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-primary' : ''}`} />
              </button>
            </div>
          </div>

          {/* PERMANENT RANK & ACCREDITATION BADGES */}
          <div className="mt-6 pt-5 border-t border-border flex flex-wrap items-center gap-3">
            <span className="text-xs font-semibold text-text-muted uppercase font-mono tracking-wider">
              Accolades:
            </span>

            {/* Badge 1: Verification status */}
            {product.isVerified ? (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                <BadgeCheck className="w-3.5 h-3.5" />
                <span>DNS Cryptographically Verified Domain</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface-sunken border border-border text-text-muted text-xs font-medium">
                <span>Community Discovery Submission</span>
              </div>
            )}

            {/* Badge 2: Verified Discovery */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary-subtle border border-primary/20 text-primary text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Multi-Signal Anti-Fraud Protected</span>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN TWO-COLUMN CONTENT GRID */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* LEFT 2 COLUMNS: Media Carousel + Long Description + Reviews */}
          <div className="lg:col-span-2 space-y-8">
            {/* Media Gallery with Lightbox */}
            <section>
              <h2 className="text-base font-bold text-text-primary mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                Product Interface &amp; Gallery
              </h2>
              <MediaGallery
                screenshots={product.media?.screenshotUrls || []}
                bannerUrl={product.media?.bannerUrl}
                productName={product.name}
              />
            </section>

            {/* Product Overview & Long-form Description */}
            <section className="rounded-2xl border border-border bg-surface p-6 sm:p-8 shadow-card space-y-6">
              <div>
                <h2 className="text-xl font-bold text-text-primary">About {product.name}</h2>
                <p className="text-xs text-text-muted mt-0.5">Product overview, key workflows, and core architecture</p>
              </div>

              {/* Description Body */}
              <div className="text-sm leading-relaxed text-text-secondary space-y-4">
                <p className="font-normal leading-relaxed whitespace-pre-line">
                  {product.description}
                </p>
              </div>

              {/* Tech Ecosystem Tags */}
              <div className="pt-6 border-t border-border">
                <h4 className="text-xs font-bold text-text-muted uppercase font-mono tracking-wider mb-3 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5" /> Tech Ecosystem Tags
                </h4>
                <div className="flex flex-wrap gap-2">
                  {tagsList.map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-xl text-xs font-medium bg-surface-sunken text-text-secondary border border-border"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            </section>

            {/* Community Reviews Showcase */}
            <section>
              <ReviewList
                productId={productId}
                productName={product.name}
                onAuthRequired={() => setAuthModalOpen(true)}
              />
            </section>
          </div>

          {/* RIGHT 1 COLUMN: Sticky Sidebar with Founder Profile & Specifications */}
          <aside className="space-y-6 sticky top-20">
            {/* FOUNDER PROFILE CARD */}
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-card space-y-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-primary font-bold">
                  Builder Identity
                </span>
                <h3 className="text-base font-bold text-text-primary mt-0.5">Meet the Founder</h3>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl border border-border overflow-hidden bg-surface-sunken shrink-0 flex items-center justify-center">
                  {founderAvatar ? (
                    <img
                      src={founderAvatar}
                      alt={founderName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm font-bold text-primary bg-primary-subtle">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-bold text-text-primary text-sm">
                    <span className="truncate">{founderName}</span>
                    {product.isVerified && (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    )}
                  </div>
                  {founderTwitter && (
                    <a
                      href={`https://twitter.com/${founderTwitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-primary transition-colors font-mono"
                    >
                      <Twitter className="w-3 h-3 text-sky-500" />
                      @{founderTwitter}
                    </a>
                  )}
                </div>
              </div>

              <p className="text-xs text-text-secondary leading-relaxed">
                {founderBio}
              </p>

              {/* Cryptographic Domain Verification Badge */}
              <div className="p-3 rounded-xl bg-surface-sunken border border-border text-xs space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-text-primary">
                  {product.isVerified ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Verified Domain Owner</span>
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                      <span>Unclaimed Product Listing</span>
                    </>
                  )}
                </div>
                <p className="text-[11px] text-text-muted font-mono truncate">
                  Domain: {product.canonicalDomain || product.websiteUrl.replace(/^https?:\/\//, '')}
                </p>
              </div>

              {/* Direct Website Link */}
              <div className="pt-1">
                <a
                  href={outboundUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 py-2 rounded-xl border border-border bg-surface hover:bg-surface-sunken text-xs font-semibold text-text-primary transition-motion-fast focus-ring"
                >
                  <Globe className="w-3.5 h-3.5 text-text-muted" /> Visit Official Website
                </a>
              </div>
            </div>

            {/* Launch Specifications Card */}
            <div className="rounded-2xl border border-border bg-surface p-6 shadow-card space-y-3 text-xs">
              <h4 className="font-bold text-text-primary text-sm">Product Specifications</h4>

              <div className="divide-y divide-border">
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-text-muted">Pricing Model</span>
                  <span className="font-semibold text-text-primary capitalize">{pricingModel}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-text-muted">Category</span>
                  <span className="font-semibold text-primary">{categoryName}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-text-muted">Verified Domain</span>
                  <span className="font-mono text-text-primary">{product.canonicalDomain || 'Verified'}</span>
                </div>
                <div className="py-2.5 flex items-center justify-between">
                  <span className="text-text-muted">Platform Integrity</span>
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">Anti-Fraud v1.0</span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Auth Modal for unauthenticated actions */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        title="Sign in to Upvote"
        subtitle={`Sign in to vote for ${product.name} and post verified community reviews.`}
      />
    </div>
  );
}

export default ProductDetailClient;
