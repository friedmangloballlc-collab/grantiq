// src/app/twitter-image.tsx
//
// Twitter/X card image. Uses the same design as the OG image —
// both are 1200×630 PNGs. Can't re-export the route segment config
// from another file (Next.js statically analyzes these exports),
// so we duplicate them here and import only the default component.

import OpenGraphImage from "./opengraph-image";

export const runtime = "edge";
export const alt = "GrantAQ — Find Grants You Actually Qualify For";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default OpenGraphImage;
