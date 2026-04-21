// src/components/ui/logo-cloud-3.tsx
//
// Edge-faded scrolling logo cloud. Accepts either image logos (via src)
// or text-only labels (via label) — text labels are important for us
// because most of our trust sources (IRS, SAM.gov, Grants.gov) don't
// have clean brand SVGs we can legally hotlink.

import { InfiniteSlider } from "@/components/ui/infinite-slider";
import { cn } from "@/lib/utils";

export type LogoCloudItem =
  | {
      kind: "image";
      src: string;
      alt: string;
      width?: number;
      height?: number;
    }
  | {
      kind: "label";
      label: string;
    };

type LogoCloudProps = React.ComponentProps<"div"> & {
  logos: LogoCloudItem[];
  /** Animation duration in seconds. Defaults to 40. */
  speed?: number;
  /** Slow-down duration when hovered. Defaults to 80. */
  speedOnHover?: number;
  /** Scroll right-to-left by default; set true for the opposite. */
  reverse?: boolean;
};

export function LogoCloud({
  className,
  logos,
  speed = 40,
  speedOnHover = 80,
  reverse = false,
  ...props
}: LogoCloudProps) {
  return (
    <div
      {...props}
      className={cn(
        "overflow-hidden py-4 [mask-image:linear-gradient(to_right,transparent,black,transparent)]",
        className
      )}
    >
      <InfiniteSlider
        gap={42}
        reverse={reverse}
        speed={speed}
        speedOnHover={speedOnHover}
      >
        {logos.map((logo, i) =>
          logo.kind === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element -- intentional: logo images may be hotlinked from 3rd-party CDNs (svgl.app, etc.) and require remote-pattern whitelist to use next/image; plain <img> is acceptable for lazy-loaded logo strips
            <img
              key={`logo-${logo.alt}-${i}`}
              alt={logo.alt}
              className="pointer-events-none h-5 md:h-6 select-none opacity-70 hover:opacity-100 transition-opacity dark:brightness-0 dark:invert"
              height={logo.height || "auto"}
              loading="lazy"
              src={logo.src}
              width={logo.width || "auto"}
            />
          ) : (
            <span
              key={`label-${logo.label}-${i}`}
              className="inline-flex items-center text-sm md:text-base font-semibold uppercase tracking-[0.15em] text-warm-500 dark:text-warm-400 whitespace-nowrap"
            >
              {logo.label}
            </span>
          )
        )}
      </InfiniteSlider>
    </div>
  );
}
