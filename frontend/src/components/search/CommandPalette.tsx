'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { Product } from '@/types';
import {
  Search,
  X,
  TrendingUp,
  Award,
  Plus,
  Zap,
  LayoutDashboard,
  Grid,
  ChevronRight,
  Loader2,
  Sparkles,
} from 'lucide-react';

const QUICK_LINKS = [
  { name: 'Daily Leaderboard', href: '/leaderboards', icon: Award, badge: 'Marquee' },
  { name: 'Trending Launches', href: '/trending', icon: TrendingUp, badge: 'Velocity' },
  { name: 'Browse Categories', href: '/categories', icon: Grid },
  { name: 'Submit New Launch', href: '/submit', icon: Plus, badge: 'Founder' },
  { name: 'Promote & Boost', href: '/promote', icon: Zap, badge: 'Boost' },
  { name: 'Founder Dashboard', href: '/dashboard', icon: LayoutDashboard },
];

const CATEGORIES = [
  'AI Tools',
  'AI Agents',
  'SaaS',
  'Developer Tools',
  'Productivity',
  'Marketing Tools',
  'SEO Tools',
  'Design Tools',
  'Security & Privacy',
];

const categoryToSlug = (cat: string) =>
  cat.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

const SEED_SEARCH_PRODUCTS: Product[] = [
  {
    id: 'prod-sponsor-1',
    name: 'VectorPulse Cloud',
    slug: 'vectorpulse-cloud',
    tagline: 'Serverless vector database engine with automated sub-millisecond similarity indexing',
    description: 'Ultra-low latency vector embeddings storage built specifically for high-throughput LLM reasoning pipelines.',
    category: 'Developer Tools',
    pricing: { model: 'Freemium' },
    upvotesCount: 412,
    isVerified: true,
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
    websiteUrl: 'https://launchproduct.io',
    tags: ['AI Engine', 'Database', 'TypeScript'],
  },
  {
    id: 'prod-1',
    name: 'DevSync AI',
    slug: 'devsync-ai',
    tagline: 'Autonomous code review agent that spots performance regressions before merging',
    description: 'DevSync connects directly to your Git repositories, analyzing PR AST diffs.',
    category: 'Developer Tools',
    pricing: { model: 'Freemium' },
    upvotesCount: 388,
    isVerified: true,
    logoUrl: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=128&auto=format&fit=crop&q=80',
    websiteUrl: 'https://launchproduct.io',
    tags: ['DevTools', 'AI Agents', 'GitHub'],
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
    isVerified: true,
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
    isVerified: true,
    logoUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&auto=format&fit=crop&q=80',
    websiteUrl: 'https://launchproduct.io',
    tags: ['Tailwind CSS', 'React 18', 'Design System'],
  },
];

