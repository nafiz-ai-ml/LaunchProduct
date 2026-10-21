'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, ArrowRight } from 'lucide-react';

export default function RetiredPromotePage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace('/');
    }, 2500);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-5 font-sans">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
        <Zap className="w-7 h-7" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-black text-text-primary tracking-tight">
          Promotion Packages Have Been Retired
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-md mx-auto">
          LaunchProduct has transformed into a direct, transparent <strong>Pay-to-Rank</strong> product discovery platform. Separate promotional packages have been replaced by commercial leaderboard bids starting at $5.99.
        </p>
      </div>

      <div className="pt-2 flex items-center justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs transition-colors"
        >
          <span>Explore Live Leaderboards</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
        <Link
          href="/submit"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-surface border border-border hover:border-primary text-text-primary text-xs font-semibold transition-colors"
        >
          <span>Submit &amp; Rank ($5.99)</span>
        </Link>
      </div>

      <p className="text-[11px] text-text-muted">
        Redirecting to the main leaderboard in a few seconds...
      </p>
    </div>
  );
}
