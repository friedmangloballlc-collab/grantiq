# Site Teardown: Novatus Global

**URL:** https://novatus.global/
**Platform:** WordPress 6.8.1 + custom theme (`novatus`)
**Date analyzed:** 2026-04-21

---

## Tech Stack (Confirmed from Source)

| Technology | Evidence | Purpose |
|---|---|---|
| **WordPress 6.8.1** | `<meta name="generator" content="WordPress 6.8.1" />`, `/wp-content/` paths | CMS backbone |
| **Custom theme "novatus"** | `wp-theme-novatus` body class, `/wp-content/themes/novatus/` | Theme layer |
| **Swiper.js** | `swiper-slider.min.js`, `.swiper-wrapper`, `.swiper-slide` classes | All carousels (logo ticker, cards, posts) |
| **Fancybox** | `.fancybox__container` CSS, `data-fancybox` attributes on mobile menu | Mobile menu modal, lightbox |
| **Rank Math SEO** | `class="rank-math-schema-pro"`, schema.org JSON-LD | SEO, structured data |
| **WP Rocket** | `RocketLazyLoadScripts`, `rocketlazyloadscript` types, rocket_pairs for lazy CSS bg | Performance (defer JS, lazy images, used-CSS) |
| **Google Tag Manager** | `gtag/js?id=G-GTFMMRNKSP` | Analytics |
| **No animation library** | No GSAP, no Framer, no Lottie in script loads | All animation is vanilla CSS/JS |

**Key insight:** This is a fully vanilla WP stack. No Next.js, no React, no framework-wrapped animations. The "premium" feel comes entirely from type + color discipline, not from libraries.

---

## Design System

### Colors

| Role | Value | Usage |
|---|---|---|
| Primary dark | `#0A2B36` | Title color, button fill, dark text |
| Text body | `#3A545E` | Body text (--text-color) |
| Text muted (70%) | `rgba(10,43,54,0.7)` | Secondary text, dates |
| Text muted (60%) | `rgba(10,43,54,0.6)` | Links, placeholder |
| Borders / dividers | `rgba(10,43,54,0.1)` | 1px section dividers |
| Background pale teal | `#F3F9FA` | Card background neutral |
| Background pale teal dark | `#D0E5EB` | Card hover state |
| **Accent orange** | `#FE5B00` | Button hover, link hover, arrows on hover |
| Accent link blue | `#396C7D` | Link hover (alternate to orange) |
| Green highlight | `#188967` | Icon accent (star in FAQ) |
| Green highlight soft | `#62B59C` | Secondary icon accent |
| Card accent — moss | `#F2F6EB` / `#454F2F` | Thematic card variation |
| Card accent — tan | `#FEF6EF` / `#805029` | Thematic card variation |
| Footer bg | `#0A2B36` | Dark footer |
| Footer muted text | `#9DAAAF` | Bottom copyright |
| Pure white | `#FFFFFF` | Hero text, button fg |

