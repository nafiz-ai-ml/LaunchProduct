'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import {
  X,
  Zap,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Loader2,
  DollarSign,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

export interface OutbidModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId?: string;
  productName?: string;
  currentRank?: number;
  currentAmountCents?: number;
  targetProduct?: {
    id: string;
    name: string;
    slug?: string;
    rank?: number;
    amountCents?: number;
    logoUrl?: string;
  } | null;
  onAuthRequired?: () => void;
}

export function OutbidModal({
  isOpen,
  onClose,
  productId,
  productName,
  currentRank,
  currentAmountCents,
  targetProduct,
  onAuthRequired,
}: OutbidModalProps) {
  const router = useRouter();

  // Resolve target properties from direct props or targetProduct
  const resolvedRank = targetProduct?.rank ?? currentRank ?? 1;
  const resolvedAmountCents = targetProduct?.amountCents ?? currentAmountCents ?? 599;
  const resolvedName = targetProduct?.name ?? productName ?? 'Top Product';

  // Minimum required to outbid: current bid + $1.00 (100 cents), but at least $5.99 (599 cents)
  const minOutbidCents = Math.max(599, resolvedAmountCents + 100);
  const minOutbidDollars = (minOutbidCents / 100).toFixed(2);

  const [bidAmountDollars, setBidAmountDollars] = useState<string>(minOutbidDollars);
  const [productUrl, setProductUrl] = useState<string>('');
  const [payerEmail, setPayerEmail] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOutbidRedirect = () => {
    // If user wants full submission with this target bid
    const params = new URLSearchParams();
    if (productUrl) params.set('url', productUrl);
    if (payerEmail) params.set('email', payerEmail);
    if (bidAmountDollars) params.set('bid', bidAmountDollars);
    router.push(`/submit?${params.toString()}`);
    onClose();
  };

  const handleDirectOutbidCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const dollarsNum = parseFloat(bidAmountDollars);
    if (isNaN(dollarsNum) || dollarsNum < minOutbidCents / 100) {
      setErrorMessage(`Minimum outbid amount for rank #${resolvedRank} is $${minOutbidDollars}`);
      return;
    }

    if (!productUrl.trim()) {
      setErrorMessage('Please enter your product website URL');
      return;
    }

    if (!payerEmail.trim() || !payerEmail.includes('@')) {
      setErrorMessage('Please enter a valid contact email for your payment receipt');
      return;
    }

    setIsSubmitting(true);
    try {
      // Use publicAccountlessSubmit which detects existing products or creates a pending record and returns checkout
      const amountCents = Math.round(dollarsNum * 100);
      const res = await apiClient.post('/products/public-submit', {
        name: productUrl.replace(/^https?:\/\//i, '').split('/')[0],
        url: productUrl.startsWith('http') ? productUrl : `https://${productUrl}`,
        tagline: 'Outbid submission via Pay-to-Rank',
        categorySlug: 'saas',
        contactEmail: payerEmail,
        rankingAmountCents: amountCents,
        provider: 'paddle',
      });

      if (res.data?.data?.checkoutUrl) {
        window.location.href = res.data.data.checkoutUrl;
      } else {
        // Fallback to submit form
        handleOutbidRedirect();
      }
    } catch (err: any) {
      setErrorMessage(
        err.response?.data?.error?.message ||
          'Failed to initialize checkout. Please use the full submission form.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in overflow-y-auto">
      <div className="bg-surface border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-up my-auto max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary-subtle to-transparent p-4 sm:p-5 border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm shrink-0">
              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-amber-300" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-text-primary text-sm sm:text-lg truncate">
                Outbid &amp; Claim Rank #{resolvedRank}
              </h3>
              <p className="text-text-muted text-[11px] sm:text-xs">
                Accountless Pay-to-Rank • Instant placement upon confirmed payment
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-sunken text-text-muted hover:text-text-primary flex items-center justify-center transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4 sm:space-y-5 overflow-y-auto">
          {/* Target Product Badge */}
          <div className="bg-surface-sunken p-3.5 rounded-xl border border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="font-mono text-sm font-bold text-primary bg-primary-subtle px-2.5 py-1 rounded-lg">
                #{resolvedRank}
              </span>
              <div>
                <div className="text-[11px] text-text-muted uppercase tracking-wider font-semibold">
                  Current Leader
                </div>
                <div className="font-bold text-text-primary text-sm">
                  {resolvedName}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-text-muted uppercase tracking-wider font-semibold">
                Current Bid
              </div>
              <div className="font-mono font-bold text-text-primary text-sm">
                ${(resolvedAmountCents / 100).toFixed(2)}
              </div>
            </div>
          </div>

          <form onSubmit={handleDirectOutbidCheckout} className="space-y-4">
            {/* Outbid Bid Amount Input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs font-bold text-text-primary uppercase tracking-wider">
                  Your Outbid Amount (USD)
                </label>
                <span className="text-[11px] text-primary font-medium">
                  Min required: ${minOutbidDollars}
                </span>
              </div>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted font-bold">
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min={minOutbidDollars}
                  value={bidAmountDollars}
                  onChange={(e) => setBidAmountDollars(e.target.value)}
                  className="w-full bg-surface border border-border rounded-xl pl-8 pr-4 py-2.5 text-sm font-mono font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  required
                />
              </div>
            </div>

            {/* Your Product URL */}
            <div>
              <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">
                Your Product Website URL
              </label>
              <input
                type="url"
                value={productUrl}
                onChange={(e) => setProductUrl(e.target.value)}
                placeholder="https://yourproduct.com"
                className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              />
              <p className="text-[11px] text-text-muted mt-1">
                If already listed, your product is automatically identified by canonical domain.
              </p>
            </div>

            {/* Payer Email */}
            <div>
              <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-1.5">
                Founder / Contact Email
              </label>
              <input
                type="email"
                value={payerEmail}
                onChange={(e) => setPayerEmail(e.target.value)}
                placeholder="founder@yourproduct.com"
                className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                required
              />
              <p className="text-[11px] text-text-muted mt-1">
                For Merchant of Record payment receipt and verification. No account required.
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-xl bg-primary hover:bg-primary-hover text-white font-bold text-sm shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Preparing Checkout...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-amber-300" />
                    <span>Pay ${bidAmountDollars} to Claim #{resolvedRank}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleOutbidRedirect}
                className="py-3 px-4 rounded-xl bg-surface-sunken hover:bg-surface border border-border text-text-secondary hover:text-text-primary font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Full Submit Form</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Trust badges */}
          <div className="pt-2 border-t border-border flex items-center justify-between text-[11px] text-text-muted">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Merchant of Record Verified</span>
            </span>
            <span>No Account Needed</span>
          </div>
        </div>
      </div>
    </div>
  );
}
