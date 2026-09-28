'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';
import { BrandIcon } from '@/components/brand/Icon';
import { verifyMagicLink } from '@/lib/auth-client';
import { CheckCircle2, AlertCircle, ArrowRight, Loader2 } from 'lucide-react';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No authentication token provided in the verification URL.');
      return;
    }

    let isMounted = true;

    async function doVerify() {
      try {
        const user = await verifyMagicLink(token!);
        if (isMounted) {
          setStatus('success');
          const redirect = searchParams.get('redirect') || '/dashboard';
          setTimeout(() => {
            window.location.href = redirect;
          }, 800);
        }
      } catch (err: any) {
        // If link was already consumed but session exists, proceed cleanly
        if (typeof window !== 'undefined' && localStorage.getItem('lp_session_user')) {
          if (isMounted) {
            setStatus('success');
            const redirect = searchParams.get('redirect') || '/dashboard';
            setTimeout(() => {
              window.location.href = redirect;
            }, 600);
            return;
          }
        }

        if (isMounted) {
          setStatus('error');
          setErrorMessage(
            err?.message ||
              'This sign-in link has expired or has already been used.'
          );
        }
      }
    }

    doVerify();

    return () => {
      isMounted = false;
    };
  }, [token, router]);

  return (
    <div className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-xl p-8 text-center relative overflow-hidden">
      {/* Ambient Glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-brand-primary/10 rounded-full blur-2xl pointer-events-none" />

      {status === 'verifying' && (
        <div className="space-y-4 py-4 animate-in fade-in duration-200">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 flex items-center justify-center mx-auto text-brand-primary animate-pulse">
            <BrandIcon size={30} />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold tracking-tight text-text-primary">
              Securing your session...
            </h1>
            <p className="text-xs text-text-secondary">
              Verifying magic link
            </p>
          </div>
        </div>
      )}

      {status === 'success' && (
        <div className="space-y-4 py-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h1 className="text-xl font-bold tracking-tight text-text-primary">
              Authenticated successfully!
            </h1>
            <p className="text-xs text-text-secondary">
              Welcome to LaunchProduct. Taking you to your dashboard...
            </p>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div className="space-y-5 py-4 animate-in fade-in zoom-in-95 duration-200">
          <div className="w-14 h-14 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center justify-center mx-auto text-red-600 dark:text-red-400">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div className="space-y-1.5">
            <h1 className="text-xl font-bold tracking-tight text-text-primary">
              Authentication Link Expired
            </h1>
            <p className="text-xs text-text-secondary leading-relaxed max-w-sm mx-auto">
              {errorMessage || 'This sign-in link has expired or has already been used.'}
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/auth"
              className="w-full py-2.5 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-hover rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all"
            >
              Request New Magic Link
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
            <Link
              href="/"
              className="w-full py-2.5 text-xs font-semibold text-text-secondary hover:text-text-primary border border-border rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Return to Home
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VerifyPage() {
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
          <VerifyContent />
        </Suspense>
      </main>

      <footer className="py-6 text-center text-xs text-text-muted">
        © 2026 LaunchProduct. High-integrity session security.
      </footer>
    </div>
  );
}
