'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { OutbidModal } from '@/components/leaderboard/OutbidModal';
import {
  Trophy,
  Medal,
  Award,
  Calendar,
  Clock,
  ExternalLink,
  ShieldCheck,
  Zap,
  Flame,
  ArrowRight,
  TrendingUp,
  Sparkles,
  RefreshCw,
  Info,
  DollarSign,
  Plus,
  Layers,
} from 'lucide-react';

export type BoardType = 'today' | 'all-time' | 'archive';

interface LeaderboardItemData {
  rank: number;
  score: number;
  amountCents?: number;
  formattedAmount?: string;
  voteCount: number;
  product: {
    _id?: string;
    id?: string;
    name: string;
    slug: string;
    tagline: string;
    logoUrl?: string;
    media?: {
      logoUrl?: string;
      bannerUrl?: string;
    };
    category?: {
      name?: string;
      slug?: string;
    } | string;
    websiteUrl?: string;
    canonicalDomain?: string;
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

const FALLBACK_ITEMS: LeaderboardItemData[] = [
  {
    rank: 1,
    score: 120.0,
    amountCents: 12000,
    formattedAmount: '$120.00',
    voteCount: 412,
    product: {
      id: 'prod-sponsor-1',
      name: 'VectorPulse Cloud',
      slug: 'vectorpulse-cloud',
      tagline: 'Serverless vector database engine with automated sub-millisecond similarity indexing',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
      category: 'Developer Tools',
      websiteUrl: 'https://vectorpulse.cloud',
      canonicalDomain: 'vectorpulse.cloud',
    },
  },
  {
    rank: 2,
    score: 85.0,
    amountCents: 8500,
    formattedAmount: '$85.00',
    voteCount: 388,
    product: {
      id: 'prod-1',
      name: 'DevSync AI',
      slug: 'devsync-ai',
      tagline: 'Autonomous code review agent that spots performance regressions before merging',
      logoUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=128&auto=format&fit=crop&q=80',
      category: 'Developer Tools',
      websiteUrl: 'https://devsync.ai',
      canonicalDomain: 'devsync.ai',
    },
  },
  {
    rank: 3,
    score: 45.0,
    amountCents: 4500,
    formattedAmount: '$45.00',
    voteCount: 295,
    product: {
      id: 'prod-2',
      name: 'PromptCanvas',
      slug: 'promptcanvas',
      tagline: 'Visual node-based IDE for building, testing, and versioning production LLM chains',
      logoUrl: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=128&auto=format&fit=crop&q=80',
      category: 'AI Tools',
      websiteUrl: 'https://promptcanvas.dev',
      canonicalDomain: 'promptcanvas.dev',
    },
  },
  {
    rank: 4,
    score: 25.0,
    amountCents: 2500,
    formattedAmount: '$25.00',
    voteCount: 247,
    product: {
      id: 'prod-3',
      name: 'ShipFast UI',
      slug: 'shipfast-ui',
      tagline: 'Accessible React & Tailwind component library for hyper-growth SaaS platforms',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
      category: 'Design Tools',
      websiteUrl: 'https://shipfastui.com',
      canonicalDomain: 'shipfastui.com',
    },
  },
  {
    rank: 5,
    score: 15.0,
    amountCents: 1500,
    formattedAmount: '$15.00',
    voteCount: 184,
    product: {
      id: 'prod-4',
      name: 'AuditShield',
      slug: 'auditshield',
      tagline: 'Zero-trust API key scanner and cryptographic secret rotation service',
      logoUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=128&auto=format&fit=crop&q=80',
      category: 'Developer Tools',
      websiteUrl: 'https://auditshield.io',
      canonicalDomain: 'auditshield.io',
    },
  },
];

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabParam = (searchParams?.get('tab') as BoardType) || 'today';
  const categoryParam = searchParams?.get('category') || 'all';

  const [activeBoard, setActiveBoard] = useState<BoardType>(tabParam);
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam);
  const [leaderboardItems, setLeaderboardItems] = useState<LeaderboardItemData[]>(FALLBACK_ITEMS);
  const [isLoading, setIsLoading] = useState(false);
  const [utcCountdown, setUtcCountdown] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  // Outbid Modal State
  const [selectedProductForOutbid, setSelectedProductForOutbid] = useState<{
    id: string;
    name: string;
    currentRank: number;
    amountCents: number;
  } | null>(null);

