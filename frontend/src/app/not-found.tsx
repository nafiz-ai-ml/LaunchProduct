'use client';

import React from 'react';
import Link from 'next/link';
import { Compass, Trophy, ArrowRight, Home, Search, Sparkles } from 'lucide-react';
import { BrandIcon } from '@/components/brand/Icon';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-md w-full text-center space-y-6 bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden">
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-brand-electric/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Brand 404 Illustration / Graphic */}
        <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-brand-electric/10 border border-brand-electric/20 rotate-6" />
          <div className="absolute inset-0 rounded-3xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 -rotate-3" />
          <div className="relative z-10 w-20 h-20 rounded-2xl bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-700 shadow-md flex items-center justify-center text-brand-electric">
            <Compass className="w-10 h-10 animate-spin-slow" />
          </div>
        </div>

        <div className="space-y-2">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-brand-electric/10 text-brand-electric border border-brand-electric/20">
            HTTP 404 — Error
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Page or Launch Not Found
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
            This product or page has moved, launched under another domain, or expired from active discovery.
          </p>
        </div>

        {/* Quick Links */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/leaderboards"
            id="back-to-leaderboard-btn"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/25 transition-all"
          >
            <Trophy className="w-4 h-4 text-amber-300" />
            <span>Back to Daily Leaderboard</span>
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span>Discover Feed</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
