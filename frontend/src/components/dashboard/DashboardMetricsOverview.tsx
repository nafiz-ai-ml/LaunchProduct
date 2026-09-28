'use client';

import React from 'react';
import { Eye, MousePointerClick, Percent, Award, TrendingUp } from 'lucide-react';

interface MetricsOverviewProps {
  impressions: number;
  clicks: number;
  ctr: number;
  votes: number;
  isLoading?: boolean;
}

export function DashboardMetricsOverview({
  impressions,
  clicks,
  ctr,
  votes,
  isLoading = false,
}: MetricsOverviewProps) {
  const cards = [
    {
      label: 'Total Impressions',
      value: impressions.toLocaleString(),
      subtext: 'Directory & category views',
      icon: Eye,
      iconColor: 'text-primary',
      bgGlow: 'bg-primary/10',
    },
    {
      label: 'Organic Outbound Clicks',
      value: clicks.toLocaleString(),
      subtext: 'Direct visits to your landing page',
      icon: MousePointerClick,
      iconColor: 'text-emerald-500',
      bgGlow: 'bg-emerald-500/10',
    },
    {
      label: 'Organic Click-Through (CTR)',
      value: `${(ctr * 100).toFixed(1)}%`,
      subtext: 'Clicks / Impressions ratio',
      icon: Percent,
      iconColor: 'text-amber-500',
      bgGlow: 'bg-amber-500/10',
    },
    {
      label: 'Community Upvotes',
      value: votes.toLocaleString(),
      subtext: 'Verified votes earned',
      icon: Award,
      iconColor: 'text-indigo-500',
      bgGlow: 'bg-indigo-500/10',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="p-5 rounded-2xl bg-surface border border-border shadow-sm skeleton-shimmer h-32"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon;
        return (
          <div
            key={idx}
            className="p-5 rounded-2xl bg-surface border border-border hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-text-muted">{card.label}</span>
              <div className={`p-2 rounded-xl ${card.bgGlow} ${card.iconColor} shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold font-mono text-text-primary tracking-tight">
                {card.value}
              </div>
              <p className="text-[11px] text-text-muted mt-1 leading-snug">{card.subtext}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
