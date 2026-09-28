# LaunchProduct UI/UX Refinement Master Plan
**Platform:** LaunchProduct (Global Product Discovery & Growth Platform)  
**Roles:** Senior Product Designer, UX Architect, Design Systems Engineer, Frontend UX Auditor  
**Document Status:** Final Reconciled Single Source of Truth  
**Target File:** `UI-UX-REFINEMENT-PLAN.md`  

---

## 1. Document Purpose

This document is the **authoritative single source of truth** for the UI/UX refinement, design system normalization, responsive optimization, motion architecture, and accessibility implementation for the LaunchProduct platform. 

It establishes an implementation-ready roadmap that bridges existing product capabilities with high-end, global SaaS design standards. Every issue identified includes verified code references, concrete architectural solutions, clear priority ratings, dependencies, and unambiguous acceptance criteria.

---

## 2. Source of Truth / Constraints

All implementation decisions in this document adhere strictly to the following precedence hierarchy:
1. **Finalized Architecture & Backend Contracts:** Next.js frontend, Express.js REST API on port 4000, MongoDB Atlas, Redis 7 + BullMQ, isolated sandboxed scraper. No new databases, microservices, or backend frameworks may be introduced.
2. **Authoritative Product Documentation:** `PRD.md`, `UI-UX.md`, and finalized backend API specifications.
3. **Verified Codebase Reality:** Concrete file paths, existing routes, real database models, and existing API contracts in `frontend/` and `backend/`.
4. **Implementation Verification Standard:** Any capability, metric, or endpoint not fully implemented in the existing codebase is explicitly tagged as:  
   `"Requires verification during implementation"` rather than presented as an assumed fact.

---

## 3. Product & Brand Context

### 3.1 Platform Identity
LaunchProduct is a global product discovery and growth platform for AI Tools, AI Agents, SaaS, Developer Tools, Productivity Utilities, and Indie Hacker products.

**Core Workflow:**
Founder launches product → Users discover product → Users vote / review / interact → Products gain organic visibility → Products appear in rankings/trending → Founders can optionally purchase transparent sponsored promotion → Founders receive analytics and distribution opportunities.

### 3.2 Brand Constraints (Non-Negotiable)
- **Brand Name:** LaunchProduct
- **Primary Typography:** Poppins (Google Fonts via `next/font/google`), supported by system sans-serif and monospace fallback stacks.
- **Brand Palette:**
  - Primary Electric Blue: `#0653FD`
  - Deep Midnight Navy: `#00214E`
- **Logo Integrity:** The existing approved raster and vector logo assets located in `public/brand/` (`primary-horizontal.png`, `wordmark.png`, `logo-light.png`, `logo-dark.png`, `icon.png`, `favicon.png`) must be preserved without alteration or replacement.
- **Aesthetic Principles:** Premium, modern, trustworthy, global, product-first, data-driven, clean, and high-density without clutter.
- **Negative Constraints:** The platform must **NOT** resemble a gaming leaderboard, crypto platform, generic AI landing page template, casino promotion, or direct Product Hunt clone.

---

## 4. Architecture Context

The platform architecture is a finalized **Layered Monolith**. UI refinements must respect and integrate with this system without altering the core infrastructure.

```
+-------------------------------------------------------------------------+
|                          Next.js 14 (Frontend)                          |
|      App Router, Tailwind CSS, Semantic Tokens, Native CSS Transitions  |
+-------------------------------------------------------------------------+
                                    |
                    REST Requests & JSON Payloads (Axios)
                                    |
+-------------------------------------------------------------------------+
|                         Express.js (Backend Monolith)                   |
|   Routes -> Middleware -> Controllers -> Services -> Repositories       |
+-------------------------------------------------------------------------+
              |                                          |
+----------------------------+             +------------------------------+
|       MongoDB Atlas        |             |       Redis 7 + BullMQ       |
| Products, Users, Votes,    |             | Ranking Sets, Rate Limiting, |
| Reviews, Claims, Campaigns |             | Worker Queues, Click Telemetry|
+----------------------------+             +------------------------------+
                                                         |
                                           +------------------------------+
                                           |      Isolated Scraper        |
                                           | Sandboxed HTML/OG Extraction |
                                           +------------------------------+
```

**Technical Rules:**
- The Next.js frontend runs on port `3000` (or reverse-proxied).
- The Express.js backend runs on port `4000` (or `api.launchproduct.com`).
- No Next.js API Routes are to be introduced as a substitute for the Express backend.
- Background workers operate within the backend process tree; scraping execution remains strictly isolated from live user request cycles.

---

## 5. Domain Architecture

### 5.1 Target Domain Structure
- **Public Marketing & Discovery:** `https://launchproduct.com`
  - Homepage, public product discovery, category directory, trending feed, public product pages (`/products/[slug]`), SEO content.
- **Authenticated SaaS Web Application:** `https://app.launchproduct.com`
  - Founder dashboard (`/dashboard`), submission wizard (`/submit`), campaign management (`/promote`), account settings, administration (`/admin`).
- **REST API Gateway:** `https://api.launchproduct.com`
  - Express.js API (`/api/v1/*`), health checks (`/api/health`), webhook receivers.

### 5.2 Single Next.js Project Architecture (No Duplication)
To avoid maintaining two disconnected Next.js codebases, the platform will utilize a **unified Next.js application** with subdomain routing handled via Next.js Middleware or reverse proxy (e.g. Cloudflare / Nginx / Vercel rewrites):
- **Implementation Strategy:**
  - Route grouping: `(marketing)` for public discovery and `(app)` for authenticated founder surfaces, sharing atomic UI components (`ProductCard`, `CustomSelect`, `Logo`).
  - Next.js `middleware.ts` detects the incoming `Host` header:
    - Requests to `launchproduct.com` render marketing and public discovery views.
    - Requests to `app.launchproduct.com` rewrite internally to the authenticated dashboard/submit routes.
    - Path fallbacks: Visiting `/dashboard` on `launchproduct.com` seamlessly redirects to `https://app.launchproduct.com/dashboard`.

---

## 6. Design System

### 6.1 Semantic Design Tokens
Arbitrary inline color utilities (such as `bg-blue-50`, `text-blue-600`, or `border-blue-200/50`) must be eliminated in favor of standardized semantic tokens mapped via CSS variables in `globals.css` and `tailwind.config.ts`.

