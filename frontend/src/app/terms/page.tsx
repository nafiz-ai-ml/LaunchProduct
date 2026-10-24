'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Scale,
  FileText,
  AlertCircle,
  CheckCircle2,
  Lock,
  Globe,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  Zap,
  DollarSign,
  Clock,
  History,
} from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-bg text-text-primary pb-24 min-w-0 overflow-x-hidden">
      {/* Ambient background aura */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-primary/10 blur-[130px] rounded-full" />
      </div>

      <div className="max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 pt-6 sm:pt-12 min-w-0">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-text-secondary mb-6">
          <Link href="/" className="hover:text-primary transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-text-primary font-medium">Terms of Service</span>
        </nav>

        {/* Header Hero */}
        <div className="relative rounded-2xl sm:rounded-3xl p-5 sm:p-10 mb-8 sm:mb-12 border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-b from-surface/90 to-surface/40 backdrop-blur-xl shadow-xl overflow-hidden">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 border border-primary/25 text-primary mb-4 shadow-sm">
              <Scale className="w-3.5 h-3.5" />
              <span>Commercial Terms &amp; Ranking Transparency Agreement</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
              Terms of <span className="text-primary">Service</span>
            </h1>
            <p className="mt-4 text-sm sm:text-base text-text-secondary leading-relaxed">
              LaunchProduct is a commercial Pay-to-Rank product discovery platform. These Terms govern product submissions, ranking payments, leaderboard updates, daily archives, and community features.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-text-secondary pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
              <span><strong>Last Updated:</strong> October 2026</span>
              <span>•</span>
              <span><strong>Model:</strong> Pay-to-Rank Discovery Platform</span>
              <span>•</span>
              <span><strong>Currency:</strong> USD (Integer Minor Units / Cents)</span>
            </div>
          </div>
        </div>

        {/* Document Content */}
        <div className="space-y-10 text-sm leading-relaxed text-text-secondary">
          {/* Section 1: Core Pay-to-Rank Ranking Principle */}
          <section className="rounded-2xl p-6 sm:p-8 border border-primary/30 bg-surface/80 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-2xl pointer-events-none" />
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2.5 mb-4">
              <span className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center text-xs font-bold">
                1
              </span>
              Commercial Pay-to-Rank Ranking Principles
            </h2>
            <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-text-primary mb-4 text-xs font-medium">
              LaunchProduct operates as a transparent Pay-to-Rank platform. A product&apos;s leaderboard rank is determined strictly by its qualifying paid ranking amount in USD minor units (cents), not by independent editorial score, popularity, or upvote counts.
            </div>
            <p className="mb-3">
              By participating on LaunchProduct, founders and visitors acknowledge and agree to the following ranking rules:
            </p>
            <ul className="list-disc pl-5 space-y-2 mb-4">
              <li>
                <strong>Minimum Initial Entry Payment:</strong> Establishing an initial ranked leaderboard listing requires a minimum qualifying payment of <strong>$5.99</strong> (599 cents USD).
              </li>
              <li>
                <strong>Ranking Step-Up &amp; Outbidding:</strong> Founders may outbid competitors or improve rank by paying incremental deltas with a minimum step-up increment of <strong>$1.00</strong> (100 cents USD).
              </li>
              <li>
                <strong>No Editorial Endorsement:</strong> Paid ranking positions represent commercial discoverability and must never be portrayed as independent editorial certifications or quality endorsements.
              </li>
              <li>
                <strong>Community Signals Decoupled:</strong> Upvotes and user reviews remain authentic social validation features; neither upvotes nor review ratings have any mathematical influence on leaderboard rank.
              </li>
            </ul>
          </section>

          {/* Section 2: Leaderboard Definitions & UTC Daily Reset */}
          <section className="rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800/80 bg-surface/60 backdrop-blur-md">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2.5 mb-4">
              <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                2
              </span>
              Leaderboards &amp; UTC Calendar Day Boundaries
            </h2>
            <p className="mb-3">LaunchProduct operates four distinct leaderboard experiences:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
              <div className="p-4 rounded-xl bg-surface-sunken border border-border">
                <h4 className="font-bold text-xs text-text-primary uppercase flex items-center gap-1.5 mb-1.5">
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> Today&apos;s Leaderboard
                </h4>
                <p className="text-xs text-text-muted leading-relaxed">
                  Reflects qualifying payments confirmed during the active UTC calendar day (00:00:00 UTC to 23:59:59 UTC). Updates dynamically in real-time upon confirmed payment.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-sunken border border-border">
                <h4 className="font-bold text-xs text-text-primary uppercase flex items-center gap-1.5 mb-1.5">
                  <History className="w-3.5 h-3.5 text-primary" /> Daily Archive
                </h4>
                <p className="text-xs text-text-muted leading-relaxed">
                  At midnight UTC (00:00:00 UTC), today&apos;s board freezes into a permanent, immutable daily snapshot preserving historical ranks and product metadata.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-sunken border border-border">
                <h4 className="font-bold text-xs text-text-primary uppercase flex items-center gap-1.5 mb-1.5">
                  <Trophy className="w-3.5 h-3.5 text-amber-500" /> All-Time Leaderboard
                </h4>
                <p className="text-xs text-text-muted leading-relaxed">
                  Cumulative ranking of all active products sorted by their lifetime qualifying paid ranking amounts in minor units.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-surface-sunken border border-border">
                <h4 className="font-bold text-xs text-text-primary uppercase flex items-center gap-1.5 mb-1.5">
                  <Layers className="w-3.5 h-3.5 text-primary" /> Category Leaderboards
                </h4>
                <p className="text-xs text-text-muted leading-relaxed">
                  Vertical leaderboards for specific industry taxonomies (e.g. AI Tools, Developer Tools, SaaS) sorted by cumulative paid rank amounts.
                </p>
              </div>
            </div>
            <p className="text-xs text-text-muted">
              <strong>Tie-Breaking Rule:</strong> When two or more products possess identical qualifying paid ranking amounts, position priority is awarded strictly on a first-mover basis (the product whose payment was confirmed earlier in UTC time wins). If identical to the millisecond, earlier product creation date breaks the tie.
            </p>
          </section>

          {/* Section 3: Payment Confirmation, Idempotency & Reversals */}
          <section className="rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800/80 bg-surface/60 backdrop-blur-md">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2.5 mb-4">
              <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                3
              </span>
              Payment Confirmation, Webhook Security &amp; Ledger Integrity
            </h2>
            <ul className="list-disc pl-5 space-y-2 mb-4">
              <li>
                <strong>Server-Verified Confirmation:</strong> Leaderboard positions increase only after server-side cryptographic signature verification of Merchant of Record webhook events. Client-submitted payment claims are never trusted.
              </li>
              <li>
                <strong>Durable Ledger:</strong> Every confirmed payment generates an immutable record in the platform&apos;s durable ranking ledger, documenting timestamp, qualifying minor units, and product attribution.
              </li>
              <li>
                <strong>Refunds, Chargebacks &amp; Disputes:</strong> If a ranking payment is refunded, charged back, or disputed, the corresponding qualifying cents are immediately deducted from the product&apos;s live ranking totals. Live scores cannot fall below zero. Completed historical daily archive snapshots remain immutable.
              </li>
            </ul>
          </section>

          {/* Section 4: Commercial Disclaimers & No Guarantee of Results */}
          <section className="rounded-2xl p-6 sm:p-8 border border-amber-500/30 bg-amber-500/5 backdrop-blur-md">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2.5 mb-4">
              <span className="w-7 h-7 rounded-lg bg-amber-500 text-white flex items-center justify-center text-xs font-bold">
                4
              </span>
              No Guarantee of Traffic, Customers, or Revenue
            </h2>
            <p className="mb-3 text-xs sm:text-sm font-medium">
              Purchasing a Pay-to-Rank position guarantees placement on the applicable leaderboard according to qualifying payment amounts. <strong>Paid ranking does NOT guarantee traffic, click-throughs, user conversions, customers, sales, or business revenue.</strong>
            </p>
            <p className="text-xs text-text-muted">
              Outbound conversion, click-through rates, and customer acquisition depend solely on your product&apos;s market fit, visual assets, landing page conversion, and external economic factors. LaunchProduct disclaims all warranties regarding business outcomes.
            </p>
          </section>

          {/* Section 5: Product Eligibility & Duplicate Policy */}
          <section className="rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800/80 bg-surface/60 backdrop-blur-md">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2.5 mb-4">
              <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                5
              </span>
              Product Eligibility, Ownership &amp; Duplicate Submissions
            </h2>
            <p className="mb-3">
              To protect discovery integrity, the following rules apply to all submissions:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Canonical Domain Constraint:</strong> Each distinct product is uniquely identified by its canonical apex domain. Duplicate submissions targeting the same software are rejected.
              </li>
              <li>
                <strong>Prohibited Content:</strong> Products involving malware, spyware, deceptive phishing, fraudulent financial schemes, or unlawful materials are rejected or immediately terminated without refund.
              </li>
              <li>
                <strong>Soft Deletion:</strong> Removing or soft-deleting a product revokes its active live leaderboard display while preserving historical snapshot integrity in previously frozen archives.
              </li>
            </ul>
          </section>

          {/* Contact / Inquiries Box */}
          <div className="rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800/80 bg-surface/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h3 className="text-base font-bold text-text-primary">Questions regarding commercial Pay-to-Rank rules?</h3>
              <p className="text-xs text-text-secondary mt-1">
                Contact our compliance and governance team at <span className="font-mono text-primary">support@launchproduct.io</span>.
              </p>
            </div>
            <Link
              href="/leaderboards"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-bold shadow-md hover:bg-primary-hover transition-all shrink-0"
            >
              <span>Explore Live Leaderboards</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function Trophy(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function Layers(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
      <path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65" />
      <path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65" />
    </svg>
  );
}