export function CommandPalette() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);

  // Global keydown listeners for Cmd+K, Ctrl+K, Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    const handleCustomOpen = () => {
      setIsOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-command-palette', handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-command-palette', handleCustomOpen);
    };
  }, [isOpen]);

  // Autofocus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setProducts([]);
    }
  }, [isOpen]);

  // Debounced API search query with fallback to seed products
  useEffect(() => {
    if (!query.trim()) {
      setProducts([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await apiClient.get('/products', {
          params: { q: query.trim(), limit: 6 },
        });
        const items = res.data?.data?.products || res.data?.data || [];
        if (Array.isArray(items) && items.length > 0) {
          setProducts(items);
        } else {
          // Client-side fallback matching
          const q = query.toLowerCase();
          const matched = SEED_SEARCH_PRODUCTS.filter(
            (p) =>
              p.name.toLowerCase().includes(q) ||
              p.tagline.toLowerCase().includes(q) ||
              (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
          );
          setProducts(matched);
        }
      } catch {
        const q = query.toLowerCase();
        const matched = SEED_SEARCH_PRODUCTS.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.tagline.toLowerCase().includes(q) ||
            (p.tags && p.tags.some((t) => t.toLowerCase().includes(q)))
        );
        setProducts(matched);
      } finally {
        setIsLoading(false);
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [query]);

  // Filter matching categories
  const matchingCategories = CATEGORIES.filter((c) =>
    c.toLowerCase().includes(query.toLowerCase())
  );

  // Flat array of navigable items for keyboard Up/Down
  const totalItemsCount = query.trim()
    ? products.length + matchingCategories.length
    : QUICK_LINKS.length + CATEGORIES.length;

  const handleSelect = (href: string) => {
    setIsOpen(false);
    router.push(href);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalItemsCount));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + totalItemsCount) % Math.max(1, totalItemsCount));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (!query.trim()) {
        if (selectedIndex < QUICK_LINKS.length) {
          handleSelect(QUICK_LINKS[selectedIndex].href);
        } else {
          const cat = CATEGORIES[selectedIndex - QUICK_LINKS.length];
          if (cat) handleSelect(`/categories/${categoryToSlug(cat)}`);
        }
      } else {
        if (selectedIndex < products.length) {
          const prod = products[selectedIndex];
          if (prod) handleSelect(`/products/${prod.slug || prod.id}`);
        } else {
          const cat = matchingCategories[selectedIndex - products.length];
          if (cat) handleSelect(`/categories/${categoryToSlug(cat)}`);
        }
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-start justify-center p-4 sm:p-6 md:pt-24 animate-in fade-in duration-150"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-xl bg-surface border border-border rounded-2xl shadow-popover overflow-hidden animate-in zoom-in-95 duration-150 relative"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-border bg-surface-sunken">
          <Search className="w-4 h-4 text-text-muted mr-3 flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search products, launches, categories, founder tools..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm text-text-primary placeholder:text-text-muted outline-none"
          />
          {isLoading ? (
            <Loader2 className="w-4 h-4 text-primary animate-spin ml-2 flex-shrink-0" />
          ) : query ? (
            <button
              onClick={() => setQuery('')}
              className="p-1 text-text-muted hover:text-text-primary rounded-lg focus-ring"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : (
            <kbd className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface border border-border text-text-muted shadow-xs">
              ESC
            </kbd>
          )}
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-4">
          {!query.trim() ? (
            /* Default State: Quick Navigation & Categories */
            <>
              <div>
                <p className="px-3 py-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  Quick Navigation
                </p>
                <div className="space-y-1">
                  {QUICK_LINKS.map((link, idx) => {
                    const Icon = link.icon;
                    const isSelected = selectedIndex === idx;
                    return (
                      <button
                        key={link.name}
                        onClick={() => handleSelect(link.href)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={`w-full flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-colors ${
                          isSelected
                            ? 'bg-primary text-white shadow-xs'
                            : 'text-text-primary hover:bg-surface-sunken'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-primary'}`} />
                          <span>{link.name}</span>
                        </div>
                        {link.badge && (
                          <span
                            className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${
                              isSelected
                                ? 'bg-white/20 text-white'
                                : 'bg-surface-sunken text-text-secondary border border-border'
                            }`}
                          >
                            {link.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="px-3 py-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  Browse by Category
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {CATEGORIES.map((cat, idx) => {
                    const itemIdx = QUICK_LINKS.length + idx;
                    const isSelected = selectedIndex === itemIdx;
                    return (
                      <button
                        key={cat}
                        onClick={() => handleSelect(`/categories/${categoryToSlug(cat)}`)}
                        onMouseEnter={() => setSelectedIndex(itemIdx)}
                        className={`flex items-center justify-between px-3 py-2 text-xs rounded-xl text-left transition-colors ${
                          isSelected
                            ? 'bg-primary text-white font-semibold'
                            : 'text-text-secondary hover:bg-surface-sunken'
                        }`}
                      >
                        <span className="truncate">{cat}</span>
                        <ChevronRight className={`w-3 h-3 ${isSelected ? 'text-white' : 'text-text-muted'}`} />
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Search Query Results */
            <>
              {products.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    Matching Launches
                  </p>
                  <div className="space-y-1">
                    {products.map((prod, idx) => {
                      const isSelected = selectedIndex === idx;
                      return (
                        <button
                          key={prod.id}
                          onClick={() => handleSelect(`/products/${prod.slug || prod.id}`)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                            isSelected
                              ? 'bg-primary text-white'
                              : 'hover:bg-surface-sunken'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            {prod.logoUrl ? (
                              <img
                                src={prod.logoUrl}
                                alt={prod.name}
                                className="w-7 h-7 rounded-lg object-cover flex-shrink-0 border border-border/40"
                              />
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-primary-subtle text-primary flex items-center justify-center font-bold text-xs flex-shrink-0">
                                {prod.name.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-text-primary'}`}>
                                {prod.name}
                              </p>
                              <p className={`text-[11px] truncate ${isSelected ? 'text-white/80' : 'text-text-secondary'}`}>
                                {prod.tagline}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                            <span
                              className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                                isSelected
                                  ? 'bg-white/20 text-white'
                                  : 'bg-surface-sunken text-primary border border-border'
                              }`}
                            >
                              ▲ {prod.upvotesCount ?? 0}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {matchingCategories.length > 0 && (
                <div>
                  <p className="px-3 py-1.5 text-[10px] font-bold text-text-muted uppercase tracking-wider">
                    Categories
                  </p>
                  <div className="space-y-1">
                    {matchingCategories.map((cat, idx) => {
                      const itemIdx = products.length + idx;
                      const isSelected = selectedIndex === itemIdx;
                      return (
                        <button
                          key={cat}
                          onClick={() => handleSelect(`/categories/${categoryToSlug(cat)}`)}
                          onMouseEnter={() => setSelectedIndex(itemIdx)}
                          className={`w-full flex items-center justify-between px-3 py-2 text-xs rounded-xl text-left transition-colors ${
                            isSelected
                              ? 'bg-primary text-white font-semibold'
                              : 'text-text-secondary hover:bg-surface-sunken'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <Grid className="w-3.5 h-3.5" />
                            <span>{cat}</span>
                          </div>
                          <ChevronRight className="w-3 h-3 text-text-muted" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {products.length === 0 && matchingCategories.length === 0 && !isLoading && (
                <div className="text-center py-8 px-4 space-y-2">
                  <div className="w-10 h-10 rounded-xl bg-surface-sunken flex items-center justify-center mx-auto text-text-muted">
                    <Search className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-text-primary">
                    No launches found matching &ldquo;{query}&rdquo;
                  </p>
                  <p className="text-[11px] text-text-secondary max-w-xs mx-auto">
                    Try another keyword, explore all categories, or submit this tool to LaunchProduct.
                  </p>
                  <button
                    onClick={() => handleSelect('/submit')}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline pt-2 focus-ring rounded"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Submit &ldquo;{query}&rdquo; as a new launch
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2 border-t border-border bg-surface-sunken flex items-center justify-between text-[10px] text-text-muted">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-primary" />
            LaunchProduct Search
          </span>
        </div>
      </div>
    </div>
  );
}

export default CommandPalette;
