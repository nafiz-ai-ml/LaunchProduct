'use client';

import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';
import { getSessionUser } from '@/lib/auth-client';
import { User } from '@/types';
import {
  X,
  Zap,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  AlertCircle,
  Loader2,
  DollarSign,
  Info,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

interface OutbidModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetProduct?: {
    id: string;
    name: string;
    slug: string;
    rank?: number;
    amountCents?: number;
    logoUrl?: string;
  } | null;
  onAuthRequired: () => void;
}

interface UserProduct {
  id?: string;
  _id?: string;
  name: string;
  slug: string;
  paidRankingAmountCents?: number;
}

export function OutbidModal({
  isOpen,
  onClose,
  targetProduct,
  onAuthRequired,
}: OutbidModalProps) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProducts, setUserProducts] = useState<UserProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [targetRank, setTargetRank] = useState<number>(targetProduct?.rank || 1);
  const [customAmountDollars, setCustomAmountDollars] = useState<string>('5.99');
  const [useCustomAmount, setUseCustomAmount] = useState<boolean>(false);
  const [calcLoading, setCalcLoading] = useState<boolean>(false);
  const [calcResult, setCalcResult] = useState<{
    requiredPaymentCents: number;
    formattedRequiredPayment: string;
    currentAmountCents: number;
    targetProductAmountCents: number;
    isInitialPayment: boolean;
  } | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load user and founder products
  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;
    async function loadData() {
      try {
        const user = await getSessionUser();
        if (!mounted) return;
        setCurrentUser(user);

        if (user) {
          const res = await apiClient.get('/products/me/mine');
          if (res.data?.data?.products && Array.isArray(res.data.data.products)) {
            setUserProducts(res.data.data.products);
            if (res.data.data.products.length > 0 && !selectedProductId) {
              setSelectedProductId(res.data.data.products[0]._id || res.data.data.products[0].id || '');
            }
          }
        }
      } catch {
        // user not authenticated
      }
    }

    loadData();
    return () => {
      mounted = false;
    };
  }, [isOpen, selectedProductId]);

  // Recalculate outbid whenever selectedProductId or targetRank changes
  useEffect(() => {
    if (!isOpen || !selectedProductId) return;

    let mounted = true;
    async function fetchCalc() {
      setCalcLoading(true);
      setErrorMessage(null);
      try {
        const res = await apiClient.get('/leaderboards/outbid-calc', {
          params: {
            productId: selectedProductId,
            targetRank: targetProduct?.rank || targetRank || 1,
          },
        });

        if (mounted && res.data?.data) {
          setCalcResult(res.data.data);
          const reqDollars = (res.data.data.requiredPaymentCents / 100).toFixed(2);
          if (!useCustomAmount) {
            setCustomAmountDollars(reqDollars);
          }
        }
      } catch (err: any) {
        if (mounted) {
          setErrorMessage(err.response?.data?.error?.message || 'Could not calculate outbid amount');
        }
      } finally {
        if (mounted) setCalcLoading(false);
      }
    }

    fetchCalc();
    return () => {
      mounted = false;
    };
  }, [isOpen, selectedProductId, targetRank, targetProduct, useCustomAmount]);

  if (!isOpen) return null;

  const handleCheckout = async () => {
    if (!currentUser) {
      onAuthRequired();
      return;
    }

    if (!selectedProductId) {
      setErrorMessage('Please select a product you own or submit one first');
      return;
    }

    const dollarsNum = parseFloat(customAmountDollars);
    if (isNaN(dollarsNum) || dollarsNum <= 0) {
      setErrorMessage('Please enter a valid payment amount');
      return;
    }

    const amountCents = Math.round(dollarsNum * 100);

    setCheckoutLoading(true);
    setErrorMessage(null);

    try {
      const res = await apiClient.post('/payments/rank-checkout', {
        productId: selectedProductId,
        amountCents,
        provider: 'paddle',
      });

      if (res.data?.data?.checkoutUrl) {
        window.location.href = res.data.data.checkoutUrl;
      } else {
        setErrorMessage('Failed to generate checkout session');
      }
    } catch (err: any) {
      setErrorMessage(err.response?.data?.error?.message || 'Checkout failed. Please try again.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-surface border border-border w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-scale-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary-subtle to-transparent p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-sm">
              <Zap className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="font-bold text-text-primary text-lg">Pay to Outbid & Rank</h3>
              <p className="text-text-muted text-xs">
                Transparent commercial ranking powered by verified payments
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-surface-sunken text-text-muted hover:text-text-primary flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Target Product Badge (if opened for a specific product) */}
          {targetProduct && (
            <div className="bg-surface-sunken p-3.5 rounded-xl border border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm font-bold text-primary bg-primary-subtle px-2 py-0.5 rounded-md">
                  #{targetProduct.rank || 1}
                </span>
                <div>
                  <div className="text-xs text-text-muted">Target to Outbid</div>
                  <div className="font-bold text-text-primary text-sm">{targetProduct.name}</div>
                </div>
              </div>
              {targetProduct.amountCents !== undefined && (
                <div className="text-right">
                  <div className="text-xs text-text-muted">Current Bid</div>
                  <div className="font-mono font-bold text-text-primary text-sm">
                    ${(targetProduct.amountCents / 100).toFixed(2)}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Product Selector */}
          <div>
            <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-2">
              Select Your Product
            </label>
            {userProducts.length > 0 ? (
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="w-full bg-surface border border-border rounded-xl px-3.5 py-2.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              >
                {userProducts.map((p) => (
                  <option key={p._id || p.id} value={p._id || p.id}>
                    {p.name} (Current: ${( (p.paidRankingAmountCents || 0) / 100 ).toFixed(2)})
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-4 rounded-xl bg-surface-sunken border border-border text-center">
                <p className="text-xs text-text-muted mb-2">
                  You don't have any submitted products yet.
                </p>
                <a
                  href="/submit"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
                >
                  Submit a product to rank <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>

          {/* Calculation Breakdown Card */}
          {calcResult && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Your Current Paid Total:</span>
                <span className="font-mono font-semibold text-text-primary">
                  ${(calcResult.currentAmountCents / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-muted">Target Position Amount:</span>
                <span className="font-mono font-semibold text-text-primary">
                  ${(calcResult.targetProductAmountCents / 100).toFixed(2)}
                </span>
              </div>
              <div className="border-t border-primary/10 pt-2 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-text-primary">
                    {calcResult.isInitialPayment ? 'Minimum Initial Entry' : 'Minimum Outbid Step-Up'}:
                  </span>
                  <div className="text-[11px] text-text-muted">
                    {calcResult.isInitialPayment ? 'Threshold: $5.99 min' : 'Difference + $1.00 min increment'}
                  </div>
                </div>
                <span className="font-mono text-base font-extrabold text-primary">
                  {calcResult.formattedRequiredPayment}
                </span>
              </div>
            </div>
          )}

          {/* Custom Amount Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-text-primary uppercase tracking-wider">
                Payment Amount (USD)
              </label>
              <button
                type="button"
                onClick={() => {
                  setUseCustomAmount(!useCustomAmount);
                  if (calcResult) {
                    setCustomAmountDollars((calcResult.requiredPaymentCents / 100).toFixed(2));
                  }
                }}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                {useCustomAmount ? 'Reset to Min Required' : 'Enter Custom Bid'}
              </button>
            </div>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted font-mono">
                $
              </div>
              <input
                type="number"
                step="0.01"
                min="1.00"
                value={customAmountDollars}
                onChange={(e) => {
                  setUseCustomAmount(true);
                  setCustomAmountDollars(e.target.value);
                }}
                className="w-full pl-8 pr-4 py-2.5 bg-surface border border-border rounded-xl font-mono text-base font-bold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                placeholder="5.99"
              />
            </div>
            <p className="text-[11px] text-text-muted mt-1.5 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              100% applies to your All-Time and Today's UTC leaderboard immediately upon confirmation.
            </p>
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 p-3 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-surface-sunken p-5 border-t border-border flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-border text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-surface transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={checkoutLoading || calcLoading || (userProducts.length === 0 && Boolean(currentUser))}
            className="flex-1 max-w-xs px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {checkoutLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Checkout...</span>
              </>
            ) : (
              <>
                <span>Confirm & Pay ${parseFloat(customAmountDollars || '0').toFixed(2)}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
