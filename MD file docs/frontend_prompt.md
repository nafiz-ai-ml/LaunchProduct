# LaunchProduct — Frontend Build Prompts (`frontend_prompt.md`)

**Project:** LaunchProduct — Product Discovery & Growth Platform  
**Architecture:** Next.js 14+ (App Router) + TypeScript + Tailwind CSS | Presentation Layer  
**Target Backend:** Express.js 4/5 REST API (Port 4000)  
**Primary Brand:** LaunchProduct  
**Primary Font:** Poppins (Google Fonts)  
**Reference Files:** `PRD.md`, `System Architecture.md`, `UI-UX.md`, `API Specification.md`, `database-schema.md`, `prompt.md`  
**Build Order:** Design System Tokens → Shared API Clients → Shell & Navigation → Auth Flow → Homepage Discovery → Leaderboard & Podiums → Product Details & Reviews → Product Submission Wizard → Founder Dashboard → Admin Moderation → Sponsorship & Promote → Error States & Skeletons

---

## Mandatory Directives for Frontend Agents

1. **Strictly Follow `UI-UX.md`:** All colors, spacing, borders, shadows, and interactive states must conform to the authoritative design system tokens.
2. **Poppins Typography:** Use Poppins (`--font-primary`) for display, headings, body, and navigation. Use monospace (`--font-mono`) strictly for rankings, codes, and numerical stats.
3. **Official Brand Assets:** Use `/public/brand/` logo and icon assets via `<Logo />` and `<BrandIcon />` components. Never invent or distort logos.
4. **Organic vs. Sponsored Demarcation:** Sponsored cards and banners must feature distinct Amber borders, warm backgrounds (`bg-amber-500/5`), and explicit sponsor badges.
5. **No Full-Page Blocking Spinners:** Use skeleton shimmer placeholders matching card layouts (`animate-pulse bg-slate-200 dark:bg-slate-800`).
6. **Optimistic UI:** Upvote interactions must increment instantaneously on click with smooth rollback and toast notification upon API rejection.
7. **Clean Separation of Concerns:** Server components for initial metadata/SEO; Client components (`'use client'`) for interactive widgets, modals, forms, and optimistic states.

---

# PHASE F0 — DESIGN SYSTEM, TOKENS & API CLIENT LAYER

---

## PROMPT F0.1 — Tailwind CSS & Design System Tokens Setup

```
You are a Senior Frontend Engineer. Configure Tailwind CSS and CSS design tokens for LaunchProduct matching UI-UX.md Sections 5-11.

Files:
- frontend/tailwind.config.ts
- frontend/src/app/globals.css

Requirements:
1. Configure Tailwind with dark mode class strategy ('class').
2. Define authoritative brand colors:
   - Primary Electric Blue: #0653FD (hover: #0543D6, active: #0436B0, subtle: #EFF4FF)
   - Secondary Midnight Navy: #00214E
   - Dark surfaces: Canvas #090D16, Card #0F172A, Elevated #1E293B, Recessed #060910
   - Light surfaces: Canvas #F8FAFC, Card #FFFFFF, Elevated #FFFFFF, Sunken #F1F5F9
   - Sponsored demarcation: Amber #F59E0B / #B45309, background tint, border #FCD34D
   - Status colors: Success #10B981, Warning #F59E0B, Error #EF4444, Info #0653FD
3. Define Poppins font family with robust fallbacks:
   - sans: ['var(--font-poppins)', 'Poppins', 'Inter', 'system-ui', 'sans-serif']
   - mono: ['JetBrains Mono', 'Fira Code', 'Consolas', 'monospace']
4. Define standard elevation box-shadows:
   - card: '0 1px 3px 0 rgba(0, 0, 0, 0.05), 0 1px 2px -1px rgba(0, 0, 0, 0.05)'
   - hover: '0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04)'
   - brand-glow: '0 0 20px -3px rgba(6, 83, 253, 0.35)'
   - amber-glow: '0 0 20px -3px rgba(245, 158, 11, 0.35)'
5. In globals.css, declare all root CSS custom properties, light/dark variables, smooth scroll behavior, and custom scrollbar styles.
```

---

## PROMPT F0.2 — Authoritative API Client & Shared TypeScript Interfaces