#### Surface Tokens
| Token | Light Mode Value | Dark Mode Value | Usage |
| :--- | :--- | :--- | :--- |
| `bg` | `#F8FAFC` (Slate-50) | `#090D16` (Deep Midnight) | Primary application canvas |
| `surface` | `#FFFFFF` (White) | `#0F172A` (Slate-900) | Standard product cards, panels |
| `surface-elevated` | `#FFFFFF` (White) | `#1E293B` (Slate-800) | Modals, dropdowns, popovers |
| `surface-sunken` | `#F1F5F9` (Slate-100) | `#060910` (Recessed Well) | Code blocks, skeleton backgrounds |

#### Brand Tokens
| Token | Light Mode Value | Dark Mode Value | Usage |
| :--- | :--- | :--- | :--- |
| `primary` | `#0653FD` | `#3B82F6` (WCAG tuned) | Primary CTA buttons, active tabs |
| `primary-hover` | `#0543D6` | `#2563EB` | Button hover states |
| `primary-active` | `#0436B0` | `#1D4ED8` | Pressed states |
| `primary-subtle` | `#EFF4FF` | `rgba(59, 130, 246, 0.12)`| Badges, selected item backgrounds |
| `brand-navy` | `#00214E` | `#00214E` | Dark contrast sections, footer accents |

#### Typography & Text Tokens
| Token | Light Mode Value | Dark Mode Value | WCAG Contrast Ratio |
| :--- | :--- | :--- | :--- |
| `text-primary` | `#0F172A` (Slate-900) | `#F8FAFC` (Slate-50) | > 14:1 (Passes AAA) |
| `text-secondary`| `#475569` (Slate-600) | `#94A3B8` (Slate-400) | > 4.8:1 (Passes AA) |
| `text-muted` | `#64748B` (Slate-500) | `#64748B` (Slate-500) | > 4.5:1 (Passes AA) |
| `text-inverted` | `#FFFFFF` | `#0F172A` | High contrast on primary fill |

#### Status & Feedback Tokens
- **Success:** `#10B981` (Emerald-500) | Subtle BG: `rgba(16, 185, 129, 0.10)`
- **Warning:** `#F59E0B` (Amber-500) | Subtle BG: `rgba(245, 158, 11, 0.10)`
- **Error:** `#EF4444` (Red-500) | Subtle BG: `rgba(239, 68, 68, 0.10)`
- **Info:** `#0653FD` (Blue-600) | Subtle BG: `rgba(6, 83, 253, 0.10)`

#### Sponsored Demarcation Tokens
- **Badge Text:** `#B45309` (Light: Amber-700) | `#FBBF24` (Dark: Amber-400)
- **Container BG:** `#FFFDF5` (Light) | `rgba(245, 158, 11, 0.05)` (Dark)
- **Container Border:** `#FCD34D` (Light: Amber-300) | `rgba(245, 158, 11, 0.25)` (Dark)

### 6.2 Radius & Elevation Standardization
- **`rounded-lg` (8px):** Small badges, tag pills, inline search controls.
- **`rounded-xl` (12px):** Standard interactive buttons, dropdown menus, input fields.
- **`rounded-2xl` (16px):** Core cards (`ProductCard`), review items, stat tiles.
- **`rounded-3xl` (24px):** Major hero sections, large modal dialogs (`AuthModal`).
- **Shadow Tokens:**
  - `shadow-card`: `0 1px 3px 0 rgba(0,0,0,0.05), 0 1px 2px -1px rgba(0,0,0,0.05)`
  - `shadow-hover`: `0 10px 15px -3px rgba(0,0,0,0.08), 0 4px 6px -4px rgba(0,0,0,0.04)`
  - Prohibit excessive neon glows, intense drop shadows, and high-opacity glassmorphism.

---

## 7. Global UX Principles

1. **Credibility Over Hype:** Visual design must communicate institutional trust and anti-fraud integrity. The platform must never look like an ad-heavy affiliate network.
2. **Dual-Engine Demarcation:** Organic rank is strictly earned through verified community engagement. Sponsored slots are transparently disclosed and visually segregated.
3. **Data Scannability:** High information density without visual clutter. Users should be able to evaluate 10 products in under 30 seconds.
4. **Interaction Restraint:** *"Static at first glance, alive on interaction."* Avoid ambient animations that distract from reading content.

---

## 8. Navigation

### Global Navigation Architecture

**Current State**  
The desktop navbar contains the Logo, full search bar input with `Cmd+K` trigger, Categories dropdown, Leaderboards link, Trending link, Anti-Fraud link, Theme toggle, Submit Product button, and Sign In link. On mobile, a hamburger button opens a full-screen drawer.

**Problem**  
The desktop navigation is visually crowded with 8 distinct elements competing for horizontal space. On standard laptop viewports (1024px–1280px), items wrap or compress awkwardly.

**Impact**  
Reduces primary CTA prominence ("Submit Launch") and creates visual fatigue before users reach the product feed.

**Recommended Solution**  
1. **Primary Navigation Bar:**
   - Left: Approved Logo (`Logo.tsx`).
   - Center: Consolidated Command Palette button: `[ Search launches, categories...   ⌘K ]` (fixed 220px–260px).
   - Navigation Links: **Explore** (dropdown), **Leaderboard** (with live status indicator), **Trending**, **Promote**.
   - Right: Theme toggle, **Submit Launch** (Primary brand button), User Profile / Sign In.
2. **Mobile Navigation Option:**
   - Top Header: Compact logo, Search icon (`Cmd+K` trigger), hamburger menu.
   - Document optional Mobile Bottom Bar (`Home`, `Leaderboard`, `Submit (+)`, `Dashboard`) as an implementation refinement for enhanced ergonomics.

**Priority:** P1  
**Affected Files / Components:**
- `frontend/src/components/layout/Navbar.tsx`
- `frontend/src/components/search/CommandPalette.tsx`  
**Dependencies:** Frontend layout  
**Acceptance Criteria:**
- Navbar renders without wrapping on all viewports from 1024px upwards.
- "Submit Launch" is the clear primary visual action on the right side.
- Search trigger opens Command Palette cleanly.

---

## 9. Homepage

### Homepage Discovery Feed Structure

**Current State**  
The homepage (`frontend/src/app/page.tsx`) features a large dark hero banner, category pill carousel, feed tabs (Today, Yesterday, This Week), an inline search filter, a top sponsored card, and a vertical list of organic cards.

