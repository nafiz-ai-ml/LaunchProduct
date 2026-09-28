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
} from 'lucide-react';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-bg text-text-primary pb-24">
      {/* Ambient background aura */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-brand-primary/10 blur-[130px] rounded-full" />
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-text-secondary mb-6">
          <Link href="/" className="hover:text-brand-primary transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-text-primary font-medium">Terms of Service</span>
        </nav>

        {/* Header Hero */}
        <div className="relative rounded-3xl p-8 sm:p-12 mb-12 border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-b from-surface/90 to-surface/40 backdrop-blur-xl shadow-xl overflow-hidden">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-primary/10 border border-brand-primary/25 text-brand-primary mb-4 shadow-sm">
              <Scale className="w-3.5 h-3.5" />
              <span>Platform Legal Agreement & Integrity Standards</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
              Terms of <span className="text-gradient">Service</span>
            </h1>
            <p className="mt-4 text-sm sm:text-base text-text-secondary leading-relaxed">
              Welcome to LaunchProduct. These Terms govern your access to our product discovery platform, founder verification workflows, paid distribution slots, and voting mechanisms.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-text-secondary pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
              <span><strong>Effective Date:</strong> September 25, 2026</span>
              <span>•</span>
              <span><strong>Version:</strong> 2.4.0 (Sybil-Resistance Update)</span>
              <span>•</span>
              <span><strong>Governing Jurisdiction:</strong> Delaware, USA / London, UK</span>
            </div>
          </div>
        </div>

        {/* Document Content */}
        <div className="space-y-10 text-sm leading-relaxed text-text-secondary">
          {/* Section 1 */}
          <section className="rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800/80 bg-surface/60 backdrop-blur-md">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2.5 mb-4">
              <span className="w-7 h-7 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-bold">
                1
              </span>
              Acceptance of Platform Terms
            </h2>
            <p className="mb-3">
              By accessing, browsing, submitting software to, or interacting with <strong>LaunchProduct</strong> ("we", "us", or "our"), you agree to be legally bound by these Terms of Service. If you are entering into this agreement on behalf of a company or legal entity, you represent that you possess the authority to bind such entity.
            </p>
            <p>
              If you do not agree with any provision of these terms, you must immediately discontinue your use of LaunchProduct services and interfaces.
            </p>
          </section>

          {/* Section 2 */}
          <section className="rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800/80 bg-surface/60 backdrop-blur-md">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2.5 mb-4">
              <span className="w-7 h-7 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-bold">
                2
              </span>
              Product Submissions & Founder Verification
            </h2>
            <p className="mb-3">
              Builders and makers may submit public applications, AI agents, developer libraries, and SaaS tools to the platform. By submitting a product:
            </p>
            <ul className="list-disc pl-5 space-y-2 mb-4">
              <li>
                You confirm that you own the intellectual property or possess explicit authorization from the product owners to list the software.
              </li>
              <li>
                You grant LaunchProduct a non-exclusive, worldwide, royalty-free license to display your screenshots, logos, taglines, and public website metadata for discovery and directory indexing purposes.
              </li>
              <li>
                <strong>DNS Ownership Verification:</strong> Verified founder status requires completing our cryptographic DNS TXT record or HTML meta tag challenge. Attempting to claim unauthorized domain control will result in immediate permanent account termination.
              </li>
            </ul>
          </section>

          {/* Section 3: Anti-Fraud and Sybil Resistance */}
          <section className="rounded-2xl p-6 sm:p-8 border border-brand-primary/30 bg-surface/80 backdrop-blur-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-primary/10 rounded-full blur-2xl pointer-events-none" />
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2.5 mb-4">
              <span className="w-7 h-7 rounded-lg bg-brand-primary text-white flex items-center justify-center text-xs font-bold">
                3
              </span>
              Authentic Voting, Anti-Gaming & Sybil Resistance
            </h2>
            <div className="p-4 rounded-xl bg-brand-primary/10 border border-brand-primary/20 text-text-primary mb-4 text-xs font-medium">
              LaunchProduct is founded on the core principle of authentic meritocracy. Coordinated voting rings, botting, and upvote purchasing are strictly prohibited.
            </div>
            <p className="mb-3">
              Our automated anti-fraud engine actively analyzes vote origin signals including ASN proxy detection, IP subnet clustering, disposable mailbox patterns, and account karma age.
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Vote Manipulation:</strong> Any product found soliciting, purchasing, or incentivizing artificial upvotes will be quarantined, stripped of leaderboard rank, or permanently banned.
              </li>
              <li>
                <strong>Zero Karma Multiplier:</strong> Suspicious votes are automatically flagged and multiplied by $0.00$, preserving rank integrity without notifying malicious actors.
              </li>
            </ul>
          </section>

          {/* Section 4: Commercial Sponsorships */}
          <section className="rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800/80 bg-surface/60 backdrop-blur-md">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2.5 mb-4">
              <span className="w-7 h-7 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-bold">
                4
              </span>
              Commercial Sponsorships & Ethical Demarcation
            </h2>
            <p className="mb-3">
              Makers may reserve paid promotional slots (Launch Day Boost, Category Featured, Homepage Spotlight, Launch Partner) through our Merchant of Record partner (Paddle).
            </p>
            <ul className="list-disc pl-5 space-y-2 mb-4">
              <li>
                <strong>No Organic Rank Manipulation:</strong> Paid sponsorships provide prominent visual visibility in designated top slots, but do <em>NOT</em> alter or purchase organic leaderboard rankings.
              </li>
              <li>
                <strong>Ethical Labeling:</strong> All sponsored slots will be visibly labeled with an amber "SPONSORED" badge to ensure full transparency to our community.
              </li>
              <li>
                <strong>Refund Policy:</strong> Sponsorship slots may be cancelled for a full refund up to 48 hours prior to the reserved campaign date. Within 48 hours of scheduled launch, slot reservations are final and non-refundable.
              </li>
            </ul>
          </section>

          {/* Section 5: Intellectual Property */}
          <section className="rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800/80 bg-surface/60 backdrop-blur-md">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2.5 mb-4">
              <span className="w-7 h-7 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-bold">
                5
              </span>
              Intellectual Property Rights
            </h2>
            <p className="mb-3">
              The LaunchProduct design system, proprietary ranking algorithms, codebases, graphics, and brand trademarks are the exclusive intellectual property of LaunchProduct Inc. You may not copy, reverse-engineer, frame, or scrape platform data in bulk without explicit written consent.
            </p>
          </section>

          {/* Section 6: Limitation of Liability */}
          <section className="rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800/80 bg-surface/60 backdrop-blur-md">
            <h2 className="text-lg font-bold text-text-primary flex items-center gap-2.5 mb-4">
              <span className="w-7 h-7 rounded-lg bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-bold">
                6
              </span>
              Disclaimer & Limitation of Liability
            </h2>
            <p>
              LaunchProduct is provided on an "AS IS" and "AS AVAILABLE" basis. We make no express or implied warranties regarding continuous uptime, conversion rates, or traffic volumes. In no event shall LaunchProduct or its founders be liable for any indirect, incidental, or consequential damages resulting from platform downtime or third-party listings.
            </p>
          </section>

          {/* Contact / Inquiries Box */}
          <div className="rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800/80 bg-surface/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h3 className="text-base font-bold text-text-primary">Questions regarding these terms?</h3>
              <p className="text-xs text-text-secondary mt-1">
                Reach our legal and compliance office at <span className="font-mono text-brand-primary">legal@launchproduct.io</span>.
              </p>
            </div>
            <Link
              href="/anti-fraud"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-brand-primary/10 hover:bg-brand-primary/20 text-brand-primary text-xs font-semibold border border-brand-primary/20 transition-all shrink-0"
            >
              <span>Explore Anti-Fraud Manifesto</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
