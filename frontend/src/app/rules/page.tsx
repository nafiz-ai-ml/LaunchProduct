'use client';

import React from 'react';
import Link from 'next/link';
import {
  BookOpen,
  Zap,
  Award,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  DollarSign,
  Scale,
  RefreshCw,
} from 'lucide-react';

export default function RulesPage() {
  return (
    <div className="w-full max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 sm:space-y-10 font-sans min-w-0 overflow-x-hidden">
      {/* Page Title */}
      <div className="space-y-3 border-b border-border pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
          <BookOpen className="w-3.5 h-3.5 text-primary" />
          <span>Commercial Transparency &amp; Operating Guidelines</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-text-primary tracking-tight">
          LaunchProduct Pay-to-Rank Rules
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-2xl">
          LaunchProduct operates as a commercial, Pay-to-Rank product discovery platform. Leaderboard positions are determined strictly by qualifying paid ranking amounts, not by community votes, review scores, or editorial bias.
        </p>
      </div>

      {/* Quick Summary Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-surface border border-border space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
            <DollarSign className="w-4 h-4" />
            <span>Minimum Initial Entry</span>
          </div>
          <div className="text-xl font-black text-text-primary font-mono">$5.99 USD</div>
          <p className="text-[11px] text-text-muted leading-relaxed">
            Minimum payment to publish an initial permanent listing and enter both All-Time &amp; Today boards.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-wider">
            <Clock className="w-4 h-4" />
            <span>UTC Daily Cycle</span>
          </div>
          <div className="text-xl font-black text-text-primary font-mono">00:00:00 UTC</div>
          <p className="text-[11px] text-text-muted leading-relaxed">
            Daily rankings run from 00:00:00 UTC to 23:59:59 UTC, freezing into immutable daily archives at midnight.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-500 uppercase tracking-wider">
            <Zap className="w-4 h-4" />
            <span>Outbid Increment</span>
          </div>
          <div className="text-xl font-black text-text-primary font-mono">$1.00 USD Min</div>
          <p className="text-[11px] text-text-muted leading-relaxed">
            To surpass an existing product, a step-up payment must exceed its qualifying amount by at least $1.00.
          </p>
        </div>
      </div>

      {/* Detailed Rules Sections */}
      <div className="space-y-8 text-xs sm:text-sm text-text-secondary leading-relaxed">
        {/* Rule 1: Pay-to-Rank Principle */}
        <section className="rounded-2xl bg-surface border border-border p-6 space-y-3">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Scale className="w-4 h-4 text-primary" />
            <span>1. Commercial Ranking Mechanism</span>
          </h2>
          <p>
            Leaderboard positions on LaunchProduct are determined entirely by <strong>qualifying paid ranking amounts</strong> in integer USD cents. Products with higher confirmed paid ranking amounts appear above products with lower amounts.
          </p>
          <p>
            Upvotes, community reviews, and outbound click metrics remain active as social engagement indicators, but they <strong>never alter leaderboard positions</strong>.
          </p>
        </section>

        {/* Rule 2: Four Board Experiences */}
        <section className="rounded-2xl bg-surface border border-border p-6 space-y-4">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Award className="w-4 h-4 text-primary" />
            <span>2. The Four Leaderboard Boards</span>
          </h2>
          <div className="space-y-3 pl-2 border-l-2 border-primary/30">
            <div>
              <h3 className="font-bold text-text-primary">A. All-Time Leaderboard</h3>
              <p className="text-xs mt-0.5">
                Ranks all published products by their cumulative verified All-Time ranking amount. An initial submission payment establishes the permanent All-Time ranking score.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-text-primary">B. Today’s Daily Leaderboard</h3>
              <p className="text-xs mt-0.5">
                Ranks products competing for the current UTC calendar day (00:00:00 to 23:59:59 UTC). Updates in real-time upon confirmed payment.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-text-primary">C. Daily Archive</h3>
              <p className="text-xs mt-0.5">
                At midnight UTC, the final daily rankings are permanently frozen into immutable snapshot records. Completed daily archives are never altered by subsequent payments.
              </p>
            </div>
            <div>
              <h3 className="font-bold text-text-primary">D. Category Leaderboards</h3>
              <p className="text-xs mt-0.5">
                Displays separate rankings for each of our 8 supported categories (AI Tools, AI Agents, SaaS, Developer Tools, Productivity, Marketing Tools, SEO Tools, Design Tools).
              </p>
            </div>
          </div>
        </section>

        {/* Rule 3: Submission & Accounting */}
        <section className="rounded-2xl bg-surface border border-border p-6 space-y-3">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-primary" />
            <span>3. Product Submission &amp; Daily Accounting</span>
          </h2>
          <p>
            <strong>Permanent Listings:</strong> When a founder submits a product and confirms the initial qualifying payment ($5.99 min), the product is permanently added to the LaunchProduct directory. It does not expire or disappear after the day ends.
          </p>
          <p>
            <strong>Subsequent Daily Entries:</strong> A founder wishing to compete on a new day’s leaderboard must enter the product’s URL and submit a new qualifying payment for that UTC date. Daily participation strictly credits that specific date’s daily board and <strong>does not inflate All-Time totals</strong>.
          </p>
          <p>
            <strong>Product Identity &amp; Anti-Duplication:</strong> Products are uniquely identified by normalized canonical domain (e.g. <code className="px-1.5 py-0.5 rounded bg-surface-sunken border text-[11px]">example.com</code>). Repeat submissions automatically credit the existing permanent listing rather than creating duplicate entries.
          </p>
        </section>

        {/* Rule 4: Tie-Breaking */}
        <section className="rounded-2xl bg-surface border border-border p-6 space-y-3">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <span>4. Tie-Breaking Principle</span>
          </h2>
          <p>
            When two products have identical qualifying paid amounts, the tie is resolved in favor of the product that achieved that amount earlier (<code className="px-1.5 py-0.5 rounded bg-surface-sunken border text-[11px]">firstPaidAt</code> timestamp). If timestamps are identical, the earlier product submission date applies.
          </p>
        </section>

        {/* Rule 5: Moderation & Removal */}
        <section className="rounded-2xl bg-surface border border-border p-6 space-y-3">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span>5. Moderation &amp; Prohibited Content</span>
          </h2>
          <p>
            All submitted products must adhere to platform standards. We strictly prohibit:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>Malicious software, spyware, keyloggers, or unauthorized access tools.</li>
            <li>Deceptive scam platforms, phishing landing pages, or unregistered financial schemes.</li>
            <li>Adult content, hate speech, harassment, or unlawful materials.</li>
            <li>Duplicate spam listings created under alternate subdomains or redirects.</li>
          </ul>
          <p className="text-xs">
            Products violating these guidelines will be removed or quarantined by platform administrators without entitlement to refund.
          </p>
        </section>

        {/* Rule 6: Disclaimers */}
        <section className="rounded-2xl bg-amber-500/10 border border-amber-500/25 p-5 space-y-2 text-xs text-amber-800 dark:text-amber-300">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Commercial Transparency &amp; No Guarantee Disclaimer</span>
          </div>
          <p>
            LaunchProduct rankings are commercially determined. Higher ranking placement enhances visibility across our discovery boards, but does not guarantee traffic, clicks, signups, customers, sales, or revenue. All ranking payments are final once published.
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
          <span>Submit &amp; Rank Your Product</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
