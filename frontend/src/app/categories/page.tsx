'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { apiClient } from '@/lib/api-client';
import { Category } from '@/types';
import {
  Grid,
  Bot,
  Terminal,
  Layers,
  Sparkles,
  Zap,
  Search,
  ArrowRight,
  TrendingUp,
  BarChart3,
  Shield,
  Palette,
  Briefcase,
  Compass,
  PlusCircle,
  ExternalLink,
  Cpu,
} from 'lucide-react';

interface CategoryWithMeta extends Category {
  gradient: string;
  iconComponent: React.ComponentType<{ className?: string }>;
  tags: string[];
  featuredNames: string[];
}

const CATEGORY_VISUALS: Record<
  string,
  {
    gradient: string;
    icon: React.ComponentType<{ className?: string }>;
    tags: string[];
    featured: string[];
  }
> = {
  'ai-tools': {
    gradient: 'from-purple-500/20 via-indigo-500/10 to-transparent border-purple-500/30 text-purple-400',
    icon: Bot,
    tags: ['#LLM', '#GenerativeAI', '#Vision', '#Voice'],
    featured: ['CognitiveOS', 'SynapseFlow', 'DeepAgent'],
  },
  'ai-agents': {
    gradient: 'from-blue-500/20 via-cyan-500/10 to-transparent border-blue-500/30 text-blue-400',
    icon: Cpu,
    tags: ['#Autonomous', '#MultiAgent', '#Workflows', '#Memory'],
    featured: ['NexusAgent', 'AutoCoder', 'TaskHive'],
  },
  'saas': {
    gradient: 'from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-500/30 text-emerald-400',
    icon: Layers,
    tags: ['#B2B', '#Enterprise', '#Fintech', '#Cloud'],
    featured: ['LaunchLedger', 'MetricPro', 'SaaSDesk'],
  },
  'developer-tools': {
    gradient: 'from-cyan-500/20 via-sky-500/10 to-transparent border-cyan-500/30 text-cyan-400',
    icon: Terminal,
    tags: ['#API', '#DevOps', '#CLI', '#Postgres'],
    featured: ['QueryFast', 'GitPulse', 'DeployRocket'],
  },
  'productivity': {
    gradient: 'from-amber-500/20 via-orange-500/10 to-transparent border-amber-500/30 text-amber-400',
    icon: Zap,
    tags: ['#Flow', '#TimeTracking', '#SecondBrain', '#Docs'],
    featured: ['FocusForge', 'ZenNotes', 'TimeWeave'],
  },
  'marketing-tools': {
    gradient: 'from-pink-500/20 via-rose-500/10 to-transparent border-pink-500/30 text-pink-400',
    icon: TrendingUp,
    tags: ['#Outreach', '#Funnel', '#Social', '#Growth'],
    featured: ['ViralLoop', 'CampaignPilot', 'BrandRadar'],
  },
  'seo-tools': {
    gradient: 'from-green-500/20 via-emerald-500/10 to-transparent border-green-500/30 text-green-400',
    icon: BarChart3,
    tags: ['#Backlinks', '#SERP', '#Keywords', '#RankTracker'],
    featured: ['IndexPro', 'KeywordSurge', 'SerpPulse'],
  },
  'design-tools': {
    gradient: 'from-violet-500/20 via-fuchsia-500/10 to-transparent border-violet-500/30 text-violet-400',
    icon: Palette,
    tags: ['#UIUX', '#DesignTokens', '#FigmaPlugins', '#CSS'],
    featured: ['PixelCraft', 'MotionLab', 'CanvasFlow'],
  },
  'security-privacy': {
    gradient: 'from-red-500/20 via-rose-500/10 to-transparent border-red-500/30 text-red-400',
    icon: Shield,
    tags: ['#ZeroTrust', '#Auth', '#Compliance', '#Encryption'],
    featured: ['VaultKey', 'ShieldMesh', 'GuardDog'],
  },
};

const DEFAULT_VISUAL = {
  gradient: 'from-brand-primary/20 via-brand-primary/5 to-transparent border-brand-primary/30 text-brand-primary',
  icon: Sparkles,
  tags: ['#Innovative', '#Verified', '#SaaS', '#Growth'],
  featured: ['TopInnovator', 'NextLaunch', 'PrimeTool'],
};

