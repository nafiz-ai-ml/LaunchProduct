'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { useTheme } from './ThemeProvider';
import {
  Award,
  Zap,
  Calendar,
  Layers,
  BookOpen,
  HelpCircle,
  Info,
  Plus,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  Sun,
  Moon,
  Clock,
  Sparkles,
} from 'lucide-react';

const CATEGORIES = [
  { slug: 'ai-tools', name: 'AI Tools' },
  { slug: 'ai-agents', name: 'AI Agents' },
  { slug: 'saas', name: 'SaaS' },
  { slug: 'developer-tools', name: 'Developer Tools' },
  { slug: 'productivity', name: 'Productivity' },
  { slug: 'marketing-tools', name: 'Marketing Tools' },
  { slug: 'seo-tools', name: 'SEO Tools' },
  { slug: 'design-tools', name: 'Design Tools' },
];

export function Sidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams?.get('tab') || 'today';
  const currentCategory = searchParams?.get('category');
  const { resolvedTheme, toggleTheme } = useTheme();

  const [isOpen, setIsOpen] = useState(false);
  const [isCategoriesExpanded, setIsCategoriesExpanded] = useState(true);
  const [utcTime, setUtcTime] = useState('');
  const [utcCountdown, setUtcCountdown] = useState('');

  // Live UTC Clock & Midnight Countdown Ticker
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().slice(17, 25) + ' UTC');

      // Countdown to 00:00:00 UTC
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

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close mobile drawer on route navigation
  useEffect(() => {
    setIsOpen(false);
  }, [pathname, searchParams]);

  const navItems = [
    {
      label: "Today's Board",
      href: '/?tab=today',
      icon: Zap,
      badge: 'Live',
      badgeColor: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
      isActive: pathname === '/' && currentTab === 'today' && !currentCategory,
    },
    {
      label: 'All-Time Board',
      href: '/?tab=all-time',
      icon: Award,
      isActive: pathname === '/' && currentTab === 'all-time' && !currentCategory,
    },
    {
      label: 'Daily Archive',
      href: '/?tab=archive',
      icon: Calendar,
      isActive: pathname === '/' && currentTab === 'archive',
    },
  ];

  const infoItems = [
    {
      label: 'Ranking Rules',
      href: '/rules',
      icon: BookOpen,
      isActive: pathname === '/rules',
    },
    {
      label: 'FAQ',
      href: '/faq',
      icon: HelpCircle,
      isActive: pathname === '/faq',
    },
    {
      label: 'About LaunchProduct',
      href: '/about',
      icon: Info,
      isActive: pathname === '/about',
    },
  ];

  return (
    <>
      {/* Mobile Top Navigation Bar */}
      <header className="md:hidden sticky top-0 z-40 w-full flex items-center justify-between px-4 py-3 bg-white/95 dark:bg-[#001433]/95 backdrop-blur-xl border-b border-border shadow-xs shrink-0">
        <Link href="/" className="flex items-center gap-2">
          <Logo variant="auto" width={128} height={28} />
        </Link>
        <div className="flex items-center gap-2">
          <Link
            href="/submit"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Rank</span>
          </Link>
          <button
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle navigation"
            className="p-2 rounded-lg bg-surface border border-border text-text-secondary hover:text-text-primary"
          >
            {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Container (Fixed desktop + Drawer mobile) */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-72 max-w-[85vw] md:w-64 bg-white/95 dark:bg-[#001738]/95 backdrop-blur-2xl border-r border-slate-200/80 dark:border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out font-sans shadow-2xl md:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-border/60 flex items-center justify-between shrink-0">
          <Link href="/" className="inline-block hover:opacity-90 transition-opacity">
            <Logo variant={resolvedTheme === 'dark' ? 'dark' : 'horizontal'} width={146} height={32} />
          </Link>
          <button
            onClick={() => setIsOpen(false)}
            aria-label="Close menu"
            className="md:hidden p-1.5 rounded-lg text-text-muted hover:text-text-primary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Primary Call to Action */}
        <div className="px-4 pt-4 pb-2 shrink-0">
          <Link
            href="/submit"
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-primary to-[#003cb3] hover:opacity-95 text-white font-semibold text-xs tracking-wide shadow-md shadow-primary/20 transition-all duration-200 active:scale-[0.99]"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Submit &amp; Rank Product</span>
          </Link>
          <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-text-muted font-medium">
            <span>$5.99 min initial entry</span>
            <span className="text-primary font-semibold">Pay-to-Rank</span>
          </div>
        </div>

        {/* Scrollable Navigation Area */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-6 scrollbar-thin">
          {/* Main Leaderboard Periods */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Leaderboards
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      item.isActive
                        ? 'bg-primary text-white shadow-xs font-bold'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-sunken'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${item.isActive ? 'text-white' : 'text-text-muted'}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold border ${
                          item.isActive
                            ? 'bg-white/20 text-white border-white/30'
                            : item.badgeColor || 'bg-primary-subtle text-primary border-primary/20'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Categories Section */}
          <div>
            <button
              onClick={() => setIsCategoriesExpanded(!isCategoriesExpanded)}
              className="w-full flex items-center justify-between px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted hover:text-text-primary transition-colors"
            >
              <div className="flex items-center gap-1.5">
                <Layers className="w-3 h-3" />
                <span>Categories</span>
              </div>
              {isCategoriesExpanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>

            {isCategoriesExpanded && (
              <div className="space-y-0.5 pl-1">
                {CATEGORIES.map((cat) => {
                  const isActive = currentCategory === cat.slug;
                  return (
                    <Link
                      key={cat.slug}
                      href={`/?category=${cat.slug}`}
                      className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        isActive
                          ? 'bg-primary/10 text-primary font-semibold'
                          : 'text-text-secondary hover:text-text-primary hover:bg-surface-sunken'
                      }`}
                    >
                      <span className="truncate">{cat.name}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {/* Platform Information Links */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
              Information
            </div>
            <nav className="space-y-1">
              {infoItems.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                      item.isActive
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-sunken'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${item.isActive ? 'text-white' : 'text-text-muted'}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Sidebar Footer & Clock / Theme */}
        <div className="p-4 border-t border-border/60 bg-surface/30 shrink-0 space-y-3">
          {/* UTC Midnight Reset Box */}
          <div className="p-2.5 rounded-xl bg-surface border border-border/60 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-text-muted">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-primary" />
                <span>UTC Daily Reset</span>
              </span>
              <span className="font-mono text-[10px] font-bold text-text-primary">{utcCountdown}</span>
            </div>
            <div className="text-[10px] text-text-muted font-mono">{utcTime}</div>
          </div>

          {/* Theme Switcher & Legal Links */}
          <div className="flex items-center justify-between pt-1">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-lg bg-surface border border-border text-text-muted hover:text-text-primary transition-colors text-xs flex items-center gap-1.5"
              aria-label="Toggle theme"
            >
              {resolvedTheme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px]">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="text-[11px]">Dark</span>
                </>
              )}
            </button>

            {/* Legal Links */}
            <div className="flex items-center gap-2 text-[11px] text-text-muted">
              <Link href="/terms" className="hover:text-text-primary transition-colors">
                Terms
              </Link>
              <span>·</span>
              <Link href="/privacy" className="hover:text-text-primary transition-colors">
                Privacy
              </Link>
              <span>·</span>
              <Link href="/imprint" className="hover:text-text-primary transition-colors">
                Imprint
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