```
You are a Senior Frontend Engineer. Implement the HTTP API client and TypeScript interfaces connecting the frontend to the Express REST API.

Files:
- frontend/src/lib/api-client.ts
- frontend/src/lib/auth-client.ts
- frontend/src/types/index.ts

Requirements:
1. In frontend/src/types/index.ts, export comprehensive TypeScript interfaces:
   - User: { id, email, role ('VISITOR'|'HUNTER'|'FOUNDER'|'MODERATOR'|'ADMIN'), name?, avatarUrl?, karmaScore, isVerified }
   - Category: { id, slug, name, description, icon?, sortOrder, productCount? }
   - Product: { id, name, slug, tagline, description, category: Category|string, pricing: { model, startingPrice? }, websiteUrl, logoUrl, screenshots: string[], upvotesCount, reviewsCount, isVerified, isFeatured, isSponsored?, sponsorTier?, rank?: number, founder?: { id, name, avatarUrl } }
   - LeaderboardItem: { rank, product: Product, score, votesCount, movementDelta: number }
   - Review: { id, productId, user, rating, title, body, founderReply?, createdAt }
   - Campaign: { id, tier, status, scheduledDate, impressions, clicks }
2. In frontend/src/lib/api-client.ts:
   - Use Axios or fetch wrapper with baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'.
   - Enable credentials: true / withCredentials: true so session cookies are automatically dispatched.
   - Attach request interceptor for logging in dev.
   - Attach response interceptor extracting response.data.data and converting API errors into structured UI exceptions.
3. In frontend/src/lib/auth-client.ts:
   - Export helper functions: requestMagicLink(email), verifyMagicLink(token), getSessionUser(), logoutUser().
```

---

# PHASE F1 — GLOBAL SHELL, NAVIGATION & THEME

---

## PROMPT F1.1 — Root Layout, Poppins Font & Responsive Navigation Header

```
You are a Senior Frontend Engineer. Build the root layout, theme provider, and global navigation header according to UI-UX.md Section 17.

Files:
- frontend/src/app/layout.tsx
- frontend/src/components/layout/Navbar.tsx
- frontend/src/components/layout/Footer.tsx
- frontend/src/components/layout/ThemeProvider.tsx

Requirements:
1. In layout.tsx:
   - Import Google Font Poppins with weights 400, 500, 600, 700.
   - Set up standard HTML metadata (title: "LaunchProduct — High-Integrity Product Discovery & Growth Platform", description, OpenGraph tags, favicon).
   - Wrap application with ThemeProvider (dark/light support with localStorage persistence, default to system preference).
2. In Navbar.tsx (Height: 64px, Sticky top, backdrop-blur-md):
   - Desktop view:
     - Brand Logo linking to '/' with aspect ratio lock.
     - Search trigger bar with keyboard shortcut hint (Cmd/Ctrl + K).
     - Navigation links: "Trending Launches", "Leaderboards", "Categories", "Promote".
     - Actions: Dark/Light Mode toggle, "+ Submit Launch" button (Electric Blue), and User Avatar / "Sign In" button.
   - Mobile view (< 1024px):
     - Hamburger toggle opening slide-over drawer with all links, theme switch, and user profile state.
3. In Footer.tsx:
   - Brand wordmark, copyright notice, legal links (Privacy, Terms), API documentation link, and category shortcuts.
```

---

## PROMPT F1.2 — Command Palette Search Overlay (`Cmd + K`)

```
You are a Senior Frontend Engineer. Implement the quick-search Command Palette overlay for LaunchProduct (UI-UX.md Section 24.3).

File: frontend/src/components/search/CommandPalette.tsx

Requirements:
1. Global keyboard listener for `Cmd + K` (Mac) and `Ctrl + K` (Windows/Linux) to toggle overlay open/closed.
2. Centered modal dialog with backdrop blur (`bg-slate-950/60 backdrop-blur-sm`).
3. Search input with debounce (200ms) that queries backend GET `/api/v1/products?q={query}`.
4. Categorized search results:
   - Quick Nav: "Daily Leaderboard", "Submit Product", "Founder Dashboard".
   - Products: Icon, product name, tagline, upvote count pill.
   - Categories: Matching vertical directories.
5. Keyboard navigation: Arrow Up/Down to navigate results, Enter to open, Escape to dismiss.
6. Empty search state: "No launches found matching '{query}'. Try a different keyword or submit your tool."
```

---

# PHASE F2 — AUTHENTICATION MODULE (MAGIC LINK & OAUTH)

