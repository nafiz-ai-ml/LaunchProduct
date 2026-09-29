'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { verifyEmail, resendVerificationCode } from '@/lib/auth-client';
import { CheckCircle2, AlertCircle, ArrowRight, Loader2, Mail, ShieldCheck } from 'lucide-react';

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const emailParam = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailParam);
  const [code, setCode] = useState('');
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>(
    token ? 'verifying' : 'idle'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [isResending, setIsResending] = useState(false);

  // 1-Click Verification if token is in URL
  useEffect(() => {
    if (!token) return;

    let isMounted = true;

    async function doVerifyToken() {
      try {
        await verifyEmail(emailParam, undefined, token!);
        if (isMounted) {
          setStatus('success');
          setTimeout(() => {
            window.location.href = '/dashboard?verified=true';
          }, 900);
        }
      } catch (err: any) {
        if (isMounted) {
          setStatus('error');
          setErrorMessage(
            err?.response?.data?.error?.message ||
              err?.message ||
              'This email verification link is invalid or has expired.'
          );
        }
      }
    }

    doVerifyToken();

    return () => {
      isMounted = false;
    };
  }, [token, emailParam]);

  // Handle manual 6-digit OTP submission
  const handleManualVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanCode = code.trim();
    if (cleanCode.length !== 6) {
      setErrorMessage('Please enter the full 6-digit verification code.');
      return;
    }

    setStatus('verifying');
    try {
      await verifyEmail(email.trim().toLowerCase(), cleanCode);
      setStatus('success');
      setTimeout(() => {
        window.location.href = '/dashboard?verified=true';
      }, 900);
    } catch (err: any) {
      setStatus('idle');
      setErrorMessage(
        err?.response?.data?.error?.message ||
          err?.message ||
          'Invalid or expired verification code. Please check and try again.'
      );
    }
  };

  // Handle Resend Verification Code
  const handleResend = async () => {
    if (!email) {
      setErrorMessage('Please provide your email address to receive a new code.');
      return;
    }

    setIsResending(true);
    setResendStatus(null);
    setErrorMessage(null);

    try {
      const res = await resendVerificationCode(email.trim().toLowerCase());
      setResendStatus(res.message || 'A new verification code has been dispatched.');
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.error?.message ||
          err?.message ||
          'Failed to resend code. Please try again.'
      );
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl p-6 sm:p-8 text-center relative overflow-hidden">
      {/* Brand Accent Top Bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-brand-primary via-[#ff853a] to-brand-primary" />

      {/* Verifying Status */}
      {status === 'verifying' && (
        <div className="space-y-4 py-4 animate-in fade-in duration-200">
          <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mx-auto text-brand-primary">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold tracking-tight text-text-primary">
              Verifying your email...
            </h1>
            <p className="text-xs text-text-secondary">
              Activating your LaunchProduct account credentials
            </p>
          </div>
        </div>
      )}

      {/* Success Status */}
      {status === 'success' && (
        <div className="space-y-4 py-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-text-primary">
              Email Verified Successfully!
            </h1>
            <p className="text-xs text-text-secondary">
              Welcome aboard. Redirecting you to your dashboard...
            </p>
          </div>
        </div>
      )}

      {/* Idle or Error (Enter 6-digit OTP code) */}
      {(status === 'idle' || status === 'error') && (
        <div className="space-y-5 animate-in fade-in duration-200">
          <div className="w-14 h-14 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mx-auto text-brand-primary">
            <ShieldCheck className="w-7 h-7" />
          </div>

          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-text-primary">
              Verify Your Email Address
            </h1>
            <p className="text-xs text-text-secondary leading-relaxed">
              We sent a 6-digit verification code to{' '}
              <span className="font-semibold text-text-primary">{email || 'your email'}</span>.
              Enter it below to activate your account.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-2 text-xs text-red-600 dark:text-red-400 text-left">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {resendStatus && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-300 text-left">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{resendStatus}</span>
            </div>
          )}

          <form onSubmit={handleManualVerify} className="space-y-4 text-left">
            {!emailParam && (
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
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-border bg-surface text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1 text-center">
                6-Digit Verification Code
              </label>
              <input
                type="text"
                required
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                autoFocus
                className="w-full text-center text-2xl font-mono tracking-[0.5em] py-3 rounded-xl border border-border bg-surface text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary font-bold shadow-xs"
              />
            </div>

            <button
              type="submit"
              disabled={code.length !== 6}
              className="w-full py-2.5 px-4 rounded-xl bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold shadow-md shadow-brand-primary/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <span>Activate Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="pt-2 border-t border-border flex items-center justify-between text-xs text-text-secondary">
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="text-brand-primary hover:underline font-semibold disabled:opacity-50"
            >
              {isResending ? 'Sending...' : 'Resend Code'}
            </button>
            <Link href="/auth" className="hover:text-text-primary transition-colors">
              Back to Sign In
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex-col justify-between selection:bg-brand-primary selection:text-white">
      <header className="max-w-7xl mx-auto w-full px-4 sm:px-6 py-6 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 hover:opacity-90 transition-opacity">
          <Logo variant="horizontal" width={154} height={32} />
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6">
        <Suspense
          fallback={
            <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl p-8 text-center flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-brand-primary animate-spin mb-3" />
              <p className="text-xs text-text-secondary">Loading verification...</p>
            </div>
          }
        >
          <VerifyEmailContent />
        </Suspense>
      </main>

      <footer className="py-6 text-center text-xs text-text-muted">
        © {new Date().getFullYear()} LaunchProduct. High-integrity session security.
      </footer>
    </div>
  );
}
