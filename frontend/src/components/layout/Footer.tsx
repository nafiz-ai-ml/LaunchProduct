'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ExternalLink, TrendingUp, ShieldCheck } from 'lucide-react';

export function Footer() {
  const pathname = usePathname();

  // Hide global footer on auth login pages if accessed
  if (pathname === '/auth' || pathname?.startsWith('/auth/')) {
    return null;
  }

  return (
    <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-surface/40 backdrop-blur-md mt-auto pt-12 pb-16 px-4">
      <div className="max-w-3xl mx-auto space-y-8 text-center font-sans">
        {/* Stats Headline */}
        <div className="space-y-1">
          <p className="text-xs sm:text-sm text-text-secondary">
            Some stats about this{' '}
            <span className="text-primary font-bold">Pay-to-Rank discovery platform</span>
          </p>
        </div>

        {/* 3 Outbid-Style Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-xl mx-auto">
          {/* Card 1: Visitors */}
          <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border shadow-xs flex flex-col items-center justify-center">
            <div className="flex items-center gap-1.5 font-mono text-lg sm:text-xl font-black text-text-primary">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>1,250,000+</span>
            </div>
            <span className="text-[11px] text-text-muted mt-0.5">visitors</span>
          </div>

          {/* Card 2: Revenue / Ranking Volume */}
          <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border shadow-xs flex flex-col items-center justify-center">
            <div className="font-mono text-lg sm:text-xl font-black text-primary">
              $ 148,650
            </div>
            <span className="text-[11px] text-text-muted mt-0.5">paid ranking volume</span>
          </div>

          {/* Card 3: Products Added */}
          <div className="p-4 sm:p-5 rounded-2xl bg-surface border border-border shadow-xs flex flex-col items-center justify-center">
            <div className="font-mono text-lg sm:text-xl font-black text-text-primary">
              1,240+
            </div>
            <span className="text-[11px] text-text-muted mt-0.5">products listed</span>
          </div>
        </div>

        {/* Creator / Brand Credits */}
        <div className="text-xs text-text-secondary">
          <span>Built by </span>
          <span className="font-semibold text-text-primary">LaunchProduct Team</span>
          <span> • Powered by verified </span>
          <span className="text-primary font-semibold">Merchant of Record</span>
          <span> payments</span>
        </div>

        {/* Minimal Navigation Links Row */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-text-muted font-medium">
          <Link href="/rules" className="hover:text-primary transition-colors">
            Rules
          </Link>
          <span>·</span>
          <Link href="/faq" className="hover:text-primary transition-colors">
            FAQ
          </Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-primary transition-colors">
            Terms
          </Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-primary transition-colors">
            Privacy
          </Link>
          <span>·</span>
          <Link href="/imprint" className="hover:text-primary transition-colors">
            Imprint
          </Link>
          <span>·</span>
          <Link href="/about" className="hover:text-primary transition-colors">
            About
          </Link>
        </div>

        {/* Bottom Trust Badge */}
        <div className="pt-2 flex justify-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface border border-border shadow-xs text-xs">
            <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-mono text-[10px] font-bold flex items-center justify-center">
              98
            </span>
            <span className="font-bold text-text-primary text-xs">launchproduct.io</span>
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold border-l border-border pl-2">
              Verified Pay-to-Rank
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
