/**
 * ScorpionLogo — renders the brand logo.
 * Falls back gracefully through SVG → PNG → text.
 */
import React from 'react';

interface ScorpionLogoProps {
  /** Tailwind height class, e.g. "h-10" */
  heightClass?: string;
  /** Extra className on the wrapper */
  className?: string;
}

export default function ScorpionLogo({ heightClass = 'h-10', className = '' }: ScorpionLogoProps) {
  return (
    <img
      src="/scorpion-logo.svg"
      alt="Scorpion"
      className={`${heightClass} w-auto object-contain ${className}`}
      onError={(e) => {
        const img = e.currentTarget as HTMLImageElement;
        if (img.src.endsWith('.svg')) {
          img.src = '/scorpion-logo.png';
        } else {
          img.style.display = 'none';
          const fallback = img.nextElementSibling as HTMLElement | null;
          if (fallback) fallback.style.display = 'flex';
        }
      }}
    />
  );
}

/** Compact text fallback used when the image cannot load */
export function ScorpionTextFallback() {
  return (
    <div className="flex items-center gap-1">
      <span className="text-white font-bold text-xl tracking-tight">Scorpion</span>
      <span className="text-white/60 text-xs font-semibold uppercase tracking-widest">VMS</span>
    </div>
  );
}
