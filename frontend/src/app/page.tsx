'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { ProductCard } from '@/components/product/ProductCard';
import { AuthModal } from '@/components/auth/AuthModal';
import { CustomSelect } from '@/components/ui/CustomSelect';
import { LandingSections } from '@/components/home/LandingSections';
import { apiClient } from '@/lib/api-client';
import { Product, Category } from '@/types';
import {
  Flame,
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingUp,
  Award,
  Layers,
  Search,
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  Plus,
} from 'lucide-react';

const FALLBACK_CATEGORIES = [
  'All Launches',
  'AI Tools',
  'AI Agents',
  'SaaS',
  'Developer Tools',
  'Productivity',
  'Marketing Tools',
  'SEO Tools',
  'Design Tools',
];

const INITIAL_FALLBACK_PRODUCTS: Product[] = [
  {
    id: 'prod-sponsor-1',
    name: 'VectorPulse Cloud',
    slug: 'vectorpulse-cloud',
    tagline: 'Serverless vector database engine with automated sub-millisecond similarity indexing',
    description: 'Ultra-low latency vector embeddings storage built specifically for high-throughput LLM reasoning pipelines and autonomous agents.',
    category: 'Developer Tools',
    pricing: { model: 'Freemium' },
    upvotesCount: 412,
    reviewsCount: 64,
    isVerified: true,
    isSponsored: true,
    sponsorTier: 'LAUNCH_BOOST',
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
    websiteUrl: 'https://launchproduct.io',
    tags: ['AI Engine', 'Database', 'TypeScript'],
  },
  {
    id: 'prod-1',
    name: 'DevSync AI',
    slug: 'devsync-ai',
    tagline: 'Autonomous code review agent that spots performance regressions before merging',
    description: 'DevSync connects directly to your Git repositories, analyzing PR AST diffs and predicting bundle-size regressions, SQL N+1 bugs, and memory leaks.',
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
    id: 'prod-2',
    name: 'PromptCanvas',
    slug: 'promptcanvas',
    tagline: 'Visual node-based IDE for building, testing, and versioning production LLM chains',
    description: 'The standard workspace for AI engineers: drag-and-drop prompt chaining, real-time token economics inspection, and automated unit testing suites.',
    category: 'AI Tools',
    pricing: { model: 'Freemium' },
    upvotesCount: 295,
    reviewsCount: 39,
    isVerified: true,
    rank: 2,
    logoUrl: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=128&auto=format&fit=crop&q=80',
    websiteUrl: 'https://launchproduct.io',
    tags: ['Prompt Engineering', 'LLM', 'Productivity'],
  },
  {
    id: 'prod-3',
    name: 'ShipFast UI',
    slug: 'shipfast-ui',
    tagline: 'Accessible React & Tailwind component library for hyper-growth SaaS platforms',
    description: 'Over 120+ meticulously crafted, conversion-optimized SaaS components with dark mode, full keyboard navigation, and seamless Figma synchronization.',
    category: 'Design Tools',
    pricing: { model: 'Paid', startingPrice: 49 },
    upvotesCount: 247,
    reviewsCount: 31,
    isVerified: true,
    rank: 3,
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
    websiteUrl: 'https://launchproduct.io',
    tags: ['Tailwind CSS', 'React 18', 'Design System'],
  },
  {
    id: 'prod-4',
    name: 'AuditShield',
    slug: 'auditshield',
    tagline: 'Zero-trust API key scanner and cryptographic secret rotation service',
    description: 'Continuous runtime secret detection preventing accidental leaks in commit histories, CI/CD logs, Docker containers, and Slack webhooks.',
    category: 'Developer Tools',
    pricing: { model: 'Open Source' },
    upvotesCount: 184,
    reviewsCount: 22,
    isVerified: false,
    rank: 4,
    logoUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=128&auto=format&fit=crop&q=80',
    websiteUrl: 'https://launchproduct.io',
    tags: ['Cybersecurity', 'DevSecOps', 'Open Source'],
  },
  {
    id: 'prod-5',
    name: 'MetricFlow',
    slug: 'metricflow',
    tagline: 'Real-time revenue attribution and churn prediction for subscription founders',
    description: 'Direct webhook integration with Stripe and Paddle providing instant cohort retention analytics and churn risk early warnings.',
    category: 'SaaS',
    pricing: { model: 'Freemium' },
    upvotesCount: 162,
    reviewsCount: 19,
    isVerified: true,
    rank: 5,
    logoUrl: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=128&auto=format&fit=crop&q=80',
    websiteUrl: 'https://launchproduct.io',
    tags: ['SaaS Metrics', 'Paddle', 'Growth'],
  },
];

