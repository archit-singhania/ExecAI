"use client";


export function Logo({ size = 44 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="CEO.ai compass" className="shrink-0 text-accent">
      <rect x="2" y="2" width="60" height="60" rx="19" fill="currentColor" />
      <circle cx="32" cy="32" r="20" stroke="white" strokeOpacity=".38" strokeWidth="1.5" fill="none" />
      <path d="m40 18-4 18-18 10 10-18Z" fill="white" />
      <path d="m40 18 6 28-10-10Z" fill="white" fillOpacity=".48" />
      <circle cx="32" cy="32" r="3" fill="currentColor" />
    </svg>
  );
}
