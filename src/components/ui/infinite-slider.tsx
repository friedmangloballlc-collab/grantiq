// src/components/ui/infinite-slider.tsx
//
// CSS-only infinite horizontal scroller. Same API surface as the
// framer-motion version the shadcn-style spec ships, but implemented
// with a @keyframes + duplicated children so we don't need to bundle
// framer-motion (~50KB) and react-use-measure just for a marquee.
//
// Hover-pause and reduced-motion are honored via the `.infinite-slider`
// CSS rule in globals.css (already present for the grant marquee).

import { cn } from "@/lib/utils";

interface InfiniteSliderProps {
  children: React.ReactNode;
  gap?: number;
  /** Seconds to complete one full loop at rest. */
  speed?: number;
  /** Seconds to complete one full loop while hovered (faster = lower). */
  speedOnHover?: number;
  /** Reverse direction (right-to-left → left-to-right). */
  reverse?: boolean;
  className?: string;
}

export function InfiniteSlider({
  children,
  gap = 16,
  speed = 25,
  speedOnHover,
  reverse = false,
  className,
}: InfiniteSliderProps) {
  // Expose hover + rest durations to CSS via custom properties.
  const style = {
    "--marquee-gap": `${gap}px`,
    "--marquee-duration": `${speed}s`,
    "--marquee-duration-hover": speedOnHover ? `${speedOnHover}s` : `${speed}s`,
    "--marquee-direction": reverse ? "reverse" : "normal",
  } as React.CSSProperties;

  return (
    <div className={cn("overflow-hidden", className)} style={style}>
      <div
        className="flex w-max infinite-slider-track"
        style={{ gap: `${gap}px` }}
      >
        <div className="flex shrink-0" style={{ gap: `${gap}px` }}>
          {children}
        </div>
        <div
          className="flex shrink-0"
          style={{ gap: `${gap}px` }}
          aria-hidden="true"
        >
          {children}
        </div>
      </div>
    </div>
  );
}
