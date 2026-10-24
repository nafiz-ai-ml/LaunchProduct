'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { sanitizeImageUrl } from '@/lib/safe-url';
import { OutbidModal } from '@/components/leaderboard/OutbidModal';
import {
  Trophy,
  Medal,
  Award,
  Calendar,
  Clock,
  ExternalLink,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  Sparkles,
  ArrowRight,
  RefreshCw,
  Info,
  Zap,
  Globe,
  SlidersHorizontal,
  ChevronDown,
  Layers,
  History,
  DollarSign,
} from 'lucide-react';

export type BoardType = 'today' | 'all-time' | 'category' | 'archive';

interface LeaderboardItemData {
  rank: number;
  score: number;
  amountCents?: number;
  formattedAmount?: string;
  voteCount: number;
  organicClicks?: number;
  isHistoricalSnapshot?: boolean;
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
    pricing?: {
      model?: string;
      startingPrice?: number;
      currency?: string;
    };
    category?: {
      name?: string;
      slug?: string;
    } | string;
    websiteUrl?: string;
    canonicalDomain?: string;
    launchDate?: string;
  };
}

const MVP_CATEGORIES = [
  { name: 'All Categories', slug: 'all' },
  { name: 'AI Tools', slug: 'ai-tools' },
  { name: 'AI Agents', slug: 'ai-agents' },
  { name: 'SaaS', slug: 'saas' },
  { name: 'Developer Tools', slug: 'developer-tools' },
  { name: 'Productivity', slug: 'productivity' },
  { name: 'Marketing Tools', slug: 'marketing-tools' },
  { name: 'SEO Tools', slug: 'seo-tools' },
  { name: 'Design Tools', slug: 'design-tools' },
];

