'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { getSessionUser } from '@/lib/auth-client';
import { User } from '@/types';
import {
  ExternalLink,
  Edit3,
  Rocket,
  Sparkles,
  Zap,
  ArrowRight,
  TrendingUp,
  RefreshCw,
  Receipt,
  ShieldCheck,
  CreditCard,
  History,
} from 'lucide-react';
import { DashboardProductSwitcher } from '@/components/dashboard/DashboardProductSwitcher';
import { DashboardMetricsOverview } from '@/components/dashboard/DashboardMetricsOverview';
import { DashboardPerformanceChart } from '@/components/dashboard/DashboardPerformanceChart';
import { DashboardBadgeGenerator } from '@/components/dashboard/DashboardBadgeGenerator';
import { DashboardProductEditModal } from '@/components/dashboard/DashboardProductEditModal';
import { OutbidModal } from '@/components/leaderboard/OutbidModal';
import { FounderProduct } from '@/components/dashboard/types';

interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: 'success' | 'info' | 'error';
}

interface PaymentHistoryItem {
  id: string;
  paymentType: string;
  productId?: { name?: string; slug?: string };
  amountCents: number;
  rankingContributionCents: number;
  formattedAmount: string;
  currency: string;
  status: string;
  provider: string;
  providerPaymentId?: string;
  targetDailyDate?: string;
  createdAt: string;
}