**Problem**  
Having both a navbar search bar and an inline feed search input creates redundant search chrome in the first viewport fold. The hero copy is text-heavy and takes up vertical height that delays discovery.

**Impact**  
Pushes the primary product discovery feed below the fold for desktop users on 13-inch and 14-inch laptops.

**Recommended Solution**  
Organize the homepage into a focused 8-tier hierarchy:
1. **High-Signal Hero:** Compact value proposition banner communicating anti-fraud integrity and community discovery without towering vertical height.
2. **Category Discovery Rail:** Horizontally scrollable category pills with count indicators.
3. **Active Feed Controls Bar:**
   - Timeframe Tabs: **Today's Launches** (active UTC day) | **Yesterday** (finalized) | **This Week**.
   - Sort Selector: Trending Velocity, Top Upvoted, Newest.
4. **Sponsored Spotlight (Single Scarcity Slot):** Explicitly labeled, warm amber background, top-of-feed placement.
5. **Organic Ranked Feed:** Ranks `#01` to `#10` with verified rank numbers.
6. **Upcoming Launches Section:** Teaser feed for scheduled launches with "Notify Me" actions.
7. **Founder Launch CTA:** Clear banner explaining free organic submission.
8. **Semantic Footer:** Clean public footer with verified links.

**Priority:** P1  
**Affected Files / Components:**
- `frontend/src/app/page.tsx`  
**Dependencies:** Frontend layout, category API  
**Acceptance Criteria:**
- Redundant inline search bar removed; search is centralized in the Command Palette.
- First organic product card is visible above the fold on 1080p displays.
- Timeframe tabs filter products according to launch date.

---

## 10. Product Cards

### Signature Product Card Component

**Current State**  
`ProductCard.tsx` renders rank, logo, product title, domain verification shield, category pill, pricing model pill, tagline (clamped to 2 lines), review count, tags, outbound visit link, and an `UpvoteButton`.

**Problem**  
1. Rank number is wrapped in `hidden sm:flex`, hiding ranks completely on mobile (<640px).
2. Hovering the card scales the raster logo image (`group-hover:scale-105`), causing pixel blur.
3. Category and pricing pills use hardcoded ad-hoc color classes.

**Impact**  
The primary competitive mechanic (ranking) is invisible to mobile visitors. Raster logo scaling looks unpolished on non-retina displays.

**Recommended Solution**  
- **Visual Hierarchy:**
  ```
  [Rank #01]  [Logo 48x48]  [Product Name] [🛡️ Verified] [Category Pill] [Pricing Pill]    [▲ Upvote]
                            [Tagline clamped to 2 lines with readable line height]          [  388   ]
                            [💬 Reviews]  •  [#Tags]  •  [Visit ↗]
  ```
- **Mobile Rank Support:** Display numeric rank `#01` directly adjacent to the product name on viewports under 640px.
- **Hover Polish:** Remove scale from the `<img>` element. Apply elevation to the card container: `hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-hover`.
- **Token Standardization:** Standardize category pill to `bg-slate-100 dark:bg-slate-800 text-text-secondary` and pricing pill to semantic tokens (`bg-primary-subtle text-primary`).

**Priority:** P0  
**Affected Files / Components:**
- `frontend/src/components/product/ProductCard.tsx`  
**Dependencies:** Design system tokens  
**Acceptance Criteria:**
- Verified rank number visible on all screen sizes (320px to 2560px).
- Zero image scale blur on hover.
- Outbound click routes through `/api/v1/clicks/:productId?source=organic`.

---

## 11. Product Detail

### Public Product Page Experience

**Current State**  
`ProductDetailClient.tsx` renders breadcrumbs, hero header (80x80px logo, badges, action bar with upvote, visit, share, bookmark), accolades row, media screenshot carousel, long description, review list, and a sticky founder profile sidebar.

**Problem**  
1. Social sharing only copies the current URL to clipboard with no pre-composed sharing templates.
2. Founder profile displays mock accolades and hardcoded tech ecosystem tags.
3. Media gallery lacks keyboard navigation for fullscreen screenshots.

**Impact**  
Reduces viral referral sharing from launch day traffic and limits accessibility for visual previews.

**Recommended Solution**  
1. **Enhanced Sharing:** Web Share API (`navigator.share`) on mobile; accessible modal on desktop offering 1-click sharing to X/Twitter, LinkedIn, and copyable embed badges.
2. **SEO Optimization:** Server-rendered meta tags (`generateMetadata`), canonical link `https://launchproduct.com/products/[slug]`, and `SoftwareApplication` JSON-LD schema.
3. **Media Lightbox:** Accessible modal with `ArrowLeft`, `ArrowRight`, and `Escape` keyboard handlers.
4. **Founder Trust Signals:** Display actual DNS verification status from the product record.

**Priority:** P1  
**Affected Files / Components:**
- `frontend/src/components/product/ProductDetailClient.tsx`
- `frontend/src/components/product/MediaGallery.tsx`
- `frontend/src/app/products/[slug]/page.tsx`  
**Dependencies:** Backend product API, SEO metadata  
**Acceptance Criteria:**
- Canonical URL matches `https://launchproduct.com/products/[slug]`.
- Lightbox supports full keyboard navigation and focus restoration.
- Share actions work across mobile and desktop.

---

## 12. Discovery

### Intent-Driven & Tag Discovery

**Current State**  
Discovery is primarily driven by horizontal category selection and text search on the homepage.

**Problem**  
Ecosystem tags (`#TypeScript`, `#DevSecOps`, `#LLM`) displayed on cards are plain text and non-interactive.

**Impact**  
Users cannot explore cross-category niches (e.g. all open-source developer utilities regardless of primary category).

**Recommended Solution**  
- Make tags on product cards interactive: clicking a tag navigates to `/products?tag=[tag]` or filters the active discovery view.
- Provide a clean pricing filter: `All`, `Free / Freemium`, `Paid`, `Open Source`.

**Priority:** P2  
**Affected Files / Components:**
- `frontend/src/components/product/ProductCard.tsx`
- `frontend/src/app/page.tsx`  
**Dependencies:** Backend product filtering API  
**Acceptance Criteria:**
- Clicking a tag filters products by that tag.
- Pricing filter correctly narrows product results.

---

## 13. Trending

### Momentum & Velocity Discovery

**Current State**  
`frontend/src/app/trending/page.tsx` queries `/leaderboard/trending` (which currently fails and falls back to `/products?sort=trending`).

