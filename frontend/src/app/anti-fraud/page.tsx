'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  ShieldAlert,
  ShieldCheck,
  Zap,
  Lock,
  Layers,
  Activity,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Cpu,
  Globe2,
  Mail,
  Fingerprint,
  Sliders,
  ArrowRight,
} from 'lucide-react';

export default function AntiFraudPage() {
  // Interactive Simulator States
  const [accountAgeDays, setAccountAgeDays] = useState<number>(45);
  const [karmaPoints, setKarmaPoints] = useState<number>(350);
  const [isDomainVerified, setIsDomainVerified] = useState<boolean>(true);
  const [ipReputation, setIpReputation] = useState<'residential' | 'vpn' | 'datacenter'>('residential');
  const [voteBurstRate, setVoteBurstRate] = useState<number>(2); // votes in 10s

  // Mathematical integrity calculations based on platform anti-fraud spec
  const simulation = useMemo(() => {
    // 1. Karma Weight: Base 0.5, scales with karma up to 1.35
    let wKarma = 0.5 + Math.min(1.0, (karmaPoints / 500) * 0.85);

    // 2. Account Age penalty if < 3 days
    if (accountAgeDays < 1) {
      wKarma *= 0.2;
    } else if (accountAgeDays < 7) {
      wKarma *= 0.6;
    }

    // 3. Domain Multiplier
    const wDomain = isDomainVerified ? 1.15 : 1.0;

    // 4. IP Multiplier & Flags
    let ipDampener = 1.0;
    let fraudFlag = 'NONE';

    if (ipReputation === 'datacenter') {
      ipDampener = 0.05; // 95% nullification for datacenter proxies
      fraudFlag = 'DATACENTER_PROXY_DETECTED';
    } else if (ipReputation === 'vpn') {
      ipDampener = 0.6;
      fraudFlag = 'COMMERCIAL_VPN_ANOMALY';
    }

    // 5. Burst velocity dampener
    let velocityDampener = 1.0;
    if (voteBurstRate > 8) {
      velocityDampener = 0.1; // Sudden spam spike
      fraudFlag = 'COORDINATED_BURST_SPAM';
    } else if (voteBurstRate > 4) {
      velocityDampener = 0.7;
    }

    // Final Effective Weight
    const effectiveWeight = Math.max(0, Number((wKarma * wDomain * ipDampener * velocityDampener).toFixed(2)));

    // Risk Classification
    let riskVerdict = 'LOW';
    let riskColor = 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30';
    let riskDescription = 'Vote is verified authentic and will apply full positive gravity to the daily leaderboard.';

    if (effectiveWeight < 0.25 || fraudFlag !== 'NONE') {
      if (fraudFlag === 'DATACENTER_PROXY_DETECTED' || fraudFlag === 'COORDINATED_BURST_SPAM') {
        riskVerdict = 'CRITICAL FRAUD QUARANTINE';
        riskColor = 'text-rose-500 bg-rose-500/10 border-rose-500/30';
        riskDescription =
          'Vote is automatically quarantined. Zero rank influence applied to leaderboard without tipping off malicious actors.';
      } else {
        riskVerdict = 'SUSPICIOUS / ELEVATED RISK';
        riskColor = 'text-amber-500 bg-amber-500/10 border-amber-500/30';
        riskDescription =
          'Vote is throttled and queued for asynchronous review by the moderation fraud sentinel.';
      }
    }

    return {
      wKarma: Number(wKarma.toFixed(2)),
      wDomain,
      ipDampener,
      velocityDampener,
      effectiveWeight,
      riskVerdict,
      riskColor,
      riskDescription,
      fraudFlag,
    };
  }, [accountAgeDays, karmaPoints, isDomainVerified, ipReputation, voteBurstRate]);

  return (
    <div className="min-h-screen bg-bg text-text-primary pb-24">
      {/* Background ambient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[350px] bg-brand-primary/10 blur-[130px] rounded-full" />
        <div className="absolute top-80 right-10 w-[450px] h-[300px] bg-emerald-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 sm:pt-14">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-text-secondary mb-6">
          <Link href="/" className="hover:text-brand-primary transition-colors">
            Home
          </Link>
          <span>/</span>
          <span className="text-text-primary font-medium">Anti-Fraud & Sybil Resistance</span>
        </nav>

        {/* Hero Section */}
        <div className="relative rounded-3xl p-8 sm:p-12 mb-12 border border-slate-200/80 dark:border-slate-800/80 bg-gradient-to-b from-surface/90 to-surface/40 backdrop-blur-xl shadow-xl overflow-hidden">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/25 text-emerald-500 mb-4 shadow-sm">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Platform Integrity Architecture & Proof-of-Merit</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-text-primary leading-tight">
              Anti-Fraud & <span className="text-gradient">Sybil Resistance</span>
            </h1>

            <p className="mt-4 text-base sm:text-lg text-text-secondary leading-relaxed">
              Why LaunchProduct exists: Traditional discovery platforms have devolved into botting battlegrounds where funded startups purchase artificial upvotes. LaunchProduct deploys a multi-vector cryptographic & telemetry defense engine to guarantee organic meritocracy.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-6 pt-6 border-t border-slate-200/60 dark:border-slate-800/60 text-xs text-text-secondary">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Subnet Burst Shield: Active</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>1,200+ Disposable Domains Blacklisted</span>
              </div>
              <span>•</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>DNS Proof-of-Domain Challenge</span>
              </div>
            </div>
          </div>
        </div>

        {/* The 6 Pillars Grid */}
        <div className="mb-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl font-bold text-text-primary">
              The 6-Factor Defense Architecture
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-text-secondary">
              Every vote and product submission is evaluated across six distinct cryptographic, behavioral, and reputational vectors.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Pillar 1 */}
            <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-surface/70 backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-brand-primary/10 text-brand-primary flex items-center justify-center font-bold text-sm mb-4">
                01
              </div>
              <h3 className="text-base font-bold text-text-primary">Subnet IP Clustering</h3>
              <p className="mt-2 text-xs text-text-secondary leading-relaxed">
                Detects coordinated vote rings originating from the same /24 IPv4 CIDR blocks or IPv6 /48 prefixes. Burst votes from identical network subnets are dampener-quarantined.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-surface/70 backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-bold text-sm mb-4">
                02
              </div>
              <h3 className="text-base font-bold text-text-primary">Disposable Email Blacklist</h3>
              <p className="mt-2 text-xs text-text-secondary leading-relaxed">
                Maintains a real-time synchronized database of 1,200+ temporary email providers (e.g., Mailinator, 10minutemail). Magic links sent to throwaway mailboxes are blocked at gateway ingress.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-surface/70 backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center font-bold text-sm mb-4">
                03
              </div>
              <h3 className="text-base font-bold text-text-primary">ASN Datacenter Proxy Filtering</h3>
              <p className="mt-2 text-xs text-text-secondary leading-relaxed">
                Queries autonomous system numbers (ASNs) against commercial hosting providers (AWS, DigitalOcean, Hetzner). Votes originating from headless scrapers inside cloud data centers are instantly neutralized.
              </p>
            </div>

            {/* Pillar 4 */}
            <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-surface/70 backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm mb-4">
                04
              </div>
              <h3 className="text-base font-bold text-text-primary">
                Reputation Karma Weights (W<sub>karma</sub>)
              </h3>
              <p className="mt-2 text-xs text-text-secondary leading-relaxed">
                Fresh, unverified accounts possess minimal voting weight (<strong>0.20x</strong>). As community members write substantive reviews, submit verified tools, and demonstrate longevity, their vote weight climbs to <strong>1.35x</strong>.
              </p>
            </div>

            {/* Pillar 5 */}
            <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-surface/70 backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center font-bold text-sm mb-4">
                05
              </div>
              <h3 className="text-base font-bold text-text-primary">Cryptographic DNS Proof</h3>
              <p className="mt-2 text-xs text-text-secondary leading-relaxed">
                Founders must prove domain control via a cryptographic DNS TXT record or HTML meta challenge. Verified domain owners earn a +15% multiplier and the green Verified Founder badge.
              </p>
            </div>

            {/* Pillar 6 */}
            <div className="p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-surface/70 backdrop-blur-md">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold text-sm mb-4">
                06
              </div>
              <h3 className="text-base font-bold text-text-primary">Dynamic Velocity Dampener</h3>
              <p className="mt-2 text-xs text-text-secondary leading-relaxed">
                A mathematical decay curve checks time-series variance. Sudden spikes of 50 upvotes within a 2-minute window trigger logarithmic vote compression, preventing flash-mob manipulation.
              </p>
            </div>
          </div>
        </div>

        {/* Interactive Live Integrity Score Simulator */}
        <div className="rounded-3xl p-8 sm:p-12 border border-brand-primary/30 bg-surface/90 backdrop-blur-xl shadow-2xl relative overflow-hidden mb-16">
          <div className="absolute top-0 right-0 w-80 h-80 bg-brand-primary/10 rounded-full blur-3xl pointer-events-none" />

          <div className="max-w-2xl mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-primary/10 border border-brand-primary/20 text-brand-primary mb-3">
              <Sliders className="w-3.5 h-3.5" />
              <span>Interactive Verification Sandbox</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-text-primary">
              Live Integrity & Vote Weight Simulator
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-text-secondary">
              Test how the anti-fraud scoring algorithm calculates effective vote influence in real-time. Adjust the parameters below to trigger security sentinels.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Controls (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Account Age Slider */}
              <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-surface/60">
                <div className="flex justify-between items-center text-xs font-semibold mb-2">
                  <span className="text-text-primary">Account Age</span>
                  <span className="text-brand-primary font-mono">{accountAgeDays} Days</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="180"
                  step="1"
                  value={accountAgeDays}
                  onChange={(e) => setAccountAgeDays(Number(e.target.value))}
                  className="w-full accent-brand-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-text-secondary mt-1">
                  <span>0 days (Fresh)</span>
                  <span>30 days (Standard)</span>
                  <span>180+ days (Veteran)</span>
                </div>
              </div>

              {/* Karma Points Slider */}
              <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-surface/60">
                <div className="flex justify-between items-center text-xs font-semibold mb-2">
                  <span className="text-text-primary">Community Karma Points</span>
                  <span className="text-brand-primary font-mono">{karmaPoints} Karma</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1000"
                  step="25"
                  value={karmaPoints}
                  onChange={(e) => setKarmaPoints(Number(e.target.value))}
                  className="w-full accent-brand-primary cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-text-secondary mt-1">
                  <span>0 (Lurker)</span>
                  <span>500 (Active Contributor)</span>
                  <span>1,000 (Top Hunter)</span>
                </div>
              </div>

              {/* IP Network Type Selector */}
              <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-surface/60">
                <span className="block text-xs font-semibold text-text-primary mb-2">
                  Network IP Origin & Reputation
                </span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setIpReputation('residential')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                      ipReputation === 'residential'
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 text-text-secondary'
                    }`}
                  >
                    Clean Residential
                  </button>
                  <button
                    onClick={() => setIpReputation('vpn')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                      ipReputation === 'vpn'
                        ? 'bg-amber-500/10 border-amber-500/40 text-amber-500 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 text-text-secondary'
                    }`}
                  >
                    Commercial VPN
                  </button>
                  <button
                    onClick={() => setIpReputation('datacenter')}
                    className={`py-2 px-3 rounded-lg text-xs font-medium border transition-all ${
                      ipReputation === 'datacenter'
                        ? 'bg-rose-500/10 border-rose-500/40 text-rose-500 font-semibold'
                        : 'border-slate-200 dark:border-slate-800 text-text-secondary'
                    }`}
                  >
                    Datacenter Proxy
                  </button>
                </div>
              </div>

              {/* Toggle DNS & Burst Velocity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-surface/60 flex items-center justify-between">
                  <div>
                    <span className="block text-xs font-semibold text-text-primary">Verified DNS</span>
                    <span className="text-[10px] text-text-secondary">+15% Score Multiplier</span>
                  </div>
                  <button
                    onClick={() => setIsDomainVerified(!isDomainVerified)}
                    className={`w-12 h-6 rounded-full transition-colors relative p-0.5 ${
                      isDomainVerified ? 'bg-brand-primary' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white transition-transform ${
                        isDomainVerified ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800/80 bg-surface/60">
                  <div className="flex justify-between items-center text-xs font-semibold mb-1">
                    <span className="text-text-primary">Burst Velocity</span>
                    <span className="font-mono text-brand-primary">{voteBurstRate} votes/10s</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="1"
                    value={voteBurstRate}
                    onChange={(e) => setVoteBurstRate(Number(e.target.value))}
                    className="w-full accent-brand-primary cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* Right Verdict Display (5 cols) */}
            <div className="lg:col-span-5 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-surface/80 backdrop-blur-md flex flex-col justify-between h-full">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                  Telemetry Evaluation Result
                </span>

                {/* Score Gauge */}
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-black text-text-primary font-mono">
                    {simulation.effectiveWeight}x
                  </span>
                  <span className="text-xs text-text-secondary font-medium">Effective Vote Power</span>
                </div>

                {/* Verdict Badge */}
                <div
                  className={`mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border ${simulation.riskColor}`}
                >
                  {simulation.effectiveWeight > 0.5 ? (
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                  )}
                  <span>{simulation.riskVerdict}</span>
                </div>

                <p className="mt-3 text-xs text-text-secondary leading-relaxed">
                  {simulation.riskDescription}
                </p>

                {/* Factor Breakdown */}
                <div className="mt-6 pt-6 border-t border-slate-200/60 dark:border-slate-800/60 space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">
                      Karma Multiplier (W<sub>karma</sub>):
                    </span>
                    <span className="font-mono font-bold text-text-primary">{simulation.wKarma}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">DNS Ownership Bonus:</span>
                    <span className="font-mono font-bold text-text-primary">
                      {isDomainVerified ? '+15%' : '0%'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Network IP Dampener:</span>
                    <span className="font-mono font-bold text-text-primary">{simulation.ipDampener}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Velocity Burst Factor:</span>
                    <span className="font-mono font-bold text-text-primary">{simulation.velocityDampener}x</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200/60 dark:border-slate-800/60 text-[11px] text-text-secondary text-center">
                Calculated dynamically via the LaunchProduct Sybil Sentinel Engine.
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="rounded-2xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800/80 bg-surface/40 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
          <div>
            <h3 className="text-base font-bold text-text-primary">Ready to launch with guaranteed authentic reach?</h3>
            <p className="text-xs text-text-secondary mt-1">
              Join thousands of honest software founders who build on LaunchProduct.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/submit"
              className="px-5 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-hover text-white text-xs font-semibold shadow-md transition-all"
            >
              Submit Your Product
            </Link>
            <Link
              href="/leaderboards"
              className="px-4 py-2.5 rounded-xl bg-surface border border-slate-200 dark:border-slate-700 hover:border-brand-primary text-text-primary text-xs font-semibold transition-all"
            >
              View Daily Leaderboard
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
