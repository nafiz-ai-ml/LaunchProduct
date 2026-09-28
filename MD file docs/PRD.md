# Product Requirements Document (PRD)

# LaunchProduct — Product Discovery & Growth Platform

**Document Version:** 1.3.0 (Brand & UI/UX Finalized)  
**Status:** Approved — Engineering & Product Architecture  
**Original Author:** Senior Product Analyst & Business Analyst  
**Revision Lead:** Senior PM, Principal Architect, Security Engineer, Growth Analyst & SEO Specialist  
**Last Updated:** September 21, 2026  
**Target Market:** AI Tools, SaaS, Developer Utilities, Digital Micro-Products  

---

## Change Log — v1.2.0

This section summarizes the architectural alignment, database modernization, and commercial hardening introduced in PRD v1.2.0:

1. **Confirmed Database Architecture — MongoDB Atlas**:
   - Confirmed **MongoDB Atlas** as the authoritative primary application database and managed cloud deployment platform (system of record).
   - Replaced all relational PostgreSQL, SQL, and Supabase database assumptions with MongoDB Atlas document-oriented design patterns (collections, documents, ObjectIds, embedded subdocuments, document references, compound indexes, unique indexes, TTL indexes, schema validation, aggregation pipelines, and atomic document updates, with multi-document transactions strictly isolated to cross-collection critical paths).
   - Confirmed that Redis is strictly a supporting infrastructure component for ephemeral caching and rate limiting; **MongoDB Atlas is the single durable source of truth**.
   - Maintained a clean, product-focused data model without turning the PRD into a physical database schema implementation document.
2. **Global Merchant of Record (MoR) Payment Integration**:
   - Standardized the monetization architecture around a **Global Merchant of Record (MoR)** payment model.
   - Primary intended provider direction: **Paddle**; alternative/fallback: **Lemon Squeezy**. Explicitly noted that formal provider onboarding and payout eligibility for a Bangladesh-based entity will be verified post-MVP once corporate setup is finalized `[VALIDATION REQUIRED]`.
   - Made payment requirements fully **provider-agnostic** (`provider`, `provider_customer_id`, `provider_payment_id`, `provider_order_id`, `provider_event_id`).
   - Server-side verified provider webhooks are mandatory; frontend return URLs are strictly prohibited from activating paid campaigns.
3. **Explicit MVP Payment Scope**:
   - Clarified that LaunchProduct sells its own first-party promotional and sponsored placement services.
   - Explicitly excluded marketplace seller payouts, creator marketplace settlements, multi-vendor split payments, seller KYC workflows, and payment escrow from the MVP.
4. **Local Payment Gateways Excluded from MVP**:
   - Excluded local Bangladesh payment methods (bKash, Nagad, local gateways, BDT checkout) from the MVP scope; focused exclusively on global USD-denominated digital credit card and MoR processing.
5. **Consistency Corrections & Quality Hardening**:
   - *Anti-Fraud Consistency*: Clarified triage states—`FLAGGED` votes increment score with an administrative review flag, whereas `QUARANTINED` votes do **not** increment score counters. High-confidence bot clusters receive a `REJECTED_BOT` status with 0 score contribution.
   - *Formula Integrity*: Verified that trending and all-time ranking formulas gracefully handle pre-review states ($R_d = 0$, $N_{\text{reviews}} = 0$ with Bayesian shrinkage $K=5$) while reviews remain in Phase 2.
   - *Click Deduplication vs. Launch Window*: Clarified the 10-minute session deduplication window for click counting versus the 24-hour UTC launch-day scoring window.
   - *Founder Self-Vote Semantics*: Standardized founder self-voting as the user's single permitted vote per product across the product's launch lifecycle.
   - *Core Web Vitals*: Replaced deprecated First Input Delay (FID) references with Interaction to Next Paint (INP $\le 100$ms).
   - *Throughput & Concurrency*: Replaced ambiguous "50 concurrent requests/sec" with 50 requests/second (RPS) throughput at ~10–20 concurrent connections.
   - *Robots.txt & Security*: Clarified that `robots.txt` is respected as crawling etiquette, not relied upon as an internal security boundary.
   - *Threat Intelligence*: Accurately framed external URL checks as reputation screening against malicious software, phishing, and scam domains.
   - *Privacy & Compliance Targets*: Framed GDPR data erasure as an operational target (target completion within 72 hours, subject to statutory retention exceptions) rather than an absolute statutory deadline.

---

## 1. Executive Summary & Product Vision

### 1.1 Executive Summary
**LaunchProduct** is a product discovery, launch, and growth marketplace designed for builders of SaaS applications, AI agents, developer utilities, and digital micro-products.

LaunchProduct addresses two fundamental challenges in the software launch ecosystem:
1. **For Early-Stage Founders**: The extreme difficulty of acquiring initial users, authentic product feedback, and qualified referral traffic without PR agencies or massive ad budgets.
2. **For Software Buyers & Early Adopters**: The trust deficit created by pay-to-win directories where rankings reflect ad spend rather than product merit, or legacy platforms dominated by coordinated voting syndicates.

LaunchProduct implements a dual-engine architecture:
* **The Organic Discovery Engine** is powered by authenticated community upvotes, verified reviews, qualified organic outbound clicks, and a multi-signal anti-fraud pipeline.
* **The Sponsored Distribution Engine** provides transparent, paid promotional placements that deliver verifiable impressions and clicks without altering organic leaderboard positions.

### 1.2 Core Product Tenets
1. **Integrity Over Revenue**: A sponsored product can never buy, manipulate, or artificially boost an organic rank.
2. **Strict Traffic Source Isolation**: Only qualified, non-bot organic traffic may contribute to ranking scores; sponsored clicks are structurally blocked from organic algorithms.
3. **Measurable Exposure**: Founders receive verifiable click-through analytics rather than estimated impressions.
4. **Multi-Signal Anti-Fraud**: Ranking algorithms do not rely on simplistic metrics (e.g., single IP or cookie counts); abuse detection evaluates multi-layered risk signals.
5. **Document-Oriented Scalability**: Primary data persistence leverages **MongoDB Atlas** collections for flexible metadata, audit revisions, and fast document lookups.
6. **Lean, Sustainable Architecture**: The MVP is achievable and maintainable by a small engineering team using proven, battle-tested technologies.

### 1.3 Strategic Positioning

```text
               High Integrity & Transparency
                           │
                           │     ★ LaunchProduct
             Product Hunt  │     (Transparent Growth & Dual Engine)
                           │
   Community-Driven ───────┼─────── Utility / Directory-Driven
                           │
       Voting Syndicates   │     Outbid / Bid Directories
                           │     (Pay-to-Win Auctions)
                           │
                Low Integrity / Paid-Rank
```

- **Versus Outbid / Pay-to-Rank Platforms**: We do not sell leaderboard positions. Paid options are clearly disclosed as sponsored placements.
- **Versus Product Hunt**: We focus specifically on AI tools, SaaS, and developer utilities with transparent scoring algorithms, built-in anti-syndicate fraud scoring, and permanent product profiles.
- **Versus Static Web Directories**: We combine dynamic daily launches, interactive product comparisons (battles), embeddable live badges, and AI-assisted submission.

---

## 2. Market Problem & Strategic Hypotheses

All market assertions below are framed as testable strategic hypotheses rather than assumed facts.