**Problem**  
The backend route is mounted at `/api/v1/leaderboards/trending` (plural), but the frontend client queries `/leaderboard/trending` (singular), causing an unnecessary 404 and fallback query.

**Impact**  
Fails to utilize the Redis-cached 7-day rolling decayed score (`S_trending`) calculated by the backend.

**Recommended Solution**  
- Fix the API client call to target the verified endpoint: `GET /api/v1/leaderboards/trending`.
- Display momentum indicators based on actual backend data. Do not fabricate frontend velocity calculations.
- Provide timeframe filtering (e.g. 24 Hours vs 7 Days) if supported by the backend.

**Priority:** P0  
**Affected Files / Components:**
- `frontend/src/app/trending/page.tsx`  
**Dependencies:** Backend `GET /api/v1/leaderboards/trending`  
**Acceptance Criteria:**
- API call resolves with HTTP 200 from `/api/v1/leaderboards/trending`.
- Trending products reflect true backend momentum scores.

---

## 14. Leaderboard

### Daily UTC Marquee Leaderboard

**Current State**  
`frontend/src/app/leaderboards/page.tsx` displays products ranked by score, a countdown timer to midnight UTC, and a date picker for historical dates.

**Problem**  
1. Podium display can easily become overly gamified with excessive crowns, trophies, and gold effects.
2. Mutable live data must not be confused with finalized daily winners.

**Impact**  
Excessive gamification undermines the platform's professional, serious positioning.

**Recommended Solution**  
- **Editorial Ranking Presentation:**
  - Rank `#01`: Refined midnight navy / subtle gold accent border, distinct rank badge, elevated card surface.
  - Rank `#02`: Slate border, silver rank badge.
  - Rank `#03`: Slate border, bronze rank badge.
  - Avoid oversized trophies, cartoon crowns, or animated confetti.
- **Snapshot Integrity:** Clear demarcation between **Active Daily Race** (live, updating until 00:00:00 UTC) and **Historical Winners** (immutable daily snapshots fetched from `GET /api/v1/leaderboards/daily/:date`).
- **Countdown Timer:** Live countdown formatted as `00h 00m 00s (UTC)` with a hydration guard to prevent SSR mismatches.

**Priority:** P1  
**Affected Files / Components:**
- `frontend/src/app/leaderboards/page.tsx`  
**Dependencies:** Backend `GET /api/v1/leaderboards/today` & `/api/v1/leaderboards/daily/:date`  
**Acceptance Criteria:**
- Top 3 items have clear editorial hierarchy without gaming visuals.
- Daily winners are strictly immutable once archived at midnight UTC.
- Countdown timer matches UTC time accurately without client hydration warning.

---

## 15. Categories

### Category Directory & Vertical Pages

**Current State**  
`categories/page.tsx` renders a directory of 8 core categories. `categories/[slug]/page.tsx` displays products within that category.

**Problem**  
Category directory cards contain hardcoded mock counts and static gradients rather than live data from the backend.

**Impact**  
Displays inaccurate metrics to visitors and feels disconnected from actual platform activity.

**Recommended Solution**  
- Connect category cards to `GET /api/v1/categories`, displaying true product counts.
- Standardize vertical category detail routes to canonical slugs: `/categories/ai-tools`, `/categories/developer-tools`, `/categories/saas-b2b`, etc.

**Priority:** P2  
**Affected Files / Components:**
- `frontend/src/app/categories/page.tsx`
- `frontend/src/app/categories/[slug]/page.tsx`  
**Dependencies:** Backend `GET /api/v1/categories`  
**Acceptance Criteria:**
- Category listing displays real product counts from backend response.
- All category routes load without 404 errors.

---

## 16. Submit Launch

### Guided Founder Submission Workflow

**Current State**  
`submit/page.tsx` implements a 4-step wizard: URL Input & Scraper Trigger -> Metadata Editing -> Domain Verification Challenge -> Schedule & Launch.

**Problem**  
1. When scraping takes time, the UI displays a generic spinner without informing the user what is happening.
2. Step navigation can reset draft inputs if the user navigates back to check a previous step.
3. DNS TXT record instructions lack a copyable command snippet for technical founders.

**Impact**  
High abandonment rate during submission; founders feel uncertain whether the scraper is working or stuck.

**Recommended Solution**  
- **Scraper Telemetry (Transparent States):**
  - Communicate actual backend job states from `GET /api/v1/products/scrape-status/:jobId`:
    - *"Connecting to website..."*
    - *"Extracting title, description, and metadata..."*
    - *"Analyzing OpenGraph assets..."*
    - *"Draft populated. Ready for review."*
  - Never display fake percentage counters (e.g. "47% complete").
- **Reliable Draft Persistence:** Ensure form state is backed by `sessionStorage` (`lp_submit_draft`) so navigating back and forth across steps never loses entered data.
- **Copyable Verification Commands:** Provide 1-click copy for DNS verification:
  ```bash
  # Check your DNS TXT record
  dig TXT yourdomain.com +short
  ```
- **Fallback:** If scraping encounters an error, immediately offer a clean manual submission form.

**Priority:** P0  
**Affected Files / Components:**
- `frontend/src/app/submit/page.tsx`  
**Dependencies:** Backend `POST /api/v1/products/submit-url` & `GET /api/v1/products/scrape-status/:jobId`  
**Acceptance Criteria:**
- Real scraping states displayed without fake percentages.
- Step navigation preserves all entered form data.
- 1-click copy for DNS TXT tokens and CLI verification command.

---

## 17. Authentication

### Passwordless Magic Link & OAuth Flow

**Current State**  
`frontend/src/app/auth/page.tsx` and `AuthModal.tsx` support passwordless magic links (`POST /api/v1/auth/magic-link`) and OAuth redirects (`/api/v1/auth/oauth/:provider`).

**Problem**  
1. `AuthModal` does not trap focus when opened via an unauthenticated upvote click.
2. The modal background allows body scroll while open.
3. Social login buttons lack immediate visual feedback on click.

**Impact**  
Accessibility violation for keyboard users and potential duplicate clicks during OAuth redirects.

**Recommended Solution**  
- **Focus Management:** Trap focus inside `AuthModal` using standard React keyboard handlers or focus-trap utility; restore focus to the triggering element upon close.
- **Body Scroll Lock:** Set `document.body.style.overflow = 'hidden'` while modal is mounted.
- **Button Feedback:** Display an inline spinner on OAuth buttons once clicked to confirm the browser is redirecting.
- **Clear Resend Rules:** Enforce a 60-second cooldown timer before allowing another magic link request.

