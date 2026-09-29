# LaunchProduct — UI/UX Design System Specification (`UI-UX.md`)

**Document Version:** 2.0.0 (Updated Brand Identity & Ultra-Clean System)  
**Status:** Approved Single Source of Truth  
**Target Architecture:** Next.js 14+ (App Router) + TypeScript + Tailwind CSS / CSS Variables  
**Primary Brand:** **LaunchProduct**  
**Official Typeface:** **Codec Pro** (Pairings: Plus Jakarta Sans, Inter)  
**Primary Brand Color:** **#ff751f** (Warm Sunset Tangerine)  
**Date:** September 29, 2026  

---

## Table of Contents

1. [Document Purpose](#1-document-purpose)
2. [Brand Identity](#2-brand-identity)
3. [Brand Personality](#3-brand-personality)
4. [Logo System](#4-logo-system)
5. [Typography](#5-typography)
6. [Color System](#6-color-system)
7. [Design Tokens](#7-design-tokens)
8. [Spacing System](#8-spacing-system)
9. [Layout & Grid](#9-layout--grid)
10. [Border Radius](#10-border-radius)
11. [Shadows & Elevation](#11-shadows--elevation)
12. [Iconography](#12-iconography)
13. [Buttons](#13-buttons)
14. [Form Controls](#14-form-controls)
15. [Cards](#15-cards)
16. [Badges & Status Indicators](#16-badges--status-indicators)
17. [Navigation](#17-navigation)
18. [Tables](#18-tables)
19. [Modals / Dialogs](#19-modals--dialogs)
20. [Toasts / Notifications](#20-toasts--notifications)
21. [Loading States](#21-loading-states)
22. [Empty States](#22-empty-states)
23. [Error States](#23-error-states)
24. [Product Discovery UX](#24-product-discovery-ux)
25. [Product Detail UX](#25-product-detail-ux)
26. [Leaderboard UX](#26-leaderboard-ux)
27. [Category UX](#27-category-ux)
28. [Product Submission UX](#28-product-submission-ux)
29. [Authentication UX](#29-authentication-ux)
30. [Founder Dashboard UX](#30-founder-dashboard-ux)
31. [Campaign UX](#31-campaign-ux)
32. [Analytics UX](#32-analytics-ux)
33. [Admin / Moderation UX](#33-admin--moderation-ux)
34. [Responsive Design](#34-responsive-design)
35. [Accessibility](#35-accessibility)
36. [SEO / Social Sharing UI](#36-seo--social-sharing-ui)
37. [Component Architecture](#37-component-architecture)
38. [Motion & Interaction](#38-motion--interaction)
39. [Dark/Light Theme Strategy](#39-darklight-theme-strategy)
40. [UX Consistency Rules](#40-ux-consistency-rules)
41. [Implementation Notes](#41-implementation-notes)

---

## 1. Document Purpose

This document serves as the **definitive, immutable single source of truth** for all visual design tokens, component interactions, user experience patterns, layout rules, and accessibility standards for the **LaunchProduct** platform.

It is structured specifically for frontend engineers, UI designers, and automated AI coding agents building the Next.js presentation layer. Every color value, typography scale, component state, layout breakpoint, and page flow specified herein must be strictly adhered to without ad-hoc deviation or unapproved design experimentation.

---

## 2. Brand Identity

### 2.1 Brand Name
- **Canonical Brand Name:** `LaunchProduct`
- **Domain Names:** `launchproduct.io` (Public Web / Marketing), `api.launchproduct.io` (Authoritative REST API), `docs.launchproduct.io` (Documentation), `assets.launchproduct.io` (Static & Uploaded Assets)
- **Tagline:** *"The High-Integrity Product Discovery & Growth Platform"*
- **Mission:** Democratizing launch distribution and authentic early traction for indie founders, AI builders, and developer tool creators through transparent, fraud-resilient community rankings and measurable promotion.

### 2.2 Dual-Engine Brand Architecture
LaunchProduct operates on two structurally isolated engines that must be visually transparent across the user interface:
1. **Organic Discovery Engine:** Driven by authenticated community votes, verified reviews, qualified organic outbound clicks, and multi-signal fraud scoring. Organic leaderboard positions can never be purchased.
2. **Sponsored Distribution Engine:** Fixed-inventory, clearly demarcated promotional placements (Launch Day Boosts, Category Spotlight, Homepage Hero). Sponsored items are explicitly labeled with amber/gold badges and distinct visual card styling, ensuring users never mistake paid exposure for organic rank.

---

## 3. Brand Personality

LaunchProduct's visual tone is **technical, authoritative, trustworthy, energetic, and clean**.

| Trait | How We Express It | What We Avoid |
| :--- | :--- | :--- |
| **Trust & Authority** | Crisp geometric borders, high contrast ratios ($\ge 4.5:1$), immutable snapshot badges, clear data attribution. | Shady countdown timers, fake social proof popups, pay-to-win auctions. |
| **Builder-Centric** | Compact technical information density, structured metadata tags (Tech Stack, Pricing, Category), keyboard shortcuts. | Fluffy marketing buzzwords, childish illustration styles, over-animated meme gifs. |
| **Growth & Momentum** | Vibrant Sunset Tangerine accents (`#ff751f`), subtle upward movement indicators, active launch counters. | Casino gamification, gambling aesthetic, aggressive coin/token graphics. |
| **Clarity & Focus** | Disciplined whitespace, generous typography line-heights, restrained single-purpose action buttons. | Visual clutter, rainbow color schemes, crowded banner ads, auto-playing media. |

---

## 4. Logo System

The official LaunchProduct logo assets have been finalized and organized into the `/public/brand/` directory. No redesigning, recoloring, or arbitrary aspect ratio distortion is permitted.

### 4.1 Asset Inventory & Directory Structure

All logo assets originate from the finalized package and are located in `public/brand/`:

```
public/brand/
├── logo/
│   ├── primary-horizontal.png        (1130 × 230 px, Aspect Ratio: 4.91)
│   ├── wordmark.png                  (460 × 195 px, Aspect Ratio: 2.36)
│   ├── logo-light.png                (345 × 195 px, Aspect Ratio: 1.77, for light backgrounds)
│   ├── logo-dark.png                 (400 × 205 px, Aspect Ratio: 1.95, for dark backgrounds)
│   ├── logo-monochrome-black.png     (345 × 195 px, Aspect Ratio: 1.77, 100% solid black)
│   └── logo-monochrome-white.png     (340 × 205 px, Aspect Ratio: 1.66, 100% solid white)
├── icon/
│   ├── icon.png                      (220 × 200 px, Aspect Ratio: 1.10, standalone icon)
│   └── app-icon.png                  (215 × 210 px, Aspect Ratio: 1.02, rounded square app icon)
└── favicon/
    └── favicon.png                   (160 × 190 px, Aspect Ratio: 0.84, browser tab favicon)
```

*(Note: Original prefixed files `01_primary_horizontal.png` through `09_monochrome_white.png` are also preserved alongside these semantic paths).*

### 4.2 Logo Variants & Specific Usage Matrix

| Variant | Filename / Path | Recommended Placement | Min Usable Width | Background Requirement |
| :--- | :--- | :--- | :--- | :--- |
| **Light Theme Logo** | `/brand/logo/light_theme_logo.png` | Light mode desktop navigation, white surfaces, export badges | 140px | Light background (`#FFFFFF`, `#FFFBFA`) |
| **Dark Theme Logo** | `/brand/logo/dark_theme_logo.png` | Dark mode desktop navigation, dark marketing headers | 140px | Dark surfaces (`#000000`, `#0D0C0B`) |
| **Light Wordmark** | `/brand/logo/light_theme_wordmark_only.png` | Light mode footer branding, clean editorial layouts | 100px | Clean light surface |
| **Dark Wordmark** | `/brand/logo/dark_theme_wordmark_only.png` | Dark mode footer branding, hero badges | 100px | Dark solid background |
| **Light Theme Icon** | `/brand/icon/Light Theme Icon Only.png` | Light mode mobile navigation, avatars, compact triggers | 28px | Light surface |
| **Dark Theme Icon** | `/brand/icon/Dark Theme Icon Only.png` | Dark mode mobile navigation, dark avatars | 28px | Dark surface |
| **Favicon** | `/brand/favicon/Favicon.png` | Browser tab icon, bookmark bar, URL previews | 32px | Browser-rendered |

### 4.3 Clear Space & Sizing Rules
- **Clear Space:** The minimum clear space surrounding any logo instance must equal **50% of the icon height** ($0.5 \times H_{\text{icon}}$) on all four sides. No text, icons, buttons, or container borders may encroach into this perimeter.
- **Aspect Ratio Locking:** All logo rendering must use `object-fit: contain` with strictly locked aspect ratios. Never apply separate arbitrary CSS `width` and `height` without maintaining the natural ratio.

### 4.4 Prohibited Logo Treatments
- ❌ **Do not** stretch, skew, compress, or rotate the logo.
- ❌ **Do not** recolor the logo icon or wordmark with non-brand gradients or fills.
- ❌ **Do not** add heavy drop shadows, neon strokes, or bevel effects to the logo.
- ❌ **Do not** place the light-background logo onto dark backgrounds or vice-versa.

---

## 5. Typography

The official primary typeface for LaunchProduct is **Codec Pro**, paired seamlessly with **Plus Jakarta Sans** and **Inter** for optimal rendering across all operating systems.

### 5.1 Font Family & Fallback Stack

```css
/* Official Typeface Definition */
--font-primary: 'Codec Pro', 'Plus Jakarta Sans', Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', Menlo, Monaco, Consolas, monospace;
```

### 5.2 Type Scale & Hierarchy

Every text element in LaunchProduct must map to the standardized typographical scale:

| Level | Size (rem / px) | Weight | Line Height | Letter Spacing | CSS / Tailwind Class | Application |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | 3.5rem (56px) | 800 (ExtraBold)| 1.15 (64px) | -0.025em (-1.4px) | `text-5xl sm:text-6xl font-extrabold tracking-tight` | Marketing Hero Headline |
| **H1** | 2.5rem (40px) | 700 (Bold) | 1.20 (48px) | -0.020em (-0.8px) | `text-4xl font-bold tracking-tight` | Page Titles (Leaderboard, Product Detail) |
| **H2** | 1.875rem (30px)| 700 (Bold) | 1.25 (38px) | -0.015em (-0.45px)| `text-3xl font-bold tracking-tight` | Section Headers, Dashboard Titles |
| **H3** | 1.5rem (24px)  | 600 (SemiBold)| 1.30 (32px) | -0.010em (-0.24px)| `text-2xl font-semibold` | Card Titles, Modal Headers, Sub-sections |
| **H4** | 1.25rem (20px) | 600 (SemiBold)| 1.40 (28px) | 0.000em | `text-xl font-semibold` | Component Group Headers, Table Titles |
| **Body Large** | 1.125rem (18px)| 400 / 500 | 1.55 (28px) | 0.000em | `text-lg font-normal` | Product Hero Taglines, Lead Paragraphs |
| **Body (Base)**| 1.0rem (16px)  | 400 (Regular) | 1.50 (24px) | 0.000em | `text-base font-normal` | Main Body Text, Descriptions, Reviews |
| **Body Small** | 0.875rem (14px)| 400 / 500 | 1.45 (20px) | 0.000em | `text-sm font-normal` | Table Cells, Form Inputs, Card Subtext |
| **Caption** | 0.75rem (12px) | 500 (Medium)  | 1.40 (16px) | +0.010em (+0.12px)| `text-xs font-medium` | Timestamps, Metadata, Fine Print |
| **Button** | 0.875rem (14px)| 600 (SemiBold)| 1.00 (14px) | +0.010em (+0.14px)| `text-sm font-semibold` | Primary & Secondary Button Labels |
| **Nav Link** | 0.9375rem (15px)| 500 (Medium)| 1.20 (18px) | 0.000em | `text-[15px] font-medium` | Header Navigation Links, Tab Labels |
| **Ranking Num**| 1.25rem (20px) | 800 (ExtraBold)| 1.00 (20px) | -0.020em | `text-xl font-extrabold font-mono` | Leaderboard #1-#100 Rank Indicators |

---

## 6. Color System

The LaunchProduct color system is built directly from the high-energy sunset brand palette and structured into semantic tokens that support high-contrast light and dark modes.

### 6.1 Brand Identity Colors

- **LaunchProduct Sunset Tangerine (Main):** `#ff751f` (RGB: 255, 117, 31 / HSL: 23°, 100%, 56%) — High-energy vibrant amber-orange representing product momentum, innovation, and standout community visibility.
- **Warm Canvas White:** `#fffbfa` (RGB: 255, 251, 250) — Soft warm cream foundation providing soothing readability, eliminating sterile clinic white.
- **Obsidian Pitch Black:** `#000000` / `#0D0C0B` (RGB: 13, 12, 11) — Deep rich grounding dark surface representing modern premium depth.

### 6.2 Semantic Color Tokens (Light & Dark Mode)

```css
:root {
  /* Brand Tokens (Warm Sunset Palette) */
  --color-primary: #ff751f;
  --color-primary-hover: #e66210;
  --color-primary-active: #cb520a;
  --color-primary-subtle: #fff4ed;
  --color-primary-focus: rgba(255, 117, 31, 0.35);

  --color-secondary: #0D0C0B;
  --color-secondary-hover: #1F1D1B;

  /* Surfaces & Backgrounds (Light) */
  --color-bg: #fffbfa;               /* Warm Cream: Main Canvas */
  --color-surface: #FFFFFF;          /* Pure White: Cards, Panels */
  --color-surface-elevated: #FFFFFF; /* Modals, Menus */
  --color-surface-sunken: #F7F2EF;   /* Soft warm grey: Code blocks, wells */

  /* Text Tokens (Light) */
  --color-text-primary: #181513;     /* Near Black: High-contrast primary */
  --color-text-secondary: #57524E;   /* Warm Stone: Descriptions, subheads */
  --color-text-muted: #A8A29E;       /* Stone-400: Placeholders, disabled */
  --color-text-inverted: #FFFFFF;    /* Text on primary buttons */

  /* Borders & Dividers (Light) */
  --color-border: #EFE8E4;           /* Warm Stone: Default card borders */
  --color-border-subtle: #F7F2EF;    /* Inner dividers */
  --color-border-hover: #DDD4CF;     /* Card hover border */

  /* Feedback & Status */
  --color-success: #10B981;          /* Emerald-500: Valid votes, claims */
  --color-success-bg: #ECFDF5;
  --color-success-border: #A7F3D0;

  --color-warning: #F59E0B;          /* Amber-500: Flagged review, warnings */
  --color-warning-bg: #FFFBEB;
  --color-warning-border: #FDE68A;

  --color-error: #EF4444;            /* Red-500: Quarantined, errors, bans */
  --color-error-bg: #FEF2F2;
  --color-error-border: #FECACA;

  --color-info: #ff751f;             /* Sunset orange for info */
  --color-info-bg: #fff4ed;
  --color-info-border: #fed7aa;

  /* Sponsored / Promotion Demarcation */
  --color-sponsored-badge: #C2410C;  /* Orange-700 */
  --color-sponsored-bg: #FFF7ED;     /* Warm Orange Tint */
  --color-sponsored-border: #FDBA74; /* Orange-300 */
}

.dark {
  /* Brand Tokens (Dark Mode) */
  --color-primary: #ff751f;
  --color-primary-hover: #ff853a;
  --color-primary-active: #e66210;
  --color-primary-subtle: rgba(255, 117, 31, 0.15);
  --color-primary-focus: rgba(255, 117, 31, 0.40);

  --color-secondary: #FAFAF9;
  --color-secondary-hover: #E7E5E4;

  /* Surfaces & Backgrounds (Dark) */
  --color-bg: #0D0C0B;               /* Deep Obsidian Warm Black */
  --color-surface: #181615;          /* Warm Charcoal: Primary Cards */
  --color-surface-elevated: #22201D; /* Modals, Popovers */
  --color-surface-sunken: #080706;   /* Recessed Wells */

  /* Text Tokens (Dark) */
  --color-text-primary: #FAFAF9;     /* Warm White */
  --color-text-secondary: #A8A29E;   /* Warm Gray */
  --color-text-muted: #78716C;       /* Stone-500 */
  --color-text-inverted: #0D0C0B;

  /* Borders & Dividers (Dark) */
  --color-border: #292524;           /* Warm Dark Border */
  --color-border-subtle: #1C1917;
  --color-border-hover: #334155;     /* Slate-700 */

  /* Feedback & Status (Dark) */
  --color-success: #10B981;
  --color-success-bg: rgba(16, 185, 129, 0.12);
  --color-success-border: rgba(16, 185, 129, 0.30);

  --color-warning: #F59E0B;
  --color-warning-bg: rgba(245, 158, 11, 0.12);
  --color-warning-border: rgba(245, 158, 11, 0.30);

  --color-error: #EF4444;
  --color-error-bg: rgba(239, 68, 68, 0.12);
  --color-error-border: rgba(239, 68, 68, 0.30);

  --color-info: #3B82F6;
  --color-info-bg: rgba(59, 130, 246, 0.12);
  --color-info-border: rgba(59, 130, 246, 0.30);

  /* Sponsored / Promotion Demarcation (Dark) */
  --color-sponsored-badge: #FBBF24;
  --color-sponsored-bg: rgba(245, 158, 11, 0.06);
  --color-sponsored-border: rgba(245, 158, 11, 0.25);
}
```

---

## 7. Design Tokens

The complete design token dictionary bridges CSS custom properties with Tailwind utility conventions.

| Token Category | Token Variable | Value / Meaning |
| :--- | :--- | :--- |
| **Max Widths** | `--container-sm` | `640px` (Compact form pages, auth modals) |
| | `--container-md` | `768px` (Article, legal terms, documentation) |
| | `--container-lg` | `1024px` (Product detail hero, founder dashboard) |
| | `--container-xl` | `1280px` (Standard desktop content width) |
| | `--container-2xl` | `1440px` (Wide leaderboard & analytics view) |
| **Breakpoints** | `sm:` | `640px` (Mobile landscape / small tablets) |
| | `md:` | `768px` (Tablets / medium screens) |
| | `lg:` | `1024px` (Laptops / standard desktop) |
| | `xl:` | `1280px` (Large desktop monitors) |
| | `2xl:`| `1536px` (Ultra-wide displays) |
| **Z-Index Scale** | `--z-hide` | `-1` |
| | `--z-base` | `0` |
| | `--z-card` | `10` |
| | `--z-header` | `100` (Sticky top navigation bar) |
| | `--z-drawer` | `200` (Mobile navigation drawer) |
| | `--z-modal` | `300` (Dialog backdrops & modals) |
| | `--z-toast` | `400` (Notification toasts) |
| | `--z-tooltip`| `500` (Hover tooltips & contextual popovers) |

---

## 8. Spacing System

LaunchProduct uses an absolute **4px base grid** ($0.25\text{rem} = 4\text{px}$). All padding, margins, gaps, and heights must be exact multiples of 4px.

```
--space-1:  0.25rem (4px)    -- Micro-spacing, icon-to-label gap
--space-2:  0.50rem (8px)    -- Badge inner padding, button internal gap
--space-3:  0.75rem (12px)   -- Form field vertical padding, tag margins
--space-4:  1.00rem (16px)   -- Card inner padding (mobile), standard gap
--space-5:  1.25rem (20px)   -- Table cell padding, medium gap
--space-6:  1.50rem (24px)   -- Card inner padding (desktop), stack spacing
--space-8:  2.00rem (32px)   -- Section gap, modal internal padding
--space-10: 2.50rem (40px)   -- Major section headers, dashboard widgets
--space-12: 3.00rem (48px)   -- Page title vertical spacing
--space-16: 4.00rem (64px)   -- Landing page hero vertical rhythm
--space-20: 5.00rem (80px)   -- Landing page section divider gap
```

---

## 9. Layout & Grid

### 9.1 Desktop Layout (12-Column Grid)
- **Max Content Width:** `1280px` centered with auto margins (`mx-auto px-4 sm:px-6 lg:px-8`).
- **Columns:** 12 columns with a fixed `24px` (`gap-6`) gutter.
- **Leaderboard / Discovery Two-Column Split:**
  - Main Column (Feed & Products): 8 columns (`col-span-8`, approx. 820px).
  - Sidebar Column (Trending, Launch Boosts, Categories): 4 columns (`col-span-4`, approx. 400px).

### 9.2 Mobile & Tablet Layout
- **Mobile (<768px):** Single-column vertical stream (`col-span-12`). Sidebar widgets collapse beneath the primary feed or move into a sticky bottom drawer or dedicated tabs.
- **Tablet (768px–1023px):** Compact two-column split or stacked layout with condensed horizontal padding (`px-4`).

---

## 10. Border Radius

Curvature communicates a clean, modern software interface without feeling cartoonish or bubbly.

```css
--radius-none: 0px;
--radius-xs:   2px;   /* Fine table borders, code chips */
--radius-sm:   4px;   /* Small badges, micro-buttons, tooltips */
--radius-md:   8px;   /* Standard buttons, form inputs, dropdowns */
--radius-lg:   12px;  /* Product cards, review cards, callouts */
--radius-xl:   16px;  /* Modals, feature hero containers */
--radius-2xl:  24px;  /* Floating action bars */
--radius-full: 9999px;/* Pill badges, vote counter pills, avatars */
```

---

## 11. Shadows & Elevation

LaunchProduct maintains a restrained, tactile elevation hierarchy. Heavy, diffuse black shadows are forbidden; ambient light and subtle border tints create clean physical depth.

```css
/* Elevation 1: Hover cards, dropdown menus */
--shadow-sm: 0 1px 2px 0 rgba(15, 23, 42, 0.05);

/* Elevation 2: Resting Product Card, floating bars */
--shadow-md: 0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05);

/* Elevation 3: Hovered Product Card, Flyouts */
--shadow-lg: 0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03);

/* Elevation 4: Modals, Dialogs */
--shadow-xl: 0 20px 25px -5px rgba(15, 23, 42, 0.10), 0 8px 10px -6px rgba(15, 23, 42, 0.04);

/* Brand Glow: Focused Primary CTA, Active Upvote */
--shadow-brand-glow: 0 0 0 3px rgba(6, 83, 253, 0.25), 0 4px 12px rgba(6, 83, 253, 0.15);
```

---

## 12. Iconography

- **Icon Set:** **Lucide Icons** (`lucide-react`) is the standard system iconography library.
- **Stroke Width:** Consistently set to `1.75px` across all sizes for visual balance with Poppins typography.
- **Icon Sizing Standards:**
  - Micro / Inline: `14px` (`w-3.5 h-3.5`) — Used in small badges and timestamps.
  - Standard / Button: `16px` (`w-4 h-4`) — Used inside action buttons and table rows.
  - Navigation / Card: `20px` (`w-5 h-5`) — Used in navbar links and category icons.
  - Feature / Large: `24px` (`w-6 h-6`) — Used in dashboard headers and empty state graphics.
- **Alignment:** Always center-align icons vertically with adjacent text (`inline-flex items-center gap-2`).

---

## 13. Buttons

Buttons represent explicit user intent. They must feature clear state transitions (default, hover, focus, active, disabled, loading).

### 13.1 Button Variants

1. **Primary Button:**
   - Background: `var(--color-primary)` (`#ff751f`)
   - Text: `#FFFFFF`, Font: Codec Pro / Plus Jakarta Sans SemiBold (600), `14px`
   - Hover: `var(--color-primary-hover)` (`#e66210`)
   - Active: `var(--color-primary-active)` (`#cb520a`)
   - Focus: `box-shadow: 0 0 0 3px var(--color-primary-focus)`
   - Used for: "Submit Product", "Launch Campaign", "Claim Product".

2. **Secondary Button:**
   - Background: `var(--color-surface)`
   - Border: `1px solid var(--color-border)`
   - Text: `var(--color-text-primary)`
   - Hover: Background `var(--color-surface-sunken)`, Border `var(--color-border-hover)`
   - Used for: "Cancel", "Filter", "Preview", "View Details".

3. **Outline / Ghost Button:**
   - Background: `transparent`
   - Text: `var(--color-text-secondary)`
   - Hover: Background `rgba(15, 23, 42, 0.04)` (Light) / `rgba(255, 255, 255, 0.05)` (Dark), Text `var(--color-text-primary)`
   - Used for: Navigation links, pagination numbers, icon-only dismiss triggers.

4. **Destructive / Danger Button:**
   - Background: `var(--color-error)` (`#EF4444`)
   - Text: `#FFFFFF`
   - Hover: `#DC2626`
   - Used for: "Delete Product", "Revoke Claim", "Ban Spammer".

5. **Vote Button (Specialized Component):**
   - See detailed spec in [Section 16](#16-badges--status-indicators).

### 13.2 Button Sizes & Touch Targets

- **Small (`btn-sm`):** Height `32px`, Padding `0 12px`, Font `12px`, Radius `6px`.
- **Medium (`btn-md`):** Height `40px`, Padding `0 16px`, Font `14px`, Radius `8px`. (Default)
- **Large (`btn-lg`):** Height `48px`, Padding `0 24px`, Font `16px`, Radius `10px`.
- **Mobile Touch Minimum:** On viewports $<768\text{px}$, all interactive click targets must expand to at least `44px × 44px` via padding or invisible pseudo-elements.

---

## 14. Form Controls

All forms utilize explicit `<label>` tags with floating helper text and accessible validation error states.

### 14.1 Text Inputs & Textareas
- Height: `40px` (Input), variable (Textarea).
- Background: `var(--color-surface)`.
- Border: `1px solid var(--color-border)`.
- Radius: `8px`.
- Placeholder: `var(--color-text-muted)` (`#94A3B8`).
- Focus Ring: `border-color: var(--color-primary)`, `box-shadow: 0 0 0 3px var(--color-primary-focus)`.
- Error State: `border-color: var(--color-error)`, `box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.2)`. A descriptive error message in `text-xs text-red-500 mt-1` must be rendered with `aria-live="polite"`.

### 14.2 Select & Dropdowns
- Custom SVG chevron arrow right-aligned with `pointer-events-none`.
- Options menu rendered with background `var(--color-surface-elevated)` and border `var(--color-border)`.

### 14.3 Checkbox & Radio Buttons
- Checkbox: `18px × 18px`, Radius `4px`.
- Radio: `18px × 18px`, Radius `9999px`.
- Checked State: Fill `var(--color-primary)` with crisp white SVG checkmark.

### 14.4 Toggle Switch
- Track: Width `44px`, Height `24px`, Radius `9999px`.
- Thumb: Width `20px`, Height `20px`, White circle with subtle shadow.
- Transition: `transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)`.

---

## 15. Cards

Cards are the fundamental building blocks of LaunchProduct feeds.

### 15.1 Base Card Styles
- Background: `var(--color-surface)`
- Border: `1px solid var(--color-border)`
- Radius: `var(--radius-lg)` (`12px`)
- Padding: `16px` (Mobile) / `20px` (Desktop)
- Transition: `border-color 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease`
- Hover State: `border-color: var(--color-border-hover)`, `box-shadow: var(--shadow-md)`, subtle `translate-y-[-1px]`.

### 15.2 ProductCard Architecture
The standard ProductCard displays:
1. **Left / Rank Section:** Numeric rank pill (`#1`, `#2` in font-mono bold).
2. **Media Section:** 56×56px product logo (`rounded-lg object-contain bg-slate-50 p-1 border`).
3. **Content Section:**
   - Product Name (H3 style, font-semibold).
   - Verification Badge (Shield with check if founder verified).
   - Category Chip (e.g., `AI Developer Tools`).
   - One-sentence tagline (14px, muted slate, clamped to 2 lines).
   - Social / Credibility signals (e.g., ⭐ 4.8 / 12 reviews, organic clicks).
4. **Right / Action Section:**
   - Dedicated Upvote Button with live counter.
   - Outbound link icon button (`target="_blank" rel="noopener"` tracking organic click telemetry).

---

## 16. Badges & Status Indicators

### 16.1 VoteButton Component

The VoteButton is the highest-frequency interactive component on the platform.

```
┌──────────────┐
│  ▲  UPVOTE   │  <-- Resting State: Slate Border, White/Dark Surface
│     142      │      Font: Poppins SemiBold 14px, Count in Font-Mono
└──────────────┘

┌──────────────┐
│  ▲  UPVOTED  │  <-- Active State: Primary Tangerine Fill (#ff751f), White Text
│     143      │      Subtle brand glow shadow
└──────────────┘
```

- **Layout:** Vertical pill on desktop (`w-16 h-16 rounded-xl flex flex-col items-center justify-center gap-1`), horizontal pill on mobile (`h-10 px-4 flex flex-row items-center gap-2`).
- **Unvoted State:** Border `1px solid var(--color-border)`, Text `var(--color-text-primary)`. Hover: Border `var(--color-primary)`, Background `var(--color-primary-subtle)`.
- **Voted State:** Background `var(--color-primary)`, Border `1px solid var(--color-primary)`, Text `#FFFFFF`, Icon `#FFFFFF`. Micro-animation: Quick 10% bounce (`scale(1.1) -> scale(1.0)` over 150ms).
- **Disabled / Quarantined:** Opacity `50%`, cursor `not-allowed`.

### 16.2 Badges Spectrum

| Badge Type | Visual Treatment | Icon | Meaning / Application |
| :--- | :--- | :--- | :--- |
| **Rank Badge (#1–#3)** | Gold/Silver/Bronze gradient pill with dark text | 🏆 / 🥇 | Top 3 finishers in immutable daily snapshot |
| **Rank Badge (#4–#100)**| Slate border, dark text, mono font | `#` | Daily leaderboard ranked finishers |
| **Verified Founder** | Tangerine fill (`#ff751f`), white checkmark | CheckCircle2 | Verified domain owner via DNS TXT or HTML tag |
| **Sponsored / Boost** | Amber tint (`#FFFBEB`), Amber border (`#FCD34D`), Amber text (`#B45309`) | Sparkles | Paid promotional placement (Dual-engine separation) |
| **Pricing Chip** | Neutral slate background, text-xs | DollarSign | `Free`, `Freemium`, `Paid`, `Open Source` |
| **Fraud Status (Admin)**| Green / Yellow / Red / Purple pills | ShieldAlert | `VALID`, `FLAGGED_FOR_REVIEW`, `QUARANTINED`, `REJECTED_BOT` |

---

## 17. Navigation

### 17.1 Top Header (Global Navigation)
- **Position:** Sticky top (`sticky top-0 z-100`), height `64px`.
- **Backdrop:** `backdrop-blur-md bg-white/85` (Light) / `backdrop-blur-md bg-slate-950/85` (Dark), with a 1px bottom border (`var(--color-border)`).
- **Desktop Elements (Left to Right):**
  1. Brand Logo (`primary-horizontal.png` or `logo-light.png`/`logo-dark.png`, height `36px`).
  2. Search Trigger Bar (Command Palette input `Ctrl + K` / `Cmd + K`, width `280px`).
  3. Navigation Links: `Leaderboard`, `Trending`, `Categories`, `Promote`.
  4. Actions: Dark/Light Mode Toggle, `+ Submit Product` (Primary Button), User Avatar / Sign In.

### 17.2 Mobile Navigation Drawer
- Hamburger icon trigger on viewports $<1024\text{px}$.
- Slides in smoothly from the right (`width: min(320px, 85vw)`).
- Overlay backdrop: `bg-slate-950/50 backdrop-blur-sm`.
- Focus trapped within drawer; closed via `ESC` key or tap outside.

### 17.3 Founder / Admin Sidebar
- Persistent 240px wide navigation column on desktop screens.
- Collapsible to 64px icon-only rail on intermediate viewports.

---

## 18. Tables

Tables power the Leaderboard archive view, Founder campaign management, and the Admin moderation queue.

- **Header Row:** Height `44px`, background `var(--color-surface-sunken)`, text `text-xs font-semibold text-slate-500 uppercase tracking-wider`.
- **Data Rows:** Height `60px`, border bottom `1px solid var(--color-border-subtle)`. Hover state: `bg-slate-50/70` (Light) / `bg-slate-800/40` (Dark).
- **Numeric Alignment:** All quantitative figures (Rank, Votes, CTR, Impressions, Conversion) must be **right-aligned** using `font-mono`.
- **Responsive Table Card Fallback:** On screens $<768\text{px}$, wide data tables must transform into individual vertical card blocks with labeled key-value rows.

---

## 19. Modals / Dialogs

Modals are reserved for high-focus tasks: Product Submission, Campaign Checkout, Claim Domain Verification, and Confirmations.

- **Backdrop:** `fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-300 animate-fade-in`.
- **Dialog Container:** Centered flex container, max width `540px` (Standard) / `720px` (Submission / Checkout), radius `16px`, shadow `var(--shadow-xl)`.
- **Dismissibility:** Visible top-right 'X' icon button, click on backdrop outside dialog, and `ESC` key press.
- **Accessibility:** Must trap focus within modal elements, announce title via `aria-labelledby`, and restore focus to trigger button upon close.

---

## 20. Toasts / Notifications

LaunchProduct uses the Sonner / Radix toast pattern for non-blocking asynchronous feedback.

- **Placement:** Bottom-right on desktop (`bottom-4 right-4 z-400`), bottom-center on mobile (`bottom-4 inset-x-4`).
- **Variants:**
  - **Success:** Green icon, "Vote recorded successfully."
  - **Warning:** Amber icon, "Vote under routine review."
  - **Error:** Red icon, "Daily vote limit reached."
  - **Info:** Blue icon, "Campaign scheduled for tomorrow 00:00 UTC."
- **Dismissal:** Auto-dismiss after `4000ms`, manual close 'X' button, swipe-to-dismiss gesture on touch screens.

---

## 21. Loading States

- **No Blocking Full-Page Spinners:** Never render a full-page blocker for route transitions.
- **Skeleton Shimmers:** Product feeds, leaderboard tables, and dashboard cards must render matching wireframe skeleton blocks with a subtle pulsing shimmer (`animate-pulse bg-slate-200 dark:bg-slate-800 rounded`).
- **Button Loading Spinners:** When a form or vote is submitting, the button maintains its exact dimensions, replaces label with an inline `16px` spinning SVG ring (`animate-spin`), and disables click triggers (`pointer-events-none`).
- **Optimistic UI:** Upvote count increments immediately upon click. If the backend returns a rejection (e.g. rate limit), the counter rolls back smoothly and fires an error toast.

---

## 22. Empty States

Empty states provide actionable guidance rather than dead ends.

- **Visual Composition:** Centered 48×48px icon container with soft brand background, clear H3 headline, one-sentence explanatory subtext, and a primary CTA button.
- **Examples:**
  - *No Products Found in Search:* "No tools matched 'Crypto Bot'. Try broadening your search or submit a new product." → Button: `+ Submit a Product`.
  - *No Active Campaigns:* "You haven't booked any promotional boosts yet. Get your product in front of 50,000+ tech early adopters." → Button: `Explore Boost Packages`.
  - *No Moderation Items:* "All queues are clear! No flagged votes or reviews require inspection."

---

## 23. Error States

- **404 Not Found:** Clean illustration, "This product or page has moved or launched elsewhere." → Button: `Back to Daily Leaderboard`.
- **500 Server Error:** "Our servers encountered a temporary hiccup. Telemetry has been dispatched to engineering." → Button: `Reload Page`.
- **Scraper Fallback Mode:** When automated scraping of a submitted URL times out or is blocked by Cloudflare, the UI transitions to **Manual Submission Mode** with a friendly banner: "We couldn't automatically read metadata from this site. Please enter your product details below."

---

## 24. Product Discovery UX

1. **Category Filter Pills:** Horizontal scrollable pill row at the top of the feed (`All`, `AI Agents`, `Developer Utilities`, `SaaS`, `Productivity`, `Design Tools`). Active pill receives primary blue fill.
2. **Sort Dropdown:** Options: `Top Ranked (Today)`, `Trending Velocity`, `Most Discussed`, `Recently Launched`.
3. **Search & Command Palette:** Global `Cmd + K` search opens instant overlay querying product titles, taglines, and categories with zero-latency debounce (200ms).
4. **Outbound Click Tracking:** Clicking the outbound product link routes through the privacy-preserving telemetry redirector (`/api/v1/redirect/{productId}`) before navigating to the founder's destination site with `?ref=launchproduct`.

---

## 25. Product Detail UX

Information Architecture for `/products/[slug]`:

1. **Hero Header:**
   - 80×80px product logo.
   - Product Name, Category pill, Verified Founder shield.
   - 1-sentence tagline in `text-lg font-normal text-slate-600`.
   - Dual CTAs: Primary Upvote Pill + Outbound "Visit Website ↗" button.
2. **Media Showcase:** Carousel or grid of product screenshots / demo video with lightbox zoom on click.
3. **Markdown Description:** Comprehensive product overview rendered with sanitized typography.
4. **Founder Spotlight:** Founder profile card with avatar, bio, Twitter/X handle, and ownership verification status.
5. **Community Reviews (Phase 2):** Breakdown of pros, cons, star ratings, and community reviews with founder replies.
6. **Historical Rank Badges:** Permanent showcase of awards won (e.g. *#1 Product of the Day — Sept 19, 2026*).

---

## 26. Leaderboard UX

The Leaderboard is LaunchProduct's marquee surface. It must convey **high integrity, excitement, and clarity without feeling like a casino**.

### 26.1 Top 3 Podium Cards
The #1, #2, and #3 ranked products of the current launch day receive prominent visual hierarchy:
- **#1 Product (Gold Accent):** Elevated card with subtle amber border glow, golden trophy icon (`#F59E0B`), enlarged logo, and "Daily Leader" badge.
- **#2 Product (Silver Accent):** Sleek slate-accented card with silver medal icon.
- **#3 Product (Bronze Accent):** Warm bronze-accented card.

### 26.2 Leaderboard Rows (#4 to #100)
Compact horizontal rows showing:
- Bold rank position (`#04`, `#05` in mono font).
- Product logo and primary tagline.
- Category tag.
- Vote counter pill with inline upvote trigger.
- Rank movement delta (`▲ 2` in green or `▼ 1` in red, comparing current score to previous 1-hour window).

### 26.3 Freeze Window & Snapshot Countdown
- Header banner displays live countdown to **Midnight UTC** (`00:00:00 UTC`): "Daily Leaderboard locks in 04h 22m 10s".
- At midnight UTC, the snapshot is frozen and marked `IMMUTABLE SNAPSHOT`.

---

## 27. Category UX

- Dedicated landing pages for each vertical (e.g. `/categories/ai-agents`).
- Features a **Category Spotlight** card at the top (promotional tier reserved for 1 featured product per category per week).
- Category statistics: Total tools launched, total votes cast, top-ranked tool of all time.
- Breadcrumb navigation: `Home / Categories / AI Agents`.

---

## 28. Product Submission UX

The submission flow employs **progressive disclosure** across a 4-step wizard:

1. **Step 1 — URL & Instant Extraction:**
   - Founder enters landing page URL (`https://mytool.com`).
   - Hardened background scraper attempts to parse OpenGraph title, description, favicon, and screenshot.
   - *Fallback:* If scraping fails or times out, smoothly reveal manual fields without resetting user progress.
2. **Step 2 — Product Metadata:**
   - Founder refines Title, Tagline (max 80 chars), Category (single select), Pricing Model (dropdown), and Uploads custom logo.
3. **Step 3 — Ownership Verification (Optional for Launch, Required for Founder Badge):**
   - Option A: Add DNS TXT record `_launchproduct.domain.com` with value `launchproduct-verify={token}`.
   - Option B: Add HTML meta tag `<meta name="launchproduct-verify" content="{token}">`.
4. **Step 4 — Schedule & Preview:**
   - Founder selects Launch Date (today or future calendar date at 00:00 UTC).
   - Live interactive card preview shows exactly how the product will appear in the feed.
   - "Confirm & Launch" button.

---

## 29. Authentication UX

LaunchProduct employs a streamlined, high-integrity dual authentication architecture. Magic link authentication has been permanently deprecated in favor of password-authenticated accounts with mandatory email verification.

- **Authentication Methods (Strictly 2 Supported Paths):**
  1. **Method 1: Email + Password with Mandatory Verification:**
     - User registers with Full Name, Email, Password (min 8 chars), and required acceptance of Terms & Privacy Policy.
     - Account is created in unverified status (`isEmailVerified: false`).
     - System dispatches a **6-digit numeric OTP code** and a **1-click activation link** to the user's email inbox via Resend.
     - User enters the 6-digit OTP code directly on the screen or clicks the email link to activate their account and issue a 30-day JWT session cookie.
     - Dedicated resend code timer and input formatting with generous letter-spacing (`tracking-[0.4em] font-mono`).
     - Password recovery available via **Forgot Password** flow with secure, single-use reset tokens.
  2. **Method 2: Google & GitHub OAuth 2.0:**
     - Single-click social authentication.
     - Since emails are verified at the provider level, OAuth accounts are immediately activated (`isEmailVerified: true`).
- **Visual Feedback:** High-contrast feedback cards for active states, OTP entry, invalid credentials, and success celebrations.
- **Security Assurance:** Explicit banner: *"We never share your email address or post without authorization."*

---

## 30. Founder Dashboard UX

The Founder Dashboard (`/dashboard`) is the builder's mission control.

1. **Summary Stat Cards (Top Row):**
   - Total Organic Clicks (with % change vs last week).
   - Total Community Upvotes.
   - Current Leaderboard Rank (with real-time position badge).
   - Conversion / CTR Rate.
2. **Live Products Table:** List of submitted products, current launch status (`SCHEDULED`, `LIVE`, `ARCHIVED`), and direct action links (`Edit`, `View Live`, `Boost`).
3. **Embeddable Badges Generator:** Interactive preview where founders can copy SVG/HTML embed snippets for their own landing pages (e.g. *"#1 Product of the Day — LaunchProduct"*).

---

## 31. Campaign UX (Sponsored Distribution)

Paid promotions must remain **100% transparent and structurally separated** from organic algorithms.

### 31.1 Sponsorship Booking Interface
- Interactive calendar displaying slot availability for each tier:
  - **Tier 1: Launch Day Boost** (Max 2 slots per day, pinned to sponsored top slot).
  - **Tier 2: Category Spotlight** (Max 1 slot per category per week).
  - **Tier 3: Run-of-Site Featured** (Rotating banner).
- Sold-out dates are clearly disabled with "Sold Out" badges.
- Pricing displayed in clear USD amounts with transparent Merchant of Record (Paddle / Lemon Squeezy) checkout.

### 31.2 Sponsored Card Demarcation Rules
- All sponsored cards feature a visible **`Sponsored`** badge in Amber (`#B45309` on `#FFFDF5`).
- The card border is tinted amber (`#FCD34D`).
- The card header explicitly states: *"Promoted Placement — Does not affect organic leaderboard rank."*

---

## 32. Analytics UX

Analytics prioritize **actionable builder metrics** over vanity numbers.

- **Primary Metrics:** Outbound Clicks, Click-Through Rate (CTR), Daily Impressions, Referral Sources.
- **Charts:** Clean area charts and bar charts rendered with accessible SVG/Canvas elements. The primary metric line uses `#ff751f` with a soft gradient fill below.
- **Date Range Selector:** Presets (`Last 24 Hours`, `Last 7 Days`, `Launch Week`, `All Time`).
- **Privacy Notice:** Display footer disclaimer: *"Analytics are privacy-preserving and deduplicated via 10-minute sliding windows. No personal tracking cookies are placed on your visitors."*

---

## 33. Admin / Moderation UX

The Admin Console (`/admin`) is restricted to users with `MODERATOR` or `ADMIN` roles.

1. **Moderation Queue:**
   - Tabs: `Flagged Votes`, `Flagged Reviews`, `Pending Products`, `Disputed Claims`.
2. **Fraud Inspection Drawer:**
   - Inspecting a flagged vote displays the 6-factor risk breakdown: Account Age, Subnet Density, Velocity Score, ASN Reputation, Disposable Email, Behavioral Fingerprint.
   - Actions: `Approve Vote (Mark Valid)`, `Quarantine Vote`, `Ban IP / Subnet (CIDR)`.
3. **Audit Trail:** Append-only log of every administrative decision with moderator timestamp and reason notes.

---

## 34. Responsive Design

LaunchProduct is designed with a **mobile-first mindset**.

| Device Class | Viewport Range | Navigation Pattern | Feed Layout | Card Presentation |
| :--- | :--- | :--- | :--- | :--- |
| **Mobile** | $<768\text{px}$ | Sticky top header with hamburger drawer + optional bottom quick-nav bar | Single column vertical stream (`100%` width) | Full-width cards, horizontal vote pill at bottom right |
| **Tablet** | $768\text{px}–1023\text{px}$| Condensed horizontal header with search icon trigger | Single wide column with collapsible sidebar widgets | Standard card layout, vertical vote button |
| **Desktop** | $1024\text{px}–1279\text{px}$| Full horizontal navbar with visible search bar and CTA | Two-column split: 8-col feed + 4-col sidebar | Full detail cards with 56px logo, tags, and right vote button |
| **Wide Screen** | $\ge 1280\text{px}$ | Centered 1280px container with generous breathing room | Two-column split with sticky trending widget and badge showcase | Spacious cards with complete metadata chips and quick links |

---

## 35. Accessibility (WCAG 2.2 AA)

LaunchProduct is engineered to meet or exceed **WCAG 2.2 Level AA** compliance across all surfaces.

1. **Color Contrast:** All body text meets at least a `4.5:1` contrast ratio against its background. Large text ($\ge 24\text{px}$ or $\ge 18.5\text{px}$ bold) meets at least `3.0:1`.
2. **Keyboard Navigation:** Every interactive element is reachable via standard `Tab` order. Focused elements receive a visible, high-contrast double ring (`ring-2 ring-primary ring-offset-2`).
3. **Screen Readers & ARIA:**
   - Rank numbers use descriptive aria-labels (e.g. `aria-label="Ranked number 1 product today"`).
   - Vote buttons use dynamic states (`aria-pressed="true"`, `aria-label="Upvote Acme AI, currently 142 votes"`).
   - Modal dialogs implement `role="dialog"`, `aria-modal="true"`, and autofocus on the primary action or close button.
4. **Motion Sensitivity:** All CSS transitions and keyframe animations must be wrapped in `@media (prefers-reduced-motion: reduce)`:
   ```css
   @media (prefers-reduced-motion: reduce) {
     *, ::before, ::after {
       animation-duration: 0.01ms !important;
       animation-iteration-count: 1 !important;
       transition-duration: 0.01ms !important;
       scroll-behavior: auto !important;
     }
   }
   ```

---

## 36. SEO / Social Sharing UI

### 36.1 Dynamic OpenGraph Image Generation
Dynamic OpenGraph cards (`/api/og/product/[slug]` and `/api/og/leaderboard/[date]`) are generated at `1200 × 630 px` via `@vercel/og` (Satori / Canvas):
- **Card Background:** Deep Midnight Navy (`#00214E`) with subtle radial electric blue gradient.
- **Card Content:**
  - LaunchProduct horizontal logo top-left.
  - Large Product Name in bold Poppins (`48px`).
  - Product tagline and category badge.
  - Right side: Large Rank Badge (e.g. *"#1 Product of the Day — Sept 21, 2026"*).
- **Cache Invalidation:** OpenGraph images are cached on edge CDN with `stale-while-revalidate=86400` and revalidated automatically when a daily snapshot freezes at midnight UTC.

### 36.2 Embeddable SVG Badges
Founders can embed live ranking badges on their websites:
```html
<a href="https://launchproduct.io/products/my-tool?ref=badge" target="_blank">
  <img src="https://api.launchproduct.io/api/v1/badges/my-tool.svg?theme=light" alt="Featured on LaunchProduct" />
</a>
```
- Badge dimensions: `240 × 54 px` or `180 × 40 px`.
- SVG uses inline vector paths with clean typography and authoritative snapshot verification.

---

## 37. Component Architecture

The Next.js presentation layer is organized into a modular, atomic structure within `frontend/src/`:

```
frontend/src/
├── app/                              # Next.js App Router Pages
│   ├── layout.tsx                    # Root layout with Poppins font & ThemeProvider
│   ├── page.tsx                      # Homepage / Daily Leaderboard
│   ├── products/[slug]/page.tsx      # Product Detail Page
│   ├── categories/[slug]/page.tsx    # Category Discovery Page
│   ├── submit/page.tsx               # Product Submission Wizard
│   ├── dashboard/page.tsx            # Founder Dashboard
│   ├── admin/page.tsx                # Admin Moderation Console
│   └── api/og/                       # Dynamic OpenGraph Generators
├── components/
│   ├── ui/                           # Primitive Design System Tokens
│   │   ├── button.tsx
│   │   ├── input.tsx
│   │   ├── badge.tsx
│   │   ├── modal.tsx
│   │   ├── card.tsx
│   │   ├── dropdown.tsx
│   │   └── skeleton.tsx
│   ├── brand/                        # Official Logo & Brand Components
│   │   ├── Logo.tsx                  # Responsive logo supporting light/dark/monochrome
│   │   ├── Icon.tsx                  # Standalone brand icon
│   │   └── Wordmark.tsx              # Text wordmark
│   ├── product/                      # Product Domain Components
│   │   ├── ProductCard.tsx
│   │   ├── VoteButton.tsx
│   │   ├── RankBadge.tsx
│   │   └── VerifiedShield.tsx
│   ├── leaderboard/                  # Leaderboard Domain Components
│   │   ├── PodiumCard.tsx
│   │   ├── LeaderboardTable.tsx
│   │   └── CountdownTimer.tsx
│   └── layout/                       # Layout Shell Components
│       ├── Header.tsx
│       ├── Footer.tsx
│       ├── MobileNav.tsx
│       └── Sidebar.tsx
└── styles/
    └── globals.css                   # CSS variables, Tailwind directives, font config
```

---

## 38. Motion & Interaction

Motion is intentional, swift, and communicative.

- **Duration Standard:** `150ms` (Micro-interactions, button hover), `200ms` (Dropdowns, popovers), `300ms` (Modals, drawers).
- **Easing Curve:** Standard cubic bezier `cubic-bezier(0.16, 1, 0.3, 1)` (Smooth ease-out).
- **Hover Transitions:** Smooth border color and subtle elevation lift (`transform: translateY(-1px)`).
- **Upvote Action:** Immediate micro-scale feedback (`scale: 1.08`) with instant color change to primary blue.

---

## 39. Dark/Light Theme Strategy

LaunchProduct ships with **first-class support for both Light and Dark themes**.

- **Theme Detection:** System preference (`prefers-color-scheme`) is loaded by default, stored in `localStorage` under `launchproduct_theme`, and toggled via the navbar theme switch.
- **No Flash of Unstyled Content (FOUC):** Next.js root layout injects an inline script that sets the `dark` class on `<html>` before DOM paint.
- **Theme Contrast Guarantee:** Dark mode uses deep obsidian `#090D16` rather than washed-out gray, pairing with vibrant electric blue `#3B82F6` and high-contrast text `#F8FAFC` to ensure strict WCAG compliance.

---

## 40. UX Consistency Rules

To prevent interface drift and ensure complete product integrity, all engineers must observe these invariants:

1. **Brand Invariant:** The brand name is always spelled **`LaunchProduct`** (camelCase compound, single word, capital L and capital P). Never write *Launch Product*, *launchproduct*, or *LaunchRank*.
2. **Sponsored Separation:** Never merge or disguise a sponsored placement as an organic rank. Sponsored items must always feature the Amber badge and disclaimer.
3. **No Downvoting:** LaunchProduct is a celebration of builder innovation. Voting is strictly positive-increment (+1).
4. **Immediate Feedback:** Every user action (vote, save, submit, copy link) must trigger immediate feedback via button state change, count increment, or toast notification.
5. **No Broken Links:** Outbound product URLs must always open in a new tab (`target="_blank" rel="noopener noreferrer"`) and pass through the server redirector for click accounting.

---

## 41. Implementation Notes

### 41.1 Loading Poppins in Next.js (App Router)

In `src/app/layout.tsx`:

```tsx
import { Poppins } from 'next/font/google';
import '@/styles/globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={poppins.variable} suppressHydrationWarning>
      <body className="font-sans antialiased bg-bg text-text-primary">
        {children}
      </body>
    </html>
  );
}
```

### 41.2 Tailwind Configuration Setup

In `tailwind.config.ts`:

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Codec Pro'", 'var(--font-jakarta)', 'var(--font-poppins)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      colors: {
        brand: {
          primary: '#ff751f',
          navy: '#0D0C0B',
          hover: '#e66210',
          active: '#cb520a',
        },
        bg: 'var(--color-bg)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          elevated: 'var(--color-surface-elevated)',
          sunken: 'var(--color-surface-sunken)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          muted: 'var(--color-text-muted)',
          inverted: 'var(--color-text-inverted)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          subtle: 'var(--color-border-subtle)',
          hover: 'var(--color-border-hover)',
        },
      },
      borderRadius: {
        lg: '12px',
        xl: '16px',
        '2xl': '24px',
      },
    },
  },
  plugins: [],
};

export default config;
```

---

*This specification represents the authoritative UI/UX standard for LaunchProduct. All visual implementation, component design, and page layouts must strictly adhere to these rules.*
