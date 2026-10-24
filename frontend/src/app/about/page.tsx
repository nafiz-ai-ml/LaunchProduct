'use client';

import React from 'react';
import Link from 'next/link';
import {
  Info,
  Zap,
  ShieldCheck,
  Scale,
  Award,
  Globe,
  ArrowRight,
  Sparkles,
  Terminal,
} from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="w-full max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 sm:space-y-10 font-sans min-w-0 overflow-x-hidden">
      {/* Title */}
      <div className="space-y-3 border-b border-border pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
          <Info className="w-3.5 h-3.5 text-primary" />
          <span>Our Mission &amp; Product Model</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-text-primary tracking-tight">
          About LaunchProduct
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-2xl">
          LaunchProduct is a global, Pay-to-Rank product discovery platform designed for builders, SaaS innovators, AI engineers, and indie founders.
        </p>
      </div>

      {/* Mission & Core Principles */}
      <div className="space-y-8 text-xs sm:text-sm text-text-secondary leading-relaxed">
        <section className="rounded-2xl bg-surface border border-border p-4 sm:p-8 space-y-4">
          <h2 className="text-base sm:text-lg font-bold text-text-primary flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary" />
            <span>Why Pay-to-Rank?</span>
          </h2>
          <p>
            Traditional product directories often suffer from obscure algorithms, closed-door editorial favoritism, and rampant bot-voting syndicates. Early founders frequently find themselves forced to compete in popularity contests or buy fraudulent upvotes simply to be discovered.
          </p>
          <p>
            LaunchProduct takes an unapologetically transparent, commercial approach: <strong>leaderboard placement is determined directly by qualifying paid ranking amounts</strong>. If you believe in your product and want top-tier visibility, you pay to establish or improve your rank. There are no secret algorithms, editorial favors, or opaque review dampening.
          </p>
        </section>

        {/* Core Pillars */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="rounded-2xl bg-surface border border-border p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-primary">
              <Zap className="w-4 h-4" />
              <span>100% Accountless Workflow</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              No accounts, passwords, or cumbersome founder dashboards. Submit your product URL, select your entry payment ($5.99 min), and get instant confirmed leaderboard placement.
            </p>
          </div>

          <div className="rounded-2xl bg-surface border border-border p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-500">
              <ShieldCheck className="w-4 h-4" />
              <span>Full Commercial Transparency</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              We never disguise paid rankings as independent editorial endorsements. Our users know exactly what rank amounts qualify each position.
            </p>
          </div>

          <div className="rounded-2xl bg-surface border border-border p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-500">
              <Award className="w-4 h-4" />
              <span>Permanent Directory Directory</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Once published, products remain in our permanent directory and maintain their cumulative All-Time ranking score indefinitely.
            </p>
          </div>

          <div className="rounded-2xl bg-surface border border-border p-5 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-indigo-500">
              <Globe className="w-4 h-4" />
              <span>Immutable Daily Archives</span>
            </div>
            <p className="text-xs text-text-muted leading-relaxed">
              Each calendar day runs from 00:00:00 to 23:59:59 UTC, freezing daily leaderboards into immutable historical snapshots at midnight.
            </p>
          </div>
        </div>

        {/* Disclaimer Notice */}
        <section className="rounded-2xl bg-surface-sunken border border-border p-6 space-y-2 text-xs text-text-muted">
          <h3 className="font-bold text-text-primary text-xs uppercase tracking-wider">
            Important Commercial Notice
          </h3>
          <p>
            LaunchProduct is an open commercial leaderboard. Positions represent commercial advertising and discovery rankings, not quality audits or endorsements. LaunchProduct makes no representations regarding the quality, suitability, or financial viability of listed third-party software products.
          </p>
        </section>
      </div>

      {/* CTA Footer */}
      <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-border">
        <Link
          href="/"
          className="text-xs font-semibold text-text-muted hover:text-text-primary transition-colors inline-flex items-center gap-1.5"
        >
          <span>← Back to Leaderboards</span>
        </Link>
        <Link
          href="/submit"
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs transition-colors inline-flex items-center justify-center gap-2"
        >
          <span>Submit &amp; Rank ($5.99)</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
