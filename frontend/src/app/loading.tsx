import React from 'react';

export default function FeedLoadingSkeleton() {
  return (
    <div className="min-h-screen bg-bg py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8" role="status" aria-label="Loading content">
      {/* Category Pills Wireframe Row */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-2">
        <div className="w-16 h-8 rounded-full skeleton-shimmer shrink-0" />
        <div className="w-24 h-8 rounded-full skeleton-shimmer shrink-0" />
        <div className="w-28 h-8 rounded-full skeleton-shimmer shrink-0" />
        <div className="w-20 h-8 rounded-full skeleton-shimmer shrink-0" />
        <div className="w-24 h-8 rounded-full skeleton-shimmer shrink-0" />
        <div className="w-28 h-8 rounded-full skeleton-shimmer shrink-0" />
      </div>

      {/* Discovery Section Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-4">
        <div className="space-y-2">
          <div className="w-48 h-6 rounded-lg skeleton-shimmer" />
          <div className="w-64 h-3.5 rounded skeleton-shimmer" />
        </div>
        <div className="flex items-center gap-3">
          <div className="w-32 h-9 rounded-xl skeleton-shimmer" />
          <div className="w-28 h-9 rounded-xl skeleton-shimmer" />
        </div>
      </div>

      {/* Wireframe Shimmer Matching <ProductCard /> Feed */}
      <div className="space-y-4">
        {[1, 2, 3, 4, 5, 6].map((idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-border bg-surface p-4 sm:p-5 flex items-start gap-4 shadow-card"
          >
            {/* Rank Placeholder */}
            <div className="hidden sm:flex flex-col items-center justify-center pt-2 w-8 shrink-0">
              <div className="w-6 h-5 rounded skeleton-shimmer" />
            </div>

            {/* Logo Placeholder */}
            <div className="w-12 h-12 rounded-xl skeleton-shimmer shrink-0" />

            {/* Content Placeholders */}
            <div className="flex-1 min-w-0 space-y-2.5">
              {/* Title & Badge Row */}
              <div className="flex items-center gap-2 flex-wrap">
                <div className="w-36 h-4 rounded-md skeleton-shimmer" />
                <div className="w-16 h-4 rounded-full skeleton-shimmer" />
                <div className="w-14 h-4 rounded-full skeleton-shimmer" />
              </div>

              {/* Tagline Placeholders */}
              <div className="space-y-1">
                <div className="w-3/4 h-3 rounded skeleton-shimmer" />
                <div className="w-1/2 h-3 rounded skeleton-shimmer" />
              </div>

              {/* Bottom Metadata */}
              <div className="flex items-center gap-4 pt-1">
                <div className="w-16 h-3 rounded skeleton-shimmer" />
                <div className="w-24 h-3 rounded skeleton-shimmer" />
              </div>
            </div>

            {/* Upvote Pill Placeholder */}
            <div className="w-14 h-14 rounded-2xl skeleton-shimmer shrink-0 flex flex-col items-center justify-center gap-1.5" />
          </div>
        ))}
      </div>
    </div>
  );
}