### 2.1 Problem Hypotheses
* *Hypothesis H-1 (Distribution Gap)*: Early-stage indie hackers and AI software developers struggle to acquire their first 100 active users through existing channels without existing social followings. `[VALIDATION REQUIRED]`
* *Hypothesis H-2 (Trust Deficit in Paid Directories)*: Software hunters and early adopters discount directory rankings when they suspect positions are directly purchased or manipulated by bot farms. `[VALIDATION REQUIRED]`
* *Hypothesis H-3 (Demand for Measurable Launch Analytics)*: Founders are willing to pay for targeted promotional boosts ($19–$149) if the platform provides verifiable click-through attribution and direct outbound referral traffic. `[VALIDATION REQUIRED]`

---

## 3. Target Personas & Stakeholder Analysis

### 3.1 Primary Personas

#### Persona A: The Indie Hacker / Micro-SaaS Builder ("Alex")
- **Profile**: Solo engineer or small team; building fast AI wrappers, micro-SaaS, or developer utilities.
- **Primary Need**: Acquire initial user signups, gather real product feedback, and generate launch visibility.
- **Frustrations**: Complex paid ad channels; submission processes that require manual entry of repetitive metadata; directories that demand reciprocal links before listing.
- **Value Realized**: Instant AI-assisted onboarding from URL, embeddable launch badge, and participation in the daily launch leaderboard.

#### Persona B: Growth Marketer / VC-Backed SaaS Founder ("Elena")
- **Profile**: Seed or Series-A marketing lead; managing a structured user acquisition budget.
- **Primary Need**: High-intent referral traffic, category brand visibility, and clean campaign tracking.
- **Frustrations**: Unverifiable directory traffic; opaque ad attribution; brand adjacency to scam or low-quality tools.
- **Value Realized**: Category sponsorship exclusivity, homepage spotlights, first-party click tracking with UTM passthrough, and verified review showcases.

### 3.2 Secondary Personas

#### Persona C: The Early Adopter / Product Hunter ("Liam")
- **Profile**: Software engineer, designer, or tech enthusiast looking for newly launched software.
- **Primary Need**: Discovering functional tools, evaluating alternative products side-by-side, and reading authentic user feedback.
- **Frustrations**: Cluttered UI, spam products that do not work, biased rankings.
- **Value Realized**: Clean category filtering, pricing transparency (Free/Freemium/Paid), head-to-head battles, and scam-screened listings.

#### Persona D: Tech Curator / Journalist / Investor ("Marcus")
- **Profile**: Technology newsletter writer, blogger, or angel scout.
- **Primary Need**: Identifying breakout tools and trending categories before they saturate the market.
- **Value Realized**: Daily and weekly archived snapshots, verifiable vote trends, and founder track records.

### 3.3 Internal Operational Stakeholders
- **Trust & Safety Operator**: Requires a real-time moderation desk to review quarantined votes, investigate reported products, and handle DMCA/trademark complaints.
- **Platform Administrator**: Manages category taxonomy, monitors provider payment webhooks, schedules promotional inventory, and reviews audit logs.

---

## 4. Goals, North Star Metric & Operational KPIs

### 4.1 North Star Metric
> **Qualified Product Discovery Sessions (QPDS) per Week**  
*Definition:* A unique, non-bot user session during which a visitor engages with at least one product (detail page view, verified vote, review, or battle comparison) and executes a verified outbound click to the product's destination URL.

### 4.2 Operational KPIs

| Category | Metric | Baseline / Minimum Viable | Target (Month 3 Post-Launch) | Verification Method |
| :--- | :--- | :--- | :--- | :--- |
| **Supply** | Cumulative Approved Products | 100 curated seeds | 500 active products | MongoDB Atlas document count (`db.products.countDocuments({ status: 'LIVE' })`) |
| **Supply** | Weekly Submissions | 15 / week | 50 / week | Weekly submission logs |
| **Audience** | Monthly Unique Discovery Visitors | 2,500 unique/mo | 25,000 unique/mo `[VALIDATION REQUIRED]` | First-party privacy-safe session analytics |
| **Engagement** | Directory Outbound CTR | $\ge 5.0\%$ | $\ge 8.5\%$ | $\frac{\text{Unique Outbound Clicks}}{\text{Unique PDP Views}}$ |
| **Integrity** | Suspicious Vote Quarantine Rate | Monitored | 2.0% – 8.0% of total votes | Count of votes triaged to `QUARANTINED` |
| **Integrity** | False-Positive Appeal Overturn Rate | $< 5.0\%$ | $< 2.0\%$ | $\frac{\text{Quarantined Votes Approved on Appeal}}{\text{Total Quarantined Votes}}$ |
| **Operations** | Moderation Resolution Time (MTTR) | $< 24$ hours | $< 6$ hours | Timestamp difference: submission to triage decision |
| **Monetization**| Submit-to-Promote Conversion Rate | 2.0% | 4.5% `[VALIDATION REQUIRED]` | $\frac{\text{Paid Campaigns Created}}{\text{Approved Product Submissions}}$ |

---

## 5. Scope Management & Feature Phasing

```
┌────────────────────────────────────────────────────────────────────────┐
│ MUST HAVE FOR MVP (Sprints 1–5)                                       │
│ • Magic link & OAuth (Google/GitHub) authentication                    │
│ • SSRF-safe AI-assisted submission scraper (founder confirmation)      │
│ • 3-way ownership verification lifecycle (Domain email, DNS, or Meta) │
│ • Hierarchical category taxonomy & MongoDB text search                 │
│ • Dual-engine architecture with strict organic/paid traffic isolation │
│ • Multi-tier ranking engine + immutable historical snapshots           │
│ • Configurable anti-fraud risk engine with quarantine triage queue     │
│ • Fixed-price Global Merchant of Record (MoR) sponsorship integration │
│ • First-party outbound click tracking, event ledger & founder metrics  │
│ • Trust-compliant SVG embeddable badges & dynamic OG cards             │
│ • Product revision history for content auditability                    │
├────────────────────────────────────────────────────────────────────────┤
│ SHOULD HAVE POST-LAUNCH (Sprints 6–7: Validation Phase)                │
│ • Head-to-Head product battles (algorithmic pairings)                 │
│ • Verified review collection with dispute workflows                    │
│ • AI Launch Kit (automated social copy generation)                     │
│ • Weekly category summary newsletter automation                        │
├────────────────────────────────────────────────────────────────────────┤
│ COULD HAVE / FUTURE SCALE (Phase 3: Not in Initial MVP)                │
│ • Outbid-style live auction bidding engine                             │
│ • Local Bangladesh payment methods (bKash/Nagad/BDT checkout)          │
│ • Marketplace seller payout / revenue-share split infrastructure       │
│ • Public developer REST API & Zapier integrations                      │
│ • Founder subscription memberships (LaunchProduct Pro)                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Product Lifecycle, State Machine & Revision History

### 6.1 Product State Machine

```text
                  ┌──────────────┐
                  │    DRAFT     │
                  └──────┬───────┘
                         │ Submit
                         ▼
                  ┌──────────────┐
                  │PENDING_REVIEW│◄──────────────┐
                  └──────┬───────┘               │
            Approve      │      Reject / Revise  │ Resubmit
        ┌────────────────┴───────────────┐       │
        ▼                                ▼       │
┌──────────────┐                  ┌──────────────┴┐
│  SCHEDULED   │                  │   REJECTED    │
└───────┬──────┘                  └───────────────┘
        │ Launch Date Reached
        ▼
