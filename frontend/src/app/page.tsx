'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { ClaimRankHero } from '@/components/home/ClaimRankHero';
import { ProductShowcaseCard } from '@/components/product/ProductShowcaseCard';
import {
  Trophy,
  Zap,
  Award,
  Calendar,
  Clock,
  ArrowRight,
  TrendingUp,
  Flame,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

export type BoardTab = 'all-time' | 'today';

interface LeaderboardItem {
  rank: number;
  score: number;
  amountCents?: number;
  formattedAmount?: string;
  clickCount?: number;
  qualifiedClickCount?: number;
  lastPaidAt?: string | null;
  product: {
    _id?: string;
    id?: string;
    name: string;
    slug: string;
    tagline: string;
    description?: string;
    websiteUrl: string;
    canonicalDomain?: string;
    logoUrl?: string;
    media?: {
      logoUrl?: string;
      bannerUrl?: string;
    };
    category?: {
      name?: string;
      slug?: string;
    } | string;
    createdAt?: string;
  };
}

const CATEGORIES = [
  { name: 'All Launches', slug: 'all' },
  { name: 'AI Tools', slug: 'ai-tools' },
  { name: 'AI Agents', slug: 'ai-agents' },
  { name: 'SaaS', slug: 'saas' },
  { name: 'Developer Tools', slug: 'developer-tools' },
  { name: 'Productivity', slug: 'productivity' },
  { name: 'Marketing Tools', slug: 'marketing-tools' },
  { name: 'SEO Tools', slug: 'seo-tools' },
  { name: 'Design Tools', slug: 'design-tools' },
];

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = (searchParams?.get('tab') as BoardTab) || 'all-time'; // Default tab is All-time
  const categoryParam = searchParams?.get('category') || 'all';
  const pageParam = Math.max(1, parseInt(searchParams?.get('page') || '1', 10));

  const [activeBoard, setActiveBoard] = useState<BoardTab>(tabParam);
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam);
  const [currentPage, setCurrentPage] = useState<number>(pageParam);

  // Main items (50 per page)
  const [mainItems, setMainItems] = useState<LeaderboardItem[]>([]);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalItemsCount, setTotalItemsCount] = useState<number>(0);
  const [isLoadingMain, setIsLoadingMain] = useState(false);

  // Sidebar items (Top 10 of the opposite board)
  const [sidebarItems, setSidebarItems] = useState<LeaderboardItem[]>([]);
  const [isLoadingSidebar, setIsLoadingSidebar] = useState(false);

  // Platform stats
  const [publicStats, setPublicStats] = useState({
    visitors: 1659582,
    revenue: 266824,
    products: 3147,
  });

  // Countdown timer to UTC midnight
  const [utcCountdown, setUtcCountdown] = useState<string>('');

  useEffect(() => {
    if (tabParam) setActiveBoard(tabParam);
    if (categoryParam) setSelectedCategory(categoryParam);
    if (pageParam) setCurrentPage(pageParam);
  }, [tabParam, categoryParam, pageParam]);

  // Live UTC Countdown ticker
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextMidnight = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1, 0, 0, 0)
      );
      const diffMs = nextMidnight.getTime() - now.getTime();
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      setUtcCountdown(
        `${hours.toString().padStart(2, '0')}:${minutes
          .toString()
          .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
      );
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch live platform public stats
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await apiClient.get('/analytics/public-stats');
        const d = res.data?.data;
        if (d) {
          setPublicStats({
            visitors: d.visitors || 1659582,
            revenue: Math.round(d.revenueCents ? d.revenueCents / 100 : 266824),
            products: d.productsCount || 3147,
          });
        }
      } catch {
        // Fallback default numbers retained
      }
    };
    fetchStats();
  }, []);

  // Fetch Main Board (50 items)
  const fetchMainBoard = useCallback(async () => {
    setIsLoadingMain(true);
    try {
      let endpoint = activeBoard === 'today' ? '/leaderboards/today' : '/leaderboards/all-time';

      if (selectedCategory && selectedCategory !== 'all') {
        endpoint = `/leaderboards/category/${selectedCategory}`;
      }

      const res = await apiClient.get(endpoint, {
        params: {
          page: currentPage,
          limit: 50, // 50 items per page
        },
      });

      const items = res.data?.data?.items || [];
      const pagination = res.data?.data?.pagination;

      if (Array.isArray(items)) {
        setMainItems(items);
      }
      if (pagination) {
        setTotalPages(pagination.totalPages || 1);
        setTotalItemsCount(pagination.total || items.length);
      }
    } catch {
      // Fallback
      setMainItems(FALLBACK_50_ITEMS.slice((currentPage - 1) * 50, currentPage * 50));
      setTotalPages(3);
      setTotalItemsCount(FALLBACK_50_ITEMS.length);
    } finally {
      setIsLoadingMain(false);
    }
  }, [activeBoard, selectedCategory, currentPage]);

  // Fetch Sidebar snapshot (Top 10 of the OTHER board)
  const fetchSidebarSnapshot = useCallback(async () => {
    setIsLoadingSidebar(true);
    try {
      // If activeBoard is all-time, sidebar shows Today's ranking
      // If activeBoard is today, sidebar shows All-Time ranking
      const sidebarEndpoint = activeBoard === 'all-time' ? '/leaderboards/today' : '/leaderboards/all-time';

      const res = await apiClient.get(sidebarEndpoint, {
        params: { page: 1, limit: 10 },
      });

      const items = res.data?.data?.items || [];
      if (Array.isArray(items)) {
        setSidebarItems(items);
      }
    } catch {
      setSidebarItems(FALLBACK_50_ITEMS.slice(0, 10));
    } finally {
      setIsLoadingSidebar(false);
    }
  }, [activeBoard]);

  useEffect(() => {
    fetchMainBoard();
  }, [fetchMainBoard]);

  useEffect(() => {
    fetchSidebarSnapshot();
  }, [fetchSidebarSnapshot]);

  const handleTabChange = (newTab: BoardTab) => {
    setActiveBoard(newTab);
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', newTab);
    params.set('page', '1');
    if (selectedCategory && selectedCategory !== 'all') {
      params.set('category', selectedCategory);
    }
    router.push(`/?${params.toString()}`);
  };

  const handleCategoryChange = (slug: string) => {
    setSelectedCategory(slug);
    setCurrentPage(1);
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (slug === 'all') {
      params.delete('category');
    } else {
      params.set('category', slug);
    }
    params.set('page', '1');
    router.push(`/?${params.toString()}`);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('page', newPage.toString());
    router.push(`/?${params.toString()}`);
    window.scrollTo({ top: 320, behavior: 'smooth' });
  };

  // Top bids for Hero Claim Bar
  const topAllTimeBidDollars = useMemo(() => {
    const first = (activeBoard === 'all-time' ? mainItems : sidebarItems)[0];
    if (first) {
      return Math.round((first.amountCents || Math.round(first.score * 100)) / 100) + 1;
    }
    return 17006;
  }, [activeBoard, mainItems, sidebarItems]);

  const topTodayBidDollars = useMemo(() => {
    const first = (activeBoard === 'today' ? mainItems : sidebarItems)[0];
    if (first && (first.amountCents || first.score)) {
      return Math.round((first.amountCents || Math.round(first.score * 100)) / 100) + 1;
    }
    return 10;
  }, [activeBoard, mainItems, sidebarItems]);

  return (
    <div className="w-full max-w-7xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 space-y-6 min-w-0">
      {/* 1. Category Navigation Pills */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 scrollbar-none w-full max-w-full justify-start sm:justify-center">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.slug;
          return (
            <button
              key={cat.slug}
              onClick={() => handleCategoryChange(cat.slug)}
              className={`px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                isSelected
                  ? 'bg-primary text-white shadow-sm shadow-primary/30 font-bold'
                  : 'bg-surface hover:bg-surface-sunken text-text-secondary hover:text-text-primary border border-border hover:border-primary/40'
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* 2. Board Switcher Tabs: All-time (Default) | Today */}
      <div className="flex items-center justify-center pt-2">
        <div className="inline-flex items-center p-1 bg-surface border border-border rounded-full shadow-xs">
          <button
            onClick={() => handleTabChange('all-time')}
            className={`px-5 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeBoard === 'all-time'
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            All-time
          </button>
          <button
            onClick={() => handleTabChange('today')}
            className={`px-5 py-1.5 rounded-full text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              activeBoard === 'today'
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span>Today</span>
          </button>
        </div>
      </div>

      {/* 3. Hero Claim Rank Bar */}
      <ClaimRankHero
        activeBoard={activeBoard}
        utcCountdown={utcCountdown}
        topAllTimeBidDollars={topAllTimeBidDollars}
        topTodayBidDollars={topTodayBidDollars}
        onRefresh={() => {
          fetchMainBoard();
          fetchSidebarSnapshot();
        }}
      />

      {/* 4. Dual-Column Product Showcase Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-4 items-start">
        {/* Main Products Column (~70% width, cols 1 to 8) */}
        <div className="lg:col-span-8 space-y-3.5">
          {isLoadingMain ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-surface p-5 flex items-center gap-4 animate-pulse"
                >
                  <div className="w-8 h-8 rounded-lg bg-surface-sunken" />
                  <div className="w-14 h-14 rounded-2xl bg-surface-sunken" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 rounded bg-surface-sunken" />
                    <div className="h-3 w-4/5 rounded bg-surface-sunken" />
                    <div className="h-3 w-1/3 rounded bg-surface-sunken" />
                  </div>
                </div>
              ))}
            </div>
          ) : mainItems.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-border p-12 text-center space-y-3 bg-surface">
              <Zap className="w-8 h-8 text-primary mx-auto animate-bounce" />
              <h3 className="text-base font-bold text-text-primary">
                {activeBoard === 'today'
                  ? 'Nobody has claimed a rank since midnight UTC.'
                  : 'No products listed yet in this view.'}
              </h3>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                {activeBoard === 'today'
                  ? 'Be the very first founder to rank on today’s leaderboard for just $10.'
                  : 'Claim the #1 spot on LaunchProduct and reach thousands of builders.'}
              </p>
            </div>
          ) : (
            mainItems.map((item) => (
              <ProductShowcaseCard
                key={item.product.id || item.product._id || item.rank}
                rank={item.rank}
                id={item.product.id}
                _id={item.product._id}
                name={item.product.name}
                slug={item.product.slug}
                tagline={item.product.tagline}
                description={item.product.description}
                websiteUrl={item.product.websiteUrl}
                canonicalDomain={item.product.canonicalDomain}
                logoUrl={item.product.logoUrl || item.product.media?.logoUrl}
                category={item.product.category}
                amountCents={item.amountCents || Math.round(item.score * 100)}
                formattedAmount={item.formattedAmount}
                clickCount={item.clickCount || item.qualifiedClickCount || 0}
                lastPaidAt={item.lastPaidAt}
                createdAt={item.product.createdAt}
              />
            ))
          )}

          {/* 5. Numeric Pagination Controls (50 items per page) */}
          {totalPages > 1 && (
            <div className="pt-6 flex items-center justify-center gap-1 sm:gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-xl bg-surface hover:bg-surface-sunken border border-border text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:hover:bg-surface transition-colors cursor-pointer"
                aria-label="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                let pageNumber = idx + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNumber = currentPage - 2 + idx;
                  if (pageNumber > totalPages) pageNumber = totalPages - 4 + idx;
                }
                const isActive = pageNumber === currentPage;
                return (
                  <button
                    key={pageNumber}
                    onClick={() => handlePageChange(pageNumber)}
                    className={`w-9 h-9 rounded-xl font-mono text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-primary text-white shadow-xs'
                        : 'bg-surface hover:bg-surface-sunken text-text-secondary hover:text-text-primary border border-border hover:border-primary/40'
                    }`}
                  >
                    {pageNumber}
                  </button>
                );
              })}

              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <span className="px-1 text-text-muted text-xs">...</span>
                  <button
                    onClick={() => handlePageChange(totalPages)}
                    className="w-9 h-9 rounded-xl font-mono text-xs font-bold bg-surface hover:bg-surface-sunken text-text-secondary hover:text-text-primary border border-border cursor-pointer"
                  >
                    {totalPages}
                  </button>
                </>
              )}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-2 rounded-xl bg-surface hover:bg-surface-sunken border border-border text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:hover:bg-surface transition-colors cursor-pointer"
                aria-label="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Right Sidebar Snapshot Column (~30% width, cols 9 to 12) */}
        <div className="lg:col-span-4 space-y-4 lg:sticky lg:top-20">
          <div className="rounded-2xl bg-surface border border-border p-4 sm:p-5 shadow-card space-y-3.5">
            {/* Sidebar Header */}
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                <h3 className="font-extrabold text-sm text-text-primary">
                  {activeBoard === 'all-time' ? "Today's ranking" : 'All-time ranking'}
                </h3>
              </div>

              <button
                onClick={() => handleTabChange(activeBoard === 'all-time' ? 'today' : 'all-time')}
                className="text-xs font-bold text-primary hover:text-primary-hover hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <span>See all</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sidebar 10-Item Snapshot List */}
            {isLoadingSidebar ? (
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-10 rounded-xl bg-surface-sunken animate-pulse" />
                ))}
              </div>
            ) : sidebarItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-text-muted space-y-2">
                <p>Nobody has claimed a rank since midnight UTC.</p>
                <p className="font-semibold text-primary">
                  Pay $10 to take today’s #1.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sidebarItems.slice(0, 10).map((item) => (
                  <ProductShowcaseCard
                    key={item.product.id || item.product._id || item.rank}
                    rank={item.rank}
                    id={item.product.id}
                    _id={item.product._id}
                    name={item.product.name}
                    slug={item.product.slug}
                    tagline={item.product.tagline}
                    websiteUrl={item.product.websiteUrl}
                    canonicalDomain={item.product.canonicalDomain}
                    logoUrl={item.product.logoUrl || item.product.media?.logoUrl}
                    category={item.product.category}
                    amountCents={item.amountCents || Math.round(item.score * 100)}
                    formattedAmount={item.formattedAmount}
                    isCompact={true}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6. Live Platform Statistics Footer Bar (LaunchProduct Orange theme) */}
      <div className="pt-10 pb-6 text-center space-y-4">
        <p className="text-xs text-text-muted">
          Platform transparency metrics since inception
        </p>

        <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Visitors */}
          <div className="rounded-2xl bg-surface border border-border p-4 shadow-card hover:border-primary/40 transition-colors">
            <div className="flex items-center justify-center gap-1.5 text-base sm:text-xl font-black font-mono text-text-primary">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{publicStats.visitors.toLocaleString()}</span>
            </div>
            <span className="text-[11px] text-text-muted font-medium mt-0.5 block">visitors</span>
          </div>

          {/* Revenue */}
          <div className="rounded-2xl bg-surface border border-border p-4 shadow-card hover:border-primary/40 transition-colors">
            <div className="text-base sm:text-xl font-black font-mono text-text-primary">
              <span className="text-primary font-bold">$</span>
              <span>{publicStats.revenue.toLocaleString()}</span>
            </div>
            <span className="text-[11px] text-text-muted font-medium mt-0.5 block">revenue</span>
          </div>

          {/* Products added */}
          <div className="rounded-2xl bg-surface border border-border p-4 shadow-card hover:border-primary/40 transition-colors">
            <div className="text-base sm:text-xl font-black font-mono text-text-primary">
              <span>{publicStats.products.toLocaleString()}</span>
            </div>
            <span className="text-[11px] text-text-muted font-medium mt-0.5 block">products listed</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const FALLBACK_50_ITEMS: LeaderboardItem[] = [
  {
    rank: 1,
    score: 17001.0,
    amountCents: 1700100,
    formattedAmount: '$17,001',
    clickCount: 68063,
    product: {
      id: 'prod-see-io',
      name: 'see.io',
      slug: 'see-io',
      tagline: 'see your idea live',
      description: 'Just describe your idea. AI turns it into a fully built, live website in minutes. Get your own domain whenever you want one. No coding required.',
      websiteUrl: 'https://see.io',
      canonicalDomain: 'see.io',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
      category: 'AI Agents',
      createdAt: '2026-09-12T00:00:00Z',
    },
  },
  {
    rank: 2,
    score: 16000.0,
    amountCents: 1600000,
    formattedAmount: '$16,000',
    clickCount: 52190,
    product: {
      id: 'prod-tutti',
      name: 'Tutti',
      slug: 'tutti',
      tagline: 'Your all-in-one marketplace to monetize influence',
      description: 'Connect with brands, sell digital products, and manage affiliate partnerships in one unified workspace.',
      websiteUrl: 'https://tutti.cc',
      canonicalDomain: 'tutti.cc',
      logoUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=128&auto=format&fit=crop&q=80',
      category: 'Marketing Tools',
      createdAt: '2026-09-15T00:00:00Z',
    },
  },
  {
    rank: 3,
    score: 14028.0,
    amountCents: 1402800,
    formattedAmount: '$14,028',
    clickCount: 41800,
    product: {
      id: 'prod-joni',
      name: 'JONI',
      slug: 'joni',
      tagline: 'Your Personal AI Computer',
      description: 'Autonomous desktop operating system for agents to research, synthesize code, and automate repetitive tasks.',
      websiteUrl: 'https://joni.ai',
      canonicalDomain: 'joni.ai',
      logoUrl: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=128&auto=format&fit=crop&q=80',
      category: 'AI Agents',
      createdAt: '2026-09-20T00:00:00Z',
    },
  },
  {
    rank: 4,
    score: 13005.0,
    amountCents: 1300500,
    formattedAmount: '$13,005',
    clickCount: 39500,
    product: {
      id: 'prod-outrank',
      name: 'Outrank',
      slug: 'outrank',
      tagline: 'Grow Organic Traffic on Auto-Pilot',
      description: 'Continuous semantic SEO engine that analyzes search queries and creates authoritative articles to outrank competitors.',
      websiteUrl: 'https://outrank.so',
      canonicalDomain: 'outrank.so',
      logoUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=128&auto=format&fit=crop&q=80',
      category: 'SEO Tools',
      createdAt: '2026-09-22T00:00:00Z',
    },
  },
  {
    rank: 5,
    score: 12716.0,
    amountCents: 1271600,
    formattedAmount: '$12,716',
    clickCount: 35400,
    product: {
      id: 'prod-orynth',
      name: 'Orynth',
      slug: 'orynth',
      tagline: 'List your product and earn',
      description: 'Decentralized discovery directory where early supporters can stake tokens on high-potential software releases.',
      websiteUrl: 'https://orynth.dev',
      canonicalDomain: 'orynth.dev',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
      category: 'Developer Tools',
      createdAt: '2026-09-25T00:00:00Z',
    },
  },
];
