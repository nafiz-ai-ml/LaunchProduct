'use client';

import React from 'react';
import Link from 'next/link';
import { ShieldCheck, AlertCircle, Building2, Mail, Globe } from 'lucide-react';

export default function ImprintPage() {
  return (
    <div className="w-full max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 sm:space-y-10 font-sans min-w-0 overflow-x-hidden">
      {/* Title */}
      <div className="space-y-3 border-b border-border pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
          <Building2 className="w-3.5 h-3.5 text-primary" />
          <span>Legal Notice · Impressum</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-text-primary tracking-tight">
          Legal Imprint
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-2xl">
          Statutory information and corporate disclosures in accordance with international e-commerce and electronic communications legislation.
        </p>
      </div>

      {/* Owner-Provided Information Notice */}
      <div className="rounded-2xl p-5 bg-amber-500/10 border border-amber-500/25 space-y-2 text-xs text-amber-800 dark:text-amber-300">
        <div className="flex items-center gap-2 font-bold text-sm">
          <AlertCircle className="w-4 h-4" />
          <span>Platform Owner Review Required</span>
        </div>
        <p>
          In accordance with platform development integrity guidelines, LaunchProduct does not fabricate commercial registration numbers, physical addresses, or corporate legal entities. The official corporate details below must be reviewed and filled with the platform owner&apos;s registered legal entity before production deployment.
        </p>
      </div>

      {/* Structured Legal Imprint Details */}
      <div className="space-y-6 text-xs sm:text-sm text-text-secondary leading-relaxed">
        <section className="rounded-2xl bg-surface border border-border p-6 space-y-4">
          <h2 className="text-base font-bold text-text-primary">
            Platform Operator &amp; Contact Information
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1">
              <span className="text-text-muted font-medium block">Legal Entity Name:</span>
              <span className="font-bold text-text-primary block font-mono">
                [Owner Required: Registered Company Name, e.g. LaunchProduct Inc.]
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-text-muted font-medium block">Commercial Registration Number:</span>
              <span className="font-bold text-text-primary block font-mono">
                [Owner Required: Company Number / Commercial Register ID]
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-text-muted font-medium block">Registered Office Address:</span>
              <span className="font-bold text-text-primary block font-mono">
                [Owner Required: Street Address, City, Postal Code, Country]
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-text-muted font-medium block">Authorized Representatives:</span>
              <span className="font-bold text-text-primary block font-mono">
                [Owner Required: Managing Director(s) / CEO]
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-text-muted font-medium block">Electronic Contact (Email):</span>
              <span className="font-bold text-text-primary block font-mono">
                support@launchproduct.com
              </span>
            </div>

            <div className="space-y-1">
              <span className="text-text-muted font-medium block">VAT / Tax Identification ID:</span>
              <span className="font-bold text-text-primary block font-mono">
                [Owner Required: VAT / Sales Tax ID if applicable]
              </span>
            </div>
          </div>
        </section>

        {/* Merchant of Record Notice */}
        <section className="rounded-2xl bg-surface border border-border p-6 space-y-3">
          <h2 className="text-base font-bold text-text-primary">
            Merchant of Record &amp; Payment Processing
          </h2>
          <p className="text-xs">
            Commercial transactions and Pay-to-Rank fees on LaunchProduct are conducted and processed via authoritative third-party Merchants of Record (Paddle / Lemon Squeezy). The applicable Merchant of Record acts as the merchant of record for payment collection, invoicing, sales tax compliance, and VAT handling.
          </p>
        </section>

        {/* Liability for External Links */}
        <section className="rounded-2xl bg-surface border border-border p-6 space-y-3">
          <h2 className="text-base font-bold text-text-primary">
            Disclaimer of Liability for Third-Party Links
          </h2>
          <p className="text-xs">
            Our platform contains hyperlinks to third-party software products and websites over whose contents we have no control. The respective operator of linked sites is solely responsible for their content, privacy policies, and compliance. LaunchProduct promptly removes links to external products upon receiving notification of specific legal infringements.
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