┌──────────────┐       Flagged/Abuse       ┌──────────────┐
│     LIVE     ├──────────────────────────►│  SUSPENDED   │
└───────┬──────┘◄──────────────────────────┴──────────────┘
        │                 Reinstated
        │ Deactivate / Retire
        ▼
┌──────────────┐
│   ARCHIVED   │
└───────┬──────┘
        │ Hard Delete Request (GDPR)
        ▼
┌──────────────┐
│   DELETED    │
└──────────────┘
```

### 6.2 State Transition Matrix

| Product State | Public Directory Visibility | Can Receive Votes? | Can Receive Reviews? | Can Run Campaigns? | Dynamic Badge Status | URL / SEO Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `DRAFT` | No (Founder only) | No | No | No | Returns placeholder SVG | HTTP 404 / `noindex` |
| `PENDING_REVIEW` | No (Admin/Founder) | No | No | No | Returns "Pending" SVG | HTTP 404 / `noindex` |
| `SCHEDULED` | Teaser only (if enabled) | No | No | Yes (pre-booking) | Returns "Launching Soon" | HTTP 200 / `noindex` |
| `LIVE` | Full public visibility | Yes | Yes | Yes | Returns live rank SVG | HTTP 200 / `index, follow` |
| `SUSPENDED` | Hidden with warning | No (frozen) | No (frozen) | Paused immediately | Returns "Under Review" | HTTP 451 or 404 / `noindex` |
| `REJECTED` | Hidden (Founder only) | No | No | No | Returns "Inactive" | HTTP 404 / `noindex` |
| `ARCHIVED` | Visible in historical lists | No | Read-only | No | Returns "Archived" | HTTP 200 / `index, nofollow` |
| `DELETED` | Removed completely | Purged/Anonymized | Purged/Anonymized | Cancelled | Returns HTTP 404 | HTTP 410 Gone |

### 6.3 Product Content Revision History (`product_revisions`)
- **Primary Document State**: The `products` collection always stores the current canonical live document.
- **Audit & Rollback Tracking**: Whenever a founder or administrator edits core content fields on an approved, scheduled, or live product, a snapshot document is inserted into the `product_revisions` collection.
- **Tracked Revision Fields**: `name`, `tagline`, `description`, `websiteUrl`, `categoryId`, `pricingType`, `pricingMetadata`.
- **Revision Schema Document**:
  ```json
  {
    "_id": "ObjectId",
    "productId": "ObjectId",
    "changedByUserId": "ObjectId",
    "versionNumber": 2,
    "name": "Acme AI",
    "tagline": "Automate your workflows with intelligent agents",
    "description": "Full product description in markdown...",
    "websiteUrl": "https://getacme.com",
    "categoryId": "ObjectId",
    "pricingType": "Freemium",
    "pricingMetadata": { "freeTier": true, "startingPrice": 29 },
    "changeReason": "Updated pricing model and added new agent features",
    "createdAt": "ISODate"
  }
  ```
- **Business Rules**:
  1. Minor edits during the initial `DRAFT` stage prior to formal review submission do not generate version bumps.
  2. For products with status `SCHEDULED`, `LIVE`, or `ARCHIVED`, any change to `websiteUrl`, `name`, or `categoryId` generates an audit revision and flags the product for re-verification if the destination domain changes.

---

## 7. Functional Requirements

### 7.1 Authentication, RBAC & Profile Management

#### Requirements
- **FR-AUTH-01: Authentication Modes**: Users authenticate via Email Magic Links (passwordless) or OAuth 2.0 (Google, GitHub). Passwords are intentionally omitted for the MVP to eliminate credential-stuffing attack vectors.
- **FR-AUTH-02: Email Verification Enforcement**: An account cannot submit a product, cast an upvote, or write a review without a confirmed, non-disposable email address.
- **FR-AUTH-03: Role-Based Access Control (RBAC)**: System supports roles: `VISITOR` (unauthenticated), `HUNTER` (verified user), `FOUNDER` (verified owner of $\ge 1$ product), `MODERATOR` (trust & safety team), and `ADMIN`.
- **FR-AUTH-04: Founder Profile**: Displays founder bio, verified social handles, product portfolio, and earned launch awards.

#### Acceptance Criteria
1. *Given* an unverified email account, *when* attempting to upvote or submit a product, *then* the system halts execution and displays an email verification modal.
2. *Given* an authenticated user with role `HUNTER`, *when* attempting to access `/admin/*`, *then* the server returns HTTP 403 Forbidden and logs the unauthorized attempt.

---

### 7.2 Product Submission, AI Scraping & Ownership Verification Lifecycle

#### Requirements
- **FR-SUB-01: URL Submission & SSRF Defense Pipeline**:
  - Founders provide an external URL (`https://...`).
  - Prior to fetching, the scraping service executes a strict SSRF sanitization check:
    1. Resolves DNS records for the target domain.
    2. Verifies that the resolved IP does NOT belong to private, loopback, or reserved blocks:
       - `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` (RFC 1918)
       - `127.0.0.0/8` (Loopback)
       - `169.254.0.0/16` (Link-local / Cloud metadata: AWS, GCP, Azure)
       - `::1/128`, `fc00::/7` (IPv6 private)
    3. Enforces HTTP request timeouts (max 5,000ms), disallows redirects to private IPs, and enforces a 2MB maximum payload download cap.
    4. Complies with the target domain’s `robots.txt` as crawling etiquette. (Note: `robots.txt` is respected as polite etiquette, not treated as a security perimeter). If scraping is disallowed, the system falls back to manual founder input.
- **FR-SUB-02: AI Metadata Enrichment & Founder Override**:
  - The scraper extracts OpenGraph tags (`og:title`, `og:description`, `og:image`) and main semantic text.
  - An LLM generates: Suggested Product Name, Tagline (max 80 chars), Category recommendation, and structured summary bullet points.
  - **Critical Rule**: The AI output is presented to the founder as an editable draft. The founder remains the ultimate authority and must explicitly confirm the metadata prior to submission.
- **FR-SUB-03: Duplicate & Threat Screening**:
  - System enforces canonical domain uniqueness: only one active product document per normalized apex domain (e.g., `acme.com`).
  - Destination URLs are screened against threat intelligence feeds (e.g., Google Safe Browsing API) for malware, phishing, and scam reputation `[LEGAL REVIEW REQUIRED]`.
- **FR-SUB-04: Founder Ownership Verification Lifecycle (`ownership_verifications`)**:
  - To claim founder administrative privileges, manage product settings, and run paid campaigns, a user must complete formal ownership verification.
  - **Supported Verification Methods**:
    1. `EMAIL_DOMAIN`: User's authenticated email domain matches the product's apex domain (e.g., `alex@acme.com` verifies `https://acme.com`).
    2. `DNS_TXT`: User adds a TXT record `launchproduct-verify=[token]` to the apex domain.
    3. `HTML_META`: User adds `<meta name="launchproduct-site-verification" content="[token]">` inside the homepage `<head>`.
  - **Lifecycle States**:
    - `UNVERIFIED`: Product is submitted by a community hunter; no founder claimed.
    - `PENDING`: User initiates verification; token generated (valid for 72 hours).
    - `VERIFIED`: Token successfully validated; user granted `FOUNDER` status for this product.
    - `REVOKED`: Verification invalidated due to token removal, domain transfer, or admin action.
    - `FAILED_EXPIRED`: 72-hour validation window passed without detection.
  - **Deterministic Verification Transitions**:
    ```text
    UNVERIFIED ──[Claim Initiated]──> PENDING
    PENDING    ──[Token Verified]───> VERIFIED
    PENDING    ──[Timeout (72h)]────> FAILED_EXPIRED
    VERIFIED   ──[Token Missing]────> REVOKED
    VERIFIED   ──[Admin Dispute]────> REVOKED
    ```
  - **Dispute & Multi-Claim Handling**:
    - Only **one** user can hold `VERIFIED` status for a product at any given time (enforced by a partial unique index on `{ productId: 1 }` where `status == 'VERIFIED'`).
    - If user B attempts to verify a product currently verified by user A, a `PENDING` dispute document is logged, user A receives an automated security notice, and a moderation ticket is created.
    - Unverified community submissions can exist publicly in the directory, but **cannot access the Founder Dashboard, view internal click analytics, or purchase paid promotional campaigns**.

#### Acceptance Criteria
1. *Given* a submission with URL `http://169.254.169.254/latest/meta-data/`, *when* the scraper validates the IP, *then* the system immediately aborts with an SSRF security error and alerts administrators.
2. *Given* a community product in `UNVERIFIED` state, *when* an unverified user attempts to create a paid sponsorship campaign, *then* the system halts checkout and requires ownership verification first.

---

### 7.3 Hierarchical Category Taxonomy & Search Architecture

#### Requirements
- **FR-DIR-01: Hierarchical Taxonomy Architecture**:
  - The `categories` collection supports hierarchical sub-categories via a nullable `parentId` field referencing the parent category's `ObjectId`.
  - **MVP Primary Categories (Fixed Parent Slugs)**:
    - `/ai-tools`
    - `/ai-agents`
    - `/saas`
    - `/developer-tools`
    - `/productivity`
    - `/marketing-tools`
    - `/seo-tools`
    - `/design-tools`
  - Sub-category trees (e.g., `ai-tools` $\to$ `ai-writing`, `ai-image`) are supported architecturally, but **MVP scope remains strictly focused on the 8 top-level parent categories**.
  - Circular hierarchy prevention is enforced at the application service layer.
- **FR-DIR-02: MongoDB Atlas Search & Filtering**:
  - Search queries execute via MongoDB Atlas compound text indexes across `name` (weight 10), `tagline` (weight 5), and `description` (weight 1).
  - Search queries support combined facet filtering:
    - Category (`categoryId` or parent slug)
    - Pricing Type (`Free`, `Freemium`, `Paid`, `Open Source`)
    - Sorting (`Trending`, `Launch Date`, `Most Upvoted`)
    - Cursor-based pagination (default 25 items/page)
  - Target latency benchmark: $\le 150$ms p95 under standard load `[ENGINEERING VALIDATION REQUIRED]`.

---

### 7.4 Voting Lifecycle & Rules Engine

#### Requirements
- **FR-VT-01: Voting Eligibility & Authentication**:
  - Anonymous voting is **strictly disallowed**.
  - Users must have an authenticated account with verified email.
  - Account age must exceed a configurable threshold (`VOTE_MIN_ACCOUNT_AGE_HOURS`, default: 2 hours) to cast an immediately valid vote.
- **FR-VT-02: Vote Quota & Idempotency**:
  - Exactly **one vote per user per product across the product's entire launch lifecycle** (enforced by a compound unique index on `{ productId: 1, userId: 1 }` in the `votes` collection).
  - A user can retract their vote within a 15-minute window; after 15 minutes, the vote is locked to prevent rapid score-cycling manipulation.
- **FR-VT-03: Self-Voting & Competitor Voting**:
  - A verified founder is permitted to cast their single standard vote for their own product (counted as the initial "Founder Vote").
  - Downvotes are excluded from the MVP; LaunchProduct MVP implements **positive-only upvoting**.
- **FR-VT-04: Vote Lifecycle & Triage Rules**:
  - `VALID` votes increment public score counters.
  - `FLAGGED` votes increment public score counters but attach an audit flag for moderator queue inspection.
  - `QUARANTINED` votes do **not** increment public score counters unless formally approved by a moderator.
  - `REJECTED_BOT` votes return HTTP 200 silently to mitigate bot probing, but assign 0 weight and do not increment scores.
  - If a user account is deleted under privacy erasure requests, personal identifiers are anonymized, but historical aggregated counts remain preserved on past immutable snapshots.

---

### 7.5 Review & Rating Integrity Engine (Phase 2: Post-MVP)

#### Requirements
- **FR-REV-01: Reviewer Qualification**:
  - A reviewer must be authenticated and email-verified with an account age $\ge 48$ hours.
  - Self-reviews on products where the user is a verified founder are blocked.
- **FR-REV-02: Review Constraints & Structure**:
  - Limit: Exactly **one review per user per product** (enforced by compound unique index on `{ productId: 1, userId: 1 }` in `reviews`).
  - Rating: 1–5 stars with written summary (min 50 chars, max 2,000 chars) and conflict-of-interest disclaimer checkbox.
- **FR-REV-03: Founder Dispute & Reply Workflow**:
  - Verified founders receive notification and may publish one public response.
  - Founders may trigger a dispute under standardized categories (*Competitor Smear*, *Harassment*, *False Technical Facts*, *Spam*). Disputed reviews display a `[Flagged for Review]` label during moderation.
- **FR-REV-04: Anti-Incentivized Review Policy**:
  - Offering incentives (cash, crypto, discounts) for reviews is prohibited in the Terms of Service `[LEGAL REVIEW REQUIRED]`.

---

### 7.6 Multi-Signal Anti-Fraud & Risk Engine

```text
Incoming Vote Request
         │
         ▼
┌───────────────────────────┐
│ 1. Fast Edge Filter       │ ──> Fail (Rate Limit / Disposable Email / Blocked ASN) ──> [REJECTED_BOT]
└────────┬──────────────────┘
         │ Pass
         ▼
┌───────────────────────────┐
│ 2. Signal Extraction      │ (Account, Network, Behavioral, Cluster signals)
└────────┬──────────────────┘
         │
         ▼
┌───────────────────────────┐
│ 3. Score Aggregation      │ ──> RiskScore = ∑ (Weight_i × Signal_i)
└────────┬──────────────────┘
         │
         ├──────────────────────────────────────┬─────────────────────────────────────┐
         ▼                                      ▼                                     ▼
RiskScore < THRESHOLD_LOW             THRESHOLD_LOW ≤ Score < THRESHOLD_HIGH      RiskScore ≥ THRESHOLD_HIGH
      (e.g., < 30)                                (e.g., 30–69)                         (e.g., ≥ 70)
         │                                      │                                     │
         ▼                                      ▼                                     ▼
  [STATUS: VALID]                           [STATUS: FLAGGED]                     [STATUS: QUARANTINED]
Score increments count                  Increments count with flag              Held in queue, count NOT incremented
                                                │                                     │
                                                └───────────────┬─────────────────────┘
                                                                ▼
                                                   Trust & Safety Review Desk
```

#### Evaluated Risk Signals & Dynamic Weights

Risk weights are stored in the database (`system_settings` collection) and cached for runtime evaluation:

| Signal Identifier | Evaluation Description | Default Weight | Condition for Trigger |
| :--- | :--- | :---: | :--- |
| `SIG_EMAIL_DISPOSABLE` | Domain matches known temporary email list | **Hard Reject** | Instant HTTP 400 rejection |
| `SIG_ACCOUNT_NEW` | Account age $< 2$ hours | +20 pts | Time since account verification |
| `SIG_IP_DATACENTER` | IP belongs to known hosting provider/VPN/Tor exit | +25 pts | Local ASN lookup |
| `SIG_SUBNET_CONCENTRATION`| $> 3$ votes for same product from same `/24` subnet in 1 hour | +35 pts | Subnet frequency counter |
| `SIG_BURST_VELOCITY` | Vote arrival rate $> 5\times$ product’s 3-day baseline | +25 pts | Rolling velocity window |
| `SIG_ZERO_PRIOR_ACTIVITY`| Account has 0 pageviews before direct vote navigation | +15 pts | Session navigation history length |
| `SIG_DEVICE_COLLISION` | Duplicate browser fingerprint voting from different accounts | +40 pts | Canvas/Client fingerprint match |
| `SIG_HISTORICAL_TRUST` | Account $> 30$ days old with $> 5$ historical valid votes | -20 pts | Established reputation discount |

*Note: Thresholds (`THRESHOLD_LOW = 30`, `THRESHOLD_HIGH = 70`) are baseline starting parameters requiring live traffic calibration `[VALIDATION REQUIRED]`.*

---

### 7.7 Multi-Tier Ranking Engine & Click-Source Isolation

#### Architectural Rule: Traffic Source Classification & Click Isolation
All inbound interactions and outbound clicks are classified under a mandatory taxonomy:
- `TRAFFIC_SOURCE`: `ORGANIC`, `SPONSORED`, `INTERNAL`, `BOT`, `FRAUD`, `TEST`.

**Hard Rule**: **ONLY `ORGANIC` qualified outbound clicks ($U_{\text{organic\_clicks}}$) can be supplied as inputs to organic ranking formulas.** All clicks with source `SPONSORED`, `INTERNAL`, `BOT`, `FRAUD`, or `TEST` are mathematically filtered out of ranking calculation pipelines.

```text
Outbound Click Event Captured
             │
             ├──> source == 'SPONSORED' ──> Log to activity_events & campaign_analytics (EXCLUDE FROM RANKING)
             ├──> source == 'BOT'       ──> Tag and discard
             ├──> source == 'FRAUD'     ──> Route to quarantine log
             │
             └──> source == 'ORGANIC'   ──> Deduplicate (10-min session window)
                                                      │
                                                      ▼
                                           Qualified Organic Click (U_organic_clicks)
                                                      │
                                                      ▼
                                           Passed into Organic Ranking Formula
```

#### Algorithm 1: Launch-Day Score ($S_{\text{launch}}$)
*Target View:* `/today` (Active UTC 24-hour cycle)  

$$S_{\text{launch}} = \frac{V_{\text{valid}} \times W_v + U_{\text{organic\_clicks}} \times W_c}{\left(\Delta t_{\text{hours}} + 1\right)^{\gamma_{\text{launch}}}}$$

- $V_{\text{valid}}$: Count of verified, non-quarantined upvotes.
- $U_{\text{organic\_clicks}}$: Count of unique, deduplicated organic outbound clicks (10-minute session window deduplication; sponsored clicks strictly excluded).
- $W_v, W_c$: Configurable weights (Defaults: $W_v = 1.0$, $W_c = 0.15$).
- $\Delta t_{\text{hours}}$: Hours elapsed since `00:00:00 UTC` of the launch day ($0 \le \Delta t \le 24$).
- $\gamma_{\text{launch}}$: Gravity dampening exponent (Default: $1.2$).

#### Algorithm 2: Trending Score ($S_{\text{trending}}$)
*Target View:* `/trending` (Rolling 7-day window)  

$$S_{\text{trending}} = \sum_{d=1}^{7} \left[ \left( V_d \times W_v + R_d \times W_r + \log_{10}(U_{\text{organic\_clicks}, d} + 1) \times W_u \right) \times \lambda^{d-1} \right]$$

- $d$: Days elapsed (1 = today, 7 = 7 days ago).
- $V_d, R_d, U_{\text{organic\_clicks}, d}$: Valid votes, verified reviews, and unique organic clicks received on day $d$. (Note: While reviews are in Phase 2, $R_d = 0$ and the formula evaluates votes and organic clicks seamlessly).
- $W_r$: Review weight (Default: $2.5$).
- $\lambda$: Daily decay factor ($0 < \lambda \le 1.0$, Default: $0.75$).

#### Algorithm 3: All-Time Authority Score ($S_{\text{alltime}}$)
*Target View:* `/hall-of-fame`  

$$S_{\text{alltime}} = \log_{10}(V_{\text{total}} + 1) \times 40 + \left(\overline{R}_{\text{rating}} \times \frac{N_{\text{reviews}}}{N_{\text{reviews}} + K}\right) \times 60$$

- $V_{\text{total}}$: Lifetime valid votes.
- Bayesian review component: Uses shrinkage parameter $K = 5$. In MVP (prior to reviews phase), $N_{\text{reviews}} = 0$ evaluates to 0, ensuring ranking operates reliably on vote authority alone.

#### Algorithm 4: Sponsored Placement Isolation
*Target View:* Dedicated slots on `/`, `/today`, and `/categories/*`  
- Sponsored rankings are determined **exclusively by campaign tier, reserved inventory slots, and schedule windows**.
- **Hard Rule**: A sponsored product’s impressions, paid clicks, and advertising spend are mathematically excluded from $S_{\text{launch}}$, $S_{\text{trending}}$, and $S_{\text{alltime}}$.
- Sponsored products appear in distinct visual slots with explicit labels (`[SPONSORED]`).

#### Immutable Historical Snapshots (`daily_leaderboard_snapshots`)
- At `23:59:59 UTC`, a background worker freezes the daily leaderboard, records the final positions, and writes permanent documents to `daily_leaderboard_snapshots`.
- Preserved fields: `snapshotDate`, `leaderboardType`, `productId`, `rank`, `score`, `algorithmVersion`, `voteCount`, `reviewCount`, `qualifiedClickCount`, `generatedAt`.
- Historical awards and archive pages read exclusively from this collection and are never recalculated.

---

## 8. Monetization & Global Merchant of Record (MoR) Architecture

### 8.1 Commercial Scope & Positioning
- **LaunchProduct Sells First-Party Promotion**: LaunchProduct offers its own digital advertising and promotional services (featured cards, category spotlights, launch boosts).
- **Not a Multi-Vendor Marketplace**: LaunchProduct is **not** an e-commerce marketplace for third-party software transactions. There are no seller payouts, creator split settlements, seller KYC verifications, or marketplace escrow workflows in the MVP.
- **Global Payments Focus**: LaunchProduct MVP serves the global software market in US Dollars (USD). Local Bangladesh payment gateways (bKash, Nagad, BDT checkout) are explicitly **excluded** from the MVP scope.

### 8.2 Global Merchant of Record (MoR) Integration Model
- The platform is designed around a **Global Merchant of Record (MoR)** integration to handle global tax compliance, VAT/GST calculation, and international currency conversions.
- **Primary Direction**: **Paddle** (Primary intended provider); **Lemon Squeezy** (Alternative/fallback direction).
- **Eligibility Verification Note**: Formal business onboarding and payout eligibility for a Bangladesh-based entity will be verified after the business entity and product are finalized `[VALIDATION REQUIRED]`.
- **Provider-Agnostic Design**: Core data models and APIs use generic provider fields:
  - `provider` (e.g., `'paddle'`, `'lemonsqueezy'`)
  - `providerCustomerId`
  - `providerPaymentId`
  - `providerOrderId`
  - `providerEventId`

### 8.3 Fixed-Price Promotional Inventory (MVP Tiers)
1. **Launch Boost ($19 / launch)**: Highlighted visual border on the product card for 48 hours; featured placement in the daily launch summary digest.
2. **Category Featured ($49 / 7 days)**: Dedicated pinned banner at the top of the product’s primary category page (max 2 concurrent slots per category).
3. **Homepage Spotlight ($149 / 24 hours)**: Pinned position in the top sponsored row of the homepage (max 3 concurrent slots).
4. **Launch Partner Bundle ($299)**: Homepage Spotlight + Category Featured (7 days) + Launch Kit copy review + Dedicated social highlight.

### 8.4 Server-Side Webhook Activation & Lifecycle
- **Zero Frontend Activation**: Client-side checkout return URLs **never** activate campaigns directly. Activation occurs exclusively upon receipt and cryptographic verification of a server-to-server webhook from the MoR provider (`order.completed`, `payment.succeeded`, or equivalent).
- **Idempotency**: Webhooks are deduplicated using the unique `providerEventId` / `providerPaymentId` to prevent double-activation on network retries.
- **Inventory Reservation & Conflict Handling**:
  - Initiating checkout places a 15-minute reservation on the slot (`status = 'RESERVED'`).
  - Upon verified webhook arrival, the status converts to `'ACTIVE'` and the slot converts to `'BOOKED'`.
  - If payment times out, the reservation expires and the slot is released.
- **Refunds & Disputes**:
  - Cancellations up to 24 hours prior to scheduled launch receive a 100% refund. Active campaigns are non-refundable `[LEGAL REVIEW REQUIRED]`.
  - Chargeback webhook events immediately pause the campaign and notify administrators.

---

## 9. Founder Analytics & Activity Event Ledger

### 9.1 Outbound Click Accounting & Redirector
- Outbound clicks route through `/api/clicks/[productId]?source=[organic|sponsored]`.
- The redirector validates the destination, logs an append-only event in `activity_events`, and issues an immediate HTTP 302 redirect with `rel="noopener"`.
- **Click Deduplication**: Clicks from the same session hash for the same product within a 10-minute window are tagged as duplicates and excluded from unique click metrics.
- **Bot Filtering**: Crawler user-agents are tagged `source = 'BOT'` and excluded from ranking inputs and founder dashboards.

### 9.2 Immutable Activity Event Ledger (`activity_events`)
- **Authority Rule**: `activity_events` is an operational audit ledger, **not** the transactional source of truth for business logic (authoritative state lives in `products`, `votes`, `campaigns`, and `payments`).
- Schema Document:
  ```json
  {
    "_id": "ObjectId",
    "userId": "ObjectId (nullable)",
    "productId": "ObjectId (nullable)",
    "eventType": "OUTBOUND_CLICK",
    "eventSource": "ORGANIC",
    "sessionHash": "HMAC-SHA256(IP + UA, DailyRotatingSalt)",
    "metadata": { "targetUrl": "https://getacme.com", "referrer": "twitter.com" },
    "createdAt": "ISODate"
  }
  ```
- **Privacy-Safe Tracking**: Zero third-party ad tracking scripts. IP addresses are hashed with a daily rotating salt and never stored in plaintext.
- **Data Retention**: Granular raw events are retained for 90 days (enforced via a MongoDB TTL index on `createdAt`), after which daily summary documents are materialized and raw documents are purged.

---

## 10. Founder Growth & Virality Kit

### 10.1 Dynamic Embeddable Badges
- Real-time SVG badge endpoint: `/api/badge/[slug].svg?style=flat|pill&theme=dark|light`.
- Badge dynamically displays verified product status reading from `daily_leaderboard_snapshots` or live rank:
  - *"#1 Product of the Day — LaunchProduct"*
  - *"Top 5 Daily Launch — LaunchProduct"*
  - *"Featured on LaunchProduct"*
- **Search-Compliant Linking**: Embed snippet links back to the product's canonical LaunchProduct profile with standard referral parameters:
  ```html
  <a href="https://launchproduct.io/products/acme?ref=badge" target="_blank" rel="noopener">
    <img src="https://api.launchproduct.io/api/v1/badges/acme.svg" alt="Featured on LaunchProduct" />
  </a>
  ```
  *(The platform does not guarantee search engine ranking benefits or do-follow backlink manipulation).*

### 10.2 Dynamic OpenGraph Images
- Generates 1200x630 OG image previews via `@vercel/og` displaying product logo, tagline, launch date, and rank badge when shared on social channels. Edge-cached with automatic cache purge upon product metadata updates.

---

## 11. Admin & Moderation Console

- **Product Moderation Queue**: Approve, reject, or request revisions on pending submissions.
- **Anti-Fraud Quarantine Desk**: Real-time review queue for votes with `status == 'QUARANTINED'` displaying risk signal breakdowns. Actions: `APPROVE_VOTE`, `REJECT_VOTE`, `PURGE_CLUSTER`.
- **Ownership Verification & Dispute Desk**: Triage conflicting domain claims and verify DNS/meta tokens manually if automated checks fail.
- **Campaign Inventory Grid**: Visual management of reserved, active, and expired promotional slots.
- **System Audit Logs**: Immutable log of all administrative decisions, role adjustments, and manual overrides.

---

## 12. Non-Functional Requirements (NFRs)

### 12.1 Performance & Scalability
- **Core Web Vitals**:
  - Largest Contentful Paint (LCP) $\le 1.2$s on desktop, $\le 1.8$s on mobile.
  - Cumulative Layout Shift (CLS) $\le 0.05$.
  - Interaction to Next Paint (INP) $\le 100$ms.
- **Throughput & Capacity**:
  - Day-1 MVP baseline: Sustain 50 requests/second (RPS) throughput at ~10–20 concurrent connections with zero dropped requests.
  - Target post-launch benchmark: 500 RPS during major launch spikes `[ENGINEERING VALIDATION REQUIRED]`.
- **Search Latency**: Search and faceted filter query response time $\le 150$ms (p95) `[ENGINEERING VALIDATION REQUIRED]`.

### 12.2 Security Architecture
- **SSRF Defenses**: External URL scrapers execute inside an isolated container with egress firewall rules blocking internal VPCs, loopbacks, and cloud metadata IPs (`169.254.169.254`).
- **Session Security**: Sessions managed via secure, `HttpOnly`, `SameSite=Lax`, TLS-enforced cookies.
- **Input Sanitization**: Markdown sanitized via `DOMPurify` to eliminate Cross-Site Scripting (XSS).
- **Rate Limiting**: 120 req/min for public browsing; 10 req/min for voting; 5 submissions/day per founder.

### 12.3 SEO & Structured Data
- **Schema.org**: Valid JSON-LD `SoftwareApplication` or `WebApplication` schemas on product pages. `AggregateRating` markup is strictly rendered only when a product has $\ge 3$ verified user reviews to comply with search engine guidelines.
- **Canonical URLs**: Paginated category views and filter variations canonicalize to primary parent category URLs to prevent duplicate content indexing.

### 12.4 Privacy & Data Governance
- **Data Minimization**: Zero third-party ad pixels. First-party analytics hash IP addresses with daily rotating salts.
- **Operational Erasure Target**: Account deletion requests target completion within 72 hours (subject to statutory tax and financial fraud retention exceptions).
- **Data Retention**: 90-day retention on raw clickstream documents via MongoDB TTL index.

---

## 13. Data Architecture & MongoDB Atlas Document Model

### 13.1 Authoritative Platform Decision & High-Level Architecture
**MongoDB Atlas** is the confirmed primary application database and authoritative system of record for all LaunchProduct application data.

- **Primary Database Platform**: MongoDB Atlas (Managed Cloud Deployment)
- **Application Database**: MongoDB 7+
- **Deployment**: MongoDB Atlas
- **Source of Truth**: MongoDB Atlas is the single durable system of record.
- **Role of Redis**: Redis is strictly a supporting infrastructure component for high-throughput ephemeral caching, sliding-window rate limiting, and BullMQ queue orchestration. **Redis is NOT the source of truth.**

#### High-Level Data Architecture Flow
```text
Next.js Application
        ↓
Backend/API Layer
        ↓
MongoDB Atlas
        ↑
Background Workers

Redis
        ↕
Caching / Rate Limiting / Short-lived coordination

Payment Provider
        ↓
Verified Webhooks
        ↓
Backend
        ↓
MongoDB Atlas

Analytics/Event Pipeline
        ↓
MongoDB Atlas
        ↓
Aggregation / Reporting

Scraper Worker
        ↓
MongoDB Atlas
        ↓
Product metadata / verification results
```

### 13.2 Core MongoDB Atlas Capabilities Utilized
- **Document-Oriented Collections**: Native JSON alignment for rich product metadata, embedded profiles, and audit revisions.
- **Compound & Unique Indexes**: High-performance sorting, filtering, and database-level constraint enforcement (e.g., `{ productId: 1, userId: 1 }`).
- **TTL Indexes**: Automatic, cost-free data lifecycle management for raw analytics events (90-day retention) and verification tokens (15-min / 72-hour expiry).
- **Schema Validation**: Collection-level JSON Schema validation ensuring strict data integrity without relational ORM bloat.
- **Aggregation Pipelines**: Multi-stage aggregation pipelines for real-time leaderboard calculations, category faceting, and founder analytics rollups.
- **Atomic Document Updates**: In-place atomic mutations (`$set`, `$inc`, `$push`) avoiding distributed lock overhead.
- **Targeted MongoDB Transactions**: Multi-document ACID transactions reserved strictly for multi-collection critical paths (e.g., webhook-triggered payment confirmation + campaign slot activation).
- **Atlas Monitoring & Alerts**: Built-in Atlas metrics monitoring query latency, connection pool utilization, and replica lag.
- **Continuous Backups & Point-in-Time Recovery (PITR)**: Automated continuous cloud backups with granular point-in-time restore capabilities on Atlas M10+ tier.

### 13.3 Collections & Relationships Overview
Relational normalization is replaced with document-oriented best practices:

```text
┌─────────────────────────────────┐           ┌─────────────────────────────────┐
│        users collection         │           │      products collection        │
│─────────────────────────────────│           │─────────────────────────────────│
│ _id: ObjectId                   │           │ _id: ObjectId                   │
│ email: String (unique)          │           │ userId: ObjectId (ref: users)   │
│ role: String                    │◄──────────┤ name: String                    │
│ emailVerifiedAt: Date           │           │ slug: String (unique)           │
│ founderProfile: {               │           │ tagline: String                 │
│   bio: String,                  │           │ description: String             │
│   twitter: String,              │           │ websiteUrl: String              │
│   linkedin: String              │           │ categoryId: ObjectId (ref)      │
│ }                               │           │ pricing: { type, metadata }     │
│ createdAt: Date                 │           │ status: String                  │
└─────────────────────────────────┘           │ launchDate: Date                │
                                              │ createdAt: Date                 │
                                              └───────────────┬─────────────────┘
                                                              │
               ┌──────────────────────────────┬───────────────┴──────────────┬──────────────────────────────┐
               ▼                              ▼                              ▼                              ▼
┌─────────────────────────────┐┌─────────────────────────────┐┌─────────────────────────────┐┌─────────────────────────────┐
│      votes collection       ││ product_revisions collection││ ownership_verifications col.││ daily_leaderboard_snapshots │
│─────────────────────────────││─────────────────────────────││─────────────────────────────││─────────────────────────────│
│ _id: ObjectId               ││ _id: ObjectId               ││ _id: ObjectId               ││ _id: ObjectId               │
│ productId: ObjectId (ref)   ││ productId: ObjectId (ref)   ││ productId: ObjectId (ref)   ││ snapshotDate: Date          │
│ userId: ObjectId (ref)      ││ changedByUserId: ObjectId   ││ userId: ObjectId (ref)      ││ leaderboardType: String     │
│ status: String              ││ versionNumber: Number       ││ method: String              ││ productId: ObjectId (ref)   │
│ riskScore: Number           ││ name, tagline, description  ││ status: String              ││ rank: Number                │
│ riskAssessment: {           ││ websiteUrl, categoryId      ││ tokenHash: String           ││ score: Number               │
│   signals: [String],        ││ pricing: { type, metadata } ││ verifiedAt: Date            ││ algorithmVersion: String    │
│   notes: String             ││ changeReason: String        ││ expiresAt: Date             ││ voteCount: Number           │
│ }                           ││ createdAt: Date             ││ revokedAt: Date             ││ reviewCount: Number         │
│ ipHash: String              │└─────────────────────────────┘│ createdAt: Date             ││ qualifiedClickCount: Number │
│ createdAt: Date             │                               └─────────────────────────────┘│ generatedAt: Date           │
└─────────────────────────────┘                                                              └─────────────────────────────┘

┌─────────────────────────────┐               ┌─────────────────────────────┐
│    campaigns collection     │               │     payments collection     │
│─────────────────────────────│               │─────────────────────────────│
│ _id: ObjectId               │               │ _id: ObjectId               │
│ productId: ObjectId (ref)   │               │ campaignId: ObjectId (ref)  │
│ tier: String                │◄──────────────┤ provider: String ('paddle') │
│ status: String              │               │ providerPaymentId: String   │
│ slotId: String              │               │ providerOrderId: String     │
│ startsAt: Date              │               │ amountCents: Number         │
│ endsAt: Date                │               │ currency: String ('USD')    │
│ createdAt: Date             │               │ status: String              │
└─────────────────────────────┘               │ createdAt: Date             │
                                              └─────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                activity_events collection                   │
│─────────────────────────────────────────────────────────────│
│ _id: ObjectId                                               │
│ userId: ObjectId (nullable)                                 │
│ productId: ObjectId (nullable)                              │
│ eventType: String                                           │
│ eventSource: String ('ORGANIC', 'SPONSORED', 'BOT'...)      │
│ sessionHash: String                                         │
│ metadata: Object                                            │
│ createdAt: Date (TTL Index: 90 days)                        │
└─────────────────────────────────────────────────────────────┘
```

### 13.4 Indexing Strategy
1. **Unique Indexes**:
   - `db.users.createIndex({ email: 1 }, { unique: true })`
   - `db.products.createIndex({ slug: 1 }, { unique: true })`
   - `db.categories.createIndex({ slug: 1 }, { unique: true })`
   - `db.votes.createIndex({ productId: 1, userId: 1 }, { unique: true })`
   - `db.reviews.createIndex({ productId: 1, userId: 1 }, { unique: true })`
   - `db.product_revisions.createIndex({ productId: 1, versionNumber: 1 }, { unique: true })`
   - `db.daily_leaderboard_snapshots.createIndex({ snapshotDate: 1, leaderboardType: 1, rank: 1 }, { unique: true })`
   - `db.payments.createIndex({ providerPaymentId: 1 }, { unique: true, sparse: true })`
   - Partial Unique Index for verified ownership:  
     `db.ownership_verifications.createIndex({ productId: 1 }, { unique: true, partialFilterExpression: { status: "VERIFIED" } })`
2. **Compound Query & Aggregation Indexes**:
   - `db.products.createIndex({ categoryId: 1, status: 1 })`
   - `db.products.createIndex({ launchDate: 1, status: 1 })`
   - `db.votes.createIndex({ productId: 1, status: 1, createdAt: 1 })`
   - `db.activity_events.createIndex({ productId: 1, eventSource: 1, eventType: 1, createdAt: 1 })`
3. **TTL (Time-To-Live) Indexes**:
   - 90-day automatic raw event purging:  
     `db.activity_events.createIndex({ createdAt: 1 }, { expireAfterSeconds: 7776000 })`
   - Temporary reservation expiry cleanup:  
     `db.ownership_verifications.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 })`
4. **Text Search Index**:
   - `db.products.createIndex({ name: "text", tagline: "text", description: "text" }, { weights: { name: 10, tagline: 5, description: 1 } })`

---

## 14. Operational Growth Loops

```text
┌────────────────────────────────────────────────────────────────────────┐
│ The LaunchProduct Self-Sustaining Founder Growth Loop                  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ TRIGGER: Founder launches on LaunchProduct (Launch Day 00:00 UTC)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ ACTION: Founder receives real-time rank updates & dynamic SVG badge    │
│         Founder shares link on X/LinkedIn: "We are live on LaunchProduct!"│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ USER BEHAVIOR: Founder's audience visits LaunchProduct to support product│
│                Visitors must authenticate to upvote                    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ DISCOVERY: 25% of new visitors explore other tools on /today & /ai-tools│
│            Qualified Product Discovery Sessions (QPDS) increase        │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│ MARKETPLACE EFFECT: Other founders see traffic & submit their products │
│                     Sponsored placements gain tangible referral value  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 15. Implementation & Sprint Roadmap (Sprints 0–7)

```text
Sprint 0: Setup & Architecture (Week 1)
 └── Next.js 14+ setup, MongoDB Atlas cluster connection/schemas, Redis cache, Docker local env.

Sprint 1: Auth & User Profiles (Week 2)
 └── Magic link auth, OAuth (Google/GitHub), RBAC, Embedded founder profile model.

Sprint 2: Product Submission & Ownership Lifecycle (Week 3)
 └── SSRF-safe scraper, AI metadata draft generator, 3-way ownership verification lifecycle.

Sprint 3: Directory, Categories & Search (Week 4)
 └── Category pages with parentId hierarchy, MongoDB Atlas text search, Product detail pages.

Sprint 4: Voting, Multi-Signal Anti-Fraud & Event Ledger (Week 5)
 └── Upvoting API, Risk scoring engine, activity_events append pipeline, Quarantine queue.

Sprint 5: Global Monetization & Traffic Source Isolation (Week 6)
 └── Sponsorship tiers, Merchant of Record (MoR) webhook integration, click isolation.

Sprint 6: Founder Analytics, Revisions & Badges (Week 7)
 └── Outbound click redirector, Salted session tracking, Dynamic SVG badges, Revisions.

Sprint 7: Leaderboard Snapshots, Hardening & Launch (Week 8)
 └── Daily snapshot worker, Seed 100 curated tools, Security audit, Load testing, Public launch.
```

---

## 16. Risk Management Matrix

| Risk Event | Severity | Probability | Operational Mitigation Strategy |
| :--- | :---: | :---: | :--- |
| **Cold-Start Supply Deficit** | High | High | Team curates and pre-populates 100 high-quality AI/SaaS tools prior to public launch. Early submitters receive free "Early Adopter" badges. |
| **Coordinated Voting Brigades** | High | High | Multi-signal risk engine with quarantine queue, subnet concentration limits, and shadow-ban mitigations for high-confidence bots. |
| **SSRF / Server Exploitation** | Critical | Medium | Scraper isolates network execution, validates resolved IP addresses, and blocks private/loopback/cloud metadata CIDRs. |
| **Pay-to-Win Credibility Loss** | High | Medium | Strict visual demarcation (`[SPONSORED]`), zero placement of paid cards within organic leaderboards, and independent ranking formulas with traffic source isolation. |
| **Search Engine Link-Scheme Penalty**| High | Low | Embeddable badge embeds use search-compliant attribution links without promising do-follow ranking manipulation. |
| **Merchant of Record Onboarding Delay**| Medium | Medium | Provider-agnostic payment architecture allows switching between Paddle and Lemon Squeezy; manual sponsorship invoicing as temporary fallback. |

---

## 17. Open Decisions, Validation & Governance

### 17.1 Open Product Decisions
1. `[OPEN PRODUCT DECISION]`: **Launch Day Timing**: Should daily launch leaderboards reset on a synchronized global clock (**00:00:00 UTC**, standardizing daily competition) or operate on a rolling 24-hour window? *(Recommendation: Standardize on 00:00:00 UTC to concentrate launch-day community engagement).*
2. `[OPEN PRODUCT DECISION]`: **Free Tier Visibility**: Should free submissions launch immediately upon admin approval, or should they be required to select an available future launch calendar date? *(Recommendation: Require scheduling to preserve daily leaderboard balance).*

### 17.2 Items Requiring Legal Review
1. `[LEGAL REVIEW REQUIRED]`: Formalize Terms of Service regarding non-refundable digital advertising inventory upon campaign activation.
2. `[LEGAL REVIEW REQUIRED]`: Review visual ad disclosures against current digital advertising consumer-protection guidelines.
3. `[LEGAL REVIEW REQUIRED]`: Privacy Policy disclosures regarding first-party salted IP hashing for fraud prevention and click analytics.

### 17.3 Items Requiring Real-World Validation
1. `[VALIDATION REQUIRED]`: Validate Merchant of Record (Paddle / Lemon Squeezy) business account approval and payout eligibility for the operating entity.
2. `[VALIDATION REQUIRED]`: Validate whether a $19 Launch Boost price point achieves the target 4.5% conversion rate among submitting founders.
3. `[VALIDATION REQUIRED]`: Calibrate anti-fraud risk weights (`SIG_SUBNET_CONCENTRATION`, `SIG_BURST_VELOCITY`) against live traffic patterns during the first 30 days post-launch.

### 17.4 Items Requiring Engineering Validation
1. `[ENGINEERING VALIDATION REQUIRED]`: Staging load-testing of MongoDB Atlas compound text search and aggregation pipelines to verify sub-150ms p95 latency under concurrent query load.
2. `[ENGINEERING VALIDATION REQUIRED]`: Benchmarking Redis queue throughput under peak launch traffic spikes (500 req/sec target).

---

## 18. Sign-Off & Approvals

- **Senior Product Manager**: Approved  
- **Principal Software Architect**: Approved  
- **Security & Integrity Engineering**: Approved  
- **Growth & SEO Strategy**: Approved  