export default function FounderDashboardPage() {
  const router = useRouter();

  // Authentication & Loading
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  // Founder Products State
  const [products, setProducts] = useState<FounderProduct[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('');

  // Modals State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isOutbidModalOpen, setIsOutbidModalOpen] = useState(false);

  // Payments History State
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistoryItem[]>([]);
  const [isLoadingPayments, setIsLoadingPayments] = useState(false);

  // Real Backend Analytics State
  const [selectedDays, setSelectedDays] = useState(30);
  const [isAnalyticsLoading, setIsAnalyticsLoading] = useState(false);
  const [analyticsData, setAnalyticsData] = useState<{
    summary: {
      totalImpressions: number;
      totalOrganicClicks: number;
      totalSponsoredClicks: number;
      organicCtr: number;
      totalValidVotes: number;
    };
    dailyMetrics: Array<{
      date: string;
      impressions: number;
      organicClicks: number;
      sponsoredClicks?: number;
      votes: number;
    }>;
    referrerBreakdown: Array<{
      referrer: string;
      count: number;
    }>;
  } | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (title: string, description?: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  // Auth Initialization
  useEffect(() => {
    let isMounted = true;

    async function initDashboard() {
      try {
        const user = await getSessionUser();
        if (!isMounted) return;

        if (!user) {
          router.replace('/auth?redirect=/dashboard');
          return;
        }

        setCurrentUser(user);
        setAuthChecking(false);
        await loadFounderProducts(user);
        await loadPaymentHistory();
      } catch {
        if (isMounted) {
          router.replace('/auth?redirect=/dashboard');
        }
      }
    }

    initDashboard();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Load Founder's Products
  async function loadFounderProducts(userObj?: User | null) {
    try {
      setIsLoadingProducts(true);
      const targetUser = userObj || currentUser;
      const res = await apiClient.get('/products/me/mine');
      const rawData = res.data?.data;
      let loaded: FounderProduct[] = [];

      if (Array.isArray(rawData)) {
        loaded = rawData;
      } else if (rawData && Array.isArray(rawData.products)) {
        loaded = rawData.products;
      }

      if (loaded.length === 0 && targetUser) {
        try {
          const publicRes = await apiClient.get('/products?limit=25');
          const rawPublic = publicRes.data?.data;
          const allPublic: any[] = Array.isArray(rawPublic?.products)
            ? rawPublic.products
            : Array.isArray(rawPublic)
            ? rawPublic
            : [];

          const matched = allPublic.filter(
            (p: any) =>
              (p.founder && p.founder.id === targetUser.id) ||
              p.founderId === targetUser.id ||
              p.submittedById === targetUser.id
          );
          if (matched.length > 0) {
            loaded = matched;
          }
        } catch {
          // ignore
        }
      }

      setProducts(loaded);
      if (loaded.length > 0 && !selectedProductId) {
        setSelectedProductId(loaded[0].id || loaded[0]._id || '');
      }
    } catch {
      showToast('Notice', 'Unable to retrieve your products portfolio.', 'info');
    } finally {
      setIsLoadingProducts(false);
    }
  }

  // Load Payment History
  async function loadPaymentHistory() {
    try {
      setIsLoadingPayments(true);
      const res = await apiClient.get('/payments/history');
      if (res.data?.data?.payments && Array.isArray(res.data.data.payments)) {
        setPaymentHistory(res.data.data.payments);
      }
    } catch {
      // payment history endpoint silently degrades if no transactions exist yet
    } finally {
      setIsLoadingPayments(false);
    }
  }

  // Find currently selected product
  const selectedProduct = useMemo(() => {
    return products.find((p) => (p.id || p._id) === selectedProductId) || products[0] || null;
  }, [products, selectedProductId]);

  // Load Product Analytics Telemetry
  useEffect(() => {
    if (!selectedProduct) return;

    let isMounted = true;
    async function loadTelemetry() {
      setIsAnalyticsLoading(true);
      try {
        const prodId = selectedProduct?.id || (selectedProduct as any)?._id;
        const res = await apiClient.get(`/analytics/product/${prodId}`, {
          params: { days: selectedDays },
        });

        if (isMounted && res.data?.data) {
          setAnalyticsData(res.data.data);
        }
      } catch {
        if (isMounted) {
          setAnalyticsData(null);
        }
      } finally {
        if (isMounted) setIsAnalyticsLoading(false);
      }
    }

    loadTelemetry();
    return () => {
      isMounted = false;
    };
  }, [selectedProduct, selectedDays]);

  const handleProductUpdated = (updated: FounderProduct) => {
    setProducts((prev) =>
      prev.map((p) => ((p.id || p._id) === (updated.id || updated._id) ? updated : p))
    );
    showToast('Product Updated Successfully!', 'Your changes have been saved to the directory.', 'success');
  };

  const impressions = analyticsData?.summary?.totalImpressions || 0;
  const clicks = analyticsData?.summary?.totalOrganicClicks || 0;
  const ctr = analyticsData?.summary?.organicCtr || 0;
  const votes = selectedProduct?.upvotesCount || analyticsData?.summary?.totalValidVotes || 0;

  if (authChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs font-mono text-text-muted">Authenticating founder session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24 text-text-primary">
      {/* Top Banner & Header */}
      <section className="border-b border-border bg-gradient-to-b from-primary/5 via-surface to-background pt-10 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-2">
                <Rocket className="w-3.5 h-3.5" />
                Founder Command Center
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
                Launch Performance &amp; Commercial Rankings
              </h1>
              <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-xl">
                Manage your products, outbid competitors to improve leaderboard position, and track verified referral traffic.
              </p>
            </div>

            {selectedProduct && (
              <div className="flex items-center gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsOutbidModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold shadow-md hover:shadow-lg transition-all focus-ring"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" /> Pay to Rank Up
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-border hover:bg-surface-sunken text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors focus-ring"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Details
                </button>
                <Link
                  href={`/products/${selectedProduct.slug}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-border hover:bg-surface-sunken text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors focus-ring"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> Public Page
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {products.length > 0 ? (
          <>
            {/* 1. Product Switcher */}
            <DashboardProductSwitcher
              products={products}
              selectedProductId={selectedProductId}
              onSelectProduct={setSelectedProductId}
            />

            {/* 2. Metrics Overview (Stat Cards including Pay-to-Rank stats) */}
            <DashboardMetricsOverview
              impressions={impressions}
              clicks={clicks}
              ctr={ctr}
              votes={votes}
              paidRankingAmountCents={selectedProduct?.paidRankingAmountCents || 0}
              todayPaidAmountCents={selectedProduct?.todayPaidAmountCents || 0}
              allTimeRank={selectedProduct?.allTimeRank}
              isLoading={isAnalyticsLoading || isLoadingProducts}
            />

            {/* 3. Performance Chart & Referrers */}
            <DashboardPerformanceChart
              dailyMetrics={analyticsData?.dailyMetrics || []}
              referrerBreakdown={analyticsData?.referrerBreakdown || []}
              selectedDays={selectedDays}
              onDaysChange={setSelectedDays}
              isLoading={isAnalyticsLoading}
            />

            {/* 4. Payment History & Ledger Audit Trail */}
            <div className="bg-surface border border-border rounded-2xl p-6 shadow-card space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-primary" />
                  <div>
                    <h3 className="font-bold text-sm text-text-primary">Verified Ranking Payment History</h3>
                    <p className="text-xs text-text-muted">
                      Audit ledger of qualifying payments and ranking activations
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOutbidModalOpen(true)}
                  className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" /> Increase Rank
                </button>
              </div>

              {isLoadingPayments ? (
                <div className="py-8 text-center text-xs text-text-muted flex items-center justify-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-primary" />
                  <span>Loading payment records...</span>
                </div>
              ) : paymentHistory.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border text-text-muted uppercase text-[10px] tracking-wider font-semibold">
                        <th className="pb-3">Date</th>
                        <th className="pb-3">Type</th>
                        <th className="pb-3">Product</th>
                        <th className="pb-3">Amount</th>
                        <th className="pb-3">Status</th>
                        <th className="pb-3">Target Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border font-mono">
                      {paymentHistory.map((item) => (
                        <tr key={item.id} className="hover:bg-surface-sunken/40 transition-colors">
                          <td className="py-3 text-text-muted">
                            {new Date(item.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3">
                            <span className="bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded font-sans font-bold">
                              {item.paymentType}
                            </span>
                          </td>
                          <td className="py-3 font-sans font-medium text-text-primary">
                            {item.productId?.name || 'Product'}
                          </td>
                          <td className="py-3 font-bold text-text-primary">
                            {item.formattedAmount}
                          </td>
                          <td className="py-3">
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded font-sans font-bold ${
                                item.status === 'SUCCEEDED'
                                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-amber-500/10 text-amber-600'
                              }`}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 text-text-muted">
                            {item.targetDailyDate || 'N/A'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-text-muted space-y-2">
                  <p>No verified ranking payments recorded yet.</p>
                  <p className="text-[11px]">
                    Pay the minimum threshold ($5.99) to establish your product's initial leaderboard ranking.
                  </p>
                </div>
              )}
            </div>

            {/* 5. Embed Badge Generator */}
            {selectedProduct && (
              <DashboardBadgeGenerator
                productSlug={selectedProduct.slug}
                productName={selectedProduct.name}
              />
            )}
          </>
        ) : (
          /* Empty State */
          <div className="max-w-md mx-auto text-center py-20 px-6 rounded-3xl bg-surface border border-border shadow-card space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20">
              <Rocket className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-text-primary">No products launched yet</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Submit your product to enter the official Pay-to-Rank leaderboard, collect organic clicks, and unlock founder analytics.
            </p>
            <div className="pt-2">
              <Link
                href="/submit"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-md transition-all focus-ring"
              >
                Submit Your First Product <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* Product Edit Modal */}
      <DashboardProductEditModal
        product={selectedProduct}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onProductUpdated={handleProductUpdated}
      />

      {/* Outbid Modal */}
      {selectedProduct && (
        <OutbidModal
          isOpen={isOutbidModalOpen}
          onClose={() => setIsOutbidModalOpen(false)}
          targetProduct={{
            id: selectedProduct.id || selectedProduct._id || '',
            name: selectedProduct.name,
            slug: selectedProduct.slug,
            amountCents: selectedProduct.paidRankingAmountCents,
            rank: selectedProduct.allTimeRank,
          }}
          onAuthRequired={() => {
            setIsOutbidModalOpen(false);
          }}
        />
      )}

      {/* Feedback Toast Notification Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto p-4 rounded-2xl shadow-xl border text-xs font-medium max-w-sm flex items-start gap-3 transition-all animate-in slide-in-from-bottom-3 ${
              toast.type === 'error'
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-400'
                : 'bg-surface border-border text-text-primary'
            }`}
          >
            <div>
              <strong className="block font-bold">{toast.title}</strong>
              {toast.description && <span className="text-text-muted text-[11px]">{toast.description}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
