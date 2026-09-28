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
  Trash2,
  Mail,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

export default function PrivacyPolicyPage() {
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
          <span className="text-text-primary font-medium">Privacy Policy</span>
        </nav>

        {/* Header Hero */}
        <div className="relative rounded-3xl p-8 sm:p-12 mb-12 border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-b from-surface/90 to-surface/40 backdrop-blur-xl shadow-xl overflow-hidden">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 mb-4 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Zero-Tracker Architecture & Privacy Manifesto</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-text-primary">
              Privacy <span className="text-gradient">Policy</span>
            </h1>
            <p className="mt-4 text-sm sm:text-base text-text-secondary leading-relaxed">
              At LaunchProduct, privacy is not a compliance checkbox—it is a core engineering tenet. We do not sell your data, we deploy zero third-party ad pixels, and we employ passwordless authentication.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-text-secondary pt-4 border-t border-slate-200/60 dark:border-slate-800/60">
              <span><strong>Last Updated:</strong> September 25, 2026</span>
              <span>•</span>
              <span><strong>Compliance:</strong> GDPR (EU), CCPA (California), UK-GDPR</span>
              <span>•</span>
              <span><strong>Ad Trackers:</strong> 0 (Guaranteed)</span>
            </div>
          </div>
        </div>

        {/* Core Guarantees 3-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
          <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-surface/70 backdrop-blur-md">
            <EyeOff className="w-8 h-8 text-brand-primary mb-3" />
            <h3 className="text-sm font-bold text-text-primary">Zero Third-Party Trackers</h3>
            <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">
              No Meta Pixel, Google AdSense, or invasive surveillance scripts run on LaunchProduct.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-surface/70 backdrop-blur-md">
            <Lock className="w-8 h-8 text-emerald-500 mb-3" />
            <h3 className="text-sm font-bold text-text-primary">100% Passwordless</h3>
            <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">
              We never store passwords. All logins use cryptographic magic links or verified OAuth providers.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-surface/70 backdrop-blur-md">
            <Database className="w-8 h-8 text-indigo-400 mb-3" />
            <h3 className="text-sm font-bold text-text-primary">Right to Erasure</h3>
            <p className="mt-1.5 text-xs text-text-secondary leading-relaxed">
              Complete one-click data deletion: purge your votes, profile, and email from our database at any time.
            </p>
          </div>
        </div>

        {/* Detailed Sections */}
        <div className="space-y-10 text-sm leading-relaxed text-text-secondary">
          {/* Section 1: Information Collected */}
          <section className="rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800/80 bg-surface/60 backdrop-blur-md">
            <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-bold">
                1
              </span>
              Information We Collect & Why
            </h2>
            <p className="mb-4">
              We only collect data strictly necessary to operate our product discovery and anti-fraud ranking systems:
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border border-slate-200/60 dark:border-slate-800/60 rounded-xl overflow-hidden">
                <thead className="bg-slate-100/60 dark:bg-slate-800/60 text-text-primary font-semibold">
                  <tr>
                    <th className="p-3">Data Point</th>
                    <th className="p-3">Collection Method</th>
                    <th className="p-3">Operational Purpose</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                  <tr>
                    <td className="p-3 font-medium text-text-primary">Email Address</td>
                    <td className="p-3">User provided at login</td>
                    <td className="p-3">Sending secure passwordless magic links and critical moderation updates</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-text-primary">IP & User-Agent Hash</td>
                    <td className="p-3">Automated network handshake</td>
                    <td className="p-3">
                      Anonymously hashed to detect coordinated Sybil bot rings, subnet bursts, and datacenter proxy voting
                    </td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-text-primary">Product Submissions</td>
                    <td className="p-3">Founder provided</td>
                    <td className="p-3">Public directory listing, tags, screenshots, and domain verification records</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-medium text-text-primary">Billing Information</td>
                    <td className="p-3">Handled by Paddle (MoR)</td>
                    <td className="p-3">
                      We never store raw credit card numbers. Paddle processes payments and sends encrypted webhook confirmation
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          {/* Section 2: How We Protect Data */}
          <section className="rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800/80 bg-surface/60 backdrop-blur-md">
            <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-bold">
                2
              </span>
              Security & Cryptographic Standards
            </h2>
            <p className="mb-3">
              All data in transit is encrypted using modern TLS 1.3 encryption. At rest, data is stored with AES-256 encryption. Our authentication tokens utilize ephemeral, signed JSON Web Tokens (JWT) stored in HTTP-only, Secure, SameSite=Strict cookies to prevent cross-site scripting (XSS) and CSRF attacks.
            </p>
          </section>

          {/* Section 3: User Rights */}
          <section className="rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800/80 bg-surface/60 backdrop-blur-md">
            <h2 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
              <span className="w-6 h-6 rounded-md bg-brand-primary/10 text-brand-primary flex items-center justify-center text-xs font-bold">
                3
              </span>
              Your Global Rights (GDPR & CCPA)
            </h2>
            <p className="mb-3">Regardless of your physical location, we grant all users the following fundamental rights:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>
                <strong>Right to Access & Portability:</strong> Request an export of all products, votes, and activity associated with your email.
              </li>
              <li>
                <strong>Right to Rectification:</strong> Edit or correct any inaccurate product or founder profile details.
              </li>
              <li>
                <strong>Right to Deletion:</strong> Permanently wipe your account and associated private data within 72 hours.
              </li>
              <li>
                <strong>Opt-Out of Non-Essential Communications:</strong> We send zero unsolicited promotional spam. You control all email notification preferences.
              </li>
            </ul>
          </section>

          {/* Data Protection Officer contact */}
          <div className="rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800/80 bg-surface/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div>
              <h3 className="text-base font-bold text-text-primary">Data Protection Officer</h3>
              <p className="text-xs text-text-secondary mt-1">
                To exercise your rights or request an immediate data export/purge, contact: <span className="font-mono text-brand-primary">privacy@launchproduct.io</span>.
              </p>
            </div>
            <Link
              href="/terms"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 hover:border-brand-primary text-text-primary text-xs font-semibold transition-all shrink-0"
            >
              <span>View Terms of Service</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