**Priority:** P1  
**Affected Files / Components:**
- `frontend/src/components/auth/AuthModal.tsx`
- `frontend/src/app/auth/page.tsx`  
**Dependencies:** Backend auth endpoints  
**Acceptance Criteria:**
- Keyboard Tab navigation is strictly trapped inside the open modal.
- Body scroll is prevented while modal is open.
- Escape key closes modal and restores focus.

---

## 18. Founder Dashboard

### Actionable Founder Command Center

**Current State**  
`dashboard/page.tsx` is an 1,100-line monolithic client file containing stat cards, charts, product switching, edit modals, and badge generator.

**Problem**  
1. The dashboard uses synthetic client-side fallback calculations (`p.upvotesCount * 4 + 38` for clicks, `Math.min(...)` for CTR) instead of calling the actual backend analytics endpoint.
2. The component is overloaded, making state maintenance and testing difficult.

**Impact**  
Founders see estimated numbers rather than real telemetry. Codebase maintainability is severely compromised.

**Recommended Solution**  
1. **Decompose into Modular Sub-Components:**
   - `DashboardMetricsOverview.tsx`: Stat cards (Impressions, Clicks, CTR, Upvotes).
   - `DashboardPerformanceChart.tsx`: Daily traffic and engagement chart.
   - `DashboardProductSwitcher.tsx`: Dropdown to toggle between founder's products.
   - `DashboardBadgeGenerator.tsx`: Embeddable markdown/HTML badge code.
   - `DashboardProductEditModal.tsx`: Form to update tagline, description, links.
2. **Utilize Verified Backend Analytics:**
   - Query verified endpoint: `GET /api/v1/analytics/products/:id?days=30`.
   - Map real data fields: `summary.totalImpressions`, `summary.totalOrganicClicks`, `summary.organicCtr`, `dailyMetrics`.
3. **Actionable Empty States:** If a product has no analytics yet, display a clear message:
   - *"No traffic recorded yet. Your launch will start collecting impressions and outbound click telemetry once live."*
   - Never fabricate numbers or show fake charts to fill space.

**Priority:** P0  
**Affected Files / Components:**
- `frontend/src/app/dashboard/page.tsx`
- New sub-components in `frontend/src/components/dashboard/`  
**Dependencies:** Backend `GET /api/v1/analytics/products/:id`  
**Acceptance Criteria:**
- Dashboard renders verified data from `/api/v1/analytics/products/:id`.
- Zero client-side math estimates for CTR or clicks.
- Monolithic file decomposed into clean, focused components.

---

## 19. Campaigns

### Transparent Sponsored Distribution

**Current State**  
`promote/page.tsx` outlines 4 sponsorship tiers (Launch Boost, Category Featured, Homepage Spotlight, Launch Partner) with feature lists and slot availability.

**Problem**  
Pricing figures in UI documents may drift from business strategy. Visual presentation of sponsored cards must never mimic organic rank winners.

**Impact**  
Risk of misrepresenting commercial terms or compromising organic trust.

**Recommended Solution**  
- **Monetization Policy:** Focus the UI plan on **placement hierarchy, disclosure, and UX states**. Treat specific price points as configurable via backend or configuration file:
  - *"Tier pricing requires verification against authoritative monetization specification during implementation."*
- **Visual Separation:**
  - Sponsored placements must carry an unambiguous `Promoted` or `Sponsored` badge.
  - Sponsored cards must use the distinct warm-amber surface token (`bg-amber-500/5`, border `border-amber-300/40`).
  - Sponsored products must **never** display an organic rank badge (`#01`, `#02`) in their sponsored slot.
  - Card click tracking routes through `/api/v1/clicks/:productId?source=sponsored`.

**Priority:** P1  
**Affected Files / Components:**
- `frontend/src/app/promote/page.tsx`
- `frontend/src/components/product/ProductCard.tsx`  
**Dependencies:** Backend campaign and click tracking API  
**Acceptance Criteria:**
- Explicit "Promoted" disclosure visible on all sponsored placements.
- Sponsored cards never display organic numeric rank badges.
- Outbound clicks recorded with `source=sponsored`.

---

## 20. Analytics

### Real Aggregated Telemetry

**Current State**  
Raw click events are processed by `analytics.controller.ts` via Redis/BullMQ. Aggregated stats are queried via `GET /api/v1/analytics/products/:id`.

**Problem**  
The frontend dashboard currently bypasses this endpoint and attempts to read non-existent nested properties on the product model.

**Impact**  
The entire analytics pipeline built in the backend is unused in the presentation layer.

**Recommended Solution**  
- Connect `DashboardPerformanceChart` directly to `data.dailyMetrics` returned by the backend:
  - `impressions` (Daily views)
  - `organicClicks` (Outbound visits)
  - `votes` (Community upvotes)
- Render charts using clean, accessible SVG paths or lightweight charting without heavy runtime bloat.
- Display Referrer breakdown table using `data.referrerBreakdown` (`referrer`, `count`).

**Priority:** P1  
**Affected Files / Components:**
- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/components/dashboard/DashboardPerformanceChart.tsx`  
**Dependencies:** Backend `GET /api/v1/analytics/products/:id`  
**Acceptance Criteria:**
- Daily metrics accurately plot real impressions and outbound clicks.
- Referrer table displays verified traffic sources.

---

## 21. Search

### Centralized Command Palette (`Cmd+K`)

**Current State**  
`CommandPalette.tsx` supports keyboard shortcuts, debounced search (`/api/v1/products?q=`), quick links, and category tags.

**Problem**  
Lines 24, 141, and 149 navigate to hash anchors (`/#trending`, `/#category-...`) instead of canonical routes.

**Impact**  
Causes page jumping, scroll disruption, and broken navigation when triggered from subpages.

**Recommended Solution**  
- Replace all hash links with canonical paths:
  - Trending: `/trending`
  - Categories: `/categories/[slug]`
- Add search result keyboard highlighting (`ArrowDown`, `ArrowUp`, `Enter`).
- Ensure accessible dialog attributes: `role="dialog"`, `aria-modal="true"`, `aria-label="Search products and categories"`.

**Priority:** P0  
**Affected Files / Components:**
- `frontend/src/components/search/CommandPalette.tsx`  
**Dependencies:** Canonical routing  
**Acceptance Criteria:**
- Zero hash anchors in Command Palette navigation.
- Full keyboard accessibility with Escape key focus restoration.

