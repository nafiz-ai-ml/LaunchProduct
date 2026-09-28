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

  const TESTIMONIALS_TRACK_1 = [
    {
      name: 'Alex Rivera',
      role: 'Founder of PromptCanvas',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80',
      text: 'Launching on LaunchProduct delivered over 4,200 qualified developer visits in our first 48 hours. The instant verification gave our early users genuine trust.',
      category: 'AI Tools',
    },
    {
      name: 'Elena Rostova',
      role: 'Lead Architect at DevSync AI',
      avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&auto=format&fit=crop&q=80',
      text: 'Unlike other directories flooded with bot syndicates, LaunchProduct’s leaderboard actually rewards engineering merit. Reaching #1 was our biggest growth catalyst.',
      category: 'Developer Tools',
    },
    {
      name: 'Marcus Chen',
      role: 'Co-founder of AuditShield',
      avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&auto=format&fit=crop&q=80',
      text: 'The anti-fraud protection here is real. We saw hundreds of organic upvotes and zero spam. Gained 18 enterprise beta testers in one week.',
      category: 'Cybersecurity',
    },
    {
      name: 'Sarah Jenkins',
      role: 'Creator of ShipFast UI',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&auto=format&fit=crop&q=80',
      text: 'The dynamic SVG badge looks gorgeous on our GitHub README. Our conversion jumped 24% after placing on the daily podium.',
      category: 'Design Systems',
    },
  ];

  const TESTIMONIALS_TRACK_2 = [
    {
      name: 'Liam Vance',
      role: 'Creator of VectorPulse Cloud',
      avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&auto=format&fit=crop&q=80',
      text: 'The AI scraper autofilled 90% of our submission form in 2 seconds. The sleek UI, zero-friction discovery, and honest traction metrics are unmatched.',
      category: 'SaaS Infrastructure',
    },
    {
      name: 'David Miller',
      role: 'Founder of MetricFlow',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&auto=format&fit=crop&q=80',
      text: 'The Featured Launch Boost paid for itself 10x over on day one. We reached over 6,000 founders and developers looking for subscription analytics.',
      category: 'Analytics',
    },
    {
      name: 'Maya Lin',
      role: 'Lead Developer at AgentCraft',
      avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&auto=format&fit=crop&q=80',
      text: 'Genuine community discussions and insightful feedback from fellow builders. By far the highest quality developer audience of any directory.',
      category: 'Autonomous Agents',
    },
    {
      name: 'Carlos Gomez',
      role: 'CEO of CloudSync Engine',
      avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=100&auto=format&fit=crop&q=80',
      text: 'The hourly gravity decay makes competition honest and exciting. Highly recommend every indie hacker launch their SaaS here.',
      category: 'DevOps',
    },
  ];

  return (
    <div className="space-y-20 pt-16 w-full max-w-full overflow-hidden">
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

        <div className="w-full max-w-full overflow-x-auto rounded-2xl border border-border bg-surface shadow-xs">
          <table className="w-full min-w-[580px] text-left text-xs border-collapse">
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
      {/* 4. FOUNDER TESTIMONIALS (CONTINUOUS INFINITE MARQUEE)   */}
      {/* ======================================================== */}
      <section className="space-y-8 overflow-hidden">
        <div className="text-center max-w-xl mx-auto space-y-2 px-4">
          <div className="inline-flex items-center gap-1 text-amber-500 font-bold text-xs">
            <Star className="w-3.5 h-3.5 fill-amber-500" />
            <Star className="w-3.5 h-3.5 fill-amber-500" />
            <Star className="w-3.5 h-3.5 fill-amber-500" />
            <Star className="w-3.5 h-3.5 fill-amber-500" />
            <Star className="w-3.5 h-3.5 fill-amber-500" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-text-primary">
            Loved By Ambitious Builders
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary">
            Hear from genuine founders who gained distribution and paying customers through LaunchProduct.
          </p>
        </div>

        {/* Continuous Auto-Scrolling Testimonial Track 1 (Leftward) */}
        <div className="relative w-full overflow-hidden py-2 group">
          {/* Lateral edge fade gradients */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 sm:w-24 bg-gradient-to-r from-bg to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 sm:w-24 bg-gradient-to-l from-bg to-transparent z-10" />

          <div className="animate-marquee flex gap-5">
            {[...TESTIMONIALS_TRACK_1, ...TESTIMONIALS_TRACK_1].map((t, idx) => (
              <div
                key={`track1-${idx}`}
                className="w-[320px] sm:w-[360px] p-5 rounded-2xl bg-surface border border-border shadow-xs hover:border-brand-primary/40 hover:shadow-md transition-all flex flex-col justify-between shrink-0 space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="w-3 h-3 fill-amber-500" />
                      <Star className="w-3 h-3 fill-amber-500" />
                      <Star className="w-3 h-3 fill-amber-500" />
                      <Star className="w-3 h-3 fill-amber-500" />
                      <Star className="w-3 h-3 fill-amber-500" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-subtle text-primary border border-primary/20">
                      {t.category}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed italic line-clamp-3">
                    &ldquo;{t.text}&rdquo;
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-border">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="w-9 h-9 rounded-full object-cover border border-border shadow-2xs"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-text-primary">{t.name}</h4>
                    <p className="text-[11px] text-text-muted">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Continuous Auto-Scrolling Testimonial Track 2 (Rightward) */}
        <div className="relative w-full overflow-hidden py-2 group">
          {/* Lateral edge fade gradients */}
          <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 sm:w-24 bg-gradient-to-r from-bg to-transparent z-10" />
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 sm:w-24 bg-gradient-to-l from-bg to-transparent z-10" />

          <div className="animate-marquee-reverse flex gap-5">
            {[...TESTIMONIALS_TRACK_2, ...TESTIMONIALS_TRACK_2].map((t, idx) => (
              <div
                key={`track2-${idx}`}
                className="w-[320px] sm:w-[360px] p-5 rounded-2xl bg-surface border border-border shadow-xs hover:border-brand-primary/40 hover:shadow-md transition-all flex flex-col justify-between shrink-0 space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-500">
                      <Star className="w-3 h-3 fill-amber-500" />
                      <Star className="w-3 h-3 fill-amber-500" />
                      <Star className="w-3 h-3 fill-amber-500" />
                      <Star className="w-3 h-3 fill-amber-500" />
                      <Star className="w-3 h-3 fill-amber-500" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-subtle text-primary border border-primary/20">
                      {t.category}
                    </span>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed italic line-clamp-3">
                    &ldquo;{t.text}&rdquo;
                  </p>
                </div>

                <div className="flex items-center gap-3 pt-3 border-t border-border">
                  <img
                    src={t.avatar}
                    alt={t.name}
                    className="w-9 h-9 rounded-full object-cover border border-border shadow-2xs"
                  />
                  <div>
                    <h4 className="text-xs font-bold text-text-primary">{t.name}</h4>
                    <p className="text-[11px] text-text-muted">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 5. HOMEPAGE PRICING & PROMOTION TIERS                    */}
      {/* ======================================================== */}
      <section id="pricing" className="space-y-8">
        <div className="text-center max-w-xl mx-auto space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary-subtle text-primary border border-primary/20">
            <Zap className="w-3.5 h-3.5" />
            <span>Transparent Distribution Economics</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-text-primary">
            Simple, Transparent Launch Plans
          </h2>
          <p className="text-xs sm:text-sm text-text-secondary">
            100% free organic community launches with optional high-impact distribution boosts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {/* Card 1: Free Community */}
          <div className="p-6 sm:p-7 rounded-3xl bg-surface border border-border shadow-xs flex flex-col justify-between space-y-6 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-text-muted">
                  Community Merit
                </span>
                <h3 className="text-xl font-black text-text-primary">Organic Launch</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Ideal for indie developers, bootstrap builders, and open source creators.
                </p>
              </div>

              <div className="flex items-baseline gap-1 pt-2 border-t border-border">
                <span className="text-3xl font-black text-text-primary">$0</span>
                <span className="text-xs text-text-muted font-semibold">/ forever free</span>
              </div>

              <ul className="space-y-2.5 pt-2 text-xs text-text-secondary">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>100% Free organic product listing</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Daily midnight UTC leaderboard ranking</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Community upvotes, reviews &amp; discussions</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Multi-signal Sybil anti-fraud shielding</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Live dynamic embed SVG badges</span>
                </li>
              </ul>
            </div>

            <Link
              href="/submit"
              className="w-full py-2.5 px-4 rounded-xl border border-border bg-surface hover:bg-surface-sunken text-text-primary font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <span>Submit for Free</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 2: Featured Launch Boost (POPULAR) */}
          <div className="p-6 sm:p-7 rounded-3xl bg-surface border-2 border-brand-primary shadow-xl relative flex flex-col justify-between space-y-6 hover:shadow-2xl transition-all">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-brand-primary text-white text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-300" />
              <span>Most Popular Choice</span>
            </div>

            <div className="space-y-4 pt-1">
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-brand-primary">
                  Maximum Discovery
                </span>
                <h3 className="text-xl font-black text-text-primary">Featured Launch Boost</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Amplify your launch reach with prime homepage visibility and priority queue.
                </p>
              </div>

              <div className="flex items-baseline gap-1 pt-2 border-t border-border">
                <span className="text-3xl font-black text-text-primary">$49</span>
                <span className="text-xs text-text-muted font-semibold">/ one-time launch</span>
              </div>

              <ul className="space-y-2.5 pt-2 text-xs text-text-secondary">
                <li className="flex items-center gap-2 font-medium text-text-primary">
                  <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0" />
                  <span>Everything in Free Community</span>
                </li>
                <li className="flex items-center gap-2 font-medium text-text-primary">
                  <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0" />
                  <span><strong>#1 Pinned Top Homepage Feed Slot</strong> (24h)</span>
                </li>
                <li className="flex items-center gap-2 font-medium text-text-primary">
                  <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0" />
                  <span>Distinctive <strong>Amber &ldquo;Featured Launch Boost&rdquo;</strong> Demarcation</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0" />
                  <span>3x - 5x qualified clickthrough traffic</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0" />
                  <span>AI Scraper 3-second priority processing</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-primary shrink-0" />
                  <span>Newsletter highlight &amp; social mention</span>
                </li>
              </ul>
            </div>

            <Link
              href="/promote"
              className="w-full py-2.5 px-4 rounded-xl bg-brand-primary hover:bg-brand-hover text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-brand-primary/25"
            >
              <span>Get Featured Boost</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Card 3: Category Takeover & VIP */}
          <div className="p-6 sm:p-7 rounded-3xl bg-surface border border-border shadow-xs flex flex-col justify-between space-y-6 hover:border-slate-300 dark:hover:border-slate-700 transition-all">
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Authority &amp; Dominance
                </span>
                <h3 className="text-xl font-black text-text-primary">Category Takeover</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Dominate your specific category and establish long-term market authority.
                </p>
              </div>

              <div className="flex items-baseline gap-1 pt-2 border-t border-border">
                <span className="text-3xl font-black text-text-primary">$149</span>
                <span className="text-xs text-text-muted font-semibold">/ 30 days</span>
              </div>

              <ul className="space-y-2.5 pt-2 text-xs text-text-secondary">
                <li className="flex items-center gap-2 font-medium text-text-primary">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Everything in Featured Boost</span>
                </li>
                <li className="flex items-center gap-2 font-medium text-text-primary">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span><strong>30-Day Permanent Category Top Sponsor Banner</strong></span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Verified Founder VIP badge on all listings</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Direct customer inquiry lead box</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>Real-time audience analytics &amp; CTR metrics</span>
                </li>
              </ul>
            </div>

            <Link
              href="/promote"
              className="w-full py-2.5 px-4 rounded-xl border border-border bg-surface hover:bg-surface-sunken text-text-primary font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-xs"
            >
              <span>Claim Category Slot</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* 6. FREQUENTLY ASKED QUESTIONS (SMOOTH ACCORDION)        */}
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
                className="rounded-2xl border border-border bg-surface overflow-hidden transition-colors hover:border-slate-300 dark:hover:border-slate-700 shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="w-full py-4 px-5 sm:px-6 flex items-center justify-between text-left gap-4 hover:bg-surface-sunken/40 transition-colors cursor-pointer"
                  aria-expanded={isOpen}
                >
                  <span className="text-xs sm:text-sm font-bold text-text-primary">
                    {faq.q}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-text-secondary transition-transform duration-300 ease-in-out shrink-0 ${
                      isOpen ? 'rotate-180 text-brand-primary' : ''
                    }`}
                  />
                </button>
                
                {/* Smooth 60fps CSS Grid expand/collapse animation */}
                <div
                  className={`grid transition-all duration-300 ease-in-out ${
                    isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="px-5 sm:px-6 pb-4 pt-1 text-xs text-text-secondary leading-relaxed border-t border-border/40">
                      {faq.a}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ======================================================== */}
      {/* 7. FINAL FOUNDER HIGH-CONVERSION CTA BANNER             */}
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
