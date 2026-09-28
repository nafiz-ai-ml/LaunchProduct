'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api-client';
import { SubmitReviewModal } from './SubmitReviewModal';
import {
  Star,
  MessageSquare,
  ShieldCheck,
  CornerDownRight,
  PenLine,
  User as UserIcon,
  RefreshCw,
} from 'lucide-react';

interface ReviewData {
  _id?: string;
  id?: string;
  productId: string;
  userId?: {
    _id?: string;
    id?: string;
    name?: string;
    avatarUrl?: string;
    accountAgeHours?: number;
    isVerified?: boolean;
  };
  rating: number;
  title: string;
  body?: string;
  content?: string;
  conflictOfInterestDisclosed?: boolean;
  founderReply?: {
    body?: string;
    content?: string;
    repliedAt?: string;
  };
  createdAt: string;
}

interface ReviewListProps {
  productId: string;
  productName: string;
  onAuthRequired?: () => void;
}

export function ReviewList({ productId, productName, onAuthRequired }: ReviewListProps) {
  const [reviews, setReviews] = useState<ReviewData[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [averageRating, setAverageRating] = useState(0);
  const [distribution, setDistribution] = useState<Record<string, number>>({
    '1': 0,
    '2': 0,
    '3': 0,
    '4': 0,
    '5': 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchReviews = useCallback(async () => {
    if (!productId) return;
    setIsLoading(true);

    try {
      const res = await apiClient.get(`/products/${productId}/reviews`);
      if (res.data && res.data.data) {
        const data = res.data.data;
        setReviews(data.reviews || []);
        if (data.aggregate) {
          setTotalCount(data.aggregate.totalCount || 0);
          setAverageRating(data.aggregate.averageRating || 0);
          if (data.aggregate.ratingDistribution) {
            setDistribution(data.aggregate.ratingDistribution);
          }
        } else {
          setTotalCount(data.total || 0);
        }
      }
    } catch (err) {
      console.warn('Could not fetch reviews:', err);
    } finally {
      setIsLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  // Format account age badge (hours into days or months)
  const formatAccountAge = (hours?: number) => {
    if (!hours || hours <= 0) return 'New Member';
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d member`;
    const months = Math.floor(days / 30);
    return `${months}mo+ member`;
  };

  return (
    <div className="space-y-8">
      {/* Header & Write Review Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            Community Reviews & Ratings
          </h2>
          <p className="text-xs text-muted mt-1">
            Independent evaluations by verified developers, founders, and active platform users.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-xs font-semibold hover:bg-primary-hover shadow-md transition-all self-start sm:self-auto"
        >
          <PenLine className="w-4 h-4" /> Write a Review
        </button>
      </div>

      {/* Review Summary Scoreboard (UI-UX Section 25.4) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6 rounded-2xl border border-border bg-surface shadow-card">
        {/* Overall Rating Callout */}
        <div className="flex flex-col items-center justify-center text-center p-4 border-b md:border-b-0 md:border-r border-border">
          <div className="text-5xl font-extrabold text-foreground font-mono">
            {averageRating > 0 ? averageRating.toFixed(1) : '5.0'}
          </div>
          <div className="flex items-center gap-1 my-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= Math.round(averageRating || 5)
                    ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                    : 'text-slate-300 dark:text-slate-700'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-muted">
            Based on <strong className="text-foreground">{totalCount}</strong> verified reviews
          </p>
        </div>

        {/* Rating Breakdown Bars */}
        <div className="col-span-1 md:col-span-2 flex flex-col justify-center space-y-2 p-2">
          {[5, 4, 3, 2, 1].map((stars) => {
            const count = distribution[String(stars)] || 0;
            const percentage = totalCount > 0 ? (count / totalCount) * 100 : stars === 5 ? 100 : 0;

            return (
              <div key={stars} className="flex items-center gap-3 text-xs">
                <span className="w-12 text-muted font-medium flex items-center justify-end gap-1">
                  {stars} <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                </span>
                <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-500"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className="w-8 text-right font-mono text-muted text-[11px]">
                  {count}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Reviews List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((n) => (
            <div key={n} className="h-32 rounded-2xl bg-surface border border-border p-6 skeleton-shimmer" />
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-12 rounded-2xl border border-dashed border-border bg-surface p-8">
          <MessageSquare className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-40" />
          <h3 className="text-base font-bold text-text-primary">No Community Reviews Yet</h3>
          <p className="text-xs text-text-muted max-w-sm mx-auto mt-1 mb-4">
            Be the first verified user to share your hands-on feedback for {productName}!
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors"
          >
            <PenLine className="w-3.5 h-3.5" /> Write First Review
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const revId = review._id || review.id || Math.random().toString();
            const reviewerName = review.userId?.name || 'Verified Explorer';
            const reviewerAvatar = review.userId?.avatarUrl;
            const reviewBody = review.body || review.content || '';
            const reply = review.founderReply?.body || review.founderReply?.content;

            return (
              <div
                key={revId}
                className="rounded-2xl border border-border bg-surface p-6 shadow-card hover:border-slate-300 dark:hover:border-slate-700 transition-colors space-y-4"
              >
                {/* Reviewer Header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full border border-border bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center shrink-0">
                      {reviewerAvatar ? (
                        <img
                          src={reviewerAvatar}
                          alt={reviewerName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <UserIcon className="w-5 h-5 text-muted" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-foreground">
                          {reviewerName}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-muted">
                          {formatAccountAge(review.userId?.accountAgeHours)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= review.rating
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-slate-300 dark:text-slate-700'
                            }`}
                          />
                        ))}
                        <span className="ml-2 text-[11px] text-muted font-mono">
                          {new Date(review.createdAt).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {review.conflictOfInterestDisclosed && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                      <ShieldCheck className="w-3 h-3" /> Independent
                    </span>
                  )}
                </div>

                {/* Review Body */}
                <div className="space-y-1.5 pl-13">
                  <h4 className="text-sm font-bold text-foreground">
                    {review.title}
                  </h4>
                  <p className="text-xs text-muted leading-relaxed whitespace-pre-line">
                    {reviewBody}
                  </p>
                </div>

                {/* Nested Founder Reply (UI-UX Section 25.5) */}
                {reply && (
                  <div className="ml-6 sm:ml-10 p-4 rounded-xl bg-slate-100/70 dark:bg-slate-800/50 border border-border space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-primary">
                        <CornerDownRight className="w-3.5 h-3.5" />
                        <span>Founder Response</span>
                      </div>
                      {review.founderReply?.repliedAt && (
                        <span className="text-[10px] font-mono text-muted">
                          {new Date(review.founderReply.repliedAt).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted leading-relaxed">
                      {reply}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Trigger */}
      <SubmitReviewModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        productId={productId}
        productName={productName}
        onReviewSubmitted={fetchReviews}
        onAuthRequired={onAuthRequired}
      />
    </div>
  );
}
