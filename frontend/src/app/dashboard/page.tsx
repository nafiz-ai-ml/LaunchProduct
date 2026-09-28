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
} from 'lucide-react';
import { DashboardProductSwitcher } from '@/components/dashboard/DashboardProductSwitcher';
import { DashboardMetricsOverview } from '@/components/dashboard/DashboardMetricsOverview';
import { DashboardPerformanceChart } from '@/components/dashboard/DashboardPerformanceChart';
import { DashboardBadgeGenerator } from '@/components/dashboard/DashboardBadgeGenerator';
import { DashboardProductEditModal } from '@/components/dashboard/DashboardProductEditModal';
import { FounderProduct } from '@/components/dashboard/types';

interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: 'success' | 'info' | 'error';
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

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Real Backend Analytics State (Sections 18 & 20)
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
      } catch (err) {
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

  // Load Founder's Products from authenticated backend
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

      // Fallback matching by founder email or ID if endpoint returns empty list
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
              (p.founder && targetUser.email && p.founder.email === targetUser.email) ||
              (p.founderId && (p.founderId === targetUser.id || p.founderId === targetUser.id))
          );
          if (matched.length > 0) {
            setProducts(matched);
            setSelectedProductId(matched[0]._id || matched[0].id);
            return;
          }
        } catch {
          // ignore fallback error
        }
      }

      const safeLoaded = Array.isArray(loaded) ? loaded : [];
      setProducts(safeLoaded);
      if (safeLoaded.length > 0) {
        setSelectedProductId(safeLoaded[0]._id || safeLoaded[0].id);
      }
    } catch (err: any) {
      console.warn('Failed to load user products:', err?.message);
      setProducts([]);
    } finally {
      setIsLoadingProducts(false);
    }
  }

  // Currently selected product
  const selectedProduct = useMemo(() => {
    if (!products || products.length === 0) return null;
    return products.find((p) => (p._id || p.id) === selectedProductId) || products[0];
  }, [products, selectedProductId]);

  // Query verified backend analytics endpoint: GET /api/v1/analytics/products/:id?days=N
  useEffect(() => {
    if (!selectedProductId) return;

    setIsAnalyticsLoading(true);
    apiClient
      .get(`/analytics/products/${selectedProductId}?days=${selectedDays}`)
      .then((res) => {
        const data = res.data?.data;
        if (data && data.summary) {
          setAnalyticsData(data);
        } else {
          setAnalyticsData(null);
        }
      })
      .catch((err) => {
        console.warn('Analytics fetch note:', err?.message);
        setAnalyticsData(null);
      })
      .finally(() => {
        setIsAnalyticsLoading(false);
      });
  }, [selectedProductId, selectedDays]);

  const handleProductUpdated = (updated: FounderProduct) => {
    setProducts((prev) =>
      prev.map((p) => ((p.id || p._id) === (updated.id || updated._id) ? updated : p))
    );
    showToast('Product Updated Successfully!', 'Your changes have been saved to the directory.', 'success');
  };

  // Safe metrics values directly mapped from real backend telemetry (Zero synthetic math)
  const impressions = analyticsData?.summary?.totalImpressions || 0;
  const clicks = analyticsData?.summary?.totalOrganicClicks || 0;
  const ctr = analyticsData?.summary?.organicCtr || 0;
  const votes = selectedProduct?.upvotesCount || analyticsData?.summary?.totalValidVotes || 0;

  if (authChecking) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-xs font-mono text-text-muted">Authenticating founder session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-24">
      {/* Top Banner & Header */}
      <section className="border-b border-border bg-gradient-to-b from-primary/5 via-bg to-bg pt-10 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-2">
                <Rocket className="w-3.5 h-3.5" />
                Founder Command Center
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
                Launch Performance &amp; Analytics
              </h1>
              <p className="text-xs sm:text-sm text-text-muted mt-1 max-w-xl">
                Track verified impressions, organic traffic, community voting velocity, and outbound referral telemetry.
              </p>
            </div>

            {selectedProduct && (
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-border hover:bg-slate-100 dark:hover:bg-slate-800 text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors focus-ring"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit Details
                </button>
                <Link
                  href={`/products/${selectedProduct.slug}`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface border border-border hover:bg-slate-100 dark:hover:bg-slate-800 text-text-secondary hover:text-text-primary text-xs font-semibold transition-colors focus-ring"
                >
                  <ExternalLink className="w-3.5 h-3.5" /> View Public Page
                </Link>
                <Link
                  href="/promote"
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-white text-xs font-bold hover:shadow-md transition-all focus-ring"
                >
                  <Zap className="w-3.5 h-3.5" /> Promote Launch
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

            {/* 2. Metrics Overview (Stat Cards) */}
            <DashboardMetricsOverview
              impressions={impressions}
              clicks={clicks}
              ctr={ctr}
              votes={votes}
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

            {/* 4. Embed Badge Generator */}
            {selectedProduct && (
              <DashboardBadgeGenerator
                productSlug={selectedProduct.slug}
                productName={selectedProduct.name}
              />
            )}
          </>
        ) : (
          /* Empty State for user without products */
          <div className="max-w-md mx-auto text-center py-20 px-6 rounded-3xl bg-surface border border-border shadow-card space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20">
              <Rocket className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-text-primary">No products launched yet</h3>
            <p className="text-xs text-text-muted leading-relaxed">
              Submit your product to enter the official daily leaderboard, collect organic clicks, and unlock founder analytics.
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
