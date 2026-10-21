'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import {
  Zap,
  ShieldCheck,
  ArrowRight,
  Globe,
  Tag,
  DollarSign,
  Info,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';

interface CategoryItem {
  id: string;
  _id?: string;
  slug: string;
  name: string;
}

const MVP_CATEGORIES: CategoryItem[] = [
  { id: '6ab4fbbb93cf98ad0b5f59a5', slug: 'ai-tools', name: 'AI Tools' },
  { id: '6ab4fbbb93cf98ad0b5f59a6', slug: 'ai-agents', name: 'AI Agents' },
  { id: '6ab4fbbb93cf98ad0b5f59a7', slug: 'saas', name: 'SaaS' },
  { id: '6ab4fbbb93cf98ad0b5f59a8', slug: 'developer-tools', name: 'Developer Tools' },
  { id: '6ab4fbbb93cf98ad0b5f59a9', slug: 'productivity', name: 'Productivity' },
  { id: '6ab4fbbb93cf98ad0b5f59aa', slug: 'marketing-tools', name: 'Marketing Tools' },
  { id: '6ab4fbbb93cf98ad0b5f59ab', slug: 'seo-tools', name: 'SEO Tools' },
  { id: '6ab4fbbb93cf98ad0b5f59ac', slug: 'design-tools', name: 'Design Tools' },
];

const PRESET_AMOUNTS = [
  { label: 'Min Entry', dollars: 5.99, cents: 599, badge: 'Standard' },
  { label: 'Trending Boost', dollars: 15.0, cents: 1500, badge: 'Popular' },
  { label: 'Top Contender', dollars: 35.0, cents: 3500, badge: 'High Impact' },
  { label: 'Podium Bid', dollars: 75.0, cents: 7500, badge: 'Podium' },
];