---

## PROMPT F2.1 — Authentication Page & Magic Link Flow

```
You are a Senior Frontend Engineer. Implement the dedicated Authentication page for LaunchProduct (UI-UX.md Section 29).

File: frontend/src/app/auth/page.tsx

Requirements:
1. Clean, focused centered auth card with LaunchProduct brand logo.
2. Form state management:
   - Initial state: Email input field with placeholder "founder@startup.com" + "Send Magic Link" primary button.
   - OAuth divider ("or continue with") with "Continue with Google" and "Continue with GitHub" buttons.
   - Loading state: Button spinner with disabled pointer events.
   - Success state: Animated envelope graphic with message: "Check your inbox! We sent a 15-minute login link to {email}." + "Resend link" button.
   - Error state: Friendly inline alert banner for validation or server errors.
3. API Integration:
   - Dispatch POST `/api/v1/auth/magic-link` with `{ email }`.
   - OAuth buttons link to `/api/v1/auth/oauth/google` and `/api/v1/auth/oauth/github`.
4. Security note footer: "We use passwordless magic links to keep your account safe. No passwords to remember or leak."
```

---

## PROMPT F2.2 — Magic Link Verification & Session Callback

```
You are a Senior Frontend Engineer. Implement the Magic Link token verification page for LaunchProduct.

File: frontend/src/app/auth/verify/page.tsx

Requirements:
1. Read `?token=` query parameter from the URL using `useSearchParams`.
2. While verifying:
   - Display a sleek centered card with a pulsing brand icon and text: "Securing your session... Verifying magic link".
3. API Call:
   - Call GET `/api/v1/auth/verify?token={token}`.
   - On 200 Success: Show green checkmark animation ("Authenticated successfully! Redirecting...") and push router to `/dashboard` or previous intended route.
4. On Error (e.g. 401 TOKEN_EXPIRED or 401 MAGIC_LINK_ALREADY_USED):
   - Display an error state card: "This sign-in link has expired or has already been used."
   - Provide a "Request New Magic Link" primary button redirecting back to `/auth`.
```

---

## PROMPT F2.3 — Reusable Interactive Auth Modal

```
You are a Senior Frontend Engineer. Create a reusable Auth Modal that can be invoked anywhere in the app when an unauthenticated user attempts an action (e.g. upvoting, submitting, or commenting).

File: frontend/src/components/auth/AuthModal.tsx

Requirements:
1. Modal overlay with smooth fade-in animation and ESC/backdrop click dismiss.
2. Accepts props: `isOpen: boolean`, `onClose: () => void`, `title?: string`, `subtitle?: string`.
3. Inlines the full magic link email submission and OAuth buttons.
4. After sending the magic link, switches view to the "Email Dispatched" confirmation step with close button.
```

---

# PHASE F3 — PRODUCT DISCOVERY & HOMEPAGE EXPERIENCE

---

## PROMPT F3.1 — Homepage Product Discovery Feed

```
You are a Senior Frontend Engineer. Implement the complete Product Discovery experience on the homepage (UI-UX.md Section 24).

File: frontend/src/app/page.tsx

Requirements:
1. Top Section: Marketplace Hero Value Prop with gradient backdrop, headline ("Where High-Integrity Products Launch & Grow"), anti-fraud integrity trust badges, and CTA buttons.
2. Category Navigation Bar:
   - Horizontal scrollable pill row: "All Launches", "AI Agents", "Developer Tools", "SaaS", "Productivity", "Marketing Tools", "SEO Tools", "Design Tools".
   - Clicking a pill filters the feed instantly.
3. Feed Controls Header:
   - Time range tabs: "Today's Launches", "Yesterday", "This Week".
   - Sort dropdown: "Trending Velocity", "Top Upvoted", "Most Discussed", "Newest".
   - Search filter input with live debounce.
4. Separation of Discovery Engines:
   - Top Slot: Sponsored Product Placement (if active) styled with Warm Amber card design, Gold badge ("Featured Launch Boost"), and transparent disclosure.
   - Main Feed: Organic product card list ordered by ranking score.
5. Integration:
   - Fetch live products from GET `/api/v1/products` with active query parameters.
   - Support pagination or "Load More Launches" infinite trigger.
   - Display skeleton loaders during category/tab switches.
```

---

