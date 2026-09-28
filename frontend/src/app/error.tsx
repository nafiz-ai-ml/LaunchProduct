'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, RefreshCw, Home, ChevronDown, ChevronUp, Copy, CheckCircle2 } from 'lucide-react';

export default function GlobalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Log error to telemetry / console
    console.error('Unhandled Next.js client runtime error captured by boundary:', error);
  }, [error]);

  const copyDiagnostic = () => {
    const text = `Error: ${error.message}\nDigest: ${error.digest || 'N/A'}\nStack: ${error.stack || 'No stack'}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-16 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <div className="max-w-lg w-full text-center space-y-6 bg-white dark:bg-slate-900 p-8 sm:p-10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-16 -right-16 w-40 h-40 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Warning Icon Container */}
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto shadow-sm">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
            System Notice
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            Something Went Wrong
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
            We encountered an unexpected issue while rendering this page. Our telemetry has logged the event.
          </p>
        </div>

        {/* Diagnostic Panel in Development */}
        {error?.message && (
          <div className="text-left bg-slate-50 dark:bg-slate-850 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between text-slate-500">
              <span className="font-bold text-[10px] uppercase tracking-wider text-rose-500">
                Diagnostic Trace
              </span>
              <button
                type="button"
                onClick={copyDiagnostic}
                className="inline-flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-500 font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Error</span>
                  </>
                )}
              </button>
            </div>

            <p className="font-mono text-xs text-rose-600 dark:text-rose-400 font-medium break-words leading-relaxed">
              {error.message}
            </p>

            {error.digest && (
              <div className="text-[10px] font-mono text-slate-400">
                Digest ID: {error.digest}
              </div>
            )}

            {error.stack && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setShowDetails(!showDetails)}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-brand-electric hover:underline"
                >
                  <span>{showDetails ? 'Hide Stack Trace' : 'View Stack Trace'}</span>
                  {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>

                {showDetails && (
                  <pre className="mt-2 p-3 rounded-xl bg-slate-900 text-slate-200 text-[10px] font-mono overflow-x-auto max-h-40 leading-tight">
                    {error.stack}
                  </pre>
                )}
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            id="error-try-again-btn"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-md shadow-blue-500/25 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Try Again</span>
          </button>
          <Link
            href="/"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 text-xs font-semibold text-slate-700 dark:text-slate-300 transition-colors"
          >
            <Home className="w-4 h-4 text-slate-400" />
            <span>Return Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