export default function SubmitProductPage() {
  const router = useRouter();

  // Form Fields
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState(MVP_CATEGORIES[0].id);
  const [contactEmail, setContactEmail] = useState('');
  const [logoUrl, setLogoUrl] = useState('');

  // Payment Selection
  const [selectedAmountCents, setSelectedAmountCents] = useState<number>(599);
  const [customDollars, setCustomDollars] = useState<string>('');
  const [isCustom, setIsCustom] = useState(false);

  // Status
  const [categories, setCategories] = useState<CategoryItem[]>(MVP_CATEGORIES);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch live categories from API if available
  useEffect(() => {
    async function loadCategories() {
      try {
        const res = await apiClient.get('/categories');
        const items = res.data?.data;
        if (Array.isArray(items) && items.length > 0) {
          const mapped = items.map((c: any) => ({
            id: c._id || c.id,
            slug: c.slug,
            name: c.name,
          }));
          setCategories(mapped);
          setCategoryId(mapped[0].id);
        }
      } catch {
        // Fallback categories remain active
      }
    }
    loadCategories();
  }, []);

  const handleAmountSelect = (cents: number) => {
    setSelectedAmountCents(cents);
    setIsCustom(false);
    setCustomDollars('');
  };

  const handleCustomChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomDollars(val);
    setIsCustom(true);
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 5.99) {
      setSelectedAmountCents(Math.round(num * 100));
    }
  };

  const finalAmountDollars = (selectedAmountCents / 100).toFixed(2);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!websiteUrl.trim()) {
      setErrorMessage('Please enter your product website URL.');
      return;
    }
    if (!name.trim() || name.trim().length < 2) {
      setErrorMessage('Please enter a product name (at least 2 characters).');
      return;
    }
    if (!tagline.trim() || tagline.trim().length < 10) {
      setErrorMessage('Please provide a descriptive tagline (at least 10 characters).');
      return;
    }
    if (selectedAmountCents < 599) {
      setErrorMessage('The minimum qualifying ranking entry payment is $5.99 (599 cents).');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/products/public-submit', {
        name: name.trim(),
        tagline: tagline.trim(),
        description: description.trim() || tagline.trim(),
        websiteUrl: websiteUrl.trim(),
        categoryId,
        contactEmail: contactEmail.trim() || undefined,
        logoUrl: logoUrl.trim() || undefined,
        initialPaymentCents: selectedAmountCents,
        provider: 'paddle',
        successUrl: `${window.location.origin}/?status=success&paid=true`,
        cancelUrl: `${window.location.origin}/submit?status=cancelled`,
      });

      const data = res.data?.data;
      if (data?.checkoutUrl) {
        // Redirect to merchant of record hosted checkout
        window.location.href = data.checkoutUrl;
      } else {
        router.push('/?status=submitted');
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to process product submission. Please check your entries.';
      setErrorMessage(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-8 font-sans">
      {/* Header Banner */}
      <div className="space-y-2 border-b border-border pb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary border border-primary/20">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span>No Account Required · Permanent Listing</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-black text-text-primary tracking-tight">
          Submit &amp; Rank Your Product
        </h1>
        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed max-w-2xl">
          Submit your product once for permanent inclusion in the LaunchProduct directory. Pay the qualifying initial amount ($5.99 min) to establish your All-Time ranking and compete on today’s daily leaderboard.
        </p>
      </div>

      {/* Repeat Submission Callout */}
      <div className="rounded-2xl p-4 bg-surface border border-border/80 flex items-start gap-3">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs text-text-secondary space-y-1">
          <p className="font-semibold text-text-primary">
            Submitting a product that is already in LaunchProduct?
          </p>
          <p>
            Simply enter your existing product’s website URL. Our platform automatically recognizes your canonical domain and registers your new payment as a daily ranking participation for today’s UTC leaderboard without creating duplicate listings.
          </p>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Main Submission Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Section 1: Product Identity */}
        <div className="rounded-2xl bg-surface border border-border p-6 sm:p-8 space-y-6">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2 border-b border-border/60 pb-3">
            <Globe className="w-4 h-4 text-primary" />
            <span>1. Product Details</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Website URL */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-text-primary flex items-center justify-between">
                <span>Website URL *</span>
                <span className="text-[11px] text-text-muted font-normal">Domain is normalized</span>
              </label>
              <input
                type="url"
                required
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://yourproduct.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary text-xs sm:text-sm text-text-primary placeholder:text-text-muted transition-colors"
              />
            </div>

            {/* Product Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-primary">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. PromptCanvas"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary text-xs sm:text-sm text-text-primary placeholder:text-text-muted transition-colors"
              />
            </div>

            {/* Category Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-primary">
                Category *
              </label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary text-xs sm:text-sm text-text-primary transition-colors cursor-pointer"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tagline */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-text-primary flex items-center justify-between">
                <span>Tagline (10–140 chars) *</span>
                <span className="text-[11px] text-text-muted font-normal">{tagline.length}/140</span>
              </label>
              <input
                type="text"
                required
                maxLength={140}
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Brief one-line summary of what your product solves"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary text-xs sm:text-sm text-text-primary placeholder:text-text-muted transition-colors"
              />
            </div>

            {/* Description */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="text-xs font-bold text-text-primary">
                Product Description
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed overview of features, target audience, and architecture..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary text-xs sm:text-sm text-text-primary placeholder:text-text-muted transition-colors resize-y"
              />
            </div>

            {/* Logo Image URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-primary">
                Logo / Icon URL (Optional)
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://.../logo.png"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary text-xs sm:text-sm text-text-primary placeholder:text-text-muted transition-colors"
              />
            </div>

            {/* Notification Email */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-text-primary flex items-center justify-between">
                <span>Receipt Email (Optional)</span>
                <span className="text-[11px] text-text-muted font-normal">For payment confirmation</span>
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                placeholder="founder@yourproduct.com"
                className="w-full px-3.5 py-2.5 rounded-xl bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary text-xs sm:text-sm text-text-primary placeholder:text-text-muted transition-colors"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Pay-to-Rank Amount Selection */}
        <div className="rounded-2xl bg-surface border border-border p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />
              <span>2. Select Initial Pay-to-Rank Amount</span>
            </h2>
            <span className="text-xs font-semibold text-primary font-mono">$5.99 min</span>
          </div>

          <p className="text-xs text-text-secondary leading-relaxed">
            Your qualifying payment determines your starting rank on both the All-Time leaderboard and today’s daily board. Higher qualifying payments achieve higher leaderboard placement.
          </p>

          {/* Preset Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {PRESET_AMOUNTS.map((preset) => {
              const isSelected = !isCustom && selectedAmountCents === preset.cents;
              return (
                <button
                  type="button"
                  key={preset.cents}
                  onClick={() => handleAmountSelect(preset.cents)}
                  className={`p-4 rounded-xl border text-left transition-all relative ${
                    isSelected
                      ? 'bg-primary/10 border-primary shadow-xs ring-1 ring-primary'
                      : 'bg-surface-sunken border-border hover:border-slate-400'
                  }`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block mb-1">
                    {preset.label}
                  </span>
                  <span className="text-lg font-black font-mono text-text-primary block">
                    ${preset.dollars.toFixed(2)}
                  </span>
                  <span className="text-[10px] text-primary font-semibold mt-1 block">
                    {preset.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom Amount Field */}
          <div className="pt-2">
            <label className="text-xs font-semibold text-text-secondary block mb-1.5">
              Or Enter Custom Amount ($5.99 minimum):
            </label>
            <div className="relative max-w-xs">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-text-muted">
                $
              </span>
              <input
                type="number"
                step="0.01"
                min="5.99"
                value={customDollars}
                onChange={handleCustomChange}
                placeholder="5.99"
                className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-surface-sunken border border-border focus:border-primary focus:ring-1 focus:ring-primary text-sm font-mono text-text-primary placeholder:text-text-muted transition-colors"
              />
            </div>
          </div>

          {/* Summary Box */}
          <div className="p-4 rounded-xl bg-surface-sunken border border-border/80 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Listing Status:</span>
              <span className="font-semibold text-text-primary">Permanent Directory Inclusion</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Initial All-Time Contribution:</span>
              <span className="font-mono font-bold text-text-primary">${finalAmountDollars}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-text-muted">Today’s Daily UTC Contribution:</span>
              <span className="font-mono font-bold text-amber-500">${finalAmountDollars}</span>
            </div>
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs font-bold">
              <span>Total Checkout Amount:</span>
              <span className="font-mono text-base font-black text-primary">${finalAmountDollars} USD</span>
            </div>
          </div>
        </div>

        {/* Commercial Transparency Disclosure & Submit Button */}
        <div className="space-y-4">
          <p className="text-[11px] text-text-muted leading-relaxed text-center sm:text-left">
            Commercial Disclosure: LaunchProduct rankings are commercially determined by qualifying paid ranking amounts. Paid placement does not constitute an independent editorial endorsement or guarantee traffic, sales, or revenue.
          </p>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-primary via-[#0040c0] to-[#00214E] hover:opacity-95 text-white font-bold text-sm tracking-wide shadow-lg shadow-primary/25 transition-all duration-200 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Generating Secure Checkout...</span>
              </>
            ) : (
              <>
                <span>Continue to Checkout (${finalAmountDollars})</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
