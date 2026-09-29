'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import {
  registerWithPassword,
  verifyEmail,
  resendVerificationCode,
  loginWithPassword,
  forgotPassword,
} from '@/lib/auth-client';
import {
  Mail,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Lock,
  Flame,
  TrendingUp,
  Award,
  Users,
  Eye,
  EyeOff,
  User as UserIcon,
  KeyRound,
  RotateCw,
} from 'lucide-react';

export default function AuthPage() {
  const router = useRouter();

  // Mode: 'signin' | 'signup' | 'forgot' | 'verify_otp'
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot' | 'verify_otp'>('signin');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // OTP Verification Fields
  const [otpCode, setOtpCode] = useState('');
  const [verificationEmail, setVerificationEmail] = useState('');
  const [isResending, setIsResending] = useState(false);

  // Status
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [devOtpCode, setDevOtpCode] = useState<string | null>(null);
  const [devVerificationUrl, setDevVerificationUrl] = useState<string | null>(null);
  const [devResetLink, setDevResetLink] = useState<string | null>(null);

  // Social OAuth Redirection
  const handleOAuth = (provider: 'google' | 'github') => {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const baseUrl = apiUrl.includes('/api/v1') ? apiUrl : `${apiUrl.replace(/\/$/, '')}/api/v1`;
    window.location.href = `${baseUrl}/auth/oauth/${provider}`;
  };

  // Sign In with Email & Password
  // Sign In with Email & Password
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!termsAccepted) {
      setErrorMessage('Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }

    if (!email || !password) {
      setErrorMessage('Please enter both your email address and password.');
      return;
    }

    setIsLoading(true);
    try {
      await loginWithPassword(email.trim().toLowerCase(), password, rememberMe);
      setSuccessMessage('Signed in successfully! Taking you to your dashboard...');
      const redirect = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('redirect') || '/dashboard'
        : '/dashboard';
      setTimeout(() => {
        router.push(redirect);
      }, 400);
    } catch (err: any) {
      const errMsg = err?.response?.data?.error?.message || err?.message || '';
      setErrorMessage(
        errMsg || 'Invalid email or password. Please try again or use Forgot Password.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Sign Up with Name, Email & Password (Instant Frictionless Auth)
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!termsAccepted) {
      setErrorMessage('You must agree to the Terms of Service and Privacy Policy to register.');
      return;
    }

    if (!name || name.trim().length < 2) {
      setErrorMessage('Please enter your full name (at least 2 characters).');
      return;
    }

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      await registerWithPassword(name.trim(), email.trim().toLowerCase(), password, termsAccepted);
      setSuccessMessage('Account created successfully! Taking you to your dashboard...');
      const redirect = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('redirect') || '/dashboard'
        : '/dashboard';
      setTimeout(() => {
        router.push(redirect);
      }, 400);
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to create account. Please check your details and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Verify 6-Digit OTP Code
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanCode = otpCode.trim();
    if (cleanCode.length !== 6) {
      setErrorMessage('Please enter the complete 6-digit verification code.');
      return;
    }

    setIsLoading(true);
    try {
      await verifyEmail(verificationEmail || email.trim().toLowerCase(), cleanCode);
      setSuccessMessage('Email verified successfully! Taking you to your dashboard...');
      const redirect = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('redirect') || '/dashboard'
        : '/dashboard';
      setTimeout(() => {
        router.push(redirect);
      }, 700);
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.error?.message ||
        err?.message ||
        'Invalid or expired verification code. Please check and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Resend OTP Code
  const handleResendOtp = async () => {
    const target = verificationEmail || email.trim().toLowerCase();
    if (!target) {
      setErrorMessage('Email address is missing.');
      return;
    }

    setIsResending(true);
    setErrorMessage(null);
    try {
      const res = await resendVerificationCode(target);
      if (res?.devVerificationCode) {
        setDevOtpCode(res.devVerificationCode);
      }
      setSuccessMessage(res?.message || 'A fresh 6-digit verification code has been dispatched.');
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to resend verification code. Please try again.'
      );
    } finally {
      setIsResending(false);
    }
  };

  // Request Password Reset
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter your account email address.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await forgotPassword(email.trim().toLowerCase());
      setSuccessMessage('If an account exists with this email, a password reset link has been dispatched.');
      if (res?.devResetLink) {
        setDevResetLink(res.devResetLink);
      }
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to request password reset. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen lg:h-screen lg:max-h-screen lg:overflow-hidden bg-bg text-text-primary flex flex-col lg:flex-row selection:bg-brand-primary selection:text-white">
      {/* ========================================================= */}
      {/* LEFT COLUMN: BRAND WORLD, SOCIAL PROOF & LIVE TELEMETRY   */}
      {/* ========================================================= */}
      <div className="hidden lg:flex lg:w-[48%] xl:w-[50%] bg-slate-950 relative overflow-hidden flex-col justify-between p-6 lg:p-8 xl:p-10 border-r border-slate-800/80 text-white h-full">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary/20 blur-[140px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-indigo-600/15 blur-[130px] rounded-full pointer-events-none" />

        {/* Top Header - Logo removed as requested; only clean navigation back */}
        <div className="relative z-10 flex items-center justify-start">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white px-3 py-1.5 rounded-xl border border-slate-800 hover:bg-slate-900 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Explore Launches</span>
          </Link>
        </div>

        {/* Center Content (Sleek, compact and fits in standard viewport without scrolling) */}
        <div className="relative z-10 my-auto py-2 max-w-lg space-y-4">
          <div className="space-y-2.5">
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Over 100+ Verified AI &amp; SaaS Products Active</span>
            </div>

            <h1 className="text-2xl xl:text-3xl font-black tracking-tight leading-tight">
              Where High-Integrity Founders Launch &amp; Genuine Products Win.
            </h1>

            <p className="text-xs xl:text-sm text-slate-400 leading-relaxed">
              LaunchProduct is the developer-centric discovery engine powered by cryptographic DNS verification, Sybil anti-fraud defenses, and authentic community adoption.
            </p>
          </div>

          {/* Social Proof Cards */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-1.5 text-brand-primary font-bold text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-white">Zero Fake Votes</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Multi-signal anti-fraud protects honest makers from bot syndicates.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 space-y-1">
              <div className="flex items-center gap-1.5 text-brand-primary font-bold text-xs">
                <Flame className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-white">Daily Leaderboard</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-snug">
                Transparent gravity algorithm updating in real-time each midnight UTC.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom Social Proof */}
        <div className="relative z-10 pt-3 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2.5">
            <div className="flex -space-x-1.5">
              <div className="w-6 h-6 rounded-full bg-indigo-500 border border-slate-950 flex items-center justify-center text-[9px] font-bold text-white">N</div>
              <div className="w-6 h-6 rounded-full bg-emerald-500 border border-slate-950 flex items-center justify-center text-[9px] font-bold text-white">S</div>
              <div className="w-6 h-6 rounded-full bg-amber-500 border border-slate-950 flex items-center justify-center text-[9px] font-bold text-white">A</div>
            </div>
            <span className="text-[11px]">Trusted by 1,200+ founders worldwide</span>
          </div>
          <span className="text-[11px]">100% Cryptographic Security</span>
        </div>
      </div>

      {/* ========================================================= */}
      {/* RIGHT COLUMN: AUTHENTICATION FORM (SIGN IN / SIGN UP)     */}
      {/* ========================================================= */}
      <div className="flex-1 flex flex-col justify-between p-4 sm:p-6 lg:p-8 xl:p-10 max-w-xl mx-auto w-full h-full overflow-y-auto">
        {/* Mobile Header */}
        <div className="flex lg:hidden items-center justify-between mb-4 pb-3 border-b border-border">
          <Link href="/">
            <Logo width={130} height={28} />
          </Link>
          <Link
            href="/"
            className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-1 font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Home</span>
          </Link>
        </div>

        <div className="my-auto max-w-md w-full mx-auto space-y-4 py-2">
          {/* Main Primary Tabs: Sign In vs Sign Up */}
          {authMode !== 'forgot' && authMode !== 'verify_otp' && (
            <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs font-bold">
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signin');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2 rounded-lg transition-all text-center ${
                  authMode === 'signin'
                    ? 'bg-white dark:bg-slate-900 text-brand-primary shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => {
                  setAuthMode('signup');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                }}
                className={`py-2 rounded-lg transition-all text-center ${
                  authMode === 'signup'
                    ? 'bg-white dark:bg-slate-900 text-brand-primary shadow-xs'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          {/* Form Header */}
          <div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-text-primary">
              {authMode === 'signup' && 'Create Your Account'}
              {authMode === 'signin' && 'Welcome Back'}
              {authMode === 'forgot' && 'Reset Your Password'}
              {authMode === 'verify_otp' && 'Verify Your Email'}
            </h2>
            <p className="text-xs text-text-secondary mt-0.5">
              {authMode === 'signup' && 'Join LaunchProduct to submit tools, verify traction, and compete.'}
              {authMode === 'signin' && 'Sign in to access your products, voting credentials, and dashboard.'}
              {authMode === 'forgot' && 'Enter your email address to receive a secure password recovery link.'}
              {authMode === 'verify_otp' && `Enter the 6-digit code dispatched to ${verificationEmail || email}.`}
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Message */}
          {successMessage && (
            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl space-y-3">
              <div className="flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-500" />
                <span>{successMessage}</span>
              </div>

              {/* Dev instant reset shortcut */}
              {devResetLink && (
                <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60">
                  <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-200 mb-1">
                    Development Password Reset Link:
                  </p>
                  <Link
                    href={devResetLink}
                    className="text-xs text-brand-primary underline break-all font-mono hover:opacity-80"
                  >
                    Click to Open Password Reset Screen
                  </Link>
                </div>
              )}

              {/* Dev instant OTP shortcut */}
              {devOtpCode && (
                <div className="pt-2 border-t border-emerald-200/60 dark:border-emerald-800/60">
                  <p className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-200 mb-1">
                    Development 6-Digit Verification Code:
                  </p>
                  <button
                    type="button"
                    onClick={() => setOtpCode(devOtpCode)}
                    className="text-xs font-mono font-bold px-2.5 py-1 rounded bg-brand-primary/10 text-brand-primary border border-brand-primary/30 hover:bg-brand-primary/20 transition-colors"
                  >
                    Click to Auto-fill Code: {devOtpCode}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Social OAuth Buttons (for Sign In & Sign Up) */}
          {(authMode === 'signin' || authMode === 'signup') && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleOAuth('google')}
                  className="py-2 px-3 text-xs font-semibold text-text-primary bg-surface hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>Google</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleOAuth('github')}
                  className="py-2 px-3 text-xs font-semibold text-text-primary bg-surface hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                    <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                  </svg>
                  <span>GitHub</span>
                </button>
              </div>

              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-border w-full" />
                <span className="bg-bg px-2.5 text-[10px] text-text-muted uppercase tracking-wider font-semibold absolute">
                  Or with email
                </span>
              </div>
            </div>
          )}

          {/* ========================================= */}
          {/* TAB 1: SIGN IN (EMAIL + PASSWORD)         */}
          {/* ========================================= */}
          {authMode === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="founder@company.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-surface text-xs text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all shadow-xs"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-text-primary">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('forgot');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[11px] text-brand-primary hover:underline font-semibold"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-9 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-surface text-xs text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all shadow-xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-brand-primary focus:ring-brand-primary/50 cursor-pointer"
                  />
                  <span className="text-xs text-text-secondary">Remember me for 30 days</span>
                </label>
              </div>

              {/* REQUIRED Terms Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    required
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-brand-primary focus:ring-brand-primary/50 cursor-pointer"
                  />
                  <span className="text-[11px] text-text-secondary leading-tight">
                    I agree to the{' '}
                    <Link href="/terms" target="_blank" className="text-brand-primary hover:underline font-semibold">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" target="_blank" className="text-brand-primary hover:underline font-semibold">
                      Privacy Policy
                    </Link>
                    . <span className="text-red-500 font-bold">*</span>
                  </span>
                </label>
              </div>

              {/* Submit Sign In Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold shadow-md shadow-brand-primary/25 hover:shadow-brand-primary/35 transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

            </form>
          )}

          {/* ========================================= */}
          {/* TAB 2: SIGN UP (CREATE ACCOUNT)           */}
          {/* ========================================= */}
          {authMode === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Full Name
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Muhammad Nafiz"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-surface text-xs text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all shadow-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="founder@company.com"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-surface text-xs text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all shadow-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min 8 chars"
                      className="w-full pl-9 pr-8 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-surface text-xs text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all shadow-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-primary mb-1">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm pass"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-surface text-xs text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all shadow-xs"
                    />
                  </div>
                </div>
              </div>

              {/* REQUIRED Terms Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    required
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                    className="mt-0.5 w-3.5 h-3.5 rounded border-slate-300 dark:border-slate-700 text-brand-primary focus:ring-brand-primary/50 cursor-pointer"
                  />
                  <span className="text-[11px] text-text-secondary leading-tight">
                    I agree to the{' '}
                    <Link href="/terms" target="_blank" className="text-brand-primary hover:underline font-semibold">
                      Terms of Service
                    </Link>{' '}
                    and{' '}
                    <Link href="/privacy" target="_blank" className="text-brand-primary hover:underline font-semibold">
                      Privacy Policy
                    </Link>
                    . <span className="text-red-500 font-bold">*</span>
                  </span>
                </label>
              </div>

              {/* Submit Sign Up Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold shadow-md shadow-brand-primary/25 hover:shadow-brand-primary/35 transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.01] active:scale-[0.99]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Creating Account...</span>
                  </>
                ) : (
                  <>
                    <span>Create Free Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ========================================= */}
          {/* TAB 3: FORGOT PASSWORD                    */}
          {/* ========================================= */}
          {authMode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1">
                  Account Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-text-secondary absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-surface text-xs text-text-primary placeholder:text-text-secondary/50 focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all shadow-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-xl bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold shadow-md shadow-brand-primary/25 hover:shadow-brand-primary/35 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Sending Reset Link...</span>
                  </>
                ) : (
                  <>
                    <span>Send Password Reset Link</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="text-xs text-text-secondary hover:text-brand-primary transition-colors inline-flex items-center gap-1.5 font-medium"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </button>
              </div>
            </form>
          )}

          {/* ========================================= */}
          {/* TAB 4: 6-DIGIT EMAIL VERIFICATION         */}
          {/* ========================================= */}
          {authMode === 'verify_otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mx-auto text-brand-primary mb-2">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                  We sent a 6-digit verification code to{' '}
                  <span className="font-semibold text-text-primary">
                    {verificationEmail || email}
                  </span>
                  . Enter it below to activate your account.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-primary mb-1 text-center">
                  Enter 6-Digit Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  placeholder="123456"
                  autoFocus
                  className="w-full text-center text-2xl font-mono tracking-[0.4em] py-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-surface text-text-primary font-bold focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary shadow-xs"
                />
              </div>

              {/* Dev instant OTP auto-fill button */}
              {devOtpCode && (
                <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-left">
                  <p className="text-[11px] font-semibold text-amber-800 dark:text-amber-200 mb-1">
                    Development Auto-Fill Code:
                  </p>
                  <button
                    type="button"
                    onClick={() => setOtpCode(devOtpCode)}
                    className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-brand-primary text-white hover:bg-brand-hover transition-colors"
                  >
                    Click to Insert Code: {devOtpCode}
                  </button>
                </div>
              )}

              {/* Submit Verification Button */}
              <button
                type="submit"
                disabled={isLoading || otpCode.length !== 6}
                className="w-full py-2.5 px-4 rounded-xl bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold shadow-md shadow-brand-primary/25 hover:shadow-brand-primary/35 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verifying Code...</span>
                  </>
                ) : (
                  <>
                    <span>Verify &amp; Activate Account</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>

              <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-text-secondary">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={isResending}
                  className="text-brand-primary hover:underline font-semibold disabled:opacity-50 flex items-center gap-1"
                >
                  <RotateCw className={`w-3 h-3 ${isResending ? 'animate-spin' : ''}`} />
                  <span>{isResending ? 'Resending...' : 'Resend Code'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signin');
                    setErrorMessage(null);
                    setSuccessMessage(null);
                  }}
                  className="hover:text-text-primary transition-colors"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Bottom Micro Footer */}
        <div className="text-center text-[11px] text-text-secondary pt-2">
          &copy; {new Date().getFullYear()} LaunchProduct Inc. • All Rights Reserved
        </div>
      </div>
    </div>
  );
}
