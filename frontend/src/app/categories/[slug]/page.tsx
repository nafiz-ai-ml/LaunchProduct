'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ProductCard } from '@/components/product/ProductCard';
import { AuthModal } from '@/components/auth/AuthModal';
import { apiClient } from '@/lib/api-client';
import { Product, Category } from '@/types';
import {
  Compass,
  ArrowLeft,
  Sparkles,
  Zap,
  TrendingUp,
  Award,
  Search,
  Filter,
  PlusCircle,
  Layers,
  Bot,
  Terminal,
  Palette,
  Shield,
  BarChart3,
  Flame,
  Clock,
  ThumbsUp,
  SlidersHorizontal,
} from 'lucide-react';

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'ai-tools': Bot,
  'ai-agents': Bot,
  'saas': Layers,
  'developer-tools': Terminal,
  'productivity': Zap,
  'marketing-tools': TrendingUp,
  'seo-tools': BarChart3,
  'design-tools': Palette,
  'security-privacy': Shield,
};

export default function CategoryDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = (params?.slug as string) || '';

  const [category, setCategory] = useState<Category | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<'trending' | 'upvotes' | 'newest'>('trending');
  const [pricingFilter, setPricingFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // 1. Fetch category metadata & products
  useEffect(() => {
    if (!slug) return;

    let isMounted = true;

    async function loadData() {
      setIsLoading(true);
      try {
        // Fetch category details
        let catData: any = null;
        try {
          const catRes = await apiClient.get(`/categories/${slug}`);
          catData = catRes.data?.data?.category || catRes.data?.data;
        } catch {
          // Fallback if slug lookup fails
          catData = {
            id: `cat-${slug}`,
            slug,
            name: slug
              .split('-')
              .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
              .join(' '),
            description: `Top verified products and high-traction software launches in the ${slug.replace('-', ' ')} ecosystem.`,
            sortOrder: 1,
            productCount: 0,
          };
        }

        if (isMounted) {
          setCategory(catData);
        }

        // Fetch products matching category
        const catIdOrSlug = catData?.id || catData?._id || slug;
        let prodsList: Product[] = [];

        try {
          // Query products by category filter
          const prodRes = await apiClient.get(`/products`, {
            params: {
              category: catIdOrSlug,
              sort: sortBy === 'upvotes' ? 'upvotes' : sortBy === 'newest' ? 'newest' : 'trending',
              limit: 50,
            },
          });
          const raw = prodRes.data?.data?.products || prodRes.data?.data;
          if (Array.isArray(raw)) {
            prodsList = raw;
          }
        } catch (e) {
          console.warn('Direct category query failed, falling back to client-side filter', e);
        }

        // Fallback: If no products returned by backend filter, try general feed and filter client-side
        if (prodsList.length === 0) {
          try {
            const fallbackRes = await apiClient.get('/products?limit=60');
            const all = fallbackRes.data?.data?.products || fallbackRes.data?.data || [];
            if (Array.isArray(all)) {
              prodsList = all.filter((p: any) => {
                const cSlug = typeof p.category === 'object' ? p.category?.slug : p.category;
                const cId = typeof p.category === 'object' ? p.category?.id || p.category?._id : p.categoryId;
                return cSlug === slug || cId === catIdOrSlug;
              });
            }
          } catch (err) {
            console.error('Fallback products fetch failed', err);
          }
        }

        if (isMounted) {
          setProducts(prodsList);
          if (catData) {
            document.title = `${catData.name} Products & Launches | LaunchProduct`;
          }
        }
      } catch (err) {
        console.error('Failed to load category page data', err);
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
  }, [slug, sortBy]);

  // Client-side filtering for search & pricing
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // Pricing filter
      if (pricingFilter !== 'all') {
        const model =
          typeof prod.pricing === 'object'
            ? prod.pricing?.model?.toLowerCase()
            : String(prod.pricing || '').toLowerCase();
        if (!model.includes(pricingFilter.toLowerCase())) {
          return false;
        }
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const nameMatch = prod.name.toLowerCase().includes(q);
        const taglineMatch = prod.tagline?.toLowerCase().includes(q);
        const descMatch = prod.description?.toLowerCase().includes(q);
        const tagMatch = prod.tags?.some((t) => t.toLowerCase().includes(q));
        if (!nameMatch && !taglineMatch && !descMatch && !tagMatch) {
          return false;
        }
      }

      return true;
    });
  }, [products, pricingFilter, searchQuery]);

  // Featured / Spotlight product (highest upvoted or sponsored in this category)
  const spotlightProduct = useMemo(() => {
    if (products.length === 0) return null;
    return products.find((p) => p.isSponsored) || products[0];
  }, [products]);

  const IconComponent = CATEGORY_ICONS[slug] || Sparkles;

  return (
    <div className="min-h-screen bg-bg text-text-primary pb-24">
      {/* Background ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-10 left-1/3 -translate-x-1/2 w-[600px] h-[350px] bg-brand-primary/10 blur-[130px] rounded-full" />
        <div className="absolute top-96 right-10 w-[450px] h-[300px] bg-indigo-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12">
        {/* Breadcrumb Navigation */}
        <nav className="flex items-center gap-2 text-xs text-text-secondary mb-6">
          <Link href="/" className="hover:text-brand-primary transition-colors">
            Home
          </Link>
          <span>/</span>
          <Link href="/categories" className="hover:text-brand-primary transition-colors">
            Categories
          </Link>
          <span>/</span>
          <span className="text-text-primary font-medium">{category?.name || slug}</span>
        </nav>

        {/* Canonical link for SEO */}
        <link rel="canonical" href={`https://launchproduct.com/categories/${slug}`} />

        {/* Category Header Hero */}
        <div className="relative rounded-3xl p-6 sm:p-10 mb-10 border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-b from-surface/90 to-surface/40 backdrop-blur-xl shadow-xl overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 relative z-10">
            <div className="max-w-3xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-brand-primary/10 border border-brand-primary/25 text-brand-primary shadow-inner">
                  <IconComponent className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Vertical
                    </span>
                    <span className="text-xs text-text-secondary">
                      {products.length} {products.length === 1 ? 'Product' : 'Products'} Indexed
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-text-primary mt-1">
                    {category?.name || slug}
                  </h1>
                </div>
              </div>

              <p className="text-sm sm:text-base text-text-secondary leading-relaxed max-w-2xl">
                {category?.description ||
                  `Explore verified software, autonomous agents, and breakthrough developer utilities in the ${slug} ecosystem.`}
              </p>
            </div>

            {/* Category Action CTAs */}
            <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
              <Link
                href={`/submit?category=${category?.id || slug}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-brand-primary hover:bg-brand-hover text-white text-xs font-semibold shadow-md shadow-brand-primary/20 hover:shadow-brand-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Submit to this Vertical</span>
              </Link>
              <Link
                href={`/promote?tier=category&slug=${slug}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-surface border border-amber-500/40 text-amber-500 hover:bg-amber-500/10 text-xs font-semibold transition-all shadow-sm"
              >
                <Sparkles className="w-4 h-4" />
                <span>Feature Here ($49/wk)</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Category Spotlight / Featured Product Banner (if available) */}
        {spotlightProduct && (
          <div className="mb-10 rounded-2xl border border-brand-primary/30 bg-gradient-to-r from-brand-primary/10 via-surface/60 to-surface/40 backdrop-blur-md p-6 shadow-md relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 p-2 flex items-center justify-center shrink-0">
                  {spotlightProduct.logoUrl ? (
                    <img
                      src={spotlightProduct.logoUrl}
                      alt={spotlightProduct.name}
                      className="w-full h-full object-contain rounded-lg"
                    />
                  ) : (
                    <Sparkles className="w-6 h-6 text-brand-primary" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-primary text-white">
                      Vertical Spotlight
                    </span>
                    <span className="text-xs text-text-secondary">Top Ranked in {category?.name}</span>
                  </div>
                  <h3 className="text-base font-bold text-text-primary mt-1">
                    {spotlightProduct.name}{' '}
                    <span className="text-xs font-normal text-text-secondary">
                      — {spotlightProduct.tagline}
                    </span>
                  </h3>
                </div>
              </div>

              <Link
                href={`/products/${spotlightProduct.slug}`}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-surface border border-slate-200 dark:border-slate-700 hover:border-brand-primary text-xs font-semibold text-text-primary hover:text-brand-primary transition-colors shrink-0"
              >
                <span>View Launch</span>
                <span className="font-bold text-brand-primary">▲ {spotlightProduct.upvotesCount}</span>
              </Link>
            </div>
          </div>
        )}

        {/* Filter and Sorting Bar */}
        <div className="mb-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 pb-6 border-b border-slate-200/60 dark:border-slate-800/60">
          {/* Sort Tabs */}
          <div className="flex items-center gap-1 bg-surface/70 border border-slate-200/80 dark:border-slate-800/80 p-1 rounded-xl backdrop-blur-md">
            <button
              onClick={() => setSortBy('trending')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                sortBy === 'trending'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Flame className="w-3.5 h-3.5" />
              <span>Trending</span>
            </button>
            <button
              onClick={() => setSortBy('upvotes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                sortBy === 'upvotes'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <ThumbsUp className="w-3.5 h-3.5" />
              <span>Top All-Time</span>
            </button>
            <button
              onClick={() => setSortBy('newest')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                sortBy === 'newest'
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-text-secondary hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800/60'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Newest</span>
            </button>
          </div>

          {/* Pricing filter pills + Search */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 bg-surface/70 border border-slate-200/80 dark:border-slate-800/80 p-1 rounded-xl">
              {['all', 'free', 'freemium', 'paid', 'open_source'].map((model) => (
                <button
                  key={model}
                  onClick={() => setPricingFilter(model)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium capitalize transition-all ${
                    pricingFilter === model
                      ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-semibold'
                      : 'text-text-secondary hover:text-text-primary'
                  }`}
                >
                  {model === 'open_source' ? 'Open Source' : model}
                </button>
              ))}
            </div>

            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-secondary" />
              <input
                type="text"
                placeholder="Filter in this vertical..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-surface/70 text-xs text-text-primary placeholder:text-text-secondary/60 focus:outline-none focus:ring-1 focus:ring-brand-primary"
              />
            </div>
          </div>
        </div>

        {/* Product Cards Feed */}
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-28 rounded-2xl border border-border bg-surface skeleton-shimmer"
              />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-surface/30 p-8">
            <Compass className="w-12 h-12 mx-auto text-text-secondary/40 mb-3" />
            <h3 className="text-lg font-bold text-text-primary">
              No products found in {category?.name || slug}
            </h3>
            <p className="text-sm text-text-secondary mt-1 max-w-sm mx-auto">
              {searchQuery || pricingFilter !== 'all'
                ? 'Try clearing your filters or search keywords.'
                : 'Be the pioneer founder to launch the very first product in this category!'}
            </p>
            <div className="mt-5 flex items-center justify-center gap-3">
              {searchQuery || pricingFilter !== 'all' ? (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setPricingFilter('all');
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 transition-colors"
                >
                  Reset Filters
                </button>
              ) : (
                <Link
                  href={`/submit?category=${category?.id || slug}`}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-hover text-white text-xs font-semibold shadow-md transition-all"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Launch First Product</span>
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredProducts.map((product, index) => (
              <ProductCard
                key={product.id || (product as any)._id}
                product={product}
                rank={index + 1}
                onAuthRequired={() => setIsAuthModalOpen(true)}
              />
            ))}
          </div>
        )}
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />
    </div>
  );
}
