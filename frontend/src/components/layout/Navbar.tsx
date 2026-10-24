'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { useTheme } from './ThemeProvider';
import {
  Search,
  Plus,
  Moon,
  Sun,
  Award,
  Grid,
  X,
  Flame,
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { resolvedTheme, toggleTheme } = useTheme();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Dynamic shadow on scroll
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const openSearch = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  const navLinks = [
    { name: 'Leaderboards', href: '/leaderboards', icon: Award },
    { name: 'Trending', href: '/trending', icon: Flame, badge: 'Hot' },
    { name: 'Categories', href: '/categories', icon: Grid },
  ];

  return (
    <>
      <header
        className={`sticky top-0 z-40 backdrop-blur-2xl backdrop-saturate-150 bg-white/80 dark:bg-[#0D0C0B]/80 supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-[#0D0C0B]/70 border-b transition-all duration-300 ${
          isScrolled
            ? 'border-border/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)]'
            : 'border-border/40'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <Logo
                variant={resolvedTheme === 'dark' ? 'dark' : 'horizontal'}
                width={132}
                height={30}
              />
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors ${
                      isActive
                        ? 'bg-slate-100 dark:bg-slate-800 text-text-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-slate-50 dark:hover:bg-slate-800/50'
                    }`}
                  >
                    <Icon className="w-4 h-4 text-text-muted" />
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right Header Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Search Trigger */}
            <button
              type="button"
              onClick={openSearch}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-border bg-surface-sunken hover:bg-surface text-text-muted hover:text-text-secondary transition-colors text-xs"
            >
              <Search className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Search...</span>
              <kbd className="hidden sm:inline text-[10px] font-mono px-1 py-0.2 rounded bg-surface border border-border">
                ⌘K
              </kbd>
            </button>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 text-text-secondary hover:text-text-primary rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {resolvedTheme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 text-slate-600" />
              )}
            </button>

            {/* Submit Product CTA */}
            <Link
              href="/submit"
              className="inline-flex items-center gap-1.5 bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-semibold px-4 py-2 rounded-xl text-xs sm:text-sm transition-all shadow-sm shadow-primary/20 shrink-0 whitespace-nowrap active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 text-white shrink-0" />
              <span>Submit Product</span>
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle navigation menu"
              className="lg:hidden p-2 rounded-xl text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex flex-col items-center justify-center gap-1 w-9 h-9"
            >
              <span
                className={`w-5 h-0.5 bg-current rounded-full transition-all duration-300 ${
                  isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : ''
                }`}
              />
              <span
                className={`w-5 h-0.5 bg-current rounded-full transition-all duration-300 ${
                  isMobileMenuOpen ? 'opacity-0 -translate-x-2' : ''
                }`}
              />
              <span
                className={`w-5 h-0.5 bg-current rounded-full transition-all duration-300 ${
                  isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : ''
                }`}
              />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-all duration-300 ${
          isMobileMenuOpen ? 'pointer-events-auto visible' : 'pointer-events-none invisible'
        }`}
      >
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className={`fixed inset-0 bg-black/60 transition-opacity duration-300 ease-out ${
            isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />

        <div
          className={`fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-surface border-l border-border shadow-2xl z-50 flex flex-col justify-between p-6 transition-transform duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-border-subtle pb-4">
              <Logo
                variant={resolvedTheme === 'dark' ? 'dark' : 'horizontal'}
                width={128}
                height={28}
              />
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-1.5 rounded-xl text-text-muted hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                openSearch();
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs bg-surface-sunken text-text-secondary rounded-xl border border-border"
            >
              <Search className="w-4 h-4 text-primary shrink-0" />
              <span className="flex-1 text-left">Search launches, AI tools...</span>
              <kbd className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border">
                ⌘K
              </kbd>
            </button>

            <nav className="flex flex-col space-y-1.5">
              {navLinks.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 text-xs font-bold rounded-xl transition-all ${
                      isActive
                        ? 'bg-primary text-white shadow-md shadow-primary/25'
                        : 'text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </div>
                    {item.badge && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="pt-4 border-t border-border-subtle">
            <Link
              href="/submit"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full h-11 bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-semibold py-2.5 px-4 rounded-xl text-center text-sm flex items-center justify-center gap-2 shadow-sm shadow-primary/20 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 text-white shrink-0" />
              <span>Submit Product</span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

export default Navbar;