## PROMPT F3.2 — Organic & Sponsored Product Cards with Optimistic Upvoting

```
You are a Senior Frontend Engineer. Build the official Product Card and Upvote Button components matching UI-UX.md Section 15 & 16.

Files:
- frontend/src/components/product/ProductCard.tsx
- frontend/src/components/product/UpvoteButton.tsx

Requirements:
1. In ProductCard.tsx:
   - Compact desktop & mobile responsive card layout.
   - Product rank indicator (#1 to #100) in bold mono font.
   - 48×48px product logo with rounded corners.
   - Product Title, verified founder checkmark, and 1-line concise tagline.
   - Category pill, pricing model badge ('Free', 'Freemium', 'Paid', 'Open Source').
   - Tags array and comments count with message bubble icon.
   - Direct link to internal `/products/[slug]` detail page.
   - Outbound visit button routing through `/api/v1/clicks/:id` with `?ref=launchproduct`.
2. In UpvoteButton.tsx:
   - Up-arrow icon + vote counter in bold font.
   - Micro-interaction: Scale-up spring bounce animation on click.
   - Optimistic update: Count increments/decrements immediately in UI.
   - Authenticated check: If user not logged in, intercepts click and opens `<AuthModal />`.
   - API Call: POST `/api/v1/votes` with `{ productId }`.
   - Reversal / Rate limit rollback: If backend returns 429 or error, rolls back count and fires toast.
3. Sponsored Card Variant:
   - Amber border (`border-amber-400/50`), subtle gold background highlight, and "Promoted / Launch Boost" badge with tooltip.
```

---

# PHASE F4 — LEADERBOARDS & DAILY FREEZE ARCHIVE

---

## PROMPT F4.1 — Daily Leaderboard & Top 3 Podium Page

```
You are a Senior Frontend Engineer. Build the official Leaderboard page with Top 3 Podium Cards and historical date freeze selector (UI-UX.md Section 26).

File: frontend/src/app/leaderboards/page.tsx

Requirements:
1. Header Section:
   - Page title: "Daily Product Leaderboard".
   - Live Countdown Banner to Midnight UTC (`00:00:00 UTC`): "Daily snapshot locks in [04h 12m 30s]".
   - Date picker selector allowing browsing past frozen historical leaderboards.
2. Top 3 Podium Hierarchy (UI-UX.md Section 26.1):
   - 3 prominent side-by-side cards (arranged #2 Silver, #1 Gold Center Elevated, #3 Bronze).
   - #1 Gold Card: Amber border glow, golden trophy icon (`#F59E0B`), enlarged logo, "Daily Winner" badge.
   - #2 Silver Card: Crisp slate medal accent.
   - #3 Bronze Card: Warm bronze medal accent.
   - Each card displays score, vote count, outbound link, and inline upvote trigger.
