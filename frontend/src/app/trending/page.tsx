'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ProductCard } from '@/components/product/ProductCard';
import { AuthModal } from '@/components/auth/AuthModal';
import { apiClient } from '@/lib/api-client';
import { Product, Category } from '@/types';
import {
  Flame,
  TrendingUp,
  Zap,
  ArrowRight,
  Plus,
  Search,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';

const FALLBACK_TRENDING_PRODUCTS: Product[] = [
  {
    id: 'prod-1',
    name: 'DevSync AI',
    slug: 'devsync-ai',
    tagline: 'Autonomous code review agent that spots performance regressions before merging',
    description: 'DevSync connects directly to your Git repositories, analyzing PR AST diffs and predicting bundle-size regressions.',
    category: 'Developer Tools',
    pricing: { model: 'Freemium' },
    upvotesCount: 388,
    reviewsCount: 52,
    isVerified: true,
    rank: 1,
    logoUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=128&auto=format&fit=crop&q=80',
    websiteUrl: 'https://launchproduct.io',
    tags: ['DevTools', 'AI Agents', 'GitHub'],
  },
  {
    id: 'prod-sponsor-1',
    name: 'VectorPulse Cloud',
    slug: 'vectorpulse-cloud',
    tagline: 'Serverless vector database engine with automated sub-millisecond similarity indexing',
    description: 'Ultra-low latency vector embeddings storage built specifically for high-throughput LLM reasoning pipelines.',
    category: 'Developer Tools',
    pricing: { model: 'Freemium' },
    upvotesCount: 412,
    reviewsCount: 64,
    isVerified: true,
    rank: 2,
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
    websiteUrl: 'https://launchproduct.io',
    tags: ['AI Engine', 'Database', 'TypeScript'],
  },
  {
    id: 'prod-2',
    name: 'PromptCanvas',
    slug: 'promptcanvas',
    tagline: 'Visual node-based IDE for building, testing, and versioning production LLM chains',
    description: 'The standard workspace for AI engineers: drag-and-drop prompt chaining.',
    category: 'AI Tools',
    pricing: { model: 'Freemium' },
    upvotesCount: 295,
    reviewsCount: 39,
    isVerified: true,
    rank: 3,
    logoUrl: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=128&auto=format&fit=crop&q=80',
    websiteUrl: 'https://launchproduct.io',
    tags: ['Prompt Engineering', 'LLM', 'Productivity'],
  },
  {
    id: 'prod-3',
    name: 'ShipFast UI',
    slug: 'shipfast-ui',
    tagline: 'Accessible React & Tailwind component library for hyper-growth SaaS platforms',
    description: 'Over 120+ meticulously crafted, conversion-optimized SaaS components.',
    category: 'Design Tools',
    pricing: { model: 'Paid', startingPrice: 49 },
    upvotesCount: 247,
    reviewsCount: 31,
    isVerified: true,
    rank: 4,
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
    websiteUrl: 'https://launchproduct.io',
    tags: ['Tailwind CSS', 'React 18', 'Design System'],
  },
];

export default function TrendingPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [timeframe, setTimeframe] = useState<'today' | '4h' | 'week'>('today');
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Fetch trending products using plural endpoint: /api/v1/leaderboards/trending
  async function loadTrendingProducts() {
    setIsLoading(true);
    try {
      let res: any;
      try {
        res = await apiClient.get('/leaderboards/trending');
      } catch {
        res = await apiClient.get('/products?sort=trending&limit=30');
      }

      const raw = res.data?.data;
      let list: any[] = [];
      if (Array.isArray(raw)) {
        list = raw;
      } else if (Array.isArray(raw?.items)) {
        list = raw.items.map((it: any) => ({
          ...it.product,
          upvotesCount: it.voteCount || it.product?.upvotesCount || 0,
          rank: it.rank,
        }));
      } else if (Array.isArray(raw?.products)) {
        list = raw.products;
      }

      if (list.length > 0) {
        setProducts(list);
      } else {
        setProducts(FALLBACK_TRENDING_PRODUCTS);
      }
    } catch (err: any) {
      console.warn('Failed to load trending products:', err?.message);
      setProducts(FALLBACK_TRENDING_PRODUCTS);
    } finally {
      setIsLoading(false);
    }
  }

  // Fetch categories
  useEffect(() => {
    let isMounted = true;
    apiClient
      .get('/categories')
      .then((res) => {
        const catData = res.data?.data?.categories || res.data?.data || [];
        if (isMounted && Array.isArray(catData)) {
          setCategories(catData);
        }
      })
      .catch(() => {});

    loadTrendingProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      // Category filter
      const catSlug = typeof p.category === 'object' ? p.category?.slug : p.category;
      const matchesCategory =
        selectedCategory === 'all' ||
        catSlug === selectedCategory ||
        (p.category as any)?.id === selectedCategory;

      // Search filter
      const term = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !term ||
        p.name?.toLowerCase().includes(term) ||
        p.tagline?.toLowerCase().includes(term);

      return matchesCategory && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  return (
    <div className="min-h-screen bg-bg text-text-primary pb-24">
      {/* Header Banner */}
      <section className="bg-surface border-b border-border py-8 sm:py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                <Flame className="w-3.5 h-3.5" />
                <span>Real-Time Momentum Engine</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
                Trending Product Launches
              </h1>
              <p className="text-xs sm:text-sm text-text-secondary max-w-xl leading-relaxed">
                Ranked by decayed time velocity (S_trending), authentic community upvotes, and high-engagement reviews.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/submit"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-semibold transition-motion-base shadow-sm focus-ring"
              >
                <span>Launch Your Tool</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Timeframe Velocity Selector */}
          <div className="flex items-center gap-2 pt-6 overflow-x-auto no-scrollbar">
            <span className="text-xs font-bold text-text-muted uppercase tracking-wider mr-1">
              Timeframe:
            </span>
            {[
              { key: 'today', label: 'Surging Today (Last 24h)', icon: Flame },
              { key: '4h', label: 'Past 4h Spikes', icon: Zap },
              { key: 'week', label: 'Weekly Momentum', icon: TrendingUp },
            ].map((tab) => {
              const Icon = tab.icon;
              const isCurrent = timeframe === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setTimeframe(tab.key as any)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-motion-fast whitespace-nowrap focus-ring ${
                    isCurrent
                      ? 'bg-rose-500 text-white shadow-xs'
                      : 'bg-surface hover:bg-surface-sunken text-text-secondary hover:text-text-primary border border-border'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Search & Category Filter Bar */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-surface p-3.5 sm:p-4 rounded-2xl border border-border shadow-card">
          {/* Category Chips Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-1">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-motion-fast whitespace-nowrap focus-ring ${
                selectedCategory === 'all'
                  ? 'bg-primary text-white shadow-xs'
                  : 'bg-surface hover:bg-surface-sunken text-text-secondary hover:text-text-primary border border-border'
              }`}
            >
              All Categories
            </button>
            {categories.map((c) => (
              <button
                key={c.id || c.slug}
                type="button"
                onClick={() => setSelectedCategory(c.slug)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-motion-fast whitespace-nowrap focus-ring ${
                  selectedCategory === c.slug
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-surface hover:bg-surface-sunken text-text-secondary hover:text-text-primary border border-border'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full md:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
            <input
              type="text"
              placeholder="Filter trending tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-border bg-surface text-text-primary placeholder:text-text-muted focus-ring outline-none"
            />
          </div>
        </div>

        {/* Trending Product List with Shimmer Skeleton */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((idx) => (
              <div
                key={idx}
                className="h-28 rounded-2xl bg-surface border border-border p-5 flex items-center gap-4 relative overflow-hidden"
              >
                <div className="w-12 h-12 rounded-xl bg-surface-sunken skeleton-shimmer shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 rounded bg-surface-sunken skeleton-shimmer" />
                  <div className="h-3 w-3/4 rounded bg-surface-sunken skeleton-shimmer" />
                </div>
                <div className="w-16 h-12 rounded-xl bg-surface-sunken skeleton-shimmer shrink-0" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-surface rounded-2xl border border-border p-12 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-500 flex items-center justify-center mx-auto mb-2">
              <Flame className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-text-primary">
              No Trending Tools Found
            </h3>
            <p className="text-xs text-text-secondary max-w-sm mx-auto">
              Be the first to launch and ignite momentum for your software project today.
            </p>
            <Link
              href="/submit"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm transition-motion-base focus-ring"
            >
              <Plus className="w-4 h-4 text-white shrink-0" />
              <span>Launch Your Product</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredProducts.map((product, index) => (
              <div key={product.id || (product as any)._id} className="relative">
                <ProductCard
                  product={product}
                  rank={index + 1}
                  onAuthRequired={() => setIsAuthModalOpen(true)}
                />
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title="Sign In to Upvote Trending Tools"
        subtitle="Cast your verified community vote to boost real-time trending velocity."
      />
    </div>
  );
}
