'use client';

import React, { useState, useMemo } from 'react';
import { DailyMetricItem, ReferrerMetricItem } from './types';
import { BarChart3, TrendingUp, Compass, Globe, Info } from 'lucide-react';

interface PerformanceChartProps {
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
  selectedDays: number;
  onDaysChange: (days: number) => void;
  isLoading?: boolean;
}

export function DashboardPerformanceChart({
  dailyMetrics,
  referrerBreakdown,
  selectedDays,
  onDaysChange,
  isLoading = false,
}: PerformanceChartProps) {
  const [activeMetric, setActiveMetric] = useState<'all' | 'clicks' | 'impressions'>('all');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Compute maximums for SVG scaling
  const maxValues = useMemo(() => {
    if (!dailyMetrics || dailyMetrics.length === 0) return { impressions: 10, clicks: 10 };
    let maxImp = 10;
    let maxClk = 10;
    for (const d of dailyMetrics) {
      if (d.impressions > maxImp) maxImp = d.impressions;
      if (d.organicClicks > maxClk) maxClk = d.organicClicks;
    }
    return { impressions: maxImp, clicks: maxClk };
  }, [dailyMetrics]);

  const hasData = dailyMetrics && dailyMetrics.length > 0 && (maxValues.impressions > 0 || maxValues.clicks > 0);

  // Dimensions for SVG chart
  const width = 800;
  const height = 260;
  const paddingX = 40;
  const paddingTop = 20;
  const paddingBottom = 40;
  const graphWidth = width - paddingX * 2;
  const graphHeight = height - paddingTop - paddingBottom;

  // Generate SVG path points
  const points = useMemo(() => {
    if (!hasData) return { impressions: '', clicks: '', areaImpressions: '' };
    const stepX = graphWidth / Math.max(1, dailyMetrics.length - 1);

    const impPoints = dailyMetrics.map((d, i) => {
      const x = paddingX + i * stepX;
      const y = paddingTop + graphHeight - (d.impressions / maxValues.impressions) * graphHeight;
      return { x, y };
    });

    const clkPoints = dailyMetrics.map((d, i) => {
      const x = paddingX + i * stepX;
      const y = paddingTop + graphHeight - (d.organicClicks / maxValues.clicks) * graphHeight;
      return { x, y };
    });

    const impPath = impPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');
    const clkPath = clkPoints.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, '');
    const areaImp = `${impPath} L ${(paddingX + (dailyMetrics.length - 1) * stepX).toFixed(1)} ${height - paddingBottom} L ${paddingX} ${height - paddingBottom} Z`;

    return { impressions: impPath, clicks: clkPath, areaImpressions: areaImp };
  }, [dailyMetrics, hasData, graphWidth, graphHeight, maxValues]);

  return (
    <div className="space-y-6">
      {/* Chart Card */}
      <div className="p-6 rounded-3xl bg-surface border border-border shadow-card">
        {/* Header Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-border">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              <h3 className="text-base font-bold text-text-primary">Performance &amp; Outbound Velocity</h3>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Verified daily impressions and organic outbound clicks to your website.
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-between sm:justify-end">
            {/* Metric Filter Tabs */}
            <div className="inline-flex p-1 rounded-xl bg-bg border border-border text-xs font-semibold">
              <button
                type="button"
                onClick={() => setActiveMetric('all')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeMetric === 'all'
                    ? 'bg-surface text-text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setActiveMetric('clicks')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeMetric === 'clicks'
                    ? 'bg-surface text-emerald-500 shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Clicks
              </button>
              <button
                type="button"
                onClick={() => setActiveMetric('impressions')}
                className={`px-3 py-1 rounded-lg transition-all ${
                  activeMetric === 'impressions'
                    ? 'bg-surface text-primary shadow-sm'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Views
              </button>
            </div>

            {/* Timeframe Selection */}
            <div className="inline-flex p-1 rounded-xl bg-bg border border-border text-xs font-semibold">
              {[7, 14, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => onDaysChange(days)}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    selectedDays === days
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-muted hover:text-text-primary'
                  }`}
                >
                  {days}D
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Chart Viewport */}
        {isLoading ? (
          <div className="py-24 text-center">
            <div className="skeleton-shimmer h-48 rounded-2xl w-full" />
          </div>
        ) : !hasData ? (
          /* High-Integrity Empty State (Section 18.3) */
          <div className="py-20 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto border border-primary/20">
              <Compass className="w-7 h-7" />
            </div>
            <h4 className="text-sm font-bold text-text-primary">No traffic recorded yet</h4>
            <p className="text-xs text-text-muted max-w-md mx-auto leading-relaxed">
              Your launch will start collecting impressions and outbound click telemetry once live in the directory.
            </p>
          </div>
        ) : (
          <div className="pt-6">
            {/* Legend & Hover Info */}
            <div className="flex items-center justify-between text-xs mb-3">
              <div className="flex items-center gap-4">
                {(activeMetric === 'all' || activeMetric === 'impressions') && (
                  <span className="flex items-center gap-1.5 text-text-secondary font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" /> Impressions
                  </span>
                )}
                {(activeMetric === 'all' || activeMetric === 'clicks') && (
                  <span className="flex items-center gap-1.5 text-text-secondary font-medium">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Organic Clicks
                  </span>
                )}
              </div>

              {hoveredIndex !== null && dailyMetrics[hoveredIndex] && (
                <div className="font-mono text-[11px] text-text-primary bg-bg px-2.5 py-1 rounded-lg border border-border">
                  <span className="text-text-muted">{dailyMetrics[hoveredIndex].date}: </span>
                  <strong className="text-primary">{dailyMetrics[hoveredIndex].impressions} views</strong>
                  <span className="text-text-muted mx-1.5">•</span>
                  <strong className="text-emerald-500">{dailyMetrics[hoveredIndex].organicClicks} clicks</strong>
                </div>
              )}
            </div>

            {/* SVG Visual Canvas */}
            <div className="w-full overflow-x-auto">
              <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-auto min-w-[500px] select-none"
              >
                <defs>
                  <linearGradient id="impGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#0653FD" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#0653FD" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid horizontal lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = paddingTop + graphHeight * ratio;
                  return (
                    <line
                      key={ratio}
                      x1={paddingX}
                      y1={y}
                      x2={width - paddingX}
                      y2={y}
                      stroke="currentColor"
                      className="text-border"
                      strokeDasharray="4 4"
                      strokeWidth="1"
                    />
                  );
                })}

                {/* Area Gradient under Impressions */}
                {(activeMetric === 'all' || activeMetric === 'impressions') && (
                  <path d={points.areaImpressions} fill="url(#impGradient)" />
                )}

                {/* Line: Impressions */}
                {(activeMetric === 'all' || activeMetric === 'impressions') && (
                  <path
                    d={points.impressions}
                    fill="none"
                    stroke="#0653FD"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Line: Organic Clicks */}
                {(activeMetric === 'all' || activeMetric === 'clicks') && (
                  <path
                    d={points.clicks}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )}

                {/* Interactive Points on hover */}
                {dailyMetrics.map((d, i) => {
                  const stepX = graphWidth / Math.max(1, dailyMetrics.length - 1);
                  const x = paddingX + i * stepX;
                  const yClk = paddingTop + graphHeight - (d.organicClicks / maxValues.clicks) * graphHeight;

                  return (
                    <g key={d.date} onMouseEnter={() => setHoveredIndex(i)} onMouseLeave={() => setHoveredIndex(null)}>
                      <circle
                        cx={x}
                        cy={yClk}
                        r={hoveredIndex === i ? 5 : 3}
                        className="fill-emerald-500 stroke-surface transition-all cursor-pointer"
                        strokeWidth="2"
                      />
                    </g>
                  );
                })}

                {/* Bottom X-Axis Date Labels */}
                {dailyMetrics.map((d, i) => {
                  // Only show ~5 evenly spaced labels to avoid overlap
                  const showLabel = i === 0 || i === dailyMetrics.length - 1 || i % Math.ceil(dailyMetrics.length / 4) === 0;
                  if (!showLabel) return null;
                  const stepX = graphWidth / Math.max(1, dailyMetrics.length - 1);
                  const x = paddingX + i * stepX;
                  const shortDate = d.date.slice(5);

                  return (
                    <text
                      key={d.date}
                      x={x}
                      y={height - 12}
                      textAnchor="middle"
                      className="fill-text-muted text-[10px] font-mono"
                    >
                      {shortDate}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>
        )}
      </div>

      {/* Referrer Breakdown Table (Section 20) */}
      <div className="p-6 rounded-3xl bg-surface border border-border shadow-card">
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Globe className="w-4 h-4 text-primary" />
            <h4 className="text-sm font-bold text-text-primary">Top Inbound Referrers</h4>
          </div>
          <span className="text-[11px] font-mono text-text-muted">Last {selectedDays} Days</span>
        </div>

        {referrerBreakdown && referrerBreakdown.length > 0 ? (
          <div className="divide-y divide-border mt-2">
            {referrerBreakdown.map((ref, idx) => (
              <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                <span className="font-mono text-text-secondary truncate max-w-xs">
                  {ref.referrer || 'direct / organic'}
                </span>
                <span className="font-mono font-bold text-text-primary bg-bg px-2.5 py-0.5 rounded-lg border border-border">
                  {ref.count.toLocaleString()} visits
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-text-muted py-6 text-center leading-relaxed">
            No external referrers recorded for this timeframe yet.
          </p>
        )}
      </div>
    </div>
  );
}