  // Sync state with search params
  useEffect(() => {
    if (tabParam) setActiveBoard(tabParam);
    if (categoryParam) setSelectedCategory(categoryParam);
  }, [tabParam, categoryParam]);

  // Live UTC Countdown ticker to midnight
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
      setDateStr(now.toISOString().split('T')[0]);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch real Pay-to-Rank data from live Express API
  const fetchLeaderboard = useCallback(async () => {
    setIsLoading(true);
    try {
      let endpoint = '/leaderboards/today';
      if (activeBoard === 'all-time') {
        endpoint = '/leaderboards/all-time';
      } else if (activeBoard === 'archive') {
        endpoint = '/leaderboards/historical';
      }

      if (selectedCategory && selectedCategory !== 'all' && activeBoard !== 'archive') {
        endpoint = `/leaderboards/category/${selectedCategory}`;
      }

      const res = await apiClient.get(endpoint, {
        params: { limit: 50 },
      });

      const items = res.data?.data?.items || res.data?.data?.leaderboard || [];
      if (Array.isArray(items) && items.length > 0) {
        setLeaderboardItems(items);
      }
    } catch {
      // Fallback data remains active gracefully
    } finally {
      setIsLoading(false);
    }
  }, [activeBoard, selectedCategory]);

  useEffect(() => {
    fetchLeaderboard();
  }, [fetchLeaderboard]);

  const handleTabChange = (newTab: BoardType) => {
    setActiveBoard(newTab);
    const params = new URLSearchParams(searchParams?.toString() || '');
    params.set('tab', newTab);
    if (selectedCategory && selectedCategory !== 'all') {
      params.set('category', selectedCategory);
    }
    router.push(`/?${params.toString()}`);
  };

  const handleCategoryChange = (slug: string) => {
    setSelectedCategory(slug);
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (slug === 'all') {
      params.delete('category');
    } else {
      params.set('category', slug);
    }
    router.push(`/?${params.toString()}`);
  };

  // Top 3 Podium Products
  const podium = useMemo(() => {
    return {
      first: leaderboardItems.find((i) => i.rank === 1),
      second: leaderboardItems.find((i) => i.rank === 2),
      third: leaderboardItems.find((i) => i.rank === 3),
    };
  }, [leaderboardItems]);

  const runnersUp = useMemo(() => {
    return leaderboardItems.filter((i) => i.rank > 3);
  }, [leaderboardItems]);

