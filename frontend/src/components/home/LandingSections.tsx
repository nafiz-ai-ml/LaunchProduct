'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Zap,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Lock,
  Flame,
  Award,
  ChevronDown,
  Globe,
  BarChart3,
  Bot,
  Layers,
  Cpu,
  Star,
  Quote,
} from 'lucide-react';

export function LandingSections() {
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  const FAQS = [
    {
      q: 'Is it completely free to submit a product on LaunchProduct?',
      a: 'Yes, 100% free! Every builder, AI developer, and indie hacker can submit their product without paywalls. Organic discovery, voting, and daily leaderboard ranking are purely merit-based.',
    },
    {
      q: 'How does the daily leaderboard and midnight UTC snapshot work?',
      a: 'Products launched today compete in real-time based on our transparent gravity decay formula (combining verified community votes, developer engagement, and qualified clicks). Every night at 00:00:00 UTC, the top 3 products earn permanent official podium ranks (#1 Champion, #2 Runner Up, #3 Bronze Podium).',
    },
    {
      q: 'How does the Sybil-resistant Anti-Fraud engine protect rankings?',
      a: 'We monitor 7+ risk signals in real-time: disposable email blacklists, datacenter proxy ASNs, subnet IP clustering, browser fingerprint entropy, and velocity anomalies. Fraudulent votes are filtered and dampened automatically so bot syndicates cannot manipulate rankings.',
    },
    {
      q: 'How do I claim ownership of my product domain?',
      a: 'We offer instant cryptographic verification: simply add a single DNS TXT record (e.g. launchproduct-verify=token) to your domain DNS. Our dual-layer DoH resolver validates it in seconds, giving your product an official "Verified Founder" checkmark.',
    },
    {
      q: 'Can I promote or sponsor my product for extra reach?',
      a: 'Yes! We offer transparent commercial sponsorship slots on our /promote page (Category Featured, Daily Sponsor, and Newsletter Blast). All sponsored placements are clearly labeled with an amber badge so community trust remains uncompromised.',
    },
    {
      q: 'How do the dynamic SVG embed badges work?',
      a: 'Once your product is live or places on the daily podium, you get an embeddable SVG code snippet for your website or GitHub README. The badge updates automatically via our edge API without requiring manual image re-uploads.',
    },
  ];

  const TESTIMONIALS = [
    {
      name: 'Alex Rivera',
      role: 'Founder of PromptCanvas',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      text: 'Launching on LaunchProduct delivered over 4,200 qualified developer visits in our first 48 hours. The DNS verification gave our early users instant trust.',
      category: 'AI Tools',
    },
    {
      name: 'Elena Rostova',
      role: 'Lead Architect at DevSync AI',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
      text: 'Unlike other directories flooded with bot votes, LaunchProduct’s leaderboard actually rewards genuine engineering. Winning the #1 Daily Champion was our biggest growth catalyst.',
      category: 'Developer Tools',
    },
    {
      name: 'Liam Vance',
      role: 'Creator of VectorPulse Cloud',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      text: 'The AI scraper autofilled 90% of our submission form in 2 seconds. The sleek UI, zero-friction discovery, and honest traction metrics are unmatched.',
      category: 'SaaS',
    },
  ];

  return (
    <div className="space-y-20 pt-16">
      {/* ======================================================== */}
      {/* 1. WHY LAUNCH ON LAUNCHPRODUCT (BENTO GRID VALUE PILLARS) */}
      {/* ======================================================== */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-primary/10 text-brand-primary border border-brand-primary/20">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Built For Builders &amp; Modern Discoverers</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-text-primary">
            Why High-Growth Startups Launch With Us
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
            A developer-first discovery platform architected for cryptographic truth, organic distribution, and bot-free meritocracy.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Bento Card 1 */}
          <div className="p-6 rounded-2xl bg-surface border border-border shadow-xs hover:shadow-md transition-all duration-300 space-y-3 group hover:border-brand-primary/40">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-text-primary">
              Multi-Signal Sybil Defense
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Zero fake votes. Our multi-vector anti-fraud engine inspects disposable emails, proxy ASNs, and IP clusters to ensure real products win.
            </p>
          </div>

          {/* Bento Card 2 */}
          <div className="p-6 rounded-2xl bg-surface border border-border shadow-xs hover:shadow-md transition-all duration-300 space-y-3 group hover:border-brand-primary/40">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center border border-indigo-500/20 group-hover:scale-105 transition-transform">
              <Zap className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-text-primary">
              AI Scraper Auto-Fill
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Drop your URL and watch our 4-phase telemetry scraper extrapolate your product title, tagline, logo, and pricing model in 3 seconds.
            </p>
          </div>

          {/* Bento Card 3 */}
          <div className="p-6 rounded-2xl bg-surface border border-border shadow-xs hover:shadow-md transition-all duration-300 space-y-3 group hover:border-brand-primary/40">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center border border-amber-500/20 group-hover:scale-105 transition-transform">
              <Globe className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-text-primary">
              DNS Cryptographic Claim
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Prove founder identity via a simple DNS TXT challenge. Gain immediate verified maker authority and manage your listing without gatekeepers.
            </p>
          </div>

          {/* Bento Card 4 */}
          <div className="p-6 rounded-2xl bg-surface border border-border shadow-xs hover:shadow-md transition-all duration-300 space-y-3 group hover:border-brand-primary/40">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center border border-rose-500/20 group-hover:scale-105 transition-transform">
              <Award className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-text-primary">
              Dynamic SVG Badges
            </h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Embed live dynamic badges into your website or GitHub repo. Podium ranks update automatically via edge CDN caching.
            </p>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 2. HOW IT WORKS (3-STEP INTERACTIVE WORKFLOW)           */}
      {/* ======================================================== */}
      <section className="rounded-3xl bg-slate-950 text-white p-8 sm:p-12 relative overflow-hidden border border-slate-800">
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-brand-primary/15 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative z-10 space-y-10">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary">
              Seamless 3-Minute Journey
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              How LaunchProduct Works
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              From initial URL submission to winning daily champion badges.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
            {/* Step 1 */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-3 relative">
              <div className="text-3xl font-black text-brand-primary/40 font-mono">01</div>
              <h3 className="text-base font-bold text-white">1-Click Submission</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Submit your website link. Our AI scraper parses and drafts your product title, description, categories, and media preview automatically.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-3 relative">
              <div className="text-3xl font-black text-brand-primary/40 font-mono">02</div>
              <h3 className="text-base font-bold text-white">DNS Ownership Claim</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Add a single DNS TXT record to your domain. Our Google DoH resolver validates it in seconds, upgrading your account to Verified Founder.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800/80 space-y-3 relative">
              <div className="text-3xl font-black text-brand-primary/40 font-mono">03</div>
              <h3 className="text-base font-bold text-white">Compete &amp; Win Podium</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Gather authentic community upvotes and qualified clicks. At midnight UTC, reach the Top 3 Podium and receive eternal recognition badges.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 3. INTEGRITY BENCHMARK COMPARISON TABLE                 */}
      {/* ======================================================== */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
            The Integrity Difference
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary">
            See how LaunchProduct differs from traditional pay-to-win product directories.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-border bg-surface shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border bg-surface-sunken/60 text-text-muted font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4 sm:px-6">Feature / Philosophy</th>
                <th className="py-3.5 px-4 sm:px-6 text-brand-primary">LaunchProduct</th>
                <th className="py-3.5 px-4 sm:px-6 text-text-muted">Legacy Directories</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="py-3.5 px-4 sm:px-6 font-semibold text-text-primary">Ranking System</td>
                <td className="py-3.5 px-4 sm:px-6 font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Transparent gravity decay with organic velocity weighting</span>
                </td>
                <td className="py-3.5 px-4 sm:px-6 text-text-secondary">Opaque, paywalled, or cron-rigged</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 sm:px-6 font-semibold text-text-primary">Anti-Fraud Protection</td>
                <td className="py-3.5 px-4 sm:px-6 font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Multi-signal Sybil defense (disposable email, proxy ASN filtering)</span>
                </td>
                <td className="py-3.5 px-4 sm:px-6 text-text-secondary">Vulnerable to bot syndicates and bought votes</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 sm:px-6 font-semibold text-text-primary">Ownership Verification</td>
                <td className="py-3.5 px-4 sm:px-6 font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Instant cryptographic DNS TXT challenge</span>
                </td>
                <td className="py-3.5 px-4 sm:px-6 text-text-secondary">Manual email support or non-existent</td>
              </tr>
              <tr>
                <td className="py-3.5 px-4 sm:px-6 font-semibold text-text-primary">Sponsored Transparency</td>
                <td className="py-3.5 px-4 sm:px-6 font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Explicit amber &ldquo;Featured Launch Boost&rdquo; demarcation</span>
                </td>
                <td className="py-3.5 px-4 sm:px-6 text-text-secondary">Hidden paid placement mixed with organic</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 4. FOUNDER TESTIMONIALS & SOCIAL PROOF                  */}
      {/* ======================================================== */}
      <section className="space-y-6">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1 text-amber-500 font-bold text-xs">
            <Star className="w-3.5 h-3.5 fill-amber-500" />
            <Star className="w-3.5 h-3.5 fill-amber-500" />
            <Star className="w-3.5 h-3.5 fill-amber-500" />
            <Star className="w-3.5 h-3.5 fill-amber-500" />
            <Star className="w-3.5 h-3.5 fill-amber-500" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
            Loved By Ambitious Builders
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary">
            Hear from founders who gained genuine customer traction through LaunchProduct.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {TESTIMONIALS.map((t, idx) => (
            <div
              key={idx}
              className="p-6 rounded-2xl bg-surface border border-border shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <Quote className="w-5 h-5 text-brand-primary/40" />
                <p className="text-xs text-text-secondary leading-relaxed italic">
                  &ldquo;{t.text}&rdquo;
                </p>
              </div>

              <div className="flex items-center gap-3 pt-3 border-t border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={t.avatar}
                  alt={t.name}
                  className="w-9 h-9 rounded-full object-cover border border-border"
                />
                <div>
                  <h4 className="text-xs font-bold text-text-primary">{t.name}</h4>
                  <p className="text-[11px] text-text-muted">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. FREQUENTLY ASKED QUESTIONS (FAQ ACCORDION)           */}
      {/* ======================================================== */}
      <section className="space-y-6 max-w-3xl mx-auto">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
            Frequently Asked Questions
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary">
            Everything you need to know about launching, voting, and claiming your product.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, index) => {
            const isOpen = openFaqIndex === index;
            return (
              <div
                key={index}
                className="rounded-2xl border border-border bg-surface overflow-hidden transition-all duration-200"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full py-4 px-5 sm:px-6 flex items-center justify-between text-left gap-4 hover:bg-surface-sunken/40 transition-colors"
                >
                  <span className="text-xs sm:text-sm font-bold text-text-primary">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-text-secondary transition-transform duration-200 shrink-0 ${
                      isOpen ? 'rotate-180 text-brand-primary' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="px-5 sm:px-6 pb-4 pt-1 text-xs text-text-secondary leading-relaxed border-t border-border/40">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. FINAL FOUNDER HIGH-CONVERSION CTA BANNER             */}
      {/* ======================================================== */}
      <section className="rounded-3xl bg-gradient-to-r from-brand-primary via-indigo-600 to-indigo-800 text-white p-8 sm:p-12 text-center relative overflow-hidden shadow-xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-2xl mx-auto space-y-5">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white/15 backdrop-blur-md border border-white/20 text-white">
            <Flame className="w-3.5 h-3.5 text-amber-300" />
            <span>Join 1,200+ Innovative Founders</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
            Ready to Launch Your Next Breakthrough Product?
          </h2>

          <p className="text-xs sm:text-sm text-indigo-100 max-w-lg mx-auto leading-relaxed">
            Gain immediate organic reach, authentic community feedback, and developer adoption. Zero fees to submit.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/submit"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white hover:bg-slate-50 text-brand-primary font-bold text-xs sm:text-sm transition-all shadow-lg shadow-black/10 flex items-center justify-center gap-2"
            >
              <span>Submit Your Product (Free)</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/leaderboards"
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs sm:text-sm border border-white/20 transition-all flex items-center justify-center gap-2"
            >
              <span>View Live Leaderboards</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
