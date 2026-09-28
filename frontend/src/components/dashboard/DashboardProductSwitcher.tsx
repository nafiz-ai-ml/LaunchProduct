'use client';

import React from 'react';
import Link from 'next/link';
import { Plus, ChevronDown, Check, Rocket, ShieldCheck } from 'lucide-react';
import { FounderProduct } from './types';

interface ProductSwitcherProps {
  products: FounderProduct[];
  selectedProductId: string;
  onSelectProduct: (productId: string) => void;
}

export function DashboardProductSwitcher({
  products,
  selectedProductId,
  onSelectProduct,
}: ProductSwitcherProps) {
  const selectedProduct = products.find((p) => (p.id || p._id) === selectedProductId) || products[0];

  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-surface border border-border shadow-sm">
      <div className="flex items-center gap-3">
        {/* Product Logo */}
        <div className="w-12 h-12 rounded-xl border border-border bg-bg overflow-hidden flex items-center justify-center p-1 shrink-0">
          <img
            src={selectedProduct?.logoUrl || selectedProduct?.media?.logoUrl || '/brand/icon.svg'}
            alt={selectedProduct?.name || 'Product'}
            className="w-full h-full object-cover rounded-lg"
            onError={(e) => {
              (e.target as HTMLImageElement).src = '/brand/icon.svg';
            }}
          />
        </div>

        {/* Product Name & Status */}
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base sm:text-lg font-bold text-text-primary tracking-tight">
              {selectedProduct?.name || 'Your Product'}
            </h2>
            {selectedProduct?.status === 'LIVE' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                LIVE
              </span>
            )}
            {selectedProduct?.status === 'SCHEDULED' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/10 text-primary border border-primary/20">
                SCHEDULED
              </span>
            )}
            {selectedProduct?.status === 'PENDING_REVIEW' && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                IN REVIEW
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted truncate max-w-sm sm:max-w-md">
            {selectedProduct?.tagline || 'Manage your product presence and performance.'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
        {/* Product Selector Dropdown if user has multiple products */}
        {products.length > 1 && (
          <div className="relative">
            <select
              value={selectedProductId}
              onChange={(e) => onSelectProduct(e.target.value)}
              className="appearance-none pl-3 pr-8 py-2 rounded-xl bg-bg border border-border text-xs font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 cursor-pointer"
            >
              {products.map((p) => {
                const pId = p.id || p._id || '';
                return (
                  <option key={pId} value={pId}>
                    {p.name}
                  </option>
                );
              })}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-text-muted absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        )}

        {/* Submit New Launch Button */}
        <Link
          href="/submit"
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-primary text-white text-xs font-bold hover:bg-primary-hover shadow-sm transition-all focus-ring"
        >
          <Plus className="w-3.5 h-3.5" /> Submit New
        </Link>
      </div>
    </div>
  );
}
