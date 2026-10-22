'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  HelpCircle,
  ChevronDown,
  Zap,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  Clock,
  Sparkles,
} from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

const FAQS: FaqItem[] = [
  {
    q: 'How does LaunchProduct work?',
    a: 'LaunchProduct is an open, accountless Pay-to-Rank product discovery platform for SaaS applications, AI tools, developer utilities, and indie startups. Founders submit their product, pay a qualifying ranking payment, and compete for top visibility on our All-Time, Today, and Category leaderboards.',
  },
  {
    q: 'Do I need to create a user account to submit a product?',
    a: 'No! LaunchProduct is 100% accountless. You do not need a password, account dashboard, or login. You simply enter your product details and website URL, select your initial ranking payment ($5.99 min), and complete checkout through our secure Merchant of Record provider (Paddle / Lemon Squeezy).',
  },
  {
    q: 'What is the minimum payment to rank a product?',
    a: 'The minimum initial qualifying payment is $5.99 USD (599 cents). This payment permanently publishes your product in our directory, gives you an initial All-Time ranking score, and enters your product into today’s daily leaderboard.',
  },
  {
    q: 'How does outbidding work?',
    a: 'Any product can improve its position by outbidding the product above it. The minimum step-up increment is $1.00 USD above the target product’s qualifying amount. When your confirmed payment clears, your rank updates immediately on the leaderboard.',
  },
  {
    q: 'Why does daily ranking require a new payment each day?',
    a: 'Today’s Leaderboard runs strictly for the 24-hour UTC calendar day (from 00:00:00 UTC to 23:59:59 UTC). At midnight UTC, the board freezes permanently into the Daily Archive. To compete on a new day’s board, founders place a new daily bid for that specific date. Daily bids apply strictly to that day and do not artificially inflate All-Time scores.',
  },
  {
    q: 'Will my product disappear after the day ends?',
    a: 'Never! Your product remains permanently published in the LaunchProduct directory and maintains its cumulative All-Time ranking position. Only the daily board resets each night at 00:00:00 UTC.',
  },
  {
    q: 'What if I submit a product that is already listed?',
    a: 'Our system automatically normalizes website URLs by canonical domain (e.g. example.com). If your product is already listed, submitting it again simply registers a new daily ranking payment for today’s UTC board. It does not create a duplicate listing.',
  },
  {
    q: 'Do community upvotes and reviews influence my rank?',
    a: 'No. While upvotes and community reviews are available as social engagement metrics, rank is determined strictly by qualifying paid ranking amounts. This guarantees 100% transparency without bot voting syndicates or vote-buying manipulation.',
  },
  {
    q: 'Does ranking #1 guarantee traffic, signups, or revenue?',
    a: 'No. Top placement provides prominent visibility across our global platform, but LaunchProduct does not guarantee specific visitor volumes, signups, or sales. Conversion depends on your product’s value proposition, pricing, and market demand.',
  },
  {
    q: 'What is your refund policy?',
    a: 'Because ranking placement is granted immediately upon server confirmation of payment, ranking payments are final and non-refundable once published. In the event of an accidental duplicate charge or technical gateway failure, please contact support for immediate remediation.',
  },
  {
    q: 'How are ties between identical payment amounts resolved?',
    a: 'If two products have the same qualifying paid amount, the tie is broken in favor of the product that completed its payment first (earliest firstPaidAt timestamp).',
  },
];

export default function FaqPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleFaq = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-3.5 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-8 sm:space-y-10 font-sans min-w-0 overflow-x-hidden">
      {/* Title */}
      <div className="space-y-3 border-b border-border pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
          <HelpCircle className="w-3.5 h-3.5 text-primary" />
          <span>Frequently Asked Questions</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-text-primary tracking-tight">
          Everything You Need to Know
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-2xl">
          Learn how LaunchProduct’s transparent Pay-to-Rank mechanics, accountless product submissions, and UTC daily cycles work.
        </p>
      </div>

      {/* Accordion FAQ List */}
      <div className="space-y-3">
        {FAQS.map((item, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div
              key={idx}
              className="rounded-2xl bg-surface border border-border/80 overflow-hidden transition-all duration-200"
            >
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full flex items-center justify-between p-4 sm:p-5 text-left font-bold text-xs sm:text-sm text-text-primary hover:text-primary transition-colors cursor-pointer"
              >
                <span>{item.q}</span>
                <ChevronDown
                  className={`w-4 h-4 text-text-muted transition-transform duration-200 shrink-0 ml-4 ${
                    isOpen ? 'rotate-180 text-primary' : ''
                  }`}
                />
              </button>
              {isOpen && (
                <div className="px-5 pb-5 pt-1 text-xs text-text-secondary leading-relaxed border-t border-border/40">
                  {item.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom CTA Card */}
      <div className="rounded-2xl p-6 bg-surface border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm text-text-primary">Ready to rank your product?</h3>
          <p className="text-xs text-text-muted mt-0.5">
            Submit your product once for permanent inclusion. Entry starts at $5.99.
          </p>
        </div>
        <Link
          href="/submit"
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-xs transition-colors inline-flex items-center justify-center gap-2 shrink-0"
        >
          <span>Submit &amp; Rank ($5.99)</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
