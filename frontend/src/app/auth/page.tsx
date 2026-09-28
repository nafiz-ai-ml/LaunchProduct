'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { requestMagicLink } from '@/lib/auth-client';
import {
  Mail,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Lock,
  Flame,
  TrendingUp,
  Award,
  Users,
  Check,
  Star,
} from 'lucide-react';

export default function AuthPage() {
  const [email, setEmail] = useState('');
  const [authMethod, setAuthMethod] = useState<'magic' | 'oauth'>('magic');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [devMagicLink, setDevMagicLink] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await requestMagicLink(email.trim().toLowerCase());
      if (res?.devMagicLinkUrl || res?.rawToken) {
        let redirectParam: string | null = null;
        if (typeof window !== 'undefined') {
          redirectParam = new URLSearchParams(window.location.search).get('redirect');
        }
        const base = res.devMagicLinkUrl || `/auth/verify?token=${res.rawToken}`;
        const finalUrl = redirectParam
          ? `${base}${base.includes('?') ? '&' : '?'}redirect=${encodeURIComponent(redirectParam)}`
          : base;
        setDevMagicLink(finalUrl);
      }
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(
        err?.message ||
          'Failed to send magic link. Please check your connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleOAuth = (provider: 'google' | 'github') => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const baseUrl = apiUrl.includes('/api/v1') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api/v1`;
    window.location.href = `${baseUrl}/auth/oauth/${provider}`;
  };

  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex-col lg:flex-row selection:bg-brand-primary selection:text-white">
      {/* ========================================================= */}
      {/* LEFT COLUMN: BRAND WORLD, SOCIAL PROOF & LIVE TELEMETRY   */}
      {/* (Visible on Desktop / Large Tablets - 55% Width)          */}
      {/* ========================================================= */}
      <div className="hidden lg:flex lg:w-[55%] bg-slate-950 relative overflow-hidden flex-col justify-between p-12 lg:p-16 border-r border-slate-800/80 text-white">
        {/* Ambient Cosmic Aura */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary/20 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-indigo-600/15 blur-[130px] rounded-full pointer-events-none" />

        {/* Top Header */}
        <div className="relative z-10 flex items-center justify-between">
          <Link href="/" className="hover:opacity-90 transition-opacity">
            <Logo variant="horizontal" width={160} height={34} />
          </Link>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white px-3.5 py-1.5 rounded-xl border border-slate-800 hover:bg-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Explore Launches</span>
          </Link>
        </div>

        {/* Center Content: Value Prop & Floating Preview Card */}
        <div className="relative z-10 my-auto py-12 max-w-xl space-y-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-brand-primary/20 border border-brand-primary/40 text-brand-primary mb-4">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Zero-Tracker • 100% Cryptographic Meritocracy</span>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
              Where high-integrity software meets authentic discovery.
            </h1>

            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              Join <strong className="text-white">12,450+ founders & tech early adopters</strong> exploring real-time SaaS rankings, autonomous AI agents, and verified developer utilities.
            </p>
          </div>

          {/* Floating Product Preview Card */}
          <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-2xl relative overflow-hidden group hover:border-slate-700 transition-all duration-300">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-2.5 flex items-center justify-center shadow-md">
                  <Sparkles className="w-full h-full text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">CognitiveOS</h3>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      Verified
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Autonomous Multi-Agent Reasoning Loops
                  </p>
                </div>
              </div>

              <div className="text-right">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-primary text-white text-xs font-bold shadow-sm">
                  ▲ 428
                </span>
                <span className="block text-[10px] font-mono text-emerald-400 font-semibold mt-1">
                  +42 votes/hr
                </span>
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Rank #1 Daily Champion</span>
              </div>
              <span className="font-mono text-slate-500">Live Telemetry Active</span>
            </div>
          </div>

          {/* Founder Testimonial */}
          <div className="p-5 rounded-2xl border border-slate-800/70 bg-slate-900/40 backdrop-blur-sm space-y-3">
            <div className="flex items-center gap-1 text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
              ))}
            </div>
            <p className="text-xs text-slate-300 italic leading-relaxed">
              &ldquo;LaunchProduct is the only launch platform where authentic builders win without paid upvote rings. It gave us genuine early adopters on launch day.&rdquo;
            </p>
            <div className="flex items-center gap-3 pt-1">
              <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold text-white">
                AR
              </div>
              <div className="text-xs">
                <strong className="text-white font-semibold">Alex Rivera</strong>
                <span className="text-slate-500 ml-1.5">— Founder of SyntaxFlow</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Social Proof Ticker */}
        <div className="relative z-10 pt-6 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Sybil-Resistant Verification Active</span>
          </div>
          <span>London UTC Sync Active</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT COLUMN: FOCUSED LUXURY AUTHENTICATION INTERFACE     */}
      {/* (45% Width on Desktop, 100% on Mobile)                    */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 lg:p-16 relative">
        {/* Mobile Header (Hidden on Desktop) */}
        <div className="flex lg:hidden items-center justify-between mb-8">
          <Link href="/">
            <Logo variant="horizontal" width={140} height={30} />
          </Link>
          <Link
            href="/"
            className="text-xs font-semibold text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-lg border border-border"
          >
            Directory
          </Link>
        </div>

        <div className="max-w-md w-full mx-auto my-auto py-8">
          {/* Main Card Container */}
          <div className="bg-surface/80 dark:bg-slate-900/90 border border-slate-200/80 dark:border-slate-800/80 rounded-3xl shadow-xl p-8 sm:p-10 backdrop-blur-xl relative overflow-hidden">
            {/* Top Amber Ambient Refraction */}
            <div className="absolute -top-12 -right-12 w-44 h-44 bg-brand-primary/10 rounded-full blur-2xl pointer-events-none" />

            {isSuccess ? (
              /* Success State */
              <div className="text-center py-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400 shadow-sm">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-2xl font-extrabold tracking-tight text-text-primary">
                    Check your inbox!
                  </h2>
                  <p className="text-xs text-text-secondary leading-relaxed max-w-sm mx-auto">
                    We sent a secure, passwordless sign-in link to{' '}
                    <span className="font-semibold text-text-primary">{email}</span>.
                  </p>
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-left border border-border">
                  <div className="flex items-start gap-2.5">
                    <Sparkles className="w-4 h-4 text-brand-primary shrink-0 mt-0.5" />
                    <p className="text-[11px] text-text-secondary leading-relaxed">
                      Click the link inside your email to immediately access your session. If you don't see it within 30 seconds, please check your spam folder.
                    </p>
                  </div>
                </div>

                {devMagicLink && (
                  <div className="p-4 bg-brand-primary/10 border border-brand-primary/30 rounded-xl text-left space-y-2">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-brand-primary">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>[Development Mode] Instant Auth Link</span>
                    </div>
                    <a
                      href={devMagicLink}
                      id="dev-magic-link-btn"
                      className="w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-lg bg-brand-primary text-white hover:bg-brand-hover transition-all shadow-md"
                    >
                      <span>Click Here to Sign In Now &rarr;</span>
                    </a>
                  </div>
                )}

                <div className="pt-3 flex flex-col gap-2">
                  <button
                    onClick={async () => {
                      setIsLoading(true);
                      try {
                        await requestMagicLink(email.trim().toLowerCase());
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={isLoading}
                    className="w-full py-2.5 text-xs font-semibold text-brand-primary border border-brand-primary/30 rounded-xl hover:bg-brand-primary/5 transition-colors flex items-center justify-center gap-1.5"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Resending Link...
                      </>
                    ) : (
                      'Resend link'
                    )}
                  </button>
                  <button
                    onClick={() => setIsSuccess(false)}
                    className="w-full py-2.5 text-xs font-semibold text-text-secondary hover:text-text-primary border border-border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                  >
                    Use a different email
                  </button>
                  <Link
                    href="/"
                    className="w-full py-2.5 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-hover rounded-xl shadow-sm transition-all text-center"
                  >
                    Return to Home
                  </Link>
                </div>
              </div>
            ) : (
              /* Standard Auth Flow */
              <div className="space-y-6">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-brand-primary/10 text-brand-primary border border-brand-primary/20 mb-3">
                    <Lock className="w-3.5 h-3.5" />
                    <span>Passwordless & Secure</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
                    Sign in to LaunchProduct
                  </h2>
                  <p className="text-xs sm:text-sm text-text-secondary mt-1">
                    Enter your email to receive a secure 1-click magic link.
                  </p>
                </div>

                {/* Method Switch Pills */}
                <div className="flex items-center p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setAuthMethod('magic')}
                    className={`flex-1 py-2 rounded-lg transition-all ${
                      authMethod === 'magic'
                        ? 'bg-white dark:bg-slate-900 text-text-primary shadow-sm'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Magic Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setAuthMethod('oauth')}
                    className={`flex-1 py-2 rounded-lg transition-all ${
                      authMethod === 'oauth'
                        ? 'bg-white dark:bg-slate-900 text-text-primary shadow-sm'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    Social OAuth
                  </button>
                </div>

                {errorMessage && (
                  <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{errorMessage}</span>
                  </div>
                )}

                {authMethod === 'magic' ? (
                  /* Magic Link Form */
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="email"
                        className="block text-xs font-semibold text-text-primary mb-1.5"
                      >
                        Email Address
                      </label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          id="email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="founder@company.com"
                          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-surface text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all shadow-sm"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3 px-4 rounded-xl bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold shadow-md shadow-brand-primary/25 hover:shadow-brand-primary/35 transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Generating Secure Link...</span>
                        </>
                      ) : (
                        <>
                          <span>Send Instant Magic Link</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* OAuth Buttons */
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={() => handleOAuth('google')}
                      className="w-full py-3 px-4 text-xs font-semibold text-text-primary bg-surface hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-sm"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOAuth('github')}
                      className="w-full py-3 px-4 text-xs font-semibold text-text-primary bg-surface hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-sm"
                    >
                      <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                        <path
                          fillRule="evenodd"
                          clipRule="evenodd"
                          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                        />
                      </svg>
                      <span>Continue with GitHub</span>
                    </button>
                  </div>
                )}

                {/* Security Guarantee Micro-Notice */}
                <div className="pt-4 border-t border-slate-200/60 dark:border-slate-800/60 text-center">
                  <p className="text-[11px] text-text-secondary leading-relaxed">
                    By signing in, you agree to our{' '}
                    <Link href="/terms" className="underline hover:text-brand-primary">
                      Terms
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" className="underline hover:text-brand-primary">
                      Privacy Policy
                    </Link>
                    . 100% passwordless security.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Micro Footer */}
        <div className="text-center text-xs text-text-secondary pt-6">
          &copy; {new Date().getFullYear()} LaunchProduct Inc. • All Rights Reserved
        </div>
      </div>
    </div>
  );
}
