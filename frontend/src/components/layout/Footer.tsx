'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { useTheme } from './ThemeProvider';
import {
  ShieldCheck,
  Flame,
  ExternalLink,
  Heart,
  TrendingUp,
  Award,
  Zap,
  Grid,
} from 'lucide-react';

export function Footer() {
  const pathname = usePathname();
  const { resolvedTheme } = useTheme();

  // Hide global footer on auth login pages for clean focused view
  if (pathname === '/auth' || pathname?.startsWith('/auth/')) {
    return null;
  }

  const categories = [
    { name: 'AI Agents & Tools', href: '/categories/ai-tools' },
    { name: 'Developer Utilities', href: '/categories/developer-tools' },
    { name: 'SaaS & Enterprise B2B', href: '/categories/saas-b2b' },
    { name: 'Productivity Systems', href: '/categories/productivity' },
    { name: 'Marketing & Sales', href: '/categories/marketing-sales' },
    { name: 'Design & Creative', href: '/categories/design-creative' },
    { name: 'Analytics & Data', href: '/categories/analytics-data' },
    { name: 'Security & Privacy', href: '/categories/security-privacy' },
  ];

  const productLinks = [
    { name: 'Daily Leaderboard', href: '/leaderboards' },
    { name: 'Trending Launches', href: '/trending' },
    { name: 'Browse Categories', href: '/categories' },
    { name: 'Submit a Launch', href: '/submit' },
    { name: 'Sponsorship & Promote', href: '/promote' },
    { name: 'Founder Dashboard', href: '/dashboard' },
  ];

  interface FooterLink {
    name: string;
    href: string;
    external?: boolean;
  }

  const resourceLinks: FooterLink[] = [
    { name: 'Anti-Fraud Engine', href: '/anti-fraud' },
    { name: 'Platform Guidelines', href: '/terms' },
    { name: 'Privacy Policy', href: '/privacy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'Sponsorship Inquiries', href: '/promote' },
  ];

  return (
    <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md transition-colors mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8">
          {/* Brand Col */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="inline-block hover:opacity-90 transition-opacity">
              <Logo
                variant={resolvedTheme === 'dark' ? 'dark' : 'horizontal'}
                width={154}
                height={32}
              />
            </Link>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm">
              LaunchProduct is the high-integrity product discovery and growth platform. Democratizing early distribution for indie founders, AI builders, and developer tool creators with transparent, fraud-resilient community rankings.
            </p>

            <div className="flex items-center gap-3 pt-1 flex-wrap">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <ShieldCheck className="w-3.5 h-3.5" />
                Anti-Fraud Engine v1.0
              </div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                <Flame className="w-3.5 h-3.5" />
                Dual-Engine Discovery
              </div>
            </div>

            {/* Premium Social Media Icons (LinkedIn, X/Twitter, GitHub) */}
            <div className="pt-2 flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-400">Connect:</span>
              {/* X / Twitter */}
              <a
                href="https://x.com/launchproduct"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="X (formerly Twitter)"
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-black hover:text-white text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-xs"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              {/* LinkedIn */}
              <a
                href="https://linkedin.com/company/launchproduct"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-[#0A66C2] hover:text-white text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-xs"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
                </svg>
              </a>

              {/* GitHub */}
              <a
                href="https://github.com/launchproduct"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800/80 hover:bg-[#24292e] hover:text-white text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-center transition-all duration-200 hover:scale-105 shadow-xs"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
              </a>
            </div>
          </div>

          {/* Categories Col */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
              Directory Categories
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
              {categories.map((c) => (
                <li key={c.name}>
                  <Link href={c.href} className="hover:text-brand-electric transition-colors">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform Col */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
              Product & Discovery
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
              {productLinks.map((p) => (
                <li key={p.name}>
                  <Link href={p.href} className="hover:text-brand-electric transition-colors">
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources & System Col */}
          <div>
            <h4 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-4">
              Platform & Legal
            </h4>
            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
              {resourceLinks.map((r) => (
                <li key={r.name}>
                  {r.external ? (
                    <a
                      href={r.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-brand-electric transition-colors inline-flex items-center gap-1"
                    >
                      {r.name}
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </a>
                  ) : (
                    <Link href={r.href} className="hover:text-brand-electric transition-colors">
                      {r.name}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-slate-200/80 dark:border-slate-800/80 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <p>© 2026 LaunchProduct Inc. All rights reserved.</p>
          </div>
          <p className="flex items-center gap-1.5">
            <span>Built for high-growth builders with</span>
            <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
            <span>& anti-fraud precision.</span>
          </p>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
