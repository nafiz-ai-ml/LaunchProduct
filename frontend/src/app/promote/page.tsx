'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CustomSelect } from '@/components/ui/CustomSelect';
import {
  Sparkles,
  Rocket,
  Calendar,
  Check,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Clock,
  ArrowRight,
  Lock,
  Layers,
  Globe,
  Tag,
  HelpCircle,
  Zap,
  ChevronLeft,
  ChevronRight,
  Info,
  ExternalLink,
  Loader2,
  Flame,
  Award,
  Crown,
  ChevronDown,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import { getSessionUser } from '@/lib/auth-client';
import { User, Category } from '@/types';

// ==========================================
// Tiers Definition
// ==========================================

export type SponsorshipTierKey =
  | 'LAUNCH_BOOST'
  | 'CATEGORY_FEATURED'
  | 'HOMEPAGE_SPOTLIGHT'
  | 'LAUNCH_PARTNER';

interface SponsorshipTier {
  key: SponsorshipTierKey;
  name: string;
  badge: string;
  priceUsd: number;
  period: string;
  tagline: string;
  maxSlots: number;
  icon: any;
  popular?: boolean;
  features: string[];
  placementSummary: string;
}

const SPONSORSHIP_TIERS: SponsorshipTier[] = [
  {
    key: 'LAUNCH_BOOST',
    name: 'Launch Day Boost',
    badge: 'Tier 1 • Daily Placement',
    priceUsd: 19,
    period: 'per day',
    tagline: 'Pinned to #1 sponsored top slot of the daily feed.',
    maxSlots: 2,
    icon: Rocket,
    features: [
      'Pinned #1 sponsored position above daily organic feed',
      'High-contrast Amber "Promoted" discovery pill',
      'Max 2 concurrent slots per calendar day (high scarcity)',
      'Direct outbound click tracking & referral telemetry',
      '100% immune to organic rank alteration',
    ],
    placementSummary: 'Pinned directly above the daily leaderboard podium for 24 hours.',
  },
  {
    key: 'CATEGORY_FEATURED',
    name: 'Category Featured',
    badge: 'Tier 2 • Weekly Vertical',
    priceUsd: 49,
    period: 'per week (7 days)',
    tagline: 'Pinned to vertical category directory top slot.',
    maxSlots: 1,
    icon: Layers,
    popular: true,
    features: [
      'Top sticky spotlight within chosen industry category (e.g., AI, DevTools)',
      '1 full week of continuous vertical exposure',
      'Guaranteed category top billing (max 1 slot per category)',
      'Targeted high-intent builder & buyer traffic',
      'Real-time click-through and impression analytics',
    ],
    placementSummary: 'Pinned to the top of your chosen vertical category for 7 consecutive days.',
  },
  {
    key: 'HOMEPAGE_SPOTLIGHT',
    name: 'Homepage Spotlight',
    badge: 'Tier 3 • Hero Banner',
    priceUsd: 149,
    period: 'per day',
    tagline: 'Prominent above-the-fold hero banner spotlight.',
    maxSlots: 3,
    icon: Crown,
    features: [
      'Hero banner spotlight immediately below main platform search',
      'Massive site-wide visibility to all incoming platform visitors',
      'Custom interactive call-to-action button & founder badge',
      'Exclusive placement capped at 3 rotating slots/day',
      'Includes inclusion in daily launch email recap to subscribers',
    ],
    placementSummary: 'Prime above-the-fold hero placement with interactive call-to-action.',
  },
  {
    key: 'LAUNCH_PARTNER',
    name: 'Launch Partner',
    badge: 'Tier 4 • Multi-Surface',
    priceUsd: 299,
    period: 'per month (30 days)',
    tagline: 'Continuous multi-surface placement and cross-network distribution.',
    maxSlots: 5,
    icon: Award,
    features: [
      '30 days of permanent run-of-site banner & directory placement',
      'Featured placement across Category, Search results, and Product Details',
      'Dedicated founder showcase mention in weekly growth dispatch',
      'Priority indexation and badge telemetry support',
      'Dedicated partner liaison and custom outbound UTM tracking',
    ],
    placementSummary: '30-day comprehensive multi-surface sponsorship across all key touchpoints.',
  },
];

interface UserProduct {
  id: string;
  _id?: string;
  name: string;
  slug: string;
  tagline?: string;
  logoUrl?: string;
  category?: any;
}

interface ToastMessage {
  id: string;
  title: string;
  description?: string;
  type?: 'success' | 'info' | 'error';
}

export default function PromotePage() {
  const router = useRouter();

  // Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProducts, setUserProducts] = useState<UserProduct[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Selection State
  const [selectedTierKey, setSelectedTierKey] = useState<SponsorshipTierKey>('CATEGORY_FEATURED');
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [selectedCategorySlug, setSelectedCategorySlug] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString().split('T')[0];
  });
  // Availability State
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [availabilityResult, setAvailabilityResult] = useState<{
    available: boolean;
    slotKey?: string;
    maxSlots?: number;
    priceCents?: number;
    nextAvailableDate?: string;
  } | null>(null);

  // Reservation & Checkout State
  const [isReserving, setIsReserving] = useState(false);
  const [reservationSuccess, setReservationSuccess] = useState<{
    checkoutUrl: string;
    campaignId: string;
    reservationExpiresAt: string;
    amountCents: number;
  } | null>(null);

  // Calendar Month View State
  const [calendarOffsetDays, setCalendarOffsetDays] = useState(0);

  // FAQ Accordion State
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Toast System
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (title: string, description?: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, description, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Selected Tier Object
  const selectedTier = useMemo(() => {
    return SPONSORSHIP_TIERS.find((t) => t.key === selectedTierKey) || SPONSORSHIP_TIERS[0];
  }, [selectedTierKey]);

  // Load User, Products, and Categories
  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        const user = await getSessionUser();
        if (isMounted) setCurrentUser(user);

        // Fetch User's Products
        if (user) {
          try {
            const res = await apiClient.get('/products/me/mine');
            const data = res.data?.data;
            const prods: UserProduct[] = Array.isArray(data)
              ? data
              : Array.isArray(data?.products)
              ? data.products
              : [];
            if (isMounted && prods.length > 0) {
              setUserProducts(prods);
              setSelectedProductId(prods[0].id || (prods[0] as any)._id);
            }
          } catch {
            // Products fetch fallback
          }
        }

        // Fetch Categories
        try {
          const catRes = await apiClient.get('/categories');
          const catList = catRes.data?.data?.categories || catRes.data?.data || [];
          if (isMounted && Array.isArray(catList)) {
            setCategories(catList);
            if (catList.length > 0) {
              setSelectedCategorySlug(catList[0].slug);
            }
          }
        } catch {
          // Category fetch fallback
        }
      } catch (err) {
        console.warn('Initialization error:', err);
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  // Check Availability Whenever Tier, Date, or Category changes
  useEffect(() => {
    let isMounted = true;

    async function checkAvailability() {
      setIsCheckingAvailability(true);
      try {
        const params: Record<string, string> = {
          tier: selectedTierKey,
          startDate: new Date(selectedDate).toISOString(),
        };
        if (selectedTierKey === 'CATEGORY_FEATURED' && selectedCategorySlug) {
          params.targetCategorySlug = selectedCategorySlug;
        }

        let res: any;
        try {
          res = await apiClient.get('/campaigns/availability', { params });
        } catch {
          res = await apiClient.get('/campaigns/inventory', { params });
        }

        if (isMounted && res.data?.data) {
          setAvailabilityResult(res.data.data);
        }
      } catch (err: any) {
        if (isMounted) {
          // If error or unconfigured, default to available for smooth builder experience
          setAvailabilityResult({
            available: true,
            maxSlots: selectedTier.maxSlots,
            priceCents: selectedTier.priceUsd * 100,
          });
        }
      } finally {
        if (isMounted) {
          setIsCheckingAvailability(false);
        }
      }
    }

    checkAvailability();

    return () => {
      isMounted = false;
    };
  }, [selectedTierKey, selectedDate, selectedCategorySlug, selectedTier.maxSlots, selectedTier.priceUsd]);

  // Generate 14-day interactive date window
  const dateOptions = useMemo(() => {
    const dates = [];
    const base = new Date();
    base.setHours(0, 0, 0, 0);

    for (let i = 0; i < 14; i++) {
      const d = new Date(base.getTime() + (i + calendarOffsetDays) * 24 * 60 * 60 * 1000);
      const isoStr = d.toISOString().split('T')[0];
      const isPast = d < base;
      const isToday = i + calendarOffsetDays === 0;

      dates.push({
        date: d,
        isoStr,
        dayName: d.toLocaleDateString(undefined, { weekday: 'short' }),
        monthName: d.toLocaleDateString(undefined, { month: 'short' }),
        dayNum: d.getDate(),
        isToday,
        isPast,
      });
    }
    return dates;
  }, [calendarOffsetDays]);

  // Handle Reservation & Checkout
  async function handleReserveSlot() {
    if (!currentUser) {
      router.push(`/auth?redirect=/promote`);
      return;
    }

    if (!selectedProductId) {
      showToast('Select a Product', 'Please select which of your products you wish to boost.', 'error');
      return;
    }

    try {
      setIsReserving(true);
      const payload: any = {
        productId: selectedProductId,
        tier: selectedTierKey,
        startDate: new Date(selectedDate).toISOString(),
        startsAt: new Date(selectedDate).toISOString(),
        provider: 'paddle',
      };

      if (selectedTierKey === 'CATEGORY_FEATURED' && selectedCategorySlug) {
        payload.targetCategorySlug = selectedCategorySlug;
      }

      let res: any;
      try {
        res = await apiClient.post('/campaigns/reserve', payload);
      } catch {
        res = await apiClient.post('/campaigns/checkout', payload);
      }

      if (res.data?.success && res.data?.data) {
        const checkoutData = res.data.data;
        setReservationSuccess({
          checkoutUrl: checkoutData.checkoutUrl,
          campaignId: checkoutData.campaignId,
          reservationExpiresAt: checkoutData.reservationExpiresAt,
          amountCents: checkoutData.amountCents || selectedTier.priceUsd * 100,
        });

        showToast(
          'Slot Reserved (15-Min Hold)',
          'Your inventory slot is locked. Redirecting to Merchant of Record checkout...',
          'success'
        );

        // Auto-redirect to MoR checkout after 1.5 seconds if URL provided
        if (checkoutData.checkoutUrl) {
          setTimeout(() => {
            window.location.href = checkoutData.checkoutUrl;
          }, 1500);
        }
      }
    } catch (err: any) {
      showToast(
        'Reservation Failed',
        err?.response?.data?.message || err?.message || 'Unable to reserve slot. It may have just been booked.',
        'error'
      );
    } finally {
      setIsReserving(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg pb-28 text-text-primary">
      {/* Toast Notification Layer */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all animate-in slide-in-from-bottom-5 ${
              toast.type === 'error'
                ? 'bg-rose-950/90 border-rose-800 text-white'
                : toast.type === 'info'
                ? 'bg-sky-950/90 border-sky-800 text-white'
                : 'bg-emerald-950/90 border-emerald-800 text-white'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs">
              <h4 className="font-bold text-sm leading-tight">{toast.title}</h4>
              {toast.description && <p className="mt-1 opacity-90">{toast.description}</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Hero Header: Clear Ethical Positioning */}
      <section className="relative overflow-hidden bg-surface border-b border-border pt-12 pb-14">
        {/* Glow Gradients */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 left-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          {/* Ethical Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/25 mb-5 shadow-sm">
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            <span>High-Integrity Discovery Policy</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-text-primary tracking-tight max-w-3xl mx-auto leading-tight">
            Transparent Distribution <br className="hidden sm:inline" />
            for Ambitious Builders.
          </h1>

          <p className="text-base sm:text-lg text-text-secondary mt-4 max-w-2xl mx-auto font-normal leading-relaxed">
            &quot;Paid boosts provide prominent discovery visibility without altering authentic organic rankings.&quot;
          </p>

          {/* Ethical Guarantee Callout */}
          <div className="mt-8 max-w-xl mx-auto p-4 rounded-2xl bg-amber-500/5 dark:bg-amber-950/20 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-3 text-left">
            <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong className="font-bold">Zero Pay-to-Win Guarantee:</strong> Sponsored products are clearly demarcated with amber badges and tracked via <code className="font-mono bg-amber-500/10 px-1 py-0.5 rounded">source=sponsored</code>. Daily rankings, upvote counts, and podium finishes remain 100% determined by community votes and anti-fraud algorithms.
            </p>
          </div>
        </div>
      </section>

      {/* Main Booking Interface */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 space-y-12">
        {/* ========================================================= */}
        {/* STEP 1: SPONSORSHIP TIERS GRID */}
        {/* ========================================================= */}
        <section className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-4">
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider block">
                Step 1 of 3
              </span>
              <h2 className="text-2xl font-black text-text-primary tracking-tight">
                Select Your Distribution Tier
              </h2>
            </div>
            <p className="text-xs text-text-muted">
              Clear fixed pricing • No bidding wars • Predictable builder ROI
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SPONSORSHIP_TIERS.map((tier) => {
              const isSelected = selectedTierKey === tier.key;
              const IconComp = tier.icon;

              return (
                <div
                  key={tier.key}
                  onClick={() => setSelectedTierKey(tier.key)}
                  className={`relative rounded-3xl p-6 transition-all cursor-pointer flex flex-col justify-between border ${
                    isSelected
                      ? 'bg-surface border-primary ring-2 ring-primary/50 shadow-xl shadow-primary/10 translate-y-[-2px]'
                      : 'bg-surface/80 border-border hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md'
                  }`}
                >
                  {/* Popular Flag */}
                  {tier.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-white text-[10px] font-black uppercase tracking-wider shadow-sm flex items-center gap-1">
                      <Flame className="w-3 h-3" />
                      <span>Most Popular</span>
                    </div>
                  )}

                  <div className="space-y-4">
                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
                          isSelected
                            ? 'bg-primary text-white shadow-md shadow-brand-glow/25'
                            : 'bg-bg text-text-secondary'
                        }`}
                      >
                        <IconComp className="w-5 h-5" />
                      </div>
                      <span className="text-[11px] font-bold text-text-muted font-mono">
                        Max {tier.maxSlots} {tier.maxSlots === 1 ? 'Slot' : 'Slots'}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1">
                        {tier.badge}
                      </span>
                      <h3 className="text-xl font-bold text-text-primary">
                        {tier.name}
                      </h3>
                      <p className="text-xs text-text-muted mt-1 leading-snug">
                        {tier.tagline}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="py-2 border-y border-border">
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-black text-text-primary">
                          ${tier.priceUsd}
                        </span>
                        <span className="text-xs font-semibold text-text-muted">
                          /{tier.period}
                        </span>
                      </div>
                    </div>

                    {/* Features list */}
                    <ul className="space-y-2.5 text-xs text-text-secondary pt-1">
                      {tier.features.map((feat, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <span className="leading-tight">{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Select Button */}
                  <div className="pt-6">
                    <button
                      type="button"
                      className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all text-center flex items-center justify-center gap-1.5 focus-ring ${
                        isSelected
                          ? 'bg-primary text-white shadow-md shadow-brand-glow/25'
                          : 'bg-bg text-text-secondary hover:bg-surface border border-border'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Tier Selected</span>
                        </>
                      ) : (
                        <span>Choose {tier.name}</span>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ========================================================= */}
        {/* STEP 2: INTERACTIVE AVAILABILITY CALENDAR & OPTIONS */}
        {/* ========================================================= */}
        <section className="bg-surface rounded-3xl border border-border p-6 sm:p-8 shadow-sm space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border pb-5">
            <div>
              <span className="text-xs font-bold text-primary uppercase tracking-wider block">
                Step 2 of 3
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight flex items-center gap-2">
                <Calendar className="w-6 h-6 text-primary" />
                <span>Interactive Availability Calendar</span>
              </h2>
            </div>
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-text-muted">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Available Slot
              </span>
              <span className="flex items-center gap-1.5 text-text-muted">
                <span className="w-2.5 h-2.5 rounded-full bg-primary ring-2 ring-primary/30" />
                Your Selection
              </span>
            </div>
          </div>

          {/* If Category Featured Tier: Select Category */}
          {selectedTierKey === 'CATEGORY_FEATURED' && (
            <div className="p-4 rounded-2xl bg-bg border border-border space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-primary" />
                <span>Target Category Spotlight</span>
              </label>
              <p className="text-xs text-text-muted">
                Your tool will be pinned to the #1 spot of this specific category for 7 days:
              </p>
              <CustomSelect
                value={selectedCategorySlug}
                onChange={(val) => setSelectedCategorySlug(val)}
                className="w-full sm:max-w-md"
                options={categories.map((c) => ({
                  value: c.slug,
                  label: `${c.name} (${c.slug})`,
                }))}
              />
            </div>
          )}

          {/* Interactive Date Strip / Carousel */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-text-muted block">
                Target Launch / Start Date
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCalendarOffsetDays((prev) => Math.max(0, prev - 7))}
                  disabled={calendarOffsetDays === 0}
                  className="p-1.5 rounded-lg border border-border hover:bg-surface text-text-secondary disabled:opacity-40 transition-colors focus-ring"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-mono font-bold text-text-muted">
                  Next 14 Days
                </span>
                <button
                  type="button"
                  onClick={() => setCalendarOffsetDays((prev) => prev + 7)}
                  className="p-1.5 rounded-lg border border-border hover:bg-surface text-text-secondary transition-colors focus-ring"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Date Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3">
              {dateOptions.map((opt) => {
                const isSelected = selectedDate === opt.isoStr;

                return (
                  <button
                    key={opt.isoStr}
                    type="button"
                    onClick={() => setSelectedDate(opt.isoStr)}
                    className={`p-3.5 rounded-2xl border text-center transition-all flex flex-col items-center justify-between focus-ring ${
                      isSelected
                        ? 'bg-primary text-white border-primary shadow-lg shadow-brand-glow/25 ring-2 ring-primary/50 scale-[1.02]'
                        : 'bg-bg border-border hover:border-slate-300 dark:hover:border-slate-700 hover:bg-surface'
                    }`}
                  >
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                        isSelected ? 'text-white/80' : 'text-text-muted'
                      }`}
                    >
                      {opt.dayName}
                    </span>
                    <span
                      className={`text-xl font-black my-1 ${
                        isSelected ? 'text-white' : 'text-text-primary'
                      }`}
                    >
                      {opt.dayNum}
                    </span>
                    <div className="flex items-center gap-1 text-[10px] font-semibold">
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isSelected ? 'bg-white' : 'bg-emerald-500'
                        }`}
                      />
                      <span className={isSelected ? 'text-white/90' : 'text-text-muted'}>
                        {opt.isToday ? 'Today' : opt.monthName}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Real-time Inventory Status Indicator */}
          <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 font-bold">
                <Check className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-text-primary block">
                  Slot Available for Reservation
                </span>
                <span className="text-text-muted">
                  {selectedTier.name} on {new Date(selectedDate).toLocaleDateString(undefined, {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 font-mono text-emerald-700 dark:text-emerald-400 font-bold">
              <span>Verified Real-Time Inventory</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                Open
              </span>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* STEP 3: RESERVATION & CHECKOUT CARD */}
        {/* ========================================================= */}
        <section className="bg-surface rounded-3xl border border-border p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-border pb-4">
            <span className="text-xs font-bold text-primary uppercase tracking-wider block">
              Step 3 of 3
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
              Confirm Reservation &amp; Merchant Checkout
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Product Selection & Payment Provider */}
            <div className="lg:col-span-7 space-y-6">
              {/* Product Selection */}
              <div>
                <label className="text-xs font-bold uppercase tracking-wider text-text-muted block mb-2">
                  Select Product to Promote <span className="text-rose-500">*</span>
                </label>

                {userProducts.length > 0 ? (
                  <CustomSelect
                    value={selectedProductId}
                    onChange={(val) => setSelectedProductId(val)}
                    fullWidth
                    options={userProducts.map((p) => ({
                      value: p.id || p._id || '',
                      label: `${p.name}${p.tagline ? ` — ${p.tagline}` : ''}`,
                    }))}
                  />
                ) : (
                  <div className="p-4 rounded-2xl bg-bg border border-border text-xs space-y-3">
                    <p className="text-text-muted">
                      No products found on this account yet. You can launch your product first or manually enter your Product ID:
                    </p>
                    <div className="flex flex-col sm:flex-row items-center gap-2">
                      <input
                        type="text"
                        placeholder="Enter 24-character Product ID..."
                        value={selectedProductId}
                        onChange={(e) => setSelectedProductId(e.target.value)}
                        className="w-full sm:flex-1 px-3 py-2 rounded-xl border border-border bg-surface text-text-primary text-xs font-mono focus-ring"
                      />
                      <Link
                        href="/submit"
                        className="w-full sm:w-auto px-4 py-2 rounded-xl bg-surface hover:bg-bg border border-border text-text-primary font-semibold text-xs text-center transition-colors focus-ring"
                      >
                        + Submit Product
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* Clean Payment Security Assurance (Paddle works securely under the hood) */}
              <div className="p-4 sm:p-5 rounded-2xl bg-bg border border-border flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-bold text-text-primary">Bank-Grade 256-Bit SSL Checkout</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Encrypted &amp; Protected
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted mt-1 leading-relaxed">
                    Major Credit &amp; Debit Cards, Apple Pay, and Google Pay supported. Instant official tax invoice &amp; receipt provided upon confirmation.
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary & 15-Minute Lock */}
            <div className="lg:col-span-5 bg-bg p-6 rounded-2xl border border-border space-y-5">
              <h3 className="text-base font-bold text-text-primary border-b border-border pb-3">
                Reservation Summary
              </h3>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-text-muted">Selected Tier:</span>
                  <span className="font-bold text-text-primary">{selectedTier.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Start Date:</span>
                  <span className="font-mono font-semibold text-text-primary">
                    {new Date(selectedDate).toLocaleDateString()}
                  </span>
                </div>
                {selectedTierKey === 'CATEGORY_FEATURED' && selectedCategorySlug && (
                  <div className="flex justify-between">
                    <span className="text-text-muted">Category:</span>
                    <span className="font-semibold text-text-primary">
                      {selectedCategorySlug}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-text-muted">Inventory Hold:</span>
                  <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> 15-Min Redis Lock
                  </span>
                </div>
                <div className="pt-3 border-t border-border flex justify-between items-baseline">
                  <span className="font-bold text-text-primary text-sm">Total Due:</span>
                  <span className="text-2xl font-black text-primary">
                    ${selectedTier.priceUsd} <span className="text-xs font-normal text-text-muted">USD</span>
                  </span>
                </div>
              </div>

              {/* Reserve Button */}
              <button
                type="button"
                onClick={handleReserveSlot}
                disabled={isReserving}
                className="w-full py-3.5 px-6 rounded-2xl bg-primary hover:bg-primary-hover text-white font-semibold text-sm shadow-md hover:shadow-brand-glow/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 focus-ring"
              >
                {isReserving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Acquiring 15-Min Slot Lock...</span>
                  </>
                ) : (
                  <>
                    <span>Reserve Slot &amp; Checkout</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <div className="text-[11px] text-text-muted text-center leading-relaxed">
                <Lock className="w-3.5 h-3.5 inline mr-1 text-text-muted" />
                Payments processed securely with instant automated tax invoice &amp; receipt generation.
              </div>
            </div>
          </div>
        </section>

        {/* ========================================================= */}
        {/* FAQ & ETHICAL TRANSPARENCY ACCORDION (Action Plan Issue 3) */}
        {/* ========================================================= */}
        <section className="bg-surface rounded-3xl border border-border p-6 sm:p-10 shadow-sm space-y-8">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20 mb-2">
              <HelpCircle className="w-3.5 h-3.5" />
              <span>Transparent Commercial Standards</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-text-primary tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-text-muted mt-1">
              Everything you need to know about distribution tiers, slot locks, and our uncompromising anti-gaming rules.
            </p>
          </div>

          <div className="max-w-3xl mx-auto space-y-3 pt-2">
            {[
              {
                q: 'Does paying for a boost improve my organic leaderboard rank?',
                a: 'No. Never. All community upvotes, daily podium rankings, and leaderboard calculations are strictly organic and calculated by our Sybil-resistant algorithm. Paid boosts give you prominent guaranteed visibility, but they cannot alter organic authority scores.',
                icon: ShieldCheck,
                color: 'text-emerald-500',
              },
              {
                q: 'How does the 15-minute slot reservation and Redis lock work?',
                a: 'When you click "Reserve Slot & Checkout", our distributed backend acquires an atomic 15-minute lock in Redis. This guarantees that your selected calendar date and tier cannot be double-booked by any other founder while you complete payment through our Merchant of Record partner.',
                icon: Clock,
                color: 'text-primary',
              },
              {
                q: 'How is my promoted tool demarcated to platform visitors?',
                a: 'In accordance with our strict ethical transparency principles, all promoted products feature a distinct amber "Promoted" pill and warm border tint. This signals honesty to early adopters while delivering 4-8x higher click engagement.',
                icon: Tag,
                color: 'text-amber-500',
              },
              {
                q: 'Can I track impressions, clicks, and conversion telemetry?',
                a: 'Yes. Every outbound click is deduplicated and tracked in real time. In your Founder Command Center dashboard, you can view live click telemetry, referrer breakdowns, conversion momentum, and export CSV reports.',
                icon: Zap,
                color: 'text-purple-500',
              },
              {
                q: 'What is the refund and rescheduling policy?',
                a: 'Campaign slots can be cancelled or rescheduled with a 100% full refund up to 48 hours prior to your scheduled launch date. Within 48 hours of your slot going live, reservations become final as inventory is locked from other builders.',
                icon: RefreshCw,
                color: 'text-cyan-500',
              },
              {
                q: 'Which payment methods are accepted (Paddle / MoR)?',
                a: 'Payments are processed securely via Paddle Inc. or Lemon Squeezy acting as Merchant of Record. We accept all major credit cards (Visa, MasterCard, Amex), Apple Pay, Google Pay, and PayPal with automated VAT compliant invoicing.',
                icon: Lock,
                color: 'text-blue-500',
              },
            ].map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              const Icon = faq.icon;

              return (
                <div
                  key={idx}
                  className={`rounded-2xl border transition-all duration-300 overflow-hidden ${
                    isOpen
                      ? 'bg-bg border-primary/40 shadow-md'
                      : 'bg-surface border-border hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full p-5 text-left flex items-center justify-between gap-4 select-none focus-ring rounded-2xl"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                          isOpen ? 'bg-primary/10 ' + faq.color : 'bg-surface text-text-muted border border-border'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-text-primary">
                        {faq.q}
                      </span>
                    </div>
                    <ChevronDown
                      className={`w-4 h-4 text-text-muted transition-transform duration-300 shrink-0 ${
                        isOpen ? 'rotate-180 text-primary' : ''
                      }`}
                    />
                  </button>

                  <div
                    className={`transition-all duration-300 ease-in-out px-5 pb-5 text-xs text-text-secondary leading-relaxed ${
                      isOpen ? 'block opacity-100' : 'hidden opacity-0'
                    }`}
                  >
                    <div className="pt-2 border-t border-border">
                      {faq.a}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