export default function CategoriesDirectoryPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await apiClient.get('/categories');
        const list = res.data?.data || [];
        setCategories(Array.isArray(list) ? list : []);
      } catch (err) {
        console.error('Failed to load categories', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadCategories();
  }, []);

  const enrichedCategories: CategoryWithMeta[] = useMemo(() => {
    // If backend returns empty, provide the MVP curated catalog
    const baseList =
      categories.length > 0
        ? categories
        : [
            {
              id: 'cat-ai-tools',
              slug: 'ai-tools',
              name: 'AI Tools',
              description: 'Next-generation artificial intelligence assistants, generative models, and smart engines.',
              sortOrder: 1,
              productCount: 42,
            },
            {
              id: 'cat-ai-agents',
              slug: 'ai-agents',
              name: 'AI Agents',
              description: 'Autonomous multi-agent workflows, self-improving reasoning loops, and agentic orchestration.',
              sortOrder: 2,
              productCount: 28,
            },
            {
              id: 'cat-saas',
              slug: 'saas',
              name: 'SaaS & Enterprise',
              description: 'Scalable cloud software, enterprise B2B platforms, revenue engines, and business suites.',
              sortOrder: 3,
              productCount: 65,
            },
            {
              id: 'cat-developer-tools',
              slug: 'developer-tools',
              name: 'Developer Tools',
              description: 'Infrastructure, API frameworks, CLI utilities, databases, and debugging superpowers.',
              sortOrder: 4,
              productCount: 51,
            },
            {
              id: 'cat-productivity',
              slug: 'productivity',
              name: 'Productivity',
              description: 'Second-brain tools, hyper-focused task managers, and frictionless team workspace platforms.',
              sortOrder: 5,
              productCount: 39,
            },
            {
              id: 'cat-marketing-tools',
              slug: 'marketing-tools',
              name: 'Marketing & Growth',
              description: 'Viral attribution, multi-channel distribution pipelines, and audience growth automation.',
              sortOrder: 6,
              productCount: 24,
            },
            {
              id: 'cat-seo-tools',
              slug: 'seo-tools',
              name: 'SEO & Content',
              description: 'Keyword intelligence, search index accelerators, and organic inbound visibility engines.',
              sortOrder: 7,
              productCount: 19,
            },
            {
              id: 'cat-design-tools',
              slug: 'design-tools',
              name: 'Design & Creative',
              description: 'Vector editors, generative UI design token studios, motion graphics, and canvas tools.',
              sortOrder: 8,
              productCount: 22,
            },
          ];

    return baseList.map((cat) => {
      const visual = CATEGORY_VISUALS[cat.slug] || DEFAULT_VISUAL;
      return {
        ...cat,
        gradient: visual.gradient,
        iconComponent: visual.icon,
        tags: visual.tags,
        featuredNames: visual.featured,
      };
    });
  }, [categories]);

  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return enrichedCategories;
    const q = searchQuery.toLowerCase().trim();
    return enrichedCategories.filter(
      (cat) =>
        cat.name.toLowerCase().includes(q) ||
        cat.description?.toLowerCase().includes(q) ||
        cat.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [enrichedCategories, searchQuery]);

  const totalProducts = useMemo(() => {
    return enrichedCategories.reduce((acc, cat) => acc + (cat.productCount || 0), 0);
  }, [enrichedCategories]);

  return (
    <div className="min-h-screen bg-bg text-text-primary pb-24">
      {/* Ambient background aura */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-brand-primary/10 blur-[130px] rounded-full" />
        <div className="absolute top-80 right-10 w-[450px] h-[300px] bg-purple-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-text-secondary mb-6">
          <Link href="/" className="hover:text-brand-primary transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-text-primary font-medium">Categories</span>
        </nav>

        {/* Hero Section */}
        <div className="relative rounded-3xl p-8 sm:p-12 mb-12 border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-b from-surface/90 to-surface/40 backdrop-blur-xl shadow-xl overflow-hidden">
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-brand-primary/15 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-3xl relative z-10">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-brand-primary/10 border border-brand-primary/25 text-brand-primary mb-4 shadow-sm">
              <Compass className="w-3.5 h-3.5" />
              <span>Taxonomy Directory & Ecosystem Catalog</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-text-primary leading-tight">
              Explore by <span className="text-gradient">Industry Vertical</span>
            </h1>

            <p className="mt-4 text-base sm:text-lg text-text-secondary leading-relaxed">
              Discover verified software across curated categories. From autonomous AI agent frameworks to enterprise SaaS engines, find high-integrity solutions ranked by genuine community traction.
            </p>

            {/* Quick Stats Bar */}
            <div className="mt-8 flex flex-wrap items-center gap-6 pt-6 border-t border-slate-200/60 dark:border-slate-800/60 text-xs sm:text-sm text-text-secondary">
              <div className="flex items-center gap-2">
                <span className="font-bold text-text-primary text-base">
                  {enrichedCategories.length}
                </span>
                <span>Active Verticals</span>
              </div>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-text-primary text-base">
                  {totalProducts > 0 ? `${totalProducts}+` : '300+'}
                </span>
                <span>Indexed Products</span>
              </div>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>100% Sybil-Resistant Verified</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Search & Filter Bar */}
        <div className="mb-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
            <input
              type="text"
              placeholder="Search category, domain, or tag (e.g. LLM, DevTools)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-surface/70 backdrop-blur-md text-sm text-text-primary placeholder:text-text-secondary/70 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-secondary hover:text-text-primary bg-slate-200/60 dark:bg-slate-800/60 rounded px-1.5 py-0.5"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-text-secondary hidden sm:inline">
              Showing {filteredCategories.length} of {enrichedCategories.length} categories
            </span>
            <Link
              href="/submit"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-hover text-white text-xs font-semibold shadow-md shadow-brand-primary/20 hover:shadow-brand-primary/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Submit to a Category</span>
            </Link>
          </div>
        </div>

        {/* Categories Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-2xl border border-border bg-surface skeleton-shimmer p-6"
              />
            ))}
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="text-center py-20 rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-surface/30 p-8">
            <Grid className="w-12 h-12 mx-auto text-text-secondary/40 mb-3" />
            <h3 className="text-lg font-bold text-text-primary">No categories found</h3>
            <p className="text-sm text-text-secondary mt-1 max-w-sm mx-auto">
              We couldn't find any category matching "{searchQuery}". Try searching for another keyword.
            </p>
            <button
              onClick={() => setSearchQuery('')}
              className="mt-4 px-4 py-2 rounded-lg text-xs font-medium text-brand-primary bg-brand-primary/10 hover:bg-brand-primary/20 transition-colors"
            >
              Reset Search
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCategories.map((cat) => {
              const Icon = cat.iconComponent;
              return (
                <Link
                  key={cat.id || cat.slug}
                  href={`/categories/${cat.slug}`}
                  className="group relative rounded-2xl p-6 border border-slate-200/80 dark:border-slate-800/80 bg-surface/70 hover:bg-surface/90 backdrop-blur-md shadow-sm hover:shadow-xl transition-all duration-300 hover:-translate-y-1.5 flex flex-col justify-between overflow-hidden"
                >
                  {/* Subtle top ambient glow */}
                  <div
                    className={`absolute inset-0 bg-gradient-to-br ${cat.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none`}
                  />

                  {/* Top card row */}
                  <div className="relative z-10">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-text-primary group-hover:scale-110 group-hover:border-brand-primary/40 transition-all duration-300 shadow-sm">
                        <Icon className="w-6 h-6" />
                      </div>

                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800/70 text-text-secondary border border-slate-200/60 dark:border-slate-700/60 group-hover:text-brand-primary group-hover:border-brand-primary/30 transition-colors">
                        {cat.productCount ? `${cat.productCount} Products` : 'Curated'}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold text-text-primary group-hover:text-brand-primary transition-colors flex items-center justify-between">
                      <span>{cat.name}</span>
                      <ArrowRight className="w-4 h-4 text-text-secondary/50 group-hover:text-brand-primary group-hover:translate-x-1 transition-all duration-300" />
                    </h2>

                    <p className="mt-2 text-xs text-text-secondary line-clamp-2 leading-relaxed">
                      {cat.description || 'Explore top-ranked tools and verified launches in this vertical.'}
                    </p>
                  </div>

                  {/* Bottom tags & preview row */}
                  <div className="relative z-10 pt-5 mt-5 border-t border-slate-200/60 dark:border-slate-800/60">
                    {/* Tags */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      {cat.tags.slice(0, 3).map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100/80 dark:bg-slate-800/50 text-text-secondary group-hover:bg-slate-200/60 dark:group-hover:bg-slate-800 transition-colors"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Featured tools preview names */}
                    <div className="flex items-center justify-between text-[11px] text-text-secondary/80">
                      <span className="truncate">Top: {cat.featuredNames.slice(0, 2).join(', ')}</span>
                      <span className="font-semibold text-brand-primary text-xs group-hover:underline flex items-center gap-0.5">
                        Browse
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Suggest / Request Category Banner */}
        <div className="mt-16 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-surface/40 backdrop-blur-sm p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div>
            <h3 className="text-base font-bold text-text-primary">
              Don't see your vertical or technical ecosystem?
            </h3>
            <p className="mt-1 text-xs text-text-secondary max-w-xl">
              LaunchProduct constantly evolves its taxonomy with the modern software landscape. Suggest a new vertical or tag taxonomy for our community review board.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/submit"
              className="px-4 py-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 hover:border-brand-primary text-text-primary text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
            >
              Submit Launch
            </Link>
            <Link
              href="/promote"
              className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 hover:bg-amber-500/20 text-xs font-semibold transition-all"
            >
              Sponsor a Vertical
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
