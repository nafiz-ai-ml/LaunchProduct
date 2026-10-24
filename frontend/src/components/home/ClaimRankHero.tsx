'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { sanitizeImageUrl } from '@/lib/safe-url';
import {
  Globe,
  Loader2,
  ChevronDown,
  Minus,
  Plus,
  ArrowRight,
  Sparkles,
  Zap,
  Check,
  X,
  CreditCard,
  AlertCircle,
  TrendingUp,
  Layers,
} from 'lucide-react';

interface CategoryOption {
  id: string;
  name: string;
  slug: string;
}

interface DomainPreviewData {
  domain: string;
  websiteUrl: string;
  name: string;
  tagline: string;
  description: string;
  logoUrl: string;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  categories: CategoryOption[];
  isExisting: boolean;
  existingProductId?: string | null;
  allTimeEstimatedRank: number;
  categoryEstimatedRank: number;
  totalAllTimeProducts: number;
  totalCategoryProducts: number;
  categoryTopBidDollars: number;
  categoryOutbidCostDollars: number;
  todayTopBidDollars: number;
  todayOutbidCostDollars: number;
  allTimeTopBidDollars: number;
  allTimeOutbidCostDollars: number;
}

interface ClaimRankHeroProps {
  activeBoard: 'all-time' | 'today';
  utcCountdown?: string;
  topAllTimeBidDollars?: number;
  topTodayBidDollars?: number;
  onRefresh?: () => void;
}