---

## 22. Loading / Empty / Error

### Unified State System

#### Loading States
- **Card Grids & Lists:** Shimmer wave skeleton using CSS keyframe animation (`skeleton-shimmer`). Avoid high-contrast flashing `animate-pulse`.
- **Buttons & Inline Actions:** Subtle 16px spinner (`Loader2` icon with `animate-spin`) with disabled interaction state.
- **Never blanket the entire viewport with shimmer.** Keep navigation and layout chrome static.

#### Empty States
Every empty state must follow the **3-Part Structure**:
1. **What happened:** Clear, concise headline (e.g. *"No products found in AI Agents"*).
2. **Why:** Contextual explanation (e.g. *"No products have launched in this category for the selected timeframe."*).
3. **What to do next:** Direct action CTA (e.g. *"Be the first to launch an AI Agent"* -> Link to `/submit?category=ai-agents`).

#### Error States
- **Network / API Failures:** Inline card with retry trigger: *"Unable to load launches. [Retry Connection]"*.
- **Validation Errors:** High-contrast text directly below form inputs using `text-status-error` (`#EF4444`).
- **Rate Limit (429):** Actionable notice: *"Too many requests. Please wait a few seconds before trying again."*

**Priority:** P1  
**Affected Files / Components:**
- `frontend/src/app/page.tsx`
- `frontend/src/app/loading.tsx`
- `frontend/src/app/error.tsx`  
**Dependencies:** Frontend presentation components  
**Acceptance Criteria:**
- Smooth horizontal shimmer replaces flashing pulse skeletons.
- All empty states provide actionable next steps.
- Retry handlers successfully re-fetch failed API requests.

---

## 23. Responsive Design

### Multi-Device Viewport Standards

| Viewport | Range | Key Requirements |
| :--- | :--- | :--- |
| **Mobile** | 320px – 639px | Numeric rank `#01` visible on card; category pills horizontal rail; touch targets ≥ 44x44px; hamburger navigation. |
| **Tablet** | 640px – 1023px | 2-column dashboard layout; search shortcut condensed; cards show category + pricing pills. |
| **Desktop** | 1024px – 1440px | Full navbar with Command Palette trigger; 3-column product detail layout; extended metadata tags. |
| **Wide** | > 1440px | Content strictly clamped to `max-w-7xl` (1280px) centered with balanced margins. |

**Priority:** P0  
**Affected Files / Components:**
- All component and page layouts  
**Dependencies:** Tailwind responsive utilities  
**Acceptance Criteria:**
- Zero horizontal overflow across all viewports from 320px upwards.
- Rank remains visible on mobile product cards.
- Interactive touch targets meet the ~44x44px standard.

---

## 24. Accessibility (WCAG 2.2 AA)

### Strict Compliance Directives

1. **Color Contrast:**
   - Body text on canvas: Minimum 4.5:1 ratio.
   - Large headings (>24px): Minimum 3.0:1 ratio.
   - Update `text-muted` from `#94A3B8` (2.5:1 on white) to `#64748B` (4.6:1 on white) to pass AA standards.
2. **Keyboard Focus:**
   - Eliminate all instances of unhandled `focus:outline-none`.
   - Apply standard visible focus ring: `focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2`.
3. **Semantic Markup & ARIA:**
   - `UpvoteButton`: Include `aria-pressed={hasVoted}` and descriptive `aria-label`.
   - Modals: Proper `role="dialog"` with focus trap and background aria-hidden.
4. **Motion Accessibility:**
   - Enforce `prefers-reduced-motion: reduce` across all animations:
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

**Priority:** P0  
**Affected Files / Components:**
- `frontend/src/app/globals.css`
- `frontend/src/components/product/UpvoteButton.tsx`
- `frontend/src/components/auth/AuthModal.tsx`  
**Dependencies:** CSS tokens, ARIA attributes  
**Acceptance Criteria:**
- Automated accessibility audit achieves zero critical or serious WCAG 2.2 AA violations.
- Full keyboard navigation supported across the entire discovery flow.

---

## 25. Animation & Motion

### Standardized Motion Budget

**Core Philosophy:** *"Static at first glance, alive on interaction."*

| Scale | Duration | Easing Curve | Use Case |
| :--- | :--- | :--- | :--- |
| **Micro** | 100ms – 180ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Button press, toggle state, active scale |
| **Component**| 180ms – 250ms | `cubic-bezier(0.4, 0, 0.2, 1)` | Card hover, dropdown popover, tooltip entrance |
| **Content** | 250ms – 400ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Modal entrance, drawer slide-in, tab line switch |
| **Data/Rank**| 300ms – 600ms | `cubic-bezier(0.16, 1, 0.3, 1)` | Layout-preserving rank position shift |
| **Special** | 500ms – 800ms | `cubic-bezier(0.175, 0.885, 0.32, 1.275)` | Upvote celebration / launch confirmation |

### Upvote Interaction Sequence
1. **Click:** Immediate optimistic UI update (`count + 1`, button transitions to `bg-primary text-white`).
2. **Micro-Motion:** Subtle scale to `1.05` for 150ms before returning to `1.0`. Chevron nudges `-2px` upward.
3. **Count Transition:** Numeric counter transitions smoothly with a 150ms crossfade.
4. **Rollback Safety:** If backend returns 401 or error, roll back count immediately without layout jitter and open `AuthModal`.
5. **No Excessive Gamification:** Avoid full-screen confetti, fireworks, or coin sounds.

### Ranking Movement Motion
- When live ranks update, cards shift smoothly via CSS `transform: translateY(...)`.
- Direction indicator (`▲ +2` or `▼ -1`) appears briefly for 3 seconds before fading.
- Never animate fake rank changes if data has not changed.

**Priority:** P1  
**Affected Files / Components:**
- `frontend/src/components/product/UpvoteButton.tsx`
- `frontend/src/components/product/ProductCard.tsx`  
**Dependencies:** CSS keyframes, optimistic state  
**Acceptance Criteria:**
- Upvote interaction finishes within 300ms.
- Rank movement animates only on true data changes.
- Animations disabled under `prefers-reduced-motion`.

---

## 26. SEO / Social / OG

### Search Engine & Social Optimization

- **Canonical URL Enforcement:** Every public product page must output:
  ```html
  <link rel="canonical" href="https://launchproduct.com/products/[slug]" />
  ```
