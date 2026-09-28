'use client';

import React, { useState, useEffect } from 'react';
import { Logo } from '@/components/brand/Logo';
import { requestMagicLink } from '@/lib/auth-client';
import {
  X,
  Mail,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}

export function AuthModal({
  isOpen,
  onClose,
  title = 'Join LaunchProduct',
  subtitle = 'Sign in or create an account to upvote, submit tools, and join discussions.',
}: AuthModalProps) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setEmail('');
      setIsLoading(false);
      setIsSuccess(false);
      setErrorMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await requestMagicLink(email.trim().toLowerCase());
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
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl p-6 sm:p-8 relative overflow-hidden animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 text-text-muted hover:text-text-primary p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {isSuccess ? (
          /* Success Screen */
          <div className="text-center py-4 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="text-lg font-bold tracking-tight text-text-primary">
                Magic Link Dispatched!
              </h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                We sent a 15-minute secure sign-in link to{' '}
                <span className="font-semibold text-text-primary">{email}</span>.
              </p>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl text-left border border-border flex items-start gap-2.5">
              <Sparkles className="w-4 h-4 text-brand-primary flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Click the link in the email to sign in instantly. Don&apos;t forget to check your spam folder if it doesn&apos;t arrive within 60 seconds.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-hover rounded-xl shadow-sm transition-all"
            >
              Done & Close
            </button>
          </div>
        ) : (
          /* Form Screen */
          <div className="space-y-5">
            <div className="text-center space-y-1.5">
              <div className="inline-block mb-1">
                <Logo variant="horizontal" width={140} height={30} />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-text-primary">
                {title}
              </h2>
              <p className="text-xs text-text-secondary max-w-xs mx-auto">
                {subtitle}
              </p>
            </div>

            {/* OAuth Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleOAuth('google')}
                className="w-full py-2 px-3 text-xs font-semibold text-text-primary bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-border rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
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
                Continue with Google
              </button>

              <button
                type="button"
                onClick={() => handleOAuth('github')}
                className="w-full py-2 px-3 text-xs font-semibold text-text-primary bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-border rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
                Continue with GitHub
              </button>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center">
              <div className="border-t border-border w-full" />
              <span className="bg-surface px-2.5 text-[10px] font-semibold text-text-muted uppercase tracking-wider relative z-10">
                Or magic link
              </span>
            </div>

            {/* Error Banner */}
            {errorMessage && (
              <div className="p-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl flex items-start gap-2 text-xs text-red-600 dark:text-red-400">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label htmlFor="auth-modal-email" className="block text-[11px] font-semibold text-text-primary mb-1">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="auth-modal-email"
                    type="email"
                    required
                    placeholder="alex@startup.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-border focus:border-brand-primary rounded-xl outline-none transition-all placeholder:text-text-muted"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-brand-primary hover:bg-brand-hover active:bg-brand-active disabled:opacity-60 rounded-xl shadow-sm flex items-center justify-center gap-1.5 transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Sending Magic Link...
                  </>
                ) : (
                  <>
                    Send Magic Link
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>

            <div className="flex items-center justify-center gap-1 text-[10px] text-text-muted text-center">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Passwordless & zero spam guaranteed</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AuthModal;