  return (
    <div className="w-full max-w-full px-3.5 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-5 sm:space-y-6 min-w-0 overflow-x-hidden">
      {/* Top Banner & Board Controls Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 sm:pb-5 border-b border-border/80">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] sm:text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
              <Zap className="w-3 h-3 text-primary" />
              Pay-to-Rank Discovery
            </span>
            <span className="text-xs text-text-muted">·</span>
            <span className="text-[11px] sm:text-xs text-text-muted font-medium">$5.99 min initial entry</span>
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-text-primary tracking-tight">
            {activeBoard === 'today'
              ? "Today's Leaderboard"
              : activeBoard === 'all-time'
              ? 'All-Time Leaderboard'
              : 'Daily Archive'}
          </h1>
          <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-2xl">
            Rank is determined strictly by verified qualifying paid ranking amounts with midnight UTC resets.
          </p>
        </div>

        {/* Board Switcher Tabs & Live UTC Reset Counter */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="inline-flex items-center p-1 bg-surface border border-border rounded-xl">
            <button
              onClick={() => handleTabChange('today')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeBoard === 'today'
                  ? 'bg-primary text-white shadow-xs font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-sunken'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Today</span>
            </button>
            <button
              onClick={() => handleTabChange('all-time')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeBoard === 'all-time'
                  ? 'bg-primary text-white shadow-xs font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-sunken'
              }`}
            >
              <Award className="w-3.5 h-3.5" />
              <span>All-Time</span>
            </button>
            <button
              onClick={() => handleTabChange('archive')}
              className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeBoard === 'archive'
                  ? 'bg-primary text-white shadow-xs font-bold'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-sunken'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Archive</span>
            </button>
          </div>

          {/* UTC Midnight Reset Pill */}
          {activeBoard === 'today' && (
            <div className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-600 dark:text-amber-400 text-[11px] sm:text-xs font-semibold">
              <Clock className="w-3.5 h-3.5 animate-pulse" />
              <span>Reset in {utcCountdown}</span>
            </div>
          )}
        </div>
      </div>

      {/* Category Navigation Pills */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-2 scrollbar-none w-full max-w-full min-w-0">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat.slug;
          return (
            <button
              key={cat.slug}
              onClick={() => handleCategoryChange(cat.slug)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                isSelected
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface hover:bg-surface-sunken text-text-secondary hover:text-text-primary border border-border'
              }`}
            >
              {cat.name}
            </button>
          );
        })}
      </div>

      {/* Top 3 Podium (Visible when loading finishes and products exist) */}
      {!isLoading && podium.first && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {/* #2 Silver Runner Up */}
          {podium.second && (
            <div className="order-2 md:order-1 rounded-2xl p-5 bg-surface border border-slate-300/80 dark:border-slate-700/80 shadow-sm relative flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  <Medal className="w-3.5 h-3.5 text-slate-400" />
                  #2 Silver Rank
                </span>
                <span className="font-mono text-sm font-black text-slate-600 dark:text-slate-300">
                  {podium.second.formattedAmount || `$${podium.second.score.toFixed(2)}`}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  {podium.second.product.logoUrl && (
                    <img
                      src={podium.second.product.logoUrl}
                      alt={podium.second.product.name}
                      className="w-10 h-10 rounded-xl object-cover border border-border"
                    />
                  )}
                  <div>
                    <h3 className="font-bold text-sm text-text-primary truncate">
                      {podium.second.product.name}
                    </h3>
                    <span className="text-[11px] text-text-muted">
                      {typeof podium.second.product.category === 'object'
                        ? podium.second.product.category?.name
                        : podium.second.product.category}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                  {podium.second.product.tagline}
                </p>
              </div>
              <div className="pt-4 flex items-center justify-between border-t border-border/60 mt-3">
                <a
                  href={podium.second.product.websiteUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-text-muted hover:text-text-primary inline-flex items-center gap-1"
                >
                  <span>Visit</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={() =>
                    setSelectedProductForOutbid({
                      id: podium.second!.product.id || podium.second!.product._id || '',
                      name: podium.second!.product.name,
                      currentRank: 2,
                      amountCents: podium.second!.amountCents || Math.round(podium.second!.score * 100),
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-primary text-text-primary hover:text-primary text-xs font-semibold transition-colors"
                >
                  Outbid #2
                </button>
              </div>
            </div>
          )}

          {/* #1 Gold Champion */}
          <div className="order-1 md:order-2 rounded-2xl p-6 bg-gradient-to-b from-amber-500/10 via-surface to-surface border-2 border-amber-500/40 shadow-md relative flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                <Trophy className="w-4 h-4 text-amber-500" />
                #1 Champion
              </span>
              <span className="font-mono text-base font-black text-amber-500">
                {podium.first.formattedAmount || `$${podium.first.score.toFixed(2)}`}
              </span>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                {podium.first.product.logoUrl && (
                  <img
                    src={podium.first.product.logoUrl}
                    alt={podium.first.product.name}
                    className="w-12 h-12 rounded-xl object-cover border border-amber-500/30"
                  />
                )}
                <div>
                  <h3 className="font-extrabold text-base text-text-primary truncate">
                    {podium.first.product.name}
                  </h3>
                  <span className="text-xs text-amber-500 font-semibold">
                    {typeof podium.first.product.category === 'object'
                      ? podium.first.product.category?.name
                      : podium.first.product.category}
                  </span>
                </div>
              </div>
              <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                {podium.first.product.tagline}
              </p>
            </div>
            <div className="pt-4 flex items-center justify-between border-t border-border/60 mt-3">
              <a
                href={podium.first.product.websiteUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-text-muted hover:text-text-primary inline-flex items-center gap-1"
              >
                <span>Visit site</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
              <button
                onClick={() =>
                  setSelectedProductForOutbid({
                    id: podium.first!.product.id || podium.first!.product._id || '',
                    name: podium.first!.product.name,
                    currentRank: 1,
                    amountCents: podium.first!.amountCents || Math.round(podium.first!.score * 100),
                  })
                }
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-colors"
              >
                Claim #1 Rank
              </button>
            </div>
          </div>

          {/* #3 Bronze Rank */}
          {podium.third && (
            <div className="order-3 rounded-2xl p-5 bg-surface border border-amber-800/30 shadow-sm relative flex flex-col justify-between">
              <div className="flex items-center justify-between mb-3">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-700/10 text-amber-700 dark:text-amber-500">
                  <Award className="w-3.5 h-3.5 text-amber-700" />
                  #3 Bronze Rank
                </span>
                <span className="font-mono text-sm font-black text-amber-700 dark:text-amber-500">
                  {podium.third.formattedAmount || `$${podium.third.score.toFixed(2)}`}
                </span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  {podium.third.product.logoUrl && (
                    <img
                      src={podium.third.product.logoUrl}
                      alt={podium.third.product.name}
                      className="w-10 h-10 rounded-xl object-cover border border-border"
                    />
                  )}
                  <div>
                    <h3 className="font-bold text-sm text-text-primary truncate">
                      {podium.third.product.name}
                    </h3>
                    <span className="text-[11px] text-text-muted">
                      {typeof podium.third.product.category === 'object'
                        ? podium.third.product.category?.name
                        : podium.third.product.category}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-text-secondary line-clamp-2 leading-relaxed">
                  {podium.third.product.tagline}
                </p>
              </div>
              <div className="pt-4 flex items-center justify-between border-t border-border/60 mt-3">
                <a
                  href={podium.third.product.websiteUrl || '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-text-muted hover:text-text-primary inline-flex items-center gap-1"
                >
                  <span>Visit</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
                <button
                  onClick={() =>
                    setSelectedProductForOutbid({
                      id: podium.third!.product.id || podium.third!.product._id || '',
                      name: podium.third!.product.name,
                      currentRank: 3,
                      amountCents: podium.third!.amountCents || Math.round(podium.third!.score * 100),
                    })
                  }
                  className="px-3 py-1.5 rounded-lg bg-surface border border-border hover:border-primary text-text-primary hover:text-primary text-xs font-semibold transition-colors"
                >
                  Outbid #3
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Leaderboard Product List */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between px-2 text-xs font-bold uppercase tracking-wider text-text-muted">
          <span>Rank &amp; Product Details</span>
          <span>Paid Rank / Outbid</span>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="rounded-2xl border border-border bg-surface p-4 flex items-center gap-4 animate-pulse"
              >
                <div className="w-8 h-8 rounded-lg bg-surface-sunken" />
                <div className="w-12 h-12 rounded-xl bg-surface-sunken" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 rounded bg-surface-sunken" />
                  <div className="h-3 w-3/4 rounded bg-surface-sunken" />
                </div>
                <div className="w-20 h-8 rounded-lg bg-surface-sunken" />
              </div>
            ))}
          </div>
        ) : (
          leaderboardItems.map((item) => {
            const formatted = item.formattedAmount || `$${item.score.toFixed(2)}`;
            const isTop3 = item.rank <= 3;
            return (
              <div
                key={item.product.id || item.product._id || item.rank}
                className="group rounded-2xl bg-surface border border-border/80 hover:border-primary/50 hover:shadow-md transition-all duration-200 p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 min-w-0"
              >
                {/* Left Product Details */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-xl font-mono text-xs sm:text-sm font-black shrink-0 bg-surface-sunken border border-border text-text-secondary">
                    #{item.rank}
                  </div>
                  {item.product.logoUrl && (
                    <img
                      src={item.product.logoUrl}
                      alt={item.product.name}
                      className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-cover border border-border shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-bold text-sm text-text-primary truncate max-w-[160px] sm:max-w-none">
                        {item.product.name}
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold bg-surface-sunken text-text-muted border border-border shrink-0">
                        {typeof item.product.category === 'object'
                          ? item.product.category?.name
                          : item.product.category}
                      </span>
                    </div>
                    <p className="text-xs text-text-secondary line-clamp-1">
                      {item.product.tagline}
                    </p>
                  </div>
                </div>

                {/* Right Pay-to-Rank Actions */}
                <div className="flex items-center justify-between sm:justify-end gap-2.5 sm:gap-3 shrink-0 pt-2.5 sm:pt-0 border-t sm:border-t-0 border-border/40 w-full sm:w-auto">
                  <div className="text-left sm:text-right">
                    <span className="font-mono text-xs sm:text-sm font-black text-text-primary block">
                      {formatted}
                    </span>
                    <span className="text-[10px] text-text-muted font-medium">qualifying bid</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <a
                      href={item.product.websiteUrl || '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 sm:p-2 rounded-xl bg-surface-sunken hover:bg-border text-text-muted hover:text-text-primary transition-colors"
                      aria-label={`Visit ${item.product.name}`}
                    >
                      <ExternalLink className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </a>

                    <button
                      onClick={() =>
                        setSelectedProductForOutbid({
                          id: item.product.id || item.product._id || '',
                          name: item.product.name,
                          currentRank: item.rank,
                          amountCents: item.amountCents || Math.round(item.score * 100),
                        })
                      }
                      className="px-3 sm:px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Outbid</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Retained: "Join 1,200+ Innovative Founders" CTA Section */}
      <section className="mt-8 sm:mt-12 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-primary via-[#003cb3] to-[#001f5c] text-white p-5 sm:p-12 text-center relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/15 backdrop-blur-md border border-white/20 text-white">
            <Flame className="w-3.5 h-3.5 text-amber-300" />
            <span>Join 1,200+ Innovative Founders</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black tracking-tight leading-tight">
            Ready to Launch and Compete on the Paid Leaderboard?
          </h2>

          <p className="text-xs sm:text-sm text-indigo-100 max-w-lg mx-auto leading-relaxed">
            Submit your product once for permanent directory inclusion. Start with a $5.99 minimum qualifying payment to establish your All-Time rank and compete on today’s daily board.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/submit"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-primary font-bold text-xs sm:text-sm transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-2"
            >
              <span>Submit &amp; Rank Your Product ($5.99)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/rules"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm border border-white/20 transition-all flex items-center justify-center gap-2"
            >
              <span>Read Ranking Rules</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Interactive Outbid Modal */}
      {selectedProductForOutbid && (
        <OutbidModal
          isOpen={true}
          onClose={() => setSelectedProductForOutbid(null)}
          productId={selectedProductForOutbid.id}
          productName={selectedProductForOutbid.name}
          currentRank={selectedProductForOutbid.currentRank}
          currentAmountCents={selectedProductForOutbid.amountCents}
        />
      )}
    </div>
  );
}