3. Leaderboard Table / Rows (#4 to #100):
   - Table showing Rank position, Logo, Product Name & Tagline, Category, 1-hour score movement delta (`▲ 2` green / `▼ 1` red), and Upvote Button.
4. API Integration:
   - Query GET `/api/v1/leaderboards?date={date}`.
   - If historical date selected, display immutable snapshot banner: "Immutable Snapshot — Frozen at 23:59:59 UTC".
```

---

# PHASE F5 — PRODUCT DETAIL & REVIEWS SHOWCASE

---

## PROMPT F5.1 — Product Detail Page Architecture

```
You are a Senior Frontend Engineer. Build the comprehensive Product Detail Page (`/products/[slug]`) adhering to UI-UX.md Section 25.

File: frontend/src/app/products/[slug]/page.tsx

Requirements:
1. Server Component Metadata:
   - Dynamic `generateMetadata()` generating page title (`{name} — {tagline} | LaunchProduct`), description, and OpenGraph image (`/api/og/{productId}`).
2. Hero Header Section:
   - 80×80px product logo, Name, Category pill, Verified Founder badge, and launch date.
   - Tagline in large body text (`text-xl text-slate-600 dark:text-slate-300`).
   - Action bar: Upvote button, Outbound "Visit Website ↗" button (tracking clicks via API), Share button, and Bookmark trigger.
3. Media & Screenshot Carousel:
   - Interactive gallery with thumbnail navigation and full-screen lightbox zoom.
4. Long-form Description:
   - Render sanitized markdown description of features, tech stack, and use cases.
5. Founder Profile Card:
   - Founder avatar, name, Twitter/X handle, and domain ownership status ("Verified Domain Owner via DNS_TXT").
6. Permanent Historical Rank Badges:
   - Showcase awards won (e.g. "#1 Product of the Day — Sept 24, 2026").
```

---

## PROMPT F5.2 — Community Reviews & Founder Replies (Phase 2 Feature)

```
You are a Senior Frontend Engineer. Implement the Reviews & Ratings module on the product detail page.

Files:
- frontend/src/components/reviews/ReviewList.tsx
- frontend/src/components/reviews/SubmitReviewModal.tsx

Requirements:
1. Review Summary Card:
   - Average star rating (1 to 5 stars), total verified reviews count, and rating distribution bars.
2. Review Cards:
   - Reviewer avatar, name, account age badge, star rating, review title, body text, and timestamp.
   - Founder Reply box: Indented nested card with "Founder Reply" badge.
3. Write Review Modal:
   - Rating star selector (1-5).
   - Title input and review body textarea (min 20 chars).
   - Conflict of interest disclosure checkbox: "I am not affiliated with or paid by this product."
   - API Call: POST `/api/v1/reviews` with `{ productId, rating, title, body, conflictOfInterestDisclosed }`.
```

---

# PHASE F6 — PROGRESSIVE PRODUCT SUBMISSION WIZARD

---

## PROMPT F6.1 — 4-Step Product Submission Wizard

```
You are a Senior Frontend Engineer. Implement the 4-step Product Submission flow with automated scraping and live card preview (UI-UX.md Section 28).

File: frontend/src/app/submit/page.tsx

Requirements:
1. Stepper Navigation Header showing current progress:
   - Step 1: URL & Extraction ➔ Step 2: Metadata & Polish ➔ Step 3: Domain Claim (Optional) ➔ Step 4: Schedule & Launch.
2. Step 1: URL & Instant Extraction:
   - Input: Landing page URL (`https://yourproduct.com`).
   - Call POST `/api/v1/products/submit-url`.
   - Polling / WebSocket state: Show animated radar scan: "Scraper analyzing OpenGraph metadata, logo, and tech stack...".
   - Fallback: If scraper returns failure or takes > 8s, reveal "Manual Entry Mode" button without losing state.
3. Step 2: Product Metadata Form:
   - Name (2-100 chars), Tagline (10-120 chars), Category (dropdown of 8 MVP categories), Pricing Model, Description, Logo URL upload/preview.
4. Step 3: Domain Ownership Claim:
   - Instructions to create DNS TXT record or HTML meta tag with verification token.
   - "Verify Now" button calling POST `/api/v1/claims/verify`.
5. Step 4: Schedule & Live Interactive Preview:
   - Live rendered `<ProductCard />` showing real-time updates as user edits fields.
   - Date picker for Launch Day (today or scheduled future date).
   - "Confirm & Launch Product" button calling POST `/api/v1/products/draft/:id/confirm`.
```

---

# PHASE F7 — FOUNDER DASHBOARD & EMBED BADGES

---

## PROMPT F7.1 — Founder Analytics & Product Management Dashboard

```
You are a Senior Frontend Engineer. Implement the Founder Mission Control Dashboard (UI-UX.md Section 30).

File: frontend/src/app/dashboard/page.tsx

Requirements:
1. Protected Route: Require authentication; redirect unauthenticated users to `/auth`.
2. Top Stat Cards:
   - Total Organic Inbound Clicks (with weekly % trend).
   - Total Verified Community Upvotes.
   - Current Daily Leaderboard Rank.
   - Click-Through Conversion Rate (CTR).
3. Live Products Table:
   - List of founder's products with Status pill (`SCHEDULED`, `LIVE`, `ARCHIVED`), launch date, total votes, and action dropdown (`Edit Details`, `View Public Page`, `Book Boost`).
4. Embed Badges Generator Card (UI-UX.md Section 30.3):
   - Interactive badge selector: Dark Theme Badge, Light Theme Badge, Minimal Ranking Pill.
   - Live visual preview of `<img src="http://localhost:4000/api/badge/{productId}" />`.
   - 1-click "Copy HTML Snippet" and "Copy Markdown Snippet" with toast confirmation.
```

---

# PHASE F8 — ADMIN MODERATION CONSOLE

---

## PROMPT F8.1 — Admin Moderation Console & Product Review Queue

```
You are a Senior Frontend Engineer. Build the Admin Moderation Console for platform staff (UI-UX.md Section 33).

File: frontend/src/app/admin/page.tsx

Requirements:
1. Protected Route: Require user role `MODERATOR` or `ADMIN`. Non-staff users receive 403 Forbidden page.
2. Moderation Tabs:
   - Tab 1: Pending Products Queue (products with status `PENDING_REVIEW`).
   - Tab 2: Flagged Votes & Anti-Fraud Signals (quarantined or flagged votes).
   - Tab 3: System Settings & Toggles.
3. Pending Products Review Table:
   - Submitter email, Product Name, Tagline, Canonical Domain, Scraped AI summary.
   - Quick Actions:
     - "Approve & Go Live" (calls PATCH `/api/v1/moderation/products/:id/approve`).
     - "Reject with Reason" (opens modal to enter rejection feedback for founder).
4. Live Audit Log Feed:
   - Stream of recent moderation decisions and activity events.
```

---

# PHASE F9 — SPONSORSHIP, BOOSTS & PROMOTION

---

## PROMPT F9.1 — Sponsorship Booking & Campaign Slot Reservation

```
You are a Senior Frontend Engineer. Implement the Sponsorship & Promote page for paid distribution tiers (UI-UX.md Section 31).

File: frontend/src/app/promote/page.tsx

Requirements:
1. Clear Ethical Positioning Header:
   - "Transparent Distribution for Builders. Paid boosts provide prominent visibility without altering authentic organic rankings."
2. Sponsorship Tiers Grid:
   - Tier 1: Launch Day Boost ($19/day) — Pinned to #1 sponsored top slot of the daily feed. Max 2 slots/day.
   - Tier 2: Category Featured ($49/week) — Pinned to vertical category directory top slot.
   - Tier 3: Homepage Spotlight ($149/day) — Hero banner spotlight.
   - Tier 4: Launch Partner ($299/mo) — Continuous multi-surface placement.
3. Interactive Availability Calendar:
   - Displays available dates and booked/sold-out dates in real-time via GET `/api/v1/campaigns/availability`.
4. Reservation & Paddle/MoR Checkout:
   - Founder selects product, tier, and target date.
   - "Reserve Slot" calls POST `/api/v1/campaigns/reserve` and redirects to merchant-of-record checkout.
```

---

# PHASE F10 — SKELETONS, ERROR STATES & SEO METADATA

---

## PROMPT F10.1 — Loading Skeletons, Error Boundaries & 404/500 Pages

```
You are a Senior Frontend Engineer. Implement resilient loading shimmers and error boundaries for all Next.js routes (UI-UX.md Sections 21-23).

Files:
- frontend/src/app/not-found.tsx
- frontend/src/app/error.tsx
- frontend/src/app/loading.tsx

Requirements:
1. In not-found.tsx (404 Page):
   - Styled brand 404 illustration, headline: "Page or Launch Not Found", friendly subtext, and "Back to Daily Leaderboard" primary button.
2. In error.tsx (Error Boundary):
   - Captures client runtime errors, displays diagnostic message in dev, and offers a "Try Again" reload button.
3. In loading.tsx (Feed Skeleton):
   - Wireframe shimmer matching `<ProductCard />` cards with animated pulsing placeholders for logos, text blocks, and upvote pills.
```

---

## Recommended Execution Order

```
Phase F0: PROMPT F0.1 → F0.2 (Tokens, Typography & API Client)
Phase F1: PROMPT F1.1 → F1.2 (Layout, Navigation & Command Palette)
Phase F2: PROMPT F2.1 → F2.2 → F2.3 (Auth Page, Verify & Modal)
Phase F3: PROMPT F3.1 → F3.2 (Discovery Feed & Upvoting Cards)
Phase F4: PROMPT F4.1 (Leaderboards & Podium Cards)
Phase F5: PROMPT F5.1 → F5.2 (Product Details & Reviews)
Phase F6: PROMPT F6.1 (Product Submission Wizard)
Phase F7: PROMPT F7.1 (Founder Dashboard & Embed Badges)
Phase F8: PROMPT F8.1 (Admin Moderation Console)
Phase F9: PROMPT F9.1 (Sponsorship & Promote Tiers)
Phase F10: PROMPT F10.1 (Skeletons, 404 & Error Boundaries)
```