- **Dynamic OpenGraph Metadata:** Generate accurate 1200x630px social preview cards via `backend/src/routes/og.routes.ts` or Next.js `opengraph-image.tsx`.
- **JSON-LD Structured Data:** Embed valid `SoftwareApplication` schema:
  ```json
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Product Name",
    "applicationCategory": "DeveloperApplication",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    }
  }
  ```
- **Truthful Indexing:** Only mark data as verified in metadata if verified by the backend. Do not make unverified claims of rich-snippet guarantees.

**Priority:** P1  
**Affected Files / Components:**
- `frontend/src/app/products/[slug]/page.tsx`  
**Dependencies:** Next.js Metadata API  
**Acceptance Criteria:**
- Valid canonical URL present in page head.
- OpenGraph tags pass validation on social card debuggers.

---

## 27. Performance

### Web Vitals & Asset Discipline

- **Typography Loading:** Load `Poppins` using `next/font/google` with `display: swap` and `subsets: ['latin']` to achieve zero Cumulative Layout Shift (CLS = 0).
- **Image Optimization:** Enforce `next/image` with explicit `width`, `height`, and responsive `sizes` attribute across all product cards to prevent hydration reflows.
- **Bundle Weight:** Avoid heavy runtime animation packages. Utilize native CSS transitions and Tailwind utility classes.
- **Latency Standards:**
  - Outbound click redirect (`/api/v1/clicks/:productId`): ≤ 25ms p95 latency.
  - Initial server-rendered discovery feed: First Contentful Paint (FCP) < 1.2s.

**Priority:** P1  
**Affected Files / Components:**
- `frontend/src/app/layout.tsx`
- `frontend/src/components/product/ProductCard.tsx`  
**Dependencies:** Next.js build configuration  
**Acceptance Criteria:**
- Lighthouse Performance score ≥ 90 on desktop.
- CLS score < 0.05.

---

## 28. Domain / Auth / CORS Considerations

### Cross-Domain Communication Architecture

```
launchproduct.com (Marketing & Discovery) <---+
                                              |-- SameSite=Lax Session Cookie
app.launchproduct.com (Authenticated SaaS) <--+   (Signed Token: 'sessionToken')
                      |
                      v
api.launchproduct.com (Express REST API)
  - CORS Allowlist: ['https://launchproduct.com', 'https://app.launchproduct.com']
  - Credentials: true
```

### Verified Implementation Requirements
1. **Cookie Configuration:**
   - Verified backend cookie name: `sessionToken` (defined in `auth.controller.ts`).
   - Flags: `httpOnly: true`, `secure: process.env.NODE_ENV === 'production'`, `sameSite: 'lax'`, `path: '/'`.
   - *Verification Item:* For cross-subdomain cookie sharing between `launchproduct.com` and `app.launchproduct.com`, backend `getCookieOptions()` must configure `domain: process.env.COOKIE_DOMAIN` (e.g. `.launchproduct.com`). This must be verified in staging.
2. **CORS Allowlist:**
   - `backend/src/server.ts` must allow both `https://launchproduct.com` and `https://app.launchproduct.com` with `credentials: true`.
3. **CSRF Mitigation:** Verify custom header `x-requested-with` or CSRF token validation on all state-mutating endpoints (`POST`, `PUT`, `DELETE`).

**Priority:** P0  
**Affected Files / Components:**
- `backend/src/server.ts`
- `backend/src/controllers/auth.controller.ts`  
**Dependencies:** Express server configuration, domain DNS  
**Acceptance Criteria:**
- Cross-origin credentials function reliably between domains.
- Session cookie persists across marketing and app subdomains in production.

---

## 29. Implementation Roadmap

The implementation is structured into **12 logical, non-disruptive phases**:

```
[Phase 1: Design System Foundation]
              ↓
[Phase 2: Navigation + Homepage]
              ↓
[Phase 3: Product Card + Discovery]
              ↓
[Phase 4: Product Detail + Reviews + Voting]
              ↓
[Phase 5: Search + Categories + Trending + Leaderboard]
              ↓
[Phase 6: Submit Launch Flow]
              ↓
[Phase 7: Founder Dashboard + Campaigns + Analytics]
              ↓
[Phase 8: Animation & Interaction Refinement]
              ↓
[Phase 9: Responsive + Accessibility]
              ↓
[Phase 10: Marketing/App Domain Architecture]
              ↓
[Phase 11: SEO + OG + Structured Data]
              ↓
[Phase 12: Performance + Final QA]
```

### Phase Breakdown

- **PHASE 1: Design System Foundation** `[COMPLETED]`
  - Standardize CSS variables in `globals.css` and tokens in `tailwind.config.ts`.
  - Normalize surface, brand, status, and sponsored color tokens.
  - Standardize radius (12px, 16px, 24px) and shadow tokens.
- **PHASE 2: Navigation + Homepage** `[COMPLETED]`
  - Clean up `Footer.tsx` (remove localhost links; add public docs/status links).
  - Consolidate search in `Navbar.tsx` into Command Palette trigger.
  - Refactor `page.tsx` hero and discovery feed layout; remove redundant inline search bar.
- **PHASE 3: Product Card + Discovery** `[COMPLETED]`
  - Add mobile-visible numeric rank to `ProductCard.tsx`.
  - Remove hover scale on raster logos; add container border elevation.
  - Standardize category and pricing pills onto semantic tokens.
  - Implement interactive ecosystem tag filtering and outbound click tracking query attribution.
- **PHASE 4: Product Detail + Reviews + Voting** `[COMPLETED]`
  - Refine `ProductDetailClient.tsx` layout and founder card trust indicators.
  - Add keyboard-accessible fullscreen lightbox to `MediaGallery.tsx` with Esc and Arrow navigation.
  - Implement accessible 1-click share popover (X/Twitter, LinkedIn, Copy URL, Embed Badge) and native Web Share.
  - Wire canonical URLs and `SoftwareApplication` JSON-LD structured data in `products/[slug]/page.tsx`.