export function ClaimRankHero({
  activeBoard,
  utcCountdown,
  topAllTimeBidDollars = 17006,
  topTodayBidDollars = 10,
  onRefresh,
}: ClaimRankHeroProps) {
  const [urlInput, setUrlInput] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [categoriesList, setCategoriesList] = useState<CategoryOption[]>([]);
  const [previewData, setPreviewData] = useState<DomainPreviewData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [amountDollars, setAmountDollars] = useState<number>(
    activeBoard === 'today' ? Math.max(10, topTodayBidDollars) : Math.max(10, topAllTimeBidDollars)
  );

  // Modal checkout state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // Update default amount when activeBoard changes
  useEffect(() => {
    if (activeBoard === 'today') {
      setAmountDollars(Math.max(10, topTodayBidDollars));
    } else {
      setAmountDollars(Math.max(10, topAllTimeBidDollars));
    }
  }, [activeBoard, topTodayBidDollars, topAllTimeBidDollars]);

  // Fast domain preview query
  const performPreview = useCallback(async (query: string) => {
    const clean = query.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
    if (!clean || clean.length < 3 || !clean.includes('.')) {
      setPreviewData(null);
      setIsLoadingPreview(false);
      return;
    }

    setIsLoadingPreview(true);
    try {
      const res = await apiClient.get('/products/preview-domain', {
        params: { url: clean },
      });
      const data: DomainPreviewData = res.data?.data;
      if (data) {
        setPreviewData(data);
        if (data.categories && data.categories.length > 0) {
          setCategoriesList(data.categories);
        }
        if (data.categoryId) {
          setSelectedCategory(data.categoryId);
        }
      }
    } catch {
      // Graceful fallback heuristics
      const domainName = clean.split('.')[0];
      const fallbackName = domainName.charAt(0).toUpperCase() + domainName.slice(1);
      setPreviewData({
        domain: clean,
        websiteUrl: `https://${clean}`,
        name: fallbackName,
        tagline: `The modern platform for ${clean}`,
        description: `${fallbackName} offers fast, reliable tools for developers and modern builders.`,
        logoUrl: `https://www.google.com/s2/favicons?domain=${clean}&sz=128`,
        categoryId: selectedCategory || '',
        categoryName: 'AI Tools',
        categorySlug: 'ai-tools',
        categories: categoriesList,
        isExisting: false,
        allTimeEstimatedRank: 42,
        categoryEstimatedRank: 8,
        totalAllTimeProducts: 3147,
        totalCategoryProducts: 166,
        categoryTopBidDollars: 174,
        categoryOutbidCostDollars: 175,
        todayTopBidDollars: 10,
        todayOutbidCostDollars: 10,
        allTimeTopBidDollars: 17006,
        allTimeOutbidCostDollars: 17007,
      });
    } finally {
      setIsLoadingPreview(false);
    }
  }, [categoriesList, selectedCategory]);

  // Handle URL input changes with debounce
  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setUrlInput(val);

    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!val.trim()) {
      setPreviewData(null);
      setIsLoadingPreview(false);
      return;
    }

    debounceTimer.current = setTimeout(() => {
      performPreview(val);
    }, 400);
  };

  const handleAmountStep = (delta: number) => {
    const minAmount = 10;
    setAmountDollars((prev) => Math.max(minAmount, prev + delta));
  };

  const handleClaimClick = () => {
    if (!urlInput.trim()) {
      return;
    }
    setIsModalOpen(true);
    setCheckoutError(null);
  };

  const handleCategoryShortcutClick = () => {
    if (previewData) {
      setAmountDollars(previewData.categoryOutbidCostDollars);
      if (previewData.categoryId) {
        setSelectedCategory(previewData.categoryId);
      }
    }
  };

  // Submit checkout
  const handleProceedToPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError(null);

    const cleanDomain = urlInput.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
    if (!cleanDomain) {
      setCheckoutError('Please enter a valid website URL or domain');
      return;
    }

    const domainName = cleanDomain.split('.')[0];
    const name = previewData?.name || domainName.charAt(0).toUpperCase() + domainName.slice(1);
    const tagline = previewData?.tagline || `Discover the power of ${cleanDomain}`;
    const description = previewData?.description || `${name} offers fast, reliable tools for developers and modern builders.`;
    const websiteUrl = previewData?.websiteUrl || `https://${cleanDomain}`;
    const categoryId = selectedCategory || previewData?.categoryId || (categoriesList[0]?.id ?? '');
    const logoUrl = previewData?.logoUrl || `https://www.google.com/s2/favicons?domain=${cleanDomain}&sz=128`;
    const initialPaymentCents = Math.round(amountDollars * 100);

    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/products/public-submit', {
        name,
        tagline,
        description,
        websiteUrl,
        categoryId,
        contactEmail: contactEmail.trim() || undefined,
        logoUrl,
        initialPaymentCents,
        provider: 'paddle',
      });

      const checkoutUrl = res.data?.data?.checkoutUrl;
      if (checkoutUrl) {
        window.location.href = checkoutUrl;
      } else {
        setIsModalOpen(false);
        if (onRefresh) onRefresh();
      }
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || err.message || 'Payment initiation failed. Please try again.';
      setCheckoutError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full text-center py-6 sm:py-8 space-y-4 max-w-4xl mx-auto">
      {/* 1. Header with Amount Stepper (LaunchProduct Orange Brand Theme) */}
      <div className="space-y-2">
        <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
          <span className="text-2xl sm:text-4xl font-extrabold text-text-primary tracking-tight">
            {activeBoard === 'today' ? "Claim today's #1 for" : 'Claim #1 for'}
          </span>

          {/* Stepper Pill in Brand Orange Theme */}
          <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-surface border border-border shadow-sm hover:border-primary/40 transition-colors">
            <button
              type="button"
              onClick={() => handleAmountStep(activeBoard === 'today' ? -5 : -50)}
              className="w-7 h-7 rounded-full bg-surface-sunken hover:bg-primary hover:text-white text-text-secondary flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
              aria-label="Decrease amount"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>

            <span className="text-2xl sm:text-4xl font-black text-primary font-mono tracking-tight">
              ${amountDollars.toLocaleString()}
            </span>

            <button
              type="button"
              onClick={() => handleAmountStep(activeBoard === 'today' ? 5 : 50)}
              className="w-7 h-7 rounded-full bg-surface-sunken hover:bg-primary hover:text-white text-text-secondary flex items-center justify-center text-xs font-bold transition-all cursor-pointer"
              aria-label="Increase amount"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Subtitle / UTC countdown */}
        {activeBoard === 'today' && utcCountdown && (
          <p className="text-xs sm:text-sm text-text-muted">
            Resets every day at midnight UTC ·{' '}
            <span className="font-mono font-bold text-primary">{utcCountdown} left</span>
          </p>
        )}
      </div>

      {/* 2. Instant Input Form Bar */}
      <div className="pt-2">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row items-stretch gap-2 p-1.5 rounded-2xl bg-surface border border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 shadow-md transition-all duration-200">
          {/* Left: Product URL input with auto favicon badge */}
          <div className="relative flex-1 flex items-center min-w-0 px-3 py-1">
            <div className="w-6 h-6 shrink-0 flex items-center justify-center mr-2.5">
              {isLoadingPreview ? (
                <Loader2 className="w-4 h-4 text-primary animate-spin" />
              ) : previewData?.logoUrl ? (
                <img
                  src={sanitizeImageUrl(previewData.logoUrl)}
                  alt="Favicon"
                  className="w-5 h-5 rounded-md object-cover border border-border shadow-xs"
                />
              ) : (
                <Globe className="w-4 h-4 text-text-muted" />
              )}
            </div>

            <input
              type="text"
              value={urlInput}
              onChange={handleUrlChange}
              placeholder="Your product URL or @handle"
              className="w-full bg-transparent text-sm sm:text-base font-medium text-text-primary placeholder:text-text-muted focus:outline-none"
            />
          </div>

          {/* Middle: Category selector */}
          <div className="sm:border-l sm:border-border sm:pl-2 flex items-center">
            <div className="relative w-full sm:w-44">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full appearance-none bg-surface-sunken sm:bg-transparent px-3 py-2 sm:py-1.5 text-xs sm:text-sm font-semibold text-text-primary rounded-xl focus:outline-none cursor-pointer pr-8"
              >
                <option value="">Choose a category</option>
                {categoriesList.length > 0 ? (
                  categoriesList.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="ai-tools">AI Tools</option>
                    <option value="ai-agents">AI Agents</option>
                    <option value="saas">SaaS</option>
                    <option value="developer-tools">Developer Tools</option>
                    <option value="productivity">Productivity</option>
                    <option value="marketing-tools">Marketing Tools</option>
                    <option value="seo-tools">SEO Tools</option>
                    <option value="design-tools">Design Tools</option>
                  </>
                )}
              </select>
              <ChevronDown className="w-4 h-4 text-text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Right: Claim rank button (Brand Orange) */}
          <button
            type="button"
            onClick={handleClaimClick}
            disabled={!urlInput.trim()}
            className="px-6 py-2.5 sm:py-2 rounded-xl bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:hover:bg-primary text-white text-sm font-bold shadow-md shadow-primary/20 transition-all shrink-0 flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Claim rank</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {/* 3. Dynamic Placement Recommendation (Appears when valid URL is typed) */}
        {previewData && (
          <div className="pt-3 text-xs sm:text-sm text-text-secondary space-y-1 animate-fadeIn">
            <p>
              Places you{' '}
              <span className="font-bold text-text-primary font-mono">
                #{previewData.allTimeEstimatedRank.toLocaleString()}
              </span>{' '}
              on the all-time list and{' '}
              <span className="font-bold text-text-primary font-mono">
                #{previewData.categoryEstimatedRank}
              </span>{' '}
              in {previewData.categoryName || 'this category'}.
            </p>

            <p>
              <button
                type="button"
                onClick={handleCategoryShortcutClick}
                className="text-primary hover:text-primary-hover hover:underline font-bold cursor-pointer inline-flex items-center gap-1.5"
              >
                <span>
                  Claim #1 in your category for ${previewData.categoryOutbidCostDollars}
                </span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </p>
          </div>
        )}
      </div>

      {/* 4. Sleek Accountless Checkout Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 shadow-2xl relative space-y-5 text-left">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-lg text-text-muted hover:text-text-primary bg-surface-sunken hover:bg-border transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Modal Header */}
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20 mb-2">
                <Zap className="w-3.5 h-3.5" />
                <span>Account-Free Instant Rank Claim</span>
              </div>
              <h3 className="text-xl font-black text-text-primary">
                Confirm Rank Placement
              </h3>
              <p className="text-xs text-text-secondary mt-0.5">
                No sign up required. Pay to instantly lock in your position on LaunchProduct.
              </p>
            </div>

            {/* Product Summary Card */}
            <div className="rounded-xl border border-border bg-surface-sunken p-3.5 flex items-center gap-3">
              {previewData?.logoUrl ? (
                <img
                  src={sanitizeImageUrl(previewData.logoUrl)}
                  alt="Logo"
                  className="w-11 h-11 rounded-xl object-cover border border-border shrink-0 shadow-xs"
                />
              ) : (
                <div className="w-11 h-11 rounded-xl bg-surface border border-border flex items-center justify-center shrink-0">
                  <Globe className="w-5 h-5 text-text-muted" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-sm text-text-primary truncate">
                  {previewData?.name || urlInput}
                </h4>
                <p className="text-xs text-text-muted truncate">
                  {urlInput.startsWith('http') ? urlInput : `https://${urlInput}`}
                </p>
                <span className="text-[10px] font-semibold text-primary mt-0.5 block">
                  Category: {previewData?.categoryName || 'General'}
                </span>
              </div>
            </div>

            {/* Bid Amount Overview */}
            <div className="rounded-xl bg-surface border border-border p-3.5 flex items-center justify-between">
              <div>
                <span className="text-xs text-text-muted block">Qualifying Rank Amount</span>
                <span className="text-xs font-semibold text-text-secondary">
                  {activeBoard === 'today' ? "Today's Leaderboard" : 'All-Time Board'}
                </span>
              </div>
              <span className="text-2xl font-black font-mono text-primary">
                ${amountDollars.toLocaleString()}
              </span>
            </div>

            {/* Email form */}
            <form onSubmit={handleProceedToPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-text-primary mb-1">
                  Contact Email <span className="text-text-muted font-normal">(for payment receipt)</span>
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="founder@yourcompany.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-surface text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary"
                />
              </div>

              {checkoutError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{checkoutError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-sm shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Preparing Checkout...</span>
                  </>
                ) : (
                  <>
                    <CreditCard className="w-4 h-4" />
                    <span>Pay ${amountDollars.toLocaleString()} &amp; Take Rank</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ClaimRankHero;
