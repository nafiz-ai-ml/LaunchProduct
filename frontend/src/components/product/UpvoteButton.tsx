'use client';

import React, { useState, useEffect } from 'react';
import { ChevronUp } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

interface UpvoteButtonProps {
  productId: string;
  initialVotesCount: number;
  initialHasVoted?: boolean;
  size?: 'sm' | 'md' | 'lg';
  onAuthRequired?: () => void;
  onVoteChange?: (newCount: number, hasVoted: boolean) => void;
  className?: string;
}

export function UpvoteButton({
  productId,
  initialVotesCount,
  initialHasVoted = false,
  size = 'md',
  onAuthRequired,
  onVoteChange,
  className = '',
}: UpvoteButtonProps) {
  const [votesCount, setVotesCount] = useState(initialVotesCount);
  const [hasVoted, setHasVoted] = useState(initialHasVoted);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    setVotesCount(initialVotesCount);
  }, [initialVotesCount]);

  useEffect(() => {
    setHasVoted(initialHasVoted);
  }, [initialHasVoted]);

  // Check local guest votes on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('lp_guest_votes');
      if (stored) {
        const guestVotes: string[] = JSON.parse(stored);
        if (guestVotes.includes(productId)) {
          setHasVoted(true);
        }
      }
    } catch {}
  }, [productId]);

  const handleVote = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSubmitting) return;

    // Optimistic UI update
    const nextVoted = !hasVoted;
    const nextCount = nextVoted ? votesCount + 1 : Math.max(0, votesCount - 1);

    setHasVoted(nextVoted);
    setVotesCount(nextCount);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 250);

    if (onVoteChange) {
      onVoteChange(nextCount, nextVoted);
    }

    // Persist optimistic guest vote in localStorage
    try {
      const stored = localStorage.getItem('lp_guest_votes');
      let guestVotes: string[] = stored ? JSON.parse(stored) : [];
      if (nextVoted) {
        if (!guestVotes.includes(productId)) guestVotes.push(productId);
      } else {
        guestVotes = guestVotes.filter((id) => id !== productId);
      }
      localStorage.setItem('lp_guest_votes', JSON.stringify(guestVotes));
      localStorage.setItem('pending_upvote', productId);
    } catch {}

    setIsSubmitting(true);

    try {
      await apiClient.post('/votes', { productId });
    } catch (err: any) {
      // If unauthorized (401), keep optimistic device vote and open lightweight social auth modal
      if (err?.statusCode === 401 || err?.response?.status === 401 || err?.code === 'UNAUTHORIZED') {
        if (onAuthRequired) {
          onAuthRequired();
        }
        return;
      }

      // Rollback on non-auth errors (e.g. rate limit exceeded)
      setHasVoted(hasVoted);
      setVotesCount(votesCount);
      if (onVoteChange) {
        onVoteChange(votesCount, hasVoted);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const sizeClasses = {
    sm: 'px-2 py-1 text-[11px] gap-1',
    md: 'px-3 py-2 text-xs gap-1.5 min-w-[56px]',
    lg: 'px-4 py-3 text-sm gap-2 min-w-[72px]',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  return (
    <button
      type="button"
      onClick={handleVote}
      disabled={isSubmitting}
      aria-label={`Upvote. Current count: ${votesCount}`}
      aria-pressed={hasVoted}
      className={`group flex flex-col items-center justify-center rounded-xl border font-bold select-none focus-ring transition-motion-fast active:scale-95 ${
        sizeClasses[size]
      } ${
        hasVoted
          ? 'bg-primary text-white border-primary shadow-xs hover:bg-primary-hover'
          : 'bg-surface hover:bg-surface-sunken text-text-primary border-border hover:border-slate-300 dark:hover:border-slate-700'
      } ${isAnimating ? 'scale-105' : 'scale-100'} ${className}`}
    >
      <ChevronUp
        className={`${iconSizes[size]} transition-transform duration-150 group-hover:-translate-y-0.5 ${
          hasVoted ? 'text-white' : 'text-text-muted group-hover:text-primary'
        }`}
      />
      <span className="font-mono tracking-tight">{votesCount}</span>
    </button>
  );
}

export default UpvoteButton;
