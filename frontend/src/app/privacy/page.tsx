'use client';

import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  EyeOff,
  Database,
  FileCheck,
  Globe2,
  Mail,
  ArrowRight,
  Server,
  CreditCard,
} from 'lucide-react';

export default function PrivacyPolicyPage() {
  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-8 py-10 space-y-10 font-sans">
      {/* Title */}
      <div className="space-y-3 border-b border-border pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span>Accountless Architecture &amp; Data Protection</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-text-primary tracking-tight">
          Privacy Policy
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-2xl">
          LaunchProduct is built on an accountless discovery architecture. We do not require account registration, do not sell user data, and never store raw credit card numbers.
        </p>
      </div>

      {/* Summary Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-surface border border-border space-y-1.5">
          <EyeOff className="w-5 h-5 text-primary" />
          <h3 className="text-xs font-bold text-text-primary">No User Accounts</h3>
          <p className="text-[11px] text-text-muted leading-relaxed">
            You browse, discover, and submit products without creating passwords or account profiles.
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border space-y-1.5">
          <CreditCard className="w-5 h-5 text-emerald-500" />
          <h3 className="text-xs font-bold text-text-primary">Zero Card Storage</h3>
          <p className="text-[11px] text-text-muted leading-relaxed">
            All payments are processed by PCI-DSS compliant Merchants of Record (Paddle / Lemon Squeezy).
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface border border-border space-y-1.5">
          <Server className="w-5 h-5 text-indigo-500" />
          <h3 className="text-xs font-bold text-text-primary">Minimal Data Footprint</h3>
          <p className="text-[11px] text-text-muted leading-relaxed">
            We collect only what is strictly necessary to publish listings and verify ranking ledger payments.
          </p>
        </div>
      </div>

      {/* Detailed Policy Sections */}
      <div className="space-y-8 text-xs sm:text-sm text-text-secondary leading-relaxed">
        <section className="rounded-2xl bg-surface border border-border p-6 space-y-3">
          <h2 className="text-base font-bold text-text-primary">1. Information We Collect</h2>
          <p>
            When you interact with LaunchProduct, we process the following categories of data:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>
              <strong>Public Product Submission Data:</strong> Product name, website URL, normalized canonical domain, tagline, description, category selection, and logo URL.
            </li>
            <li>
              <strong>Optional Founder Email:</strong> If provided during submission or checkout, your email address is used solely for payment receipt delivery and critical moderation notices.
            </li>
            <li>
              <strong>Technical &amp; Telemetry Data:</strong> Standard server access logs including IP address, user-agent, request timestamp, and rate-limiting counters.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl bg-surface border border-border p-6 space-y-3">
          <h2 className="text-base font-bold text-text-primary">2. Payment Data &amp; Merchant of Record</h2>
          <p>
            LaunchProduct does not collect, receive, or store your credit card numbers, CVVs, or bank credentials. All financial transactions are executed through accredited Merchants of Record (Paddle / Lemon Squeezy).
          </p>
          <p>
            Our backend receives signed, cryptographically verified webhooks from the payment provider containing transaction status, payment identifier, and paid ranking amount in cents to update the ranking ledger.
          </p>
        </section>

        <section className="rounded-2xl bg-surface border border-border p-6 space-y-3">
          <h2 className="text-base font-bold text-text-primary">3. Purpose and Legal Basis for Processing</h2>
          <p>
            We process data under the following legal bases pursuant to the GDPR and international data protection laws:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-xs">
            <li>
              <strong>Contractual Performance:</strong> To publish submitted products and apply qualifying paid ranking amounts to the public leaderboards.
            </li>
            <li>
              <strong>Legitimate Interests:</strong> To protect the platform against fraud, Sybil attacks, duplicate listing abuse, and denial-of-service attempts.
            </li>
            <li>
              <strong>Legal Compliance:</strong> To maintain verifiable financial records for accounting and tax compliance.
            </li>
          </ul>
        </section>

        <section className="rounded-2xl bg-surface border border-border p-6 space-y-3">
          <h2 className="text-base font-bold text-text-primary">4. Cookies and Local Storage</h2>
          <p>
            LaunchProduct uses minimal, privacy-respecting local storage strictly necessary for user preferences (such as light/dark theme selection). We do not deploy invasive third-party tracking pixels, advertising retargeting scripts, or cross-site tracking cookies.
          </p>
        </section>

        <section className="rounded-2xl bg-surface border border-border p-6 space-y-3">
          <h2 className="text-base font-bold text-text-primary">5. User Rights and Data Deletion</h2>
          <p>
            Under applicable data protection legislation (including GDPR and CCPA), you have the right to request access to, correction of, or deletion of your personal data.
          </p>
          <p>
            To request removal of a published product listing or data correction, contact support at <a href="mailto:privacy@launchproduct.com" className="text-primary hover:underline">privacy@launchproduct.com</a>. Removal requests for verified trademark infringement or legal violations are honored promptly.
          </p>
        </section>
      </div>

      {/* Back Link */}
      <div className="pt-4 border-t border-border">
        <Link
          href="/"
          className="text-xs font-semibold text-text-muted hover:text-text-primary transition-colors inline-flex items-center gap-1.5"
        >
          <span>← Back to Leaderboards</span>
        </Link>
      </div>
    </div>
  );
}
