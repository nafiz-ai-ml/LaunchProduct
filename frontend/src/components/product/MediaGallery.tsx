'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Maximize2,
  X,
  Image as ImageIcon,
} from 'lucide-react';

interface MediaGalleryProps {
  screenshots?: string[];
  bannerUrl?: string;
  productName: string;
}

export function MediaGallery({ screenshots = [], bannerUrl, productName }: MediaGalleryProps) {
  // Combine banner and screenshots into unified image list
  const allImages = React.useMemo(() => {
    const list: string[] = [];
    if (bannerUrl && !list.includes(bannerUrl)) {
      list.push(bannerUrl);
    }
    screenshots.forEach((s) => {
      if (s && !list.includes(s)) {
        list.push(s);
      }
    });
    return list;
  }, [bannerUrl, screenshots]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [imageErrors, setImageErrors] = useState<Record<number, boolean>>({});
  const lightboxRef = useRef<HTMLDivElement>(null);

  const hasImages = allImages.length > 0;
  const currentImage = hasImages ? allImages[activeIndex] : null;

  const nextImage = useCallback(() => {
    if (!hasImages) return;
    setActiveIndex((prev) => (prev + 1) % allImages.length);
  }, [hasImages, allImages.length]);

  const prevImage = useCallback(() => {
    if (!hasImages) return;
    setActiveIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  }, [hasImages, allImages.length]);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsLightboxOpen(false);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        nextImage();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevImage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, nextImage, prevImage]);

  if (!hasImages) {
    return (
      <div className="w-full h-72 sm:h-96 rounded-2xl bg-surface border border-border flex flex-col items-center justify-center text-text-muted p-6 text-center">
        <ImageIcon className="w-12 h-12 mb-3 opacity-40 text-text-muted" />
        <p className="text-sm font-medium">No screenshots uploaded for this launch</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Preview Container */}
      <div className="relative group w-full aspect-[16/9] sm:aspect-[16/10] max-h-[520px] rounded-2xl border border-border overflow-hidden bg-slate-950 shadow-card">
        {currentImage && !imageErrors[activeIndex] ? (
          <img
            src={currentImage}
            alt={`${productName} screenshot ${activeIndex + 1}`}
            className="w-full h-full object-contain cursor-pointer transition-transform duration-200"
            onClick={() => setIsLightboxOpen(true)}
            onError={() => {
              setImageErrors((prev) => ({ ...prev, [activeIndex]: true }));
            }}
          />
        ) : (
          <div
            onClick={() => setIsLightboxOpen(true)}
            className="w-full h-full flex flex-col items-center justify-center p-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white cursor-pointer select-none"
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-4 text-blue-400">
              <ImageIcon className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">{productName} Interface Preview</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm text-center">
              Interactive cloud workspace &amp; production telemetry view. Click to expand full-screen lightbox.
            </p>
            <div className="mt-6 flex items-center gap-3 text-xs font-mono text-slate-400">
              <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700">1920 × 1080</span>
              <span className="px-2.5 py-1 rounded bg-slate-800 border border-slate-700">Edge Optimized</span>
            </div>
          </div>
        )}

        {/* Zoom Lightbox Trigger Button */}
        <button
          type="button"
          onClick={() => setIsLightboxOpen(true)}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity shadow-md focus-ring"
          title="Full-screen Lightbox"
          aria-label="Full-screen Lightbox"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Carousel Arrow Buttons (If more than 1 image) */}
        {allImages.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity shadow-md focus-ring"
              aria-label="Previous screenshot"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-slate-900/70 hover:bg-slate-900 text-white backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity shadow-md focus-ring"
              aria-label="Next screenshot"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Image Counter Badge */}
        {allImages.length > 1 && (
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-slate-900/80 text-white text-[11px] font-mono backdrop-blur-sm">
            {activeIndex + 1} / {allImages.length}
          </div>
        )}
      </div>

      {/* Thumbnail Strip */}
      {allImages.length > 1 && (
        <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-none">
          {allImages.map((img, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveIndex(idx)}
              className={`relative w-20 sm:w-24 aspect-[16/10] rounded-xl overflow-hidden border-2 shrink-0 transition-motion-fast focus-ring ${
                activeIndex === idx
                  ? 'border-primary ring-2 ring-primary/20 scale-102'
                  : 'border-border opacity-70 hover:opacity-100'
              }`}
            >
              <img
                src={img}
                alt={`${productName} thumbnail ${idx + 1}`}
                className="w-full h-full object-cover"
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && currentImage && (
        <div
          ref={lightboxRef}
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} image gallery lightbox`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 sm:p-8 animate-in fade-in duration-200"
        >
          {/* Close button */}
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-6 right-6 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors focus-ring"
            title="Close Lightbox (Esc)"
            aria-label="Close Lightbox"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation */}
          {allImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevImage}
                className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors focus-ring"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                type="button"
                onClick={nextImage}
                className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors focus-ring"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </>
          )}

          {/* Image Container */}
          <div className="max-w-6xl max-h-[85vh] flex flex-col items-center">
            <img
              src={currentImage}
              alt={`${productName} full preview`}
              className="max-w-full max-h-[80vh] object-contain rounded-xl shadow-2xl"
            />
            <div className="mt-4 text-xs font-mono text-slate-300">
              {productName} — Image {activeIndex + 1} of {allImages.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MediaGallery;
