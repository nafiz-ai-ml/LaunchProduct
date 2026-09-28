'use client';

import React, { useState } from 'react';
import { Award, Code2, Copy, Check, ExternalLink } from 'lucide-react';
import { BadgeStyle } from './types';

interface BadgeGeneratorProps {
  productSlug: string;
  productName: string;
}

export function DashboardBadgeGenerator({
  productSlug,
  productName,
}: BadgeGeneratorProps) {
  const [selectedStyle, setSelectedStyle] = useState<BadgeStyle>('dark');
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);
  const [previewBg, setPreviewBg] = useState<'dark' | 'light' | 'checker'>('dark');

  const canonicalUrl = `https://launchproduct.com/products/${productSlug || 'your-product'}`;

  // Badge image SVG URL depending on style
  const badgeImgUrl =
    selectedStyle === 'pill'
      ? 'https://launchproduct.com/brand/badge-pill.svg'
      : selectedStyle === 'light'
      ? 'https://launchproduct.com/brand/badge-light.svg'
      : 'https://launchproduct.com/brand/badge-dark.svg';

  const markdownSnippet = `[![Featured on LaunchProduct](${badgeImgUrl})](${canonicalUrl})`;
  const htmlSnippet = `<a href="${canonicalUrl}" target="_blank" rel="noopener noreferrer"><img src="${badgeImgUrl}" alt="${productName || 'Featured'} on LaunchProduct" height="48" /></a>`;

  const copyMarkdown = () => {
    navigator.clipboard.writeText(markdownSnippet);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const copyHtml = () => {
    navigator.clipboard.writeText(htmlSnippet);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2000);
  };

  return (
    <div className="p-6 rounded-3xl bg-surface border border-border shadow-card space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-primary" />
            <h3 className="text-base font-bold text-text-primary">Official Embed Badges</h3>
          </div>
          <p className="text-xs text-text-muted mt-0.5">
            Embed an official LaunchProduct badge on your README or landing page to showcase authority.
          </p>
        </div>

        {/* Style Selector */}
        <div className="inline-flex p-1 rounded-xl bg-bg border border-border text-xs font-semibold">
          {(['dark', 'light', 'pill'] as BadgeStyle[]).map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => setSelectedStyle(style)}
              className={`px-3 py-1 rounded-lg capitalize transition-all ${
                selectedStyle === style
                  ? 'bg-surface text-text-primary shadow-sm font-bold'
                  : 'text-text-muted hover:text-text-primary'
              }`}
            >
              {style}
            </button>
          ))}
        </div>
      </div>

      {/* Live Badge Preview Area */}
      <div>
        <div className="flex items-center justify-between text-xs text-text-muted mb-2">
          <span>Live Interactive Preview</span>
          <div className="flex items-center gap-1.5">
            <span>Canvas:</span>
            <button
              type="button"
              onClick={() => setPreviewBg('dark')}
              className={`w-4 h-4 rounded-full bg-slate-900 border ${
                previewBg === 'dark' ? 'ring-2 ring-primary' : 'border-slate-700'
              }`}
              title="Dark Background"
            />
            <button
              type="button"
              onClick={() => setPreviewBg('light')}
              className={`w-4 h-4 rounded-full bg-white border ${
                previewBg === 'light' ? 'ring-2 ring-primary' : 'border-slate-300'
              }`}
              title="Light Background"
            />
          </div>
        </div>

        <div
          className={`p-8 rounded-2xl border border-border flex items-center justify-center transition-colors ${
            previewBg === 'dark'
              ? 'bg-slate-950 text-white'
              : 'bg-slate-100 text-slate-900'
          }`}
        >
          {/* Simulated rendered badge visual */}
          <div className="inline-flex items-center gap-3 px-4 py-2.5 rounded-xl border border-border bg-surface shadow-md hover:scale-[1.02] transition-transform cursor-pointer">
            <div className="w-6 h-6 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-xs">
              LP
            </div>
            <div className="text-left">
              <span className="text-[10px] text-text-muted uppercase tracking-wider block font-semibold">
                Featured On
              </span>
              <span className="text-xs font-bold text-text-primary tracking-tight">
                LaunchProduct
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Embed Code Snippets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
        {/* Markdown Snippet */}
        <div className="p-4 rounded-2xl bg-bg border border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-primary" /> Markdown (README.md)
            </span>
            <button
              type="button"
              onClick={copyMarkdown}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary hover:text-text-primary px-2.5 py-1 rounded-lg border border-border bg-surface transition-colors focus-ring"
            >
              {copiedMd ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 text-slate-300 font-mono text-[11px] truncate select-all">
            {markdownSnippet}
          </div>
        </div>

        {/* HTML Snippet */}
        <div className="p-4 rounded-2xl bg-bg border border-border space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-primary flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5 text-emerald-500" /> HTML (&lt;a&gt; tag)
            </span>
            <button
              type="button"
              onClick={copyHtml}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-text-secondary hover:text-text-primary px-2.5 py-1 rounded-lg border border-border bg-surface transition-colors focus-ring"
            >
              {copiedHtml ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-900 text-slate-300 font-mono text-[11px] truncate select-all">
            {htmlSnippet}
          </div>
        </div>
      </div>
    </div>
  );
}