const FALLBACK_PAY_TO_RANK_ITEMS: LeaderboardItemData[] = [
  {
    rank: 1,
    score: 120.0,
    amountCents: 12000,
    formattedAmount: '$120.00',
    voteCount: 412,
    organicClicks: 840,
    product: {
      id: 'prod-sponsor-1',
      name: 'VectorPulse Cloud',
      slug: 'vectorpulse-cloud',
      tagline: 'Serverless vector database engine with automated sub-millisecond similarity indexing',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
      pricing: { model: 'Freemium' },
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
    organicClicks: 710,
    product: {
      id: 'prod-1',
      name: 'DevSync AI',
      slug: 'devsync-ai',
      tagline: 'Autonomous code review agent that spots performance regressions before merging',
      logoUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=128&auto=format&fit=crop&q=80',
      pricing: { model: 'Freemium' },
      category: 'Developer Tools',
      websiteUrl: 'https://devsync.ai',
      canonicalDomain: 'devsync.ai',
    },
  },
  {
    rank: 3,
    score: 55.0,
    amountCents: 5500,
    formattedAmount: '$55.00',
    voteCount: 295,
    organicClicks: 520,
    product: {
      id: 'prod-2',
      name: 'PromptCanvas',
      slug: 'promptcanvas',
      tagline: 'Visual node-based IDE for building, testing, and versioning production LLM chains',
      logoUrl: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=128&auto=format&fit=crop&q=80',
      pricing: { model: 'Freemium' },
      category: 'AI Tools',
      websiteUrl: 'https://promptcanvas.io',
      canonicalDomain: 'promptcanvas.io',
    },
  },
  {
    rank: 4,
    score: 35.0,
    amountCents: 3500,
    formattedAmount: '$35.00',
    voteCount: 247,
    organicClicks: 390,
    product: {
      id: 'prod-3',
      name: 'ShipFast UI',
      slug: 'shipfast-ui',
      tagline: 'Accessible React & Tailwind component library for hyper-growth SaaS platforms',
      logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
      pricing: { model: 'Paid', startingPrice: 49 },
      category: 'Design Tools',
      websiteUrl: 'https://shipfastui.com',
      canonicalDomain: 'shipfastui.com',
    },
  },
  {
    rank: 5,
    score: 25.0,
    amountCents: 2500,
    formattedAmount: '$25.00',
    voteCount: 184,
    organicClicks: 260,
    product: {
      id: 'prod-4',
      name: 'AuditShield',
      slug: 'auditshield',
      tagline: 'Zero-trust API key scanner and cryptographic secret rotation service',
      logoUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=128&auto=format&fit=crop&q=80',
      pricing: { model: 'Open Source' },
      category: 'Developer Tools',
      websiteUrl: 'https://auditshield.dev',
      canonicalDomain: 'auditshield.dev',
    },
  },
];

export default function LeaderboardPage() {
  const getTodayUtcString = () => new Date().toISOString().split('T')[0];
  const todayStr = useMemo(() => getTodayUtcString(), []);

  // Board State
  const [activeBoard, setActiveBoard] = useState<BoardType>('today');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const [items, setItems] = useState<LeaderboardItemData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [outbidModalOpen, setOutbidModalOpen] = useState(false);
  const [outbidTarget, setOutbidTarget] = useState<{
    id: string;
    name: string;
    slug: string;
    rank?: number;
    amountCents?: number;
    logoUrl?: string;
  } | null>(null);

  // Live countdown to midnight UTC
  const [countdown, setCountdown] = useState({
    hours: '00',
    minutes: '00',
    seconds: '00',
    formatted: '00h 00m 00s',
  });

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const nextMidnightUtc = new Date(
        Date.UTC(
          now.getUTCFullYear(),
          now.getUTCMonth(),
          now.getUTCDate() + 1,
          0,
          0,
          0,
          0
        )
      );
      const diffMs = Math.max(0, nextMidnightUtc.getTime() - now.getTime());
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      setCountdown({
        hours: String(hours).padStart(2, '0'),
        minutes: String(minutes).padStart(2, '0'),
        seconds: String(seconds).padStart(2, '0'),
        formatted: `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`,
      });
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch Leaderboard based on activeBoard & filters
  const fetchBoardData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let endpoint = '/leaderboards/today';
      let params: Record<string, string> = {};

      if (activeBoard === 'today') {
        endpoint = '/leaderboards/today';
      } else if (activeBoard === 'all-time') {
        endpoint = '/leaderboards/all-time';
      } else if (activeBoard === 'category') {
        if (selectedCategory && selectedCategory !== 'all') {
          endpoint = `/leaderboards/category/${selectedCategory}`;
        } else {
          endpoint = '/leaderboards/all-time';
        }
      } else if (activeBoard === 'archive') {
        endpoint = `/leaderboards/daily/${selectedDate}`;
      }

      const res = await apiClient.get(endpoint, { params });
      if (res.data?.data?.items && Array.isArray(res.data.data.items)) {
        if (res.data.data.items.length > 0) {
          setItems(res.data.data.items);
        } else {
          // If board has no records yet (e.g. today just reset), show benchmark dataset
          setItems(FALLBACK_PAY_TO_RANK_ITEMS);
        }
      } else {
        setItems(FALLBACK_PAY_TO_RANK_ITEMS);
      }
    } catch {
      // Fallback on network or cold server
      setItems(FALLBACK_PAY_TO_RANK_ITEMS);
    } finally {
      setIsLoading(false);
    }
  }, [activeBoard, selectedCategory, selectedDate]);

  useEffect(() => {
    fetchBoardData();
  }, [fetchBoardData]);

  // Open Outbid Modal for a specific product
  const handleOpenOutbid = (productItem?: LeaderboardItemData) => {
    if (productItem) {
      setOutbidTarget({
        id: productItem.product.id || productItem.product._id || '',
        name: productItem.product.name,
        slug: productItem.product.slug,
        rank: productItem.rank,
        amountCents: productItem.amountCents || Math.round(productItem.score * 100),
        logoUrl: productItem.product.logoUrl,
      });
    } else {
      setOutbidTarget(null);
    }
    setOutbidModalOpen(true);
  };

  const top1 = items.find((i) => i.rank === 1);
  const top2 = items.find((i) => i.rank === 2);
  const top3 = items.find((i) => i.rank === 3);
  const remainingItems = items.filter((i) => i.rank > 3);

  const getProductLogo = (product: LeaderboardItemData['product']) =>
    sanitizeImageUrl(product.logoUrl || product.media?.logoUrl, '/brand/icon.svg');

  const getCategoryName = (product: LeaderboardItemData['product']) => {
    if (typeof product.category === 'object' && product.category !== null) {
      return product.category.name || 'Software';
    }
    return product.category || 'Productivity';
  };

  return (
    <div className="min-h-screen bg-background text-text-primary pb-20">
      {/* Hero Header */}
      <div className="relative border-b border-border bg-gradient-to-b from-primary/5 via-surface to-background pt-12 pb-8 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold tracking-wide uppercase">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span>Pay-to-Rank Discovery Platform</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-text-primary">
            The Commercial Leaderboard for Builders
          </h1>

          <p className="text-sm sm:text-base text-text-muted max-w-2xl mx-auto leading-relaxed">
            Positions are established strictly by verified qualifying paid ranking amounts.
            Transparent, competitive product discovery with midnight UTC daily resets.
          </p>

          {/* Transparent Commercial Disclosure Banner */}
          <div className="max-w-3xl mx-auto mt-4 p-3 rounded-xl bg-surface-sunken border border-border text-xs text-text-muted flex items-center justify-between flex-wrap gap-2 text-left">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-500 flex-shrink-0" />
              <span>
                <strong>Commercial Transparency:</strong> Rankings reflect commercial payments, not editorial endorsements. Community votes remain independent social validation.
              </span>
            </div>
            <Link href="/terms" className="text-primary font-semibold hover:underline flex items-center gap-1">
              Read Policy <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {/* Live UTC Countdown Ticker */}
          <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-surface border border-border shadow-2xs mt-2">
            <Clock className="w-4 h-4 text-primary animate-pulse" />
            <span className="text-xs text-text-muted font-medium">Next UTC Midnight Reset:</span>
            <span className="font-mono text-sm font-bold text-primary">{countdown.formatted}</span>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 space-y-8">
        {/* Navigation Tabs & Board Selectors */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border pb-4">
          {/* Main 4 Board Tabs */}
          <div className="flex items-center gap-1 bg-surface-sunken p-1 rounded-xl border border-border w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveBoard('today')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeBoard === 'today'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>Today's Board</span>
            </button>

            <button
              onClick={() => setActiveBoard('all-time')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeBoard === 'all-time'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>All-Time</span>
            </button>

            <button
              onClick={() => setActiveBoard('category')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeBoard === 'category'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Categories</span>
            </button>

            <button
              onClick={() => setActiveBoard('archive')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${
                activeBoard === 'archive'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Daily Archive</span>
            </button>
          </div>

          {/* Action / Context Controls */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {activeBoard === 'category' && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-surface border border-border rounded-xl px-3 py-1.5 text-xs text-text-primary font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                {MVP_CATEGORIES.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            )}

            {activeBoard === 'archive' && (
              <input
                type="date"
                value={selectedDate}
                max={todayStr}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-surface border border-border rounded-xl px-3 py-1.5 text-xs text-text-primary font-mono focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
              </input>
            )}

            <button
              onClick={() => handleOpenOutbid()}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300" />
              <span>Outbid & Rank Up</span>
            </button>
          </div>
        </div>

        {/* Top 3 Podium (Gold, Silver, Bronze) */}
        {!isLoading && items.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            {/* Rank 2 - Silver */}
            {top2 && (
              <div className="order-2 md:order-1 bg-surface border border-border rounded-2xl p-5 shadow-card hover:shadow-hover transition-all flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 bg-slate-300 dark:bg-slate-700 text-slate-800 dark:text-slate-200 px-3 py-1 rounded-bl-xl text-xs font-mono font-bold flex items-center gap-1">
                  <Medal className="w-3.5 h-3.5" /> #2 Silver
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={getProductLogo(top2.product)}
                      alt={top2.product.name}
                      className="w-12 h-12 rounded-xl object-cover border border-border"
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/products/${top2.product.slug}`}
                        className="font-bold text-text-primary hover:text-primary transition-colors text-base truncate block"
                      >
                        {top2.product.name}
                      </Link>
                      <span className="text-xs text-text-muted">{getCategoryName(top2.product)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
                    {top2.product.tagline}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-text-muted uppercase font-semibold">Rank Paid Amount</span>
                    <div className="font-mono text-lg font-extrabold text-text-primary">
                      {top2.formattedAmount || `$${(top2.score).toFixed(2)}`}
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenOutbid(top2)}
                    className="px-3 py-1.5 rounded-lg bg-surface-sunken hover:bg-primary hover:text-white border border-border text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <span>Outbid</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}

            {/* Rank 1 - Gold (Centered & Elevated) */}
            {top1 && (
              <div className="order-1 md:order-2 bg-gradient-to-b from-amber-500/10 via-surface to-surface border-2 border-amber-500/40 rounded-2xl p-6 shadow-xl relative overflow-hidden flex flex-col justify-between scale-100 md:-translate-y-2">
                <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-1.5 rounded-bl-xl text-xs font-mono font-extrabold flex items-center gap-1.5 shadow-sm">
                  <Trophy className="w-4 h-4 fill-amber-200" /> #1 Champion
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3.5">
                    <img
                      src={getProductLogo(top1.product)}
                      alt={top1.product.name}
                      className="w-14 h-14 rounded-xl object-cover border-2 border-amber-500/30 shadow-md"
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/products/${top1.product.slug}`}
                        className="font-extrabold text-text-primary hover:text-primary transition-colors text-lg truncate block"
                      >
                        {top1.product.name}
                      </Link>
                      <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                        {getCategoryName(top1.product)}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-text-muted line-clamp-3 leading-relaxed">
                    {top1.product.tagline}
                  </p>
                </div>

                <div className="pt-4 mt-5 border-t border-amber-500/20 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 uppercase font-bold tracking-wider">
                      Current Top Bid
                    </span>
                    <div className="font-mono text-2xl font-black text-text-primary">
                      {top1.formattedAmount || `$${(top1.score).toFixed(2)}`}
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenOutbid(top1)}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold shadow-md transition-all flex items-center gap-1.5"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Outbid #1</span>
                  </button>
                </div>
              </div>
            )}

            {/* Rank 3 - Bronze */}
            {top3 && (
              <div className="order-3 bg-surface border border-border rounded-2xl p-5 shadow-card hover:shadow-hover transition-all flex flex-col justify-between relative overflow-hidden group">
                <div className="absolute top-0 right-0 bg-amber-700/20 text-amber-700 dark:text-amber-400 px-3 py-1 rounded-bl-xl text-xs font-mono font-bold flex items-center gap-1">
                  <Medal className="w-3.5 h-3.5" /> #3 Bronze
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={getProductLogo(top3.product)}
                      alt={top3.product.name}
                      className="w-12 h-12 rounded-xl object-cover border border-border"
                    />
                    <div className="min-w-0">
                      <Link
                        href={`/products/${top3.product.slug}`}
                        className="font-bold text-text-primary hover:text-primary transition-colors text-base truncate block"
                      >
                        {top3.product.name}
                      </Link>
                      <span className="text-xs text-text-muted">{getCategoryName(top3.product)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-text-muted line-clamp-2 leading-relaxed">
                    {top3.product.tagline}
                  </p>
                </div>

                <div className="pt-4 mt-4 border-t border-border flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-text-muted uppercase font-semibold">Rank Paid Amount</span>
                    <div className="font-mono text-lg font-extrabold text-text-primary">
                      {top3.formattedAmount || `$${(top3.score).toFixed(2)}`}
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenOutbid(top3)}
                    className="px-3 py-1.5 rounded-lg bg-surface-sunken hover:bg-primary hover:text-white border border-border text-xs font-bold transition-all flex items-center gap-1"
                  >
                    <span>Outbid</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Leaderboard Table (Ranks 4..N) */}
        <div className="bg-surface border border-border rounded-2xl shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-border bg-surface-sunken/40 flex items-center justify-between">
            <h3 className="font-bold text-sm text-text-primary flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>Rankings #4 and Beyond</span>
            </h3>
            <span className="text-xs text-text-muted font-mono">{items.length} products listed</span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-text-muted space-y-3">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto text-primary" />
              <p className="text-sm">Updating Pay-to-Rank leaderboard...</p>
            </div>
          ) : remainingItems.length > 0 ? (
            <div className="divide-y divide-border">
              {remainingItems.map((item) => (
                <div
                  key={item.product.id || item.product._id || item.rank}
                  className="p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-surface-sunken/50 transition-colors group"
                >
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    {/* Rank Badge */}
                    <div className="w-8 text-center flex-shrink-0 font-mono text-sm font-bold text-text-muted group-hover:text-primary transition-colors">
                      #{item.rank}
                    </div>

                    {/* Logo */}
                    <Link
                      href={`/products/${item.product.slug}`}
                      className="flex-shrink-0 relative focus-ring rounded-xl"
                    >
                      <img
                        src={getProductLogo(item.product)}
                        alt={item.product.name}
                        className="w-11 h-11 rounded-xl object-cover border border-border"
                      />
                    </Link>

                    {/* Info */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          href={`/products/${item.product.slug}`}
                          className="font-bold text-text-primary hover:text-primary transition-colors text-sm truncate"
                        >
                          {item.product.name}
                        </Link>
                        <span className="text-[11px] font-medium text-text-muted bg-surface-sunken px-2 py-0.5 rounded-md border border-border">
                          {getCategoryName(item.product)}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted line-clamp-1 mt-0.5">
                        {item.product.tagline}
                      </p>
                    </div>
                  </div>

                  {/* Bid Amount & Action */}
                  <div className="flex items-center gap-3 sm:gap-6 flex-shrink-0">
                    <div className="text-right">
                      <div className="font-mono font-extrabold text-sm text-text-primary">
                        {item.formattedAmount || `$${item.score.toFixed(2)}`}
                      </div>
                      <div className="text-[10px] text-text-muted uppercase">Qualifying Amount</div>
                    </div>

                    <button
                      onClick={() => handleOpenOutbid(item)}
                      className="px-3.5 py-2 rounded-xl bg-surface-sunken hover:bg-primary hover:text-white border border-border text-xs font-bold transition-all flex items-center gap-1 shadow-2xs"
                    >
                      <Zap className="w-3.5 h-3.5 text-amber-500 group-hover:text-amber-300" />
                      <span className="hidden sm:inline">Outbid</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-text-muted">
              <p className="text-sm font-medium">No further ranked products in this category yet.</p>
              <button
                onClick={() => handleOpenOutbid()}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-sm"
              >
                Be the first to claim a rank position
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Outbid Modal */}
      <OutbidModal
        isOpen={outbidModalOpen}
        onClose={() => setOutbidModalOpen(false)}
        targetProduct={outbidTarget}
      />
    </div>
  );
}
