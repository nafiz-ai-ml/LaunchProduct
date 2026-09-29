'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { useTheme } from './ThemeProvider';
import { getSessionUser, logoutUser } from '@/lib/auth-client';
import { User } from '@/types';
import {
  Search,
  Plus,
  Moon,
  Sun,
  TrendingUp,
  Award,
  Zap,
  Grid,
  User as UserIcon,
  LogOut,
  LayoutDashboard,
  Shield,
  ChevronDown,
  X,
  Sparkles,
  Flame,
  ArrowRight,
} from 'lucide-react';

export function Navbar() {
  const pathname = usePathname();
  const { resolvedTheme, toggleTheme } = useTheme();

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Monitor session user
  useEffect(() => {
    let isMounted = true;
    getSessionUser().then((user) => {
      if (isMounted) {
        setCurrentUser(user);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [pathname]);

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
    setIsUserMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logoutUser();
    setCurrentUser(null);
    setIsUserMenuOpen(false);
    window.location.href = '/';
  };

  const openSearch = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  // Dedicated core navigation links (all pointing to first-class routes)
  const navLinks = [
    { name: 'Trending', href: '/trending', icon: Flame, badge: 'Hot' },
    { name: 'Leaderboards', href: '/leaderboards', icon: Award },
    { name: 'Categories', href: '/categories', icon: Grid },
    { name: 'Promote', href: '/promote', icon: Zap, badge: 'Boost' },
  ];

  // If on auth page, hide global navbar for full-screen dedicated auth layout
  const isAuthPage = pathname === '/auth' || pathname?.startsWith('/auth/');
  if (isAuthPage) {
    return null;
  }

  return (
    <>
      <header
        className={`sticky top-0 z-40 backdrop-blur-2xl backdrop-saturate-150 bg-white/80 dark:bg-[#0D0C0B]/80 supports-[backdrop-filter]:bg-white/70 dark:supports-[backdrop-filter]:bg-[#0D0C0B]/70 border-b transition-all duration-300 ${
          isScrolled
            ? 'border-border/80 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)]'
            : 'border-border/40'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-10 lg:px-12 xl:px-14 h-16 flex items-center justify-between gap-4">
          {/* Left: Brand Logo & Live Pulse Badge (outbid.lol inspired) */}
          <div className="flex items-center gap-3 lg:gap-4 shrink-0">
            <Link href="/" className="flex items-center gap-2 hover:opacity-95 transition-opacity">
              <Logo
                variant={resolvedTheme === 'dark' ? 'dark' : 'horizontal'}
                width={146}
                height={32}
              />
            </Link>

            {/* Live Launches Counter Badge */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>24 Live Launches</span>
            </div>
          </div>

          {/* Center: Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 xl:gap-2 text-xs font-semibold">
            {navLinks.map((item) => {
              const isActive =
                pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all ${
                    isActive
                      ? 'bg-primary-subtle text-primary font-bold'
                      : 'text-text-secondary hover:text-text-primary hover:bg-slate-100/60 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <Icon
                    className={`w-3.5 h-3.5 ${
                      item.name === 'Trending'
                        ? 'text-rose-500'
                        : item.name === 'Promote'
                        ? 'text-amber-500'
                        : ''
                    }`}
                  />
                  <span>{item.name}</span>
                  {item.badge && (
                    <span
                      className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded-md ${
                        item.badge === 'Hot'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                          : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right: Desktop Actions & User Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            {/* Search Icon Trigger (Clean Minimalist outbid.lol style) */}
            <button
              type="button"
              onClick={openSearch}
              className="p-2 text-text-secondary hover:text-text-primary rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5"
              aria-label="Quick Search"
              title="Search Launches (⌘K)"
            >
              <Search className="w-4 h-4 text-text-secondary" />
              <kbd className="hidden xl:inline-block text-[10px] font-mono px-1.5 py-0.2 rounded bg-surface-sunken border border-border text-text-muted">
                ⌘K
              </kbd>
            </button>

            {/* Dark / Light Mode Toggle */}
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

            {/* Submit Product CTA Button */}
            <Link
              href="/submit"
              className="hidden lg:inline-flex items-center gap-1.5 bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-semibold px-4 py-2 rounded-xl text-xs sm:text-sm transition-all shadow-sm shadow-primary/20 shrink-0 whitespace-nowrap active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 text-white shrink-0" />
              <span>Submit Product</span>
            </Link>

            {/* User Profile / Auth State Chip */}
            {currentUser ? (
              <div className="hidden lg:block relative">
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-xl border border-border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-semibold text-text-primary"
                >
                  <div className="w-7 h-7 rounded-lg bg-primary-subtle text-primary flex items-center justify-center font-bold text-xs uppercase">
                    {(currentUser.email || currentUser.name || 'U').charAt(0)}
                  </div>
                  <span className="max-w-[90px] truncate hidden md:inline">
                    {currentUser.founderProfile?.displayName ||
                      currentUser.name ||
                      (currentUser.email ? currentUser.email.split('@')[0] : 'Account')}
                  </span>
                  <ChevronDown className="w-3 h-3 text-text-muted" />
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-surface-elevated border border-border rounded-2xl shadow-popover py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-3.5 py-2 border-b border-border-subtle">
                      <p className="text-xs font-bold text-text-primary truncate">
                        {currentUser.email || currentUser.name || 'Founder'}
                      </p>
                      <span className="inline-block mt-0.5 px-2 py-0.5 text-[9px] font-black uppercase rounded bg-primary-subtle text-primary">
                        {currentUser.role || 'USER'}
                      </span>
                    </div>

                    <Link
                      href="/dashboard"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                    >
                      <LayoutDashboard className="w-3.5 h-3.5 text-primary" />
                      <span>Founder Dashboard</span>
                    </Link>

                    {(currentUser.role === 'ADMIN' || currentUser.role === 'MODERATOR') && (
                      <Link
                        href="/admin"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                      >
                        <Shield className="w-3.5 h-3.5 text-purple-500" />
                        <span>Admin Moderation</span>
                        {currentUser.role === 'ADMIN' && (
                          <span className="ml-auto text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            Admin
                          </span>
                        )}
                      </Link>
                    )}

                    <div className="border-t border-border-subtle mt-1 pt-1">
                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-semibold text-status-error hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link
                href="/auth"
                className="hidden lg:flex text-xs sm:text-sm font-semibold text-text-primary hover:text-primary px-3.5 sm:px-4 py-2 rounded-xl border border-border hover:bg-slate-100/60 dark:hover:bg-slate-800 transition-colors whitespace-nowrap items-center justify-center shrink-0"
              >
                Sign In
              </Link>
            )}

            {/* Custom 3-Line Animated Hamburger Button */}
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

      {/* ========================================================= */}
      {/* MOBILE SLIDE-IN DRAWER FROM THE RIGHT (SMOOTH EASING) */}
      {/* ========================================================= */}
      <div
        className={`lg:hidden fixed inset-0 z-50 transition-all duration-300 ${
          isMobileMenuOpen ? 'pointer-events-auto visible' : 'pointer-events-none invisible'
        }`}
      >
        {/* Backdrop Overlay with smooth fade */}
        <div
          onClick={() => setIsMobileMenuOpen(false)}
          className={`fixed inset-0 bg-slate-950/60 backdrop-blur-md transition-opacity duration-300 ease-out ${
            isMobileMenuOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Right Drawer Panel with cubic-bezier smooth glide */}
        <div
          className={`fixed inset-y-0 right-0 w-80 max-w-[85vw] bg-surface-elevated/95 backdrop-blur-2xl border-l border-border shadow-2xl z-50 flex flex-col justify-between p-6 transition-transform duration-350 ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="space-y-6">
            {/* Drawer Top Header */}
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

            {/* Mobile Search Button */}
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

            {/* Mobile Navigation Links with subtle stagger */}
            <nav className="flex flex-col space-y-1.5">
              {navLinks.map((item, idx) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href));
                const Icon = item.icon;

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    style={{ transitionDelay: `${idx * 30}ms` }}
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
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isActive
                            ? 'bg-white/20 text-white'
                            : item.badge === 'Hot'
                            ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
                            : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>

            {/* Founder Section */}
            {currentUser && (
              <div className="pt-3 border-t border-border-subtle space-y-2">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block px-1">
                  Founder Workspace
                </span>
                <Link
                  href="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3.5 py-2 text-xs font-semibold text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  <LayoutDashboard className="w-4 h-4 text-primary" />
                  <span>Founder Dashboard</span>
                </Link>

                {(currentUser.role === 'ADMIN' || currentUser.role === 'MODERATOR') && (
                  <Link
                    href="/admin"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3.5 py-2 text-xs font-semibold text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                  >
                    <Shield className="w-4 h-4 text-purple-500" />
                    <span>Admin Moderation</span>
                    {currentUser.role === 'ADMIN' && (
                      <span className="ml-auto text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400">
                        Admin
                      </span>
                    )}
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Drawer Bottom Actions */}
          <div className="pt-4 border-t border-border-subtle space-y-3">
            {/* Submit Product CTA */}
            <Link
              href="/submit"
              onClick={() => setIsMobileMenuOpen(false)}
              className="w-full h-11 bg-primary hover:bg-primary-hover active:bg-primary-active text-white font-semibold py-2.5 px-4 rounded-xl text-center text-sm flex items-center justify-center gap-2 shadow-sm shadow-primary/20 transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 text-white shrink-0" />
              <span>Submit Product</span>
            </Link>

            {/* Dedicated Sign In & Sign Up buttons inside mobile navigation */}
            {currentUser ? (
              <div className="flex items-center justify-between gap-3 pt-1">
                <Link
                  href="/dashboard"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="flex-1 h-10 px-3 text-xs font-semibold text-text-primary border border-border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors whitespace-nowrap flex items-center justify-center gap-1.5"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-primary" />
                  <span>Dashboard</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex-1 h-10 px-3 text-xs font-semibold text-status-error border border-rose-200 dark:border-rose-900/60 rounded-xl flex items-center justify-center gap-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors whitespace-nowrap"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2 pt-1">
                <Link
                  href="/auth"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full h-10 bg-gradient-to-r from-[#ff751f] via-amber-500 to-[#ea580c] hover:opacity-95 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm shadow-orange-500/20 transition-all active:scale-[0.98]"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-200" />
                  <span>Create Account (Sign Up)</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <Link
                  href="/auth"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-full h-10 bg-surface hover:bg-surface-sunken text-text-primary font-semibold rounded-xl text-xs flex items-center justify-center gap-2 border border-border transition-colors shadow-2xs"
                >
                  <UserIcon className="w-3.5 h-3.5 text-text-secondary" />
                  <span>Sign In</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default Navbar;