**Palette philosophy:** Warm desaturated teals as neutrals + one high-saturation orange as the single accent. The green (#188967) is reserved for decorative icons, not layout. This is a 60-30-10 distribution: 60% off-white/pale teal surfaces, 30% dark teal text/chrome, 10% orange accent.

### Typography

| Role | Font Family | Weight | Letter-spacing | Sizes |
|---|---|---|---|---|
| Display / Headings | **Neue Haas Grotesk Display Pro** | 400, 500 | −1.5px to −1.95px on H1/H2 | H1: `clamp(40px, 8vw, 91px)` |
| Display / H2 | Neue Haas Grotesk | 400 | −1.95px | `clamp(35px, 5vw, 53px)` |
| Display / H3 | Neue Haas Grotesk | 400 | default | `clamp(24px, 4vw, 48px)` |
| Body | **Inter** | 400, 500, 600 | default | 16px base, 14-18px variants |
| Mono | (none — not used) | | | |

**Font files (confirmed):**
- `Inter-Regular.woff2` / `-Medium.woff2` / `-SemiBold.woff2`
- `NeueHaasDisplay-Roman.woff2` / `-Mediu.woff2` (400 + 500)

**Typography rules:**
- Line-height 1.1 on display, 1.5 on body
- Tight negative letter-spacing on large headings (−1.95px on 69-91px text)
- `<strong>` inside headings bumps weight to 500 (not 700) — keeps an editorial feel
- Body paragraphs: margin-bottom 1.1rem except last-of-type
- No italics anywhere
- No all-caps display text; uppercase only in small labels and button text (with letter-spacing)

**This is a commercial font** — Neue Haas Grotesk Display Pro requires a license (~$500+ for web). Free close substitutes: Geist, Söhne (commercial), Satoshi, Hanken Grotesk.

### Spacing System

Uses a fluid approach:
- Section padding: `80px 0` desktop, `60px 0` at max-width 991px, `40px 0` at 767px
- Containers: `.container { padding: 0 20px; max-width: 1424px }` (wider than Tailwind default 1280px)
- Card padding: `34px 30px 30px` (intentionally slightly heavier on top)
- Button padding: `19px 22px` (larger than Tailwind sm/md), min-height 58px
- Border-radius: 8px buttons, 16px cards, 18px small pills

### Responsive Approach

| Breakpoint | Media query | What changes |
|---|---|---|
| Phone | `max-width: 575.98px` | Stack everything, shrink H1 to `clamp(30px, 9vw, 50px)`, section-padding 40px |
| Small tablet | `max-width: 767.98px` | H1 shrinks, button font drops to 16px, cards tighten |
| Tablet | `max-width: 991.98px` | Hero container stacks to vertical, cards grid flattens, mobile drawer for nav |
| Small laptop | `max-width: 1199.98px` | Desktop nav collapses to hamburger + Fancybox modal, sub-menus become accordion |
| XL desktop | `min-width: 1424px` | Container pushes to full 1424px |

**Mobile nav pattern:** Uses Fancybox to open a full-height modal drawer (max-width 400px) — not a slide-in from right, a centered modal with the whole nav tree.

---

## Effects Breakdown

| Effect | Implementation | Complexity | Cloneable? |
|---|---|---|---|
| Hero blur overlay | `hero-bg::after { background: rgba(10,43,54,0.3) }` on full-image bg + real team photo | Low | Yes (needs photo) |
| Hero "new" card with backdrop-blur | `.hero-card { background: rgba(255,255,255,0.3); backdrop-filter: blur(20px) }` | Low | Yes |
| Header glass effect | Fixed header with `.header_bg { background: rgba(255,255,255,0.4); backdrop-filter: blur(20px) }` | Low | Yes |
| Logo ticker infinite scroll | Swiper with `speed` linear timing + duplicated slides + transition-timing-function: linear | Low | Yes |
| Mega-dropdown nav | Hover `.menu-item-has-children` → `.sub-menu { opacity:1; transform: translateY(0) }` with backdrop-blur | Medium | Yes |
| Cards slider (horizontal carousel) | Swiper with `slidesPerView: auto`, per-card min-width | Medium | Yes |
| FAQ tabs + accordion | Tab buttons set `.active` on content block + individual items toggle `.active` class with `max-height: 2000px` transition | Medium | Yes (we already have this) |
| Button hover color swap | `transition: color .25s ease-out, background-color .25s ease-out, border-color .25s ease-out` — explicit list (not `transition-all`) | Low | Yes (already done) |
| Arrow icon in button | Inline SVG 18×18, white stroke, with `stroke` transition on hover | Low | Yes |
| Scroll-to-next indicator | Simple anchor link with icon, `position: absolute; bottom: -64px` | Low | Yes |
| "Scroll to next" chevron | Plain static SVG, no animation | Low | Yes |
| Post-card hover overlay reveal | `.info-button { opacity: 0 }` by default → `opacity: 1` on parent hover (absolute-positioned full-card overlay with "read post" button) | Low | Yes |
| Footer fluid gap | `.footer .container { gap: 80px }` → 60px at 1424px → 40px at 991px | Low | Yes |
| WP Rocket used-CSS | `<style id="wpr-usedcss">` inlines only the above-fold critical CSS, defers the rest | High (plugin) | N/A |
| Speculation Rules prefetch | `<script type="speculationrules">` — prefetches links on hover | Low (WP) | Yes (Next.js does this natively) |

---

## Implementation Details

### The hero glass card ("New in En:ACT: Benchmarking")

This is the most distinctive element on the page. Implementation:

```css
.hero-card {
  width: 100%;
  max-width: 420px;
  padding: 28px;
  border-radius: 16px;
  border: 1px solid rgba(255,255,255,0.3);
  background-color: rgba(255,255,255,0.3);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  font-size: 16px;
  line-height: 1.5;
  position: relative;
  z-index: 1;
}
.hero-card__title {
  font-size: 31px;
  padding-left: 36px; /* room for leading icon */
  position: relative;
}
.hero-card__title svg {
  height: 20px;
  width: 20px;
  position: absolute;
  left: 0;
  top: 50%;
  transform: translateY(-50%);
}
```

The card sits **on top of** the hero image (not beside it). The hero container is a `flex` with `gap: 50px` — on desktop the text takes `calc(100% - 470px)` and this card takes the remaining 420px. On mobile it stacks.

**Why it works:** The `backdrop-filter: blur(20px)` through 30%-opaque white gives the "frosted" look without requiring a photo with low-contrast background. It's legible over any hero image.

### The cards-slider horizontal carousel

Each card varies its own color palette via CSS custom properties set inline on the `<a>`:

```html
<a style="
  --cards-slider-item-color: #F2F6EB;
  --cards-slider-item-color-hover: #D9E3C2;
  --cards-slider-item-title-color: #454F2F;
">
```

Then:
```css
.cards-slider-carousel-item {
  background-color: var(--cards-slider-item-color, #f3f9fa);
  transition: background-color .25s ease-out;
}
.cards-slider-carousel-item:hover {
  background-color: var(--cards-slider-item-color-hover, #d0e5eb);
}
.cards-slider-carousel-item h3 {
  color: var(--cards-slider-item-title-color, rgba(10,43,54,0.8));
}
```

Six cards, three repeating palettes (pale teal, moss green, tan). Rotation keeps the carousel visually interesting without breaking brand.

### The FAQ-with-tabs accordion

Two-layer pattern:

1. **Tab layer:** `.tab-btn` buttons toggle `.active` class. Content blocks (`.faq-tab-content`) use `.active` to `display: block` (default `display: none`).
2. **Accordion layer inside each tab:** `.faq-item` has `.active` state that applies:
   - `padding-left: 56px` on the header (making room for the star icon to appear)
   - `opacity: 1` on `.icon_before` (star icon fades in from hidden state)
   - `opacity: 0` on `.icon_after` (plus icon fades out)
   - `max-height: 2000px` on `.faq-item-body` (was `0`, animates with `transition: max-height .6s ease-in-out`)

**The clever bit:** The header padding changes on open (0 → 56px), and the icon_before is absolute-positioned at `left: 0`. So opening the item literally slides the text right to make room for the star. More dynamic than a static [+] icon.

### The infinite logo ticker

```javascript
// Swiper config (inferred from .swiper-wrapper structure)
{
  loop: true,
  slidesPerView: "auto",
  speed: 5000,           // very slow
  autoplay: {
    delay: 0,            // no pause
    disableOnInteraction: false,
  },
  allowTouchMove: false,
}
```

Combined with CSS:
```css
.logo-ticker .swiper-wrapper {
  transition-timing-function: linear !important;
}
```

The `!important` forcing `linear` overrides Swiper's default `ease-out`, producing the constant-speed scroll instead of ease-in/ease-out slide. **This is the single most important line for the ticker feel.**

### Dropdown mega-menu

Pure CSS hover (no JS for desktop):

```css
.header-menu > li.menu-item-has-children > .sub-menu {
  position: absolute;
  top: 100%;
  left: 0;
  width: max-content;
  padding-top: 42px;        /* creates invisible gap between trigger and panel */
  opacity: 0;
  transform: translateY(20px);
  visibility: hidden;
  pointer-events: none;
  transition: opacity .25s ease-out, transform .25s ease-out;
}
.header-menu > li.menu-item-has-children:hover > .sub-menu,
.header-menu > li.menu-item-has-children:focus-within > .sub-menu {
  opacity: 1;
  transform: translateY(0);
  visibility: visible;
  pointer-events: auto;
}
.sub-menu_wrapper {
  background: rgba(255,255,255,0.8);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(10,43,54,0.1);
  border-radius: 16px;
  padding: 32px 32px 36px;
}
```

The `padding-top: 42px` on the sub-menu is key — it creates a hoverable bridge between the trigger and the panel so the panel doesn't close when the cursor moves down to it. Classic pattern done right.

### Post card hover reveal

```css
.post-item .info-button {
  position: absolute;
  top: 0; left: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
  transition: opacity .25s ease-out;
  z-index: 1;
}
.post-item:hover .info-button {
  opacity: 1;
  pointer-events: auto;
  visibility: visible;
}
.post-item .info-button .btn {
  width: 100%;
  height: 100%;   /* fills the entire card */
  min-height: 98px;
}
```

On hover, a full-card-sized dark button fades in ABOVE the title/excerpt. The button covers everything, so clicking anywhere on the card = clicking "read post." Touchpad-friendly and preserves readability.

---

## Assets Needed to Recreate

1. **Hero lifestyle photo** — Real team shot in an office setting (2560×1366). Source: custom photoshoot ($500-2000). Alternative: curated Unsplash search for "office meeting diverse team" filtered to editorial.

2. **Client logos** (16 SVG logos in the ticker + 5 award logos) — These are real financial services firms. **Cannot clone without their permission.** For your version: either wait for real customers or use generic industry indicators instead.

3. **Cards-slider icon set** — 6 thematic SVG icons (file-upload, audit, shield, delegation, testing, back-reporting). Stroke-based, 40×40, single color. Source: Heroicons, Lucide, or hand-drawn for uniqueness.

4. **Star accent SVG** — The 8-point star icon used on hero card title and FAQ active-item indicator. Simple SVG, 21×21, single-color fill. Could be recreated in 10 minutes.

5. **CTA background video** — Looping video background for the "Join the many firms" CTA. Source: custom B-roll or curated Pexels stock video.

6. **ISO 27001 certificate image** — Compliance badge in footer. GrantIQ equivalent would be SOC 2 once certified; skip for now.

7. **Blog post thumbnails** — 6 generated graphics for insights carousel. Source: Figma templates + brand photography.

---

## Build Plan

### What Transfers to GrantIQ (ranked)

| Priority | Pattern | Effort | Why |
|---|---|---|---|
| 🟢 High | **Hero glass card** (floating announcement card) | ~30 min | Perfect for "New: AI Writing Tier 3 launched" callouts. Signals product momentum. |
| 🟢 High | **Cards-slider multi-palette pattern** (each card gets its own color tokens via inline CSS variables) | ~45 min | We already have a grant-category chip system; can extend to give each card section its own warm palette variation |
| 🟢 Medium | **Hover-reveal full-card button** on post/grant cards (`info-button` absolute overlay pattern) | ~15 min | Improves our grant-card click affordance on the marquee + grant-directory pages |
| 🟡 Low | **Post-card grid for /insights or /blog** | Depends on content | Only worth it when we have 6+ real posts |
| 🟡 Low | Dropdown mega-menu | — | Rejected earlier — we have 5 nav items, don't need this |
| 🔴 Skip | Lifestyle hero photo | — | No real team photo available; stock = generic |
| 🔴 Skip | Client logo bar | — | No real customers yet |
| 🔴 Skip | Awards ticker | — | No real awards |
| 🔴 Skip | CTA with video background | — | Bandwidth cost vs. marginal lift; your CTAs are fine as text |
| 🔴 Skip | Commercial Neue Haas Grotesk font | — | $500+ license; Geist (free) is close enough |

### Recommended Implementation Order

If you want to adopt anything from this teardown, the ranked moves:

**Move 1: Hero glass announcement card** (30 min)
Add a floating card to the right of your hero text containing "New in GrantIQ" style product updates. When Tier 3 launches, when Outcome Learner hits N learnings, when a new feature ships. This is evergreen real estate for your own product announcements.

**Move 2: Per-card palette variation on the Capabilities accordion** (45 min)
Right now your capabilities accordion uses a single color scheme across all items. Novatus varies subtly between pale teal, moss green, and tan. Introduce 3 palette variants and cycle them across the 9 items.

**Move 3: Hover-reveal button on marquee grant cards** (15 min)
Your marquee cards already hover; adding a subtle "View Grant →" full-card button that fades in on hover gives clearer click affordance for first-time visitors.

**Skip moves 4+.** Everything else either duplicates what you have (capabilities accordion ≈ faq-with-tabs), requires assets you don't have (real logos, photos, videos), or would regress brand (commercial fonts, dark hero).

---

## Notes

- **The premium feel is 90% typography + color discipline.** Novatus uses one commercial font pair, one accent color, and lots of whitespace. Their animation budget is near-zero — no GSAP, no scroll-scrubbing, just CSS transitions. This is a reminder that "premium B2B" does NOT require elaborate motion.

- **Their nav has 24+ items** in dropdowns. They can pull this off because they have ~50 service pages and thousands of indexed content pieces. Do not replicate this structure until you have the same depth of content.

- **They use backdrop-filter: blur(20px) on three surfaces** (hero card, header, mega-menu). This is their signature. Worth considering as a signature for GrantIQ.

- **Performance:** WP Rocket inlines used-CSS, defers all JS, lazy-loads images below the fold. Next.js gives you most of this for free, but note that their approach is to **aggressively defer** — nothing above the fold should block render.

- **Critical insight for GrantIQ:** This teardown confirms we made the right call rejecting the Aixora dark/neon direction. Novatus is the right neighborhood. The gap between your current site and Novatus is now mostly: (a) a real lifestyle photo (customer ask), (b) real client logos (post-PMF), (c) 3-5 real case studies (post-PMF). All of those require real customers, not more code.

---

## Application to GrantIQ — Honest Recommendation

The genuinely valuable takeaways from this teardown are:
1. The **glass announcement card** pattern (doable today, high ROI)
2. The **per-card palette variation** pattern (doable today, aesthetic lift)
3. The **hover-reveal card button** pattern (15-min addition, conversion lift)

Everything else either requires assets you don't have or duplicates work we've done.

**My recommendation:** Build items 1-3 as a single focused pass (~90 min total), then stop polishing and run the $249 Stripe test. The rest of this teardown is a reference for when you have real customers and can populate the photo/logo slots with truth.