- **PHASE 5: Search + Categories + Trending + Leaderboard** `[COMPLETED]`
  - Fix Command Palette navigation: replace hash anchors with canonical routes (`/trending`, `/leaderboards`, `/categories`).
  - Correct trending API call to verified plural endpoint `/api/v1/leaderboards/trending`.
  - Upgrade `leaderboards/page.tsx` with editorial podium visual (Gold #1, Silver #2, Bronze #3) and live UTC countdown with hydration guard.
  - Connect `categories/page.tsx` to live backend category metrics.
- **PHASE 6: Submit Launch Flow** `[COMPLETED]`
  - Implemented phased transparent scraper telemetry pipeline (Phase 1-4 with elapsed timer and manual fallback) in `submit/page.tsx`.
  - Added copyable DNS TXT verification CLI command snippet (`dig TXT <domain> +short`) with terminal styling and 1-click clipboard integration.
  - Standardized multi-step draft persistence, domain challenge tokens, and semantic tokens across all wizard steps.
- **PHASE 7: Founder Dashboard + Campaigns + Analytics** `[COMPLETED]`
  - Decomposed monolithic `dashboard/page.tsx` into 5 focused sub-components (`DashboardMetricsOverview`, `DashboardPerformanceChart`, `DashboardProductSwitcher`, `DashboardBadgeGenerator`, `DashboardProductEditModal`).
  - Connected `DashboardPerformanceChart` to real backend analytics (`GET /api/v1/analytics/products/:id?days=N`) with SVG rendering, truthful empty states, and referrer breakdown.
  - Standardized `promote/page.tsx` with high-integrity commercial policy, explicit amber `source=sponsored` disclosures, real-time inventory calendar, and semantic tokens.
- **PHASE 8: Animation and Interaction Refinement** `[COMPLETED]`
  - Replaced flashing `animate-pulse` wireframe skeletons with smooth CSS gradient shimmer wave (`.skeleton-shimmer`) across `ReviewList`, `categories/page.tsx`, `categories/[slug]/page.tsx`, `loading.tsx`, and `leaderboards/page.tsx`.
  - Standardized micro-interaction duration tokens (`120ms`, `180ms`, `200ms`, `250ms`, `300ms`, `350ms`) in `tailwind.config.ts`.
  - Verified accessible spring micro-motion on `UpvoteButton` and data-driven rank transitions.
- **PHASE 9: Responsive + Accessibility** `[COMPLETED]`
  - Validated mobile viewports (320px–420px) across `/`, `/leaderboards`, and `/categories` with zero horizontal overflow (`scrollWidth <= innerWidth`).
  - Verified touch targets, mobile hamburger drawer, category horizontal swipe rail, and rank pill visibility (`#01`).
  - Elevated text contrast to pass WCAG 2.2 AA standards (>4.6:1 for text-muted, >4.8:1 for text-secondary).
  - Enforced keyboard focus visibility (`focus-ring`), `aria-pressed`/`aria-label` screen reader support, and `prefers-reduced-motion` overrides.
- **PHASE 10: Marketing/App Domain Architecture** `[COMPLETED]`
  - Created Next.js `middleware.ts` for clean multi-domain request handling (`launchproduct.com` for marketing/discovery and `app.launchproduct.com` for SaaS founder workspace).
  - Configured backend CORS allowlist in `server.ts` to allow `https://launchproduct.com` and `https://app.launchproduct.com` with `credentials: true`.
  - Configured backend session cookie domain delegation (`domain: process.env.COOKIE_DOMAIN`) in `auth.controller.ts` for seamless cross-subdomain authentication.
- **PHASE 11: SEO + OG + Structured Data** `[COMPLETED]`
  - Standardized canonical URLs across root `layout.tsx`, `products/[slug]/page.tsx`, and `categories/[slug]/page.tsx` pointing to official `https://launchproduct.com` domain.
  - Verified dynamic 1200x630 OpenGraph and Twitter summary_large_image generation via `backend/src/controllers/og.controller.ts` with Sharp and Redis caching.
  - Embedded validated `SoftwareApplication` JSON-LD structured data schema (name, headline, offers, ratings) on product detail pages.
- **PHASE 12: Performance + Final QA** `[COMPLETED]`
  - Verified font optimization with `next/font/google` (`Poppins` with `display: swap`) and responsive image loading with `next/image` ensuring zero layout shift.
  - Executed end-to-end browser subagent QA regression runs across `/`, `/leaderboards`, `/categories`, and `/products/[slug]`, validating error-free console and smooth hydration.
  - Confirmed 100% adherence to all 10 acceptance criteria (tokens, security, truthful discoverability, commercial disclosures, accessibility, and zero TypeScript compiler errors).

---

## 30. Acceptance Criteria

1. **Tokens & Styling:** Zero arbitrary hex or non-semantic color classes in component JSX.
2. **Infrastructure Security:** Zero `localhost` URLs or internal port references in client code or public links.
3. **Mobile Ranking:** Verified numeric rank is visible and legible on mobile screens (<640px).
4. **Routing Integrity:** All Command Palette quick links and categories navigate to canonical URLs without hash anchor drift.
5. **Analytics Integrity:** Founder dashboard renders verified data from `/api/v1/analytics/products/:id` with zero client-side fabricated metrics.
6. **Accessibility:** Lighthouse Accessibility score achieves ≥ 95 on desktop and mobile viewports with zero critical WCAG AA contrast failures.
7. **Loading UX:** Skeletons utilize a smooth horizontal shimmer wave without flashing pulse artifacts.
8. **Brand Preservation:** Poppins typography, approved logo assets, and core brand colors are strictly preserved.

---

## 31. Definition of Done

The UI/UX Refinement phase is officially complete when:
- All 12 implementation phases have been sequentially executed and verified in code.
- The platform presents a cohesive, high-integrity discovery experience that feels globally authoritative and serious.
- Organic discovery and sponsored promotions are unambiguously demarcated without compromising trust.
- Every user flow operates without visual regressions, console errors, or hydration warnings across all supported viewports.

---

## 32. Open Verification Items

The following items are explicitly flagged for verification during implementation:
1. **Cookie Domain Setting:** Verify whether `domain: process.env.COOKIE_DOMAIN` (e.g. `.launchproduct.com`) can be applied in `auth.controller.ts` without breaking local development on `localhost`.
2. **CORS Allowlist in Production:** Verify dynamic origin callback in `server.ts` to accommodate staging preview domains alongside production domains.
3. **UTC Countdown Hydration:** Ensure the client-side countdown timer in `leaderboards/page.tsx` mounts only after initial client hydration to prevent SSR HTML mismatch warnings.
4. **Sponsorship Tier Pricing:** Verify final commercial pricing tiers with business and product stakeholders prior to launching the updated `promote/page.tsx` interface.