export default function HomePage() {
  const [products, setProducts] = useState<Product[]>(INITIAL_FALLBACK_PRODUCTS);
  const [categories, setCategories] = useState<string[]>(FALLBACK_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string>('All Launches');
  const [activeTab, setActiveTab] = useState<'today' | 'yesterday' | 'week'>('today');
  const [sortBy, setSortBy] = useState<'trending' | 'top' | 'newest'>('trending');
  const [isLoading, setIsLoading] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Fetch real categories and products from live Express REST API
  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setIsLoading(true);
        // Load categories
        try {
          const catRes = await apiClient.get('/categories');
          const catItems: Category[] = catRes.data?.data || [];
          if (isMounted && catItems.length > 0) {
            setCategories(['All Launches', ...catItems.map((c) => c.name)]);
          }
        } catch {
          // fallback stays
        }

        // Load products
        const params: any = { limit: 25 };
        if (sortBy === 'trending') params.sortBy = 'trending';
        if (sortBy === 'top') params.sortBy = 'top';
        if (sortBy === 'newest') params.sortBy = 'newest';

        const prodRes = await apiClient.get('/products', { params });
        const fetchedProducts: Product[] = prodRes.data?.data?.products || prodRes.data?.data || [];

        if (isMounted && fetchedProducts.length > 0) {
          setProducts(fetchedProducts);
        }
      } catch {
        // Fallback initialized data stays active
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [sortBy]);

  // Filter products by selected category and active timeframe
  const filteredProducts = useMemo(() => {
    return products.filter((item) => {
      const categoryName =
        typeof item.category === 'object' && item.category !== null
          ? (item.category as any).name
          : item.category;

      const matchesCategory =
        selectedCategory === 'All Launches' ||
        categoryName?.toLowerCase() === selectedCategory.toLowerCase();

      let matchesTimeframe = true;
      if (item.createdAt) {
        const itemDate = new Date(item.createdAt);
        const now = new Date();
        const diffMs = now.getTime() - itemDate.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (activeTab === 'today') {
          matchesTimeframe = diffDays <= 1;
        } else if (activeTab === 'yesterday') {
          matchesTimeframe = diffDays > 1 && diffDays <= 2;
        } else if (activeTab === 'week') {
          matchesTimeframe = diffDays <= 7;
        }
      }

      return matchesCategory && matchesTimeframe;
    });
  }, [products, selectedCategory, activeTab]);

  // Separate Discovery Engines: Top Sponsored vs Organic Feed
  const sponsoredProduct = useMemo(
    () => filteredProducts.find((p) => p.isSponsored),
    [filteredProducts]
  );

  const organicProducts = useMemo(
    () => filteredProducts.filter((p) => !p.isSponsored),
    [filteredProducts]
  );

  return (
    <div className="bg-bg text-text-primary flex flex-col font-sans selection:bg-primary selection:text-white">
      {/* Main Container */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 w-full">
        {/* Marketplace Hero Banner / Value Prop (Compact, High-Signal) */}
        <section className="relative rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-secondary p-6 sm:p-8 text-white shadow-card overflow-hidden mb-8 border border-slate-800">
          <div className="absolute -right-10 -bottom-10 w-80 h-80 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
          <div className="relative z-10 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/20 text-blue-300 border border-blue-500/30 mb-3">
              <Flame className="w-3.5 h-3.5 text-blue-400" />
              <span>Today&apos;s Featured Product Discovery</span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-white leading-tight">
              Where High-Integrity <span className="text-blue-400">Products Launch</span> &amp; Grow
            </h1>

            <p className="mt-2.5 text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl">
              Discover vetted AI tools, developer utilities, and indie SaaS startups. Ranked by authentic community engagement with multi-signal anti-fraud protection.
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-4">
              <Link
                href="/submit"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs sm:text-sm font-semibold shadow-sm transition-motion-base focus-ring"
              >
                <span>Launch Your Product</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <div className="flex items-center gap-4 text-xs text-slate-300">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Anti-Fraud Verified
                </span>
                <span className="flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-amber-400" />
                  Dual-Engine Discovery
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Category Navigation Pills (Horizontal scrollable) */}
        <section id="categories" className="mb-6">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-motion-fast focus-ring ${
                    isSelected
                      ? 'bg-primary text-white shadow-xs'
                      : 'bg-surface hover:bg-surface-sunken text-text-secondary hover:text-text-primary border border-border'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </section>

        {/* Feed Controls Header */}
        <section id="trending" className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-border pb-4">
          {/* Time Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-surface border border-border rounded-xl">
            <button
              onClick={() => setActiveTab('today')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-motion-fast focus-ring ${
                activeTab === 'today'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-sunken'
              }`}
            >
              Today&apos;s Launches
            </button>
            <button
              onClick={() => setActiveTab('yesterday')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-motion-fast focus-ring ${
                activeTab === 'yesterday'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-sunken'
              }`}
            >
              Yesterday
            </button>
            <button
              onClick={() => setActiveTab('week')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-motion-fast focus-ring ${
                activeTab === 'week'
                  ? 'bg-primary text-white shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-sunken'
              }`}
            >
              This Week
            </button>
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted font-medium hidden sm:inline">Sort by:</span>
            <CustomSelect
              value={sortBy}
              onChange={(val) => setSortBy(val as any)}
              size="sm"
              options={[
                { value: 'trending', label: 'Trending Velocity', icon: Flame },
                { value: 'top', label: 'Top Upvoted', icon: TrendingUp },
                { value: 'newest', label: 'Newest', icon: Sparkles },
              ]}
            />
          </div>
        </section>

        {/* Discovery Feed: Separation of Engines */}
        <section className="space-y-4">
          {/* Top Slot: Sponsored Boost (if present) */}
          {sponsoredProduct && (
            <div className="mb-6">
              <ProductCard
                product={sponsoredProduct}
                isSponsored={true}
                sponsorBadge="Featured Launch Boost"
                onAuthRequired={() => setIsAuthModalOpen(true)}
              />
            </div>
          )}

          {/* Loading Skeleton Placeholder with Gradient Shimmer */}
          {isLoading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="rounded-2xl border border-border bg-surface p-5 flex items-center gap-4 relative overflow-hidden"
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
          )}

          {/* Organic Product Feed */}
          {!isLoading && organicProducts.length > 0 && (
            <div className="space-y-3">
              {organicProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  rank={index + 1}
                  onAuthRequired={() => setIsAuthModalOpen(true)}
                />
              ))}
            </div>
          )}

          {/* Empty Filter State */}
          {!isLoading && filteredProducts.length === 0 && (
            <div className="text-center py-16 px-4 bg-surface border border-border rounded-2xl space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-primary-subtle text-primary flex items-center justify-center mx-auto">
                <Search className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-text-primary">
                No products found
              </h3>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                No launches matched your filter criteria for {selectedCategory}. Try selecting another category or submit your product.
              </p>
              <Link
                href="/submit"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-primary hover:bg-primary-hover px-4 py-2 rounded-xl transition-motion-base shadow-sm focus-ring"
              >
                <Plus className="w-3.5 h-3.5 text-white" />
                <span>Submit a Product</span>
              </Link>
            </div>
          )}
        </section>

        {/* Rich SaaS Landing Page Value Sections (Bento Pillars, Workflow, Anti-Fraud Matrix, Testimonials, FAQ, CTA Banner) */}
        <LandingSections />
      </main>

      {/* Reusable Auth Modal for Non-Logged-In Upvotes */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title="Sign in to Upvote"
        subtitle="Authenticate via passwordless magic link to cast verified community votes."
      />
    </div>
  );
}
