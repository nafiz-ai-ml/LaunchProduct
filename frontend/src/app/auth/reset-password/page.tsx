'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { Logo } from '@/components/brand/Logo';
import { resetPassword } from '@/lib/auth-client';
import {
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowLeft,
  Eye,
  EyeOff,
  ShieldCheck,
} from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage('Reset token is missing or invalid. Please request a new password reset link.');
      return;
    }

    if (password.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(token, password);
      setIsSuccess(true);
      setTimeout(() => {
        router.push('/auth');
      }, 2500);
    } catch (err: any) {
      setErrorMessage(
        err?.response?.data?.error?.message ||
        err?.message ||
        'Failed to reset password. The link may have expired.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center mx-auto border border-amber-500/20">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-text-primary">Invalid Reset Link</h2>
        <p className="text-xs text-text-secondary max-w-sm mx-auto">
          The password reset token is missing from this URL. Please request a new reset link from the sign-in page.
        </p>
        <Link
          href="/auth"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-hover transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Sign In</span>
        </Link>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="text-center space-y-4 py-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
          <CheckCircle2 className="w-7 h-7" />
        </div>
        <h2 className="text-xl font-bold text-text-primary">Password Reset Successful!</h2>
        <p className="text-xs text-text-secondary max-w-sm mx-auto">
          Your password has been securely updated. Redirecting you to sign in...
        </p>
        <Link
          href="/auth"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-primary text-white text-xs font-bold hover:bg-brand-hover transition-colors"
        >
          <span>Sign In Now</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMessage && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-2.5 text-xs text-red-600 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}

      <div>
        <label className="block text-xs font-semibold text-text-primary mb-1">New Password</label>
        <div className="relative">
          <Lock className="w-4 h-4 text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
            className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all shadow-xs"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary transition-colors"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-text-primary mb-1">Confirm New Password</label>
        <div className="relative">
          <Lock className="w-4 h-4 text-text-secondary absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type={showPassword ? 'text' : 'password'}
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter your new password"
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/80 bg-surface text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/50 focus:border-brand-primary transition-all shadow-xs"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-4 rounded-xl bg-brand-primary hover:bg-brand-hover text-white text-xs font-bold shadow-md shadow-brand-primary/25 hover:shadow-brand-primary/35 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Updating Password...</span>
          </>
        ) : (
          <>
            <span>Reset Password</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      <div className="text-center pt-2">
        <Link href="/auth" className="text-xs text-text-secondary hover:text-brand-primary transition-colors">
          ← Back to Sign In
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen bg-bg text-text-primary flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-block hover:opacity-90 transition-opacity">
            <Logo variant="horizontal" width={154} height={32} />
          </Link>
          <h1 className="text-2xl font-extrabold text-text-primary pt-2">Set New Password</h1>
          <p className="text-xs text-text-secondary">
            Enter and confirm your new secure password below.
          </p>
        </div>

        <Suspense fallback={<div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-primary" /></div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
