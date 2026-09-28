'use client';

import React, { useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { X, Star, AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';

interface SubmitReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  onReviewSubmitted?: () => void;
  onAuthRequired?: () => void;
}

export function SubmitReviewModal({
  isOpen,
  onClose,
  productId,
  productName,
  onReviewSubmitted,
  onAuthRequired,
}: SubmitReviewModalProps) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [conflictDisclosed, setConflictDisclosed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (body.trim().length < 20) {
      setError('Review description must be at least 20 characters long.');
      return;
    }

    if (!title.trim()) {
      setError('Please provide a brief headline for your review.');
      return;
    }

    setIsSubmitting(true);

    try {
      await apiClient.post('/reviews', {
        productId,
        rating,
        title: title.trim(),
        body: body.trim(),
        conflictOfInterestDisclosed: conflictDisclosed,
      });

      setIsSuccess(true);
      if (onReviewSubmitted) {
        onReviewSubmitted();
      }
      setTimeout(() => {
        setIsSuccess(false);
        setTitle('');
        setBody('');
        setConflictDisclosed(false);
        onClose();
      }, 1600);
    } catch (err: any) {
      console.error('Failed to submit review:', err);
      if (err?.statusCode === 401 || err?.response?.status === 401) {
        onClose();
        if (onAuthRequired) {
          onAuthRequired();
        } else {
          window.location.href = '/auth';
        }
        return;
      }
      setError(err?.message || 'Failed to submit review. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-surface rounded-2xl border border-border shadow-2xl p-6 sm:p-8 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-5 right-5 p-2 rounded-xl text-muted hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="text-center py-8">
            <div className="w-14 h-14 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-foreground">Review Submitted!</h3>
            <p className="text-xs text-muted mt-2 max-w-xs mx-auto">
              Your feedback helps builders grow. Your review is now pending quick automated integrity verification.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-primary font-bold">
                Community Feedback
              </span>
              <h2 className="text-xl font-bold text-foreground mt-0.5">
                Review {productName}
              </h2>
              <p className="text-xs text-muted mt-1">
                Share your genuine user experience. High-integrity reviews shape product rankings.
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Star Rating Selector */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-2">
                Your Rating
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className="p-1 text-slate-300 dark:text-slate-700 hover:scale-110 transition-transform focus:outline-none"
                  >
                    <Star
                      className={`w-7 h-7 ${
                        (hoverRating || rating) >= star
                          ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                          : 'fill-transparent text-slate-300 dark:text-slate-600'
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-xs font-mono font-bold text-amber-600 dark:text-amber-400">
                  {rating} of 5 Stars
                </span>
              </div>
            </div>

            {/* Review Title */}
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1.5">
                Headline / Summary
              </label>
              <input
                type="text"
                required
                maxLength={100}
                placeholder="e.g. Incredibly fast deployment workflow"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-canvas text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>

            {/* Review Body */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-foreground">
                  Detailed Feedback
                </label>
                <span className="text-[10px] font-mono text-muted">
                  {body.length} / min 20 chars
                </span>
              </div>
              <textarea
                required
                rows={4}
                maxLength={2000}
                placeholder="What problems did this tool solve for you? How was the user experience or performance?"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-border bg-canvas text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
              />
            </div>

            {/* Conflict of Interest Disclosure Checkbox */}
            <div className="p-3 rounded-xl bg-slate-100/60 dark:bg-slate-800/40 border border-border">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={conflictDisclosed}
                  onChange={(e) => setConflictDisclosed(e.target.checked)}
                  className="mt-0.5 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-xs text-muted leading-relaxed">
                  <strong className="text-foreground font-semibold">Integrity Disclosure:</strong> I confirm that I am an independent user and not an employee, founder, or financially sponsored reviewer for this product.
                </span>
              </label>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold rounded-xl text-muted hover:text-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl bg-primary text-white hover:bg-primary-hover shadow-md transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" /> Submit Verified Review
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
