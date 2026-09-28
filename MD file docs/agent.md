# LaunchProduct — AI Agent Engineering Guide & System Instruction Manual

> **Document Type:** AI Agent Instruction Set & System Blueprint  
> **Target Audience:** Autonomous AI Agents, Senior Software Engineers, Systems Architects  
> **Project Name:** LaunchProduct (SaaS & AI Product Discovery and Monetization Platform)  
> **Version:** 1.0.0 (Production-Ready Technical Specification)  
> **Authoritative Precedence:** This document synthesizes and enforces architectural decisions from `PRD.md`, `System Architecture.md`, `database.md`, `database-schema.md`, `API Specification.md`, and `prompt.md`.

---

## Table of Contents

1. [Agent Persona, Mission & Execution Philosophy](#1-agent-persona-mission--execution-philosophy)
2. [Project Overview & Core Business Domain](#2-project-overview--core-business-domain)
3. [Document Map & Architectural Precedence](#3-document-map--architectural-precedence)
4. [Technology Stack & System Dependencies](#4-technology-stack--system-dependencies)
5. [Monorepo & Backend Directory Structure](#5-monorepo--backend-directory-structure)
6. [Core Architectural Invariants & Hard Constraints](#6-core-architectural-invariants--hard-constraints)
7. [Role-Based Access Control (RBAC) Matrix](#7-role-based-access-control-rbac-matrix)
8. [Database Layer & 15 Collection Specifications](#8-database-layer--15-collection-specifications)
9. [Anti-Fraud & Reputation Engine](#9-anti-fraud--reputation-engine)
10. [Ranking Engine & Mathematical Formulas](#10-ranking-engine--mathematical-formulas)
11. [Monetization, Ad Inventory & Webhook Ingestion](#11-monetization-ad-inventory--webhook-ingestion)
12. [API Conventions, Envelopes & Error Standard](#12-api-conventions-envelopes--error-standard)
13. [Security Architecture & Sandboxing](#13-security-architecture--sandboxing)
14. [Background Workers & BullMQ Job Queues](#14-background-workers--bullmq-job-queues)
15. [Phase-by-Phase Build Order Reference (`prompt.md`)](#15-phase-by-phase-build-order-reference-promptmd)
16. [Testing, Seed Data & Quality Assurance Strategy](#16-testing-seed-data--quality-assurance-strategy)
17. [Common AI Pitfalls & Anti-Patterns to Avoid](#17-common-ai-pitfalls--anti-patterns-to-avoid)

---

## 1. Agent Persona, Mission & Execution Philosophy

### 1.1 Persona
You are acting as a **Principal Full-Stack Architect & Senior Systems Engineer** specializing in Node.js, TypeScript, distributed systems, high-concurrency database design (MongoDB), and high-integrity marketplaces.

### 1.2 Mission
Your mission is to construct, configure, test, and deliver the **LaunchProduct** platform backend and integration layers with zero technical debt, rigorous security controls, mathematical precision in ranking, and uncompromised data integrity.

### 1.3 Core Execution Principles
1. **Zero Hallucination of Schemas & Endpoints:**  
   Every collection, field name, validation rule, API route, and error code must strictly align with `database-schema.md` and `API Specification.md`. Do not invent alternative names (e.g., use `pricing_model`, not `pricingType`; use `canonical_url`, not `websiteUrl`).
2. **MongoDB as the Sole Source of Truth:**  
   Redis is purely an ephemeral cache, token blacklist, rate limit counter, and BullMQ broker. No state may exist solely in Redis. If Redis is flushed (`FLUSHALL`), the system must continue to operate or reconstruct state from MongoDB without data loss.
3. **Defense-in-Depth Security:**  
   Input validation with Zod on every incoming request, strict SSRF egress filters on scraper workers, signed webhooks with idempotency keys, and parameterized aggregation pipelines.
4. **Backend-First Layered Monolith:**  
   Build clean boundaries: **Routes $\rightarrow$ Validation Middleware $\rightarrow$ Controllers $\rightarrow$ Services $\rightarrow$ Data Access Layer (Mongoose Models)**. Never embed raw database queries inside route handlers or controllers.
5. **Deterministic Testing:**  
   Every core business rule (anti-fraud score calculation, decay ranking calculation, claim DNS verification, webhook idempotency) must be accompanied by comprehensive automated test coverage.

---

## 2. Project Overview & Core Business Domain

LaunchProduct is a high-integrity product discovery and growth marketplace designed specifically for AI tools, SaaS products, and developer utilities.

### 2.1 The Problem It Solves
Traditional product launch platforms suffer from rampant vote manipulation, pay-to-win bias, arbitrary moderation, and opaque algorithms. LaunchProduct restores fairness through:
- **Transparent, reproducible ranking mathematics** (time-decayed vote/click formulas).
- **Multi-signal real-time anti-fraud engine** that silences vote-rings and datacenter bot networks.
- **Strict separation of organic discovery and paid sponsorship** (sponsored traffic is strictly isolated and never pollutes organic leaderboard algorithms).
- **Automated domain ownership verification** (DNS TXT, HTML `<meta>` tag, and well-known JSON files) for founder control.

### 2.2 Core Product Capabilities
1. **Curated & Community Launches:** Products are submitted by Hunters or Founders, enriched via automated headless scrapers, and launched with real-time voting.
2. **Dynamic Daily, Trending & All-Time Leaderboards:** Real-time decay scoring with midnight UTC snapshotting and historical archive locking.
3. **Reputation & Review Ecosystem:** Verified users leave qualitative reviews with sentiment ratings, pros, cons, and founder responses.
4. **Transparent Monetization:** Fixed-duration, slot-capped promotional tiers (Launch Boost, Category Featured, Homepage Spotlight) processed via Merchant of Record (Paddle / Lemon Squeezy).
5. **Embeddable Badges & Dynamic Social Cards:** SVG embed badges with real-time rank counters and dynamic SVG/Canvas OpenGraph social sharing previews.

---

## 3. Document Map & Architectural Precedence

When developing or extending LaunchProduct, navigate and honor the repository documentation using the following hierarchy:

| Document File | Purpose & Contents | Authority Level |
| :--- | :--- | :--- |
| **`PRD.md`** | High-level product requirements, user personas, MVP scope, feature tiers, business logic | High (Product Definition) |
| **`System Architecture.md`** | Component topology, network boundaries, SSRF defenses, worker topologies, scaling patterns | Supreme (System Design) |
| **`database.md`** | Comprehensive database design, relationships, transactions, aggregations, sample documents | Supreme (DB Architecture) |
| **`database-schema.md`** | Exact field-by-field definitions, enums, subdocuments, and compound index specs for all 15 collections | Supreme (Data Contract) |
| **`API Specification.md`** | Exact HTTP routes, request/response envelopes, status codes, query parameters, error responses | Supreme (API Contract) |
| **`UI-UX.md`** | Authoritative visual design system, design tokens, Poppins typography, component specs, and Next.js UX rules | Supreme (UI/UX Contract) |
| **`prompt.md`** | Granular, sequential development prompts for end-to-end backend and frontend implementation | Supreme (Execution Order) |

> [!IMPORTANT]
> **Precedence Rule:** If any apparent discrepancy arises between `PRD.md` (high-level narrative) and `database-schema.md` / `API Specification.md` (technical contracts), the technical contracts **always take precedence**. For frontend layout, visual design tokens, and components, **`UI-UX.md` is the supreme source of truth**. Never rename fields, alter endpoint paths, or deviate from the Poppins design system.

---

## 4. Technology Stack & System Dependencies

### 4.1 Core Technologies

```
+-----------------------------------------------------------------------+
|                             LAUNCHPRODUCT                             |
+-----------------------------------------------------------------------+
| Frontend UI:         Next.js 14+ (App Router, Poppins, Tailwind CSS)  |
| Backend Runtime:     Node.js 20 LTS (ESM or CommonJS with TS-Node)   |
| Language:            TypeScript 5.x (Strict Type Checking Enabled)    |
| HTTP Framework:      Express.js 4.x / 5.x                             |
| Primary Database:    MongoDB Atlas 7.0+ (Replica Set mandatory)       |
| ODM / Data Layer:    Mongoose 8.x                                     |
| Ephemeral Cache:     Redis 7.x (ioredis client)                       |
| Background Workers:  BullMQ 5.x (Redis-backed async job queues)       |
| Scraper Engine:      Puppeteer / Playwright (Chromium Sandbox)        |
| Payment Gateway:     Paddle / Lemon Squeezy (Merchant of Record)      |
| Dynamic Assets:      Sharp (image/SVG processing), Canvas (OG cards)  |
| Validation:          Zod (Schema definition & runtime parse)          |
| Security:            Helmet, CORS, Express-Rate-Limit, bcrypt, cookie |
+-----------------------------------------------------------------------+
```

### 4.2 Environmental Requirements
- **Node.js:** `>= 20.10.0`
- **MongoDB:** `>= 7.0` (Replica set required for multi-document ACID transactions via sessions).
- **Redis:** `>= 7.0` (Standard standalone or Redis Cluster).

---

## 5. Monorepo & Backend Directory Structure

Maintain a clean, layered modular architecture. All backend source code must reside under `/server` (or the project root for standalone backend repositories):

```
launchproduct/
├── .env.example
├── .gitignore
├── tsconfig.json
├── package.json
├── docs/
│   ├── PRD.md
│   ├── System Architecture.md
│   ├── database.md
│   ├── database-schema.md
│   ├── API Specification.md
│   ├── prompt.md
│   └── agent.md                 <-- (This file)
├── src/
│   ├── app.ts                   # Express app initialization, middleware pipeline
│   ├── server.ts                # HTTP server bootstrap, graceful shutdown handlers
│   ├── config/
│   │   ├── env.config.ts        # Zod-validated environment variables
│   │   ├── db.config.ts         # MongoDB Mongoose connection manager
│   │   ├── redis.config.ts      # ioredis client singleton
│   │   └── constants.ts         # App constants, defaults, error codes
│   ├── common/
│   │   ├── errors/              # AppError, BadRequestError, NotFoundError, etc.
│   │   ├── middlewares/         # authenticate, requireRole, rateLimiter, validator
│   │   ├── types/               # Global TypeScript declarations & Express extensions
│   │   └── utils/               # logger (Winston/Pino), crypto, dns, responseHelper
│   ├── models/                  # 15 Mongoose Schema definitions & TypeScript interfaces
│   │   ├── User.model.ts
│   │   ├── Product.model.ts
│   │   ├── Category.model.ts
│   │   ├── Vote.model.ts
│   │   ├── Review.model.ts
│   │   ├── Campaign.model.ts
│   │   ├── Payment.model.ts
│   │   ├── PaymentWebhookEvent.model.ts
│   │   ├── OwnershipVerification.model.ts
│   │   ├── ProductRevision.model.ts
│   │   ├── DailyLeaderboardSnapshot.model.ts
│   │   ├── ActivityEvent.model.ts
│   │   ├── ModerationAction.model.ts
│   │   ├── VerificationToken.model.ts
│   │   └── SystemSetting.model.ts
│   ├── modules/                 # Modular business logic units
│   │   ├── auth/                # Auth controller, service, validation, routes
│   │   ├── products/            # Product submission, discovery, updates
│   │   ├── claims/              # Domain ownership verification (DNS, Meta, File)
│   │   ├── votes/               # Voting logic & anti-fraud evaluation pipeline
│   │   ├── reviews/             # Qualitative review submission, voting, founder reply
│   │   ├── clicks/              # Outbound redirect tracking & traffic classifier
│   │   ├── leaderboards/        # Ranking calculations & snapshot archives
│   │   ├── campaigns/           # Ad slots, reservation, pricing, checkout links
│   │   ├── webhooks/            # MoR payment webhook ingestion & verification
│   │   ├── categories/          # Category taxonomy management
│   │   ├── badges/              # Real-time dynamic SVG badges & OG card generation
│   │   ├── analytics/           # Founder metrics, click analytics, aggregations
│   │   ├── moderation/          # Report queues, content triage, sanction logs
│   │   └── admin/               # System settings, manual overrides, platform stats
│   ├── workers/                 # BullMQ Background Job Processors
│   │   ├── scraper.worker.ts    # Headless browser metadata enrichment & SSRF filter
│   │   ├── ranking.worker.ts    # Rolling decay calculation & daily snapshot archiver
│   │   ├── fraud.worker.ts      # Asynchronous deep vote-ring & subnet analyzer
│   │   └── email.worker.ts      # Transactional notifications & magic links
│   └── scripts/
│       ├── seed.ts              # Idempotent database seeder with realistic test data
│       └── migrate.ts           # Schema migration & index rebuild utilities
└── tests/
    ├── unit/                    # Anti-fraud, ranking math, validation tests
    ├── integration/             # API routes, auth workflows, transaction tests
    └── e2e/                     # Webhook activation, end-to-end product lifecycle
```

---

## 6. Core Architectural Invariants & Hard Constraints

Every AI agent implementing code for LaunchProduct **must unconditionally enforce** the following seven architectural invariants:

### Invariant 1: Non-Negotiable Organic Traffic Isolation
- **Rule:** When tracking outbound product clicks (`/clicks/:productId`), every event is stamped with a `traffic_source` enum: `ORGANIC`, `SPONSORED`, `BOT`, or `FRAUD`.
- **Constraint:** In the ranking engine and all leaderboard score calculations, **ONLY `traffic_source: 'ORGANIC'` clicks are counted**. Sponsored clicks, bot clicks, and flagged clicks must be mathematically excluded from the ranking numerator. Paid promotion must **never** boost organic ranking directly.

### Invariant 2: Webhook-Only Campaign Activation
- **Rule:** An advertising campaign (`campaigns` collection) can **ONLY** transition from `PENDING_PAYMENT` to `ACTIVE` through a cryptographically signed, server-to-server webhook event from the Merchant of Record (Paddle / Lemon Squeezy).
- **Constraint:** Never allow frontend return URLs, query parameters (e.g. `?status=success`), or client-side calls to activate a campaign. Any attempt to activate a campaign without a verified webhook event signature stored in `payment_webhook_events` is a critical security violation.

### Invariant 3: Single Source of Truth
- **Rule:** MongoDB is the sole, definitive system of record.
- **Constraint:** Redis acts strictly as a cache, token blacklist, rate limit storage, and BullMQ transport. Business state must never be stored exclusively in Redis. If Redis crashes or experiences key eviction, the system must recover state seamlessly from MongoDB.

### Invariant 4: Mandatory ACID Transactions on Critical Paths
- **Rule:** All multi-document operations spanning multiple collections must execute within a Mongoose session transaction (`session.withTransaction(...)`).
- **Required Multi-Document Paths:**
  1. **Campaign Activation:** Creating the `payments` record + Updating the `campaigns` status to `ACTIVE` + Marking the `payment_webhook_events` as `PROCESSED`.
  2. **Product Claim Verification:** Updating `ownership_verifications` to `VERIFIED` + Updating `products.claimed_by` and `is_claimed` + Promoting user role from `HUNTER` to `FOUNDER` + Logging `activity_events`.
  3. **Product Hard Deletion / Sanction:** Updating `products.status` to `REJECTED` + Canceling active `campaigns` + Logging `moderation_actions`.

### Invariant 5: Strict SSRF Defense on Scrapers
- **Rule:** The automated metadata scraper worker (`scraper.worker.ts`) inspects external URLs submitted by users.
- **Constraint:** The scraper must resolve DNS hostnames before requesting and strictly block:
  - Loopback addresses (`127.0.0.0/8`, `::1`)
  - Private subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`)
  - Link-local and cloud metadata addresses (`169.254.169.254`, `fd00::/8`)
  - Non-standard HTTP/HTTPS protocols (e.g., `file://`, `gopher://`, `ftp://`).

### Invariant 6: Idempotent Webhook Processing
- **Rule:** Merchant of Record providers can retry webhooks multiple times.
- **Constraint:** Webhooks must check `payment_webhook_events` by `provider_event_id`. If an event with that ID already exists, immediately return HTTP `200 OK` with `{ status: "ALREADY_PROCESSED" }` without re-executing business logic.

### Invariant 7: Authentication & Cookie Security
- **Rule:** Web client authentication tokens must be transported exclusively via `HttpOnly`, `Secure`, `SameSite=Lax` cookies.
- **Constraint:** Never store access tokens in `localStorage` or `sessionStorage`. Passwords must be hashed using `bcrypt` with a minimum salt factor of 12. Password hashes must be excluded from default query projections (`select: false`).

---

## 7. Role-Based Access Control (RBAC) Matrix

LaunchProduct enforces a strict hierarchical 5-role permission model.

```
VISITOR (0)  --->  HUNTER (1)  --->  FOUNDER (2)  --->  MODERATOR (3)  --->  ADMIN (4)
```

### 7.1 Role Definitions
- **VISITOR:** Unauthenticated browsing user. Can view leaderboards, read products, inspect categories, read reviews, and trigger outbound clicks.
- **HUNTER:** Registered user with verified email. Can submit new products, upvote products, submit qualitative reviews, and report content.
- **FOUNDER:** User who has successfully completed domain ownership verification for at least one product. Retains all Hunter rights, plus editing claimed product profiles, responding to reviews as the verified maker, purchasing ad campaigns, and viewing product analytics.
- **MODERATOR:** Trusted community manager. Can review flagged submissions, approve/reject pending edits, triage reports, manage vote-fraud quarantine queues, and soft-delete abusive content.
- **ADMIN:** Platform operator. Unrestricted access: modify system settings, override fraud scores, issue financial refunds, ban users, manually trigger leaderboard snapshots, and manage platform categories.

### 7.2 Permissions Matrix

| Resource / Action | VISITOR | HUNTER | FOUNDER | MODERATOR | ADMIN |
| :--- | :---: | :---: | :---: | :---: | :---: |
| Browse Leaderboards & Products | ✅ | ✅ | ✅ | ✅ | ✅ |
| Submit Outbound Click | ✅ | ✅ | ✅ | ✅ | ✅ |
| Submit New Product | ❌ | ✅ | ✅ | ✅ | ✅ |
| Cast Upvote / Downvote | ❌ | ✅ | ✅ | ✅ | ✅ |
| Post Review & Ratings | ❌ | ✅ | ✅ | ✅ | ✅ |
| Initiate Ownership Claim | ❌ | ✅ | ✅ | ✅ | ✅ |
| Edit Claimed Product Profile | ❌ | ❌ | ✅ (Owned) | ✅ | ✅ |
| Post Official Founder Response | ❌ | ❌ | ✅ (Owned) | ❌ | ✅ |
| Purchase Ad Campaign | ❌ | ❌ | ✅ | ❌ | ✅ |
| View Granular Product Analytics | ❌ | ❌ | ✅ (Owned) | ✅ | ✅ |
| Triage Moderation Queue | ❌ | ❌ | ❌ | ✅ | ✅ |
| Overrule Fraud Scores | ❌ | ❌ | ❌ | ✅ | ✅ |
| Update Platform Settings | ❌ | ❌ | ❌ | ❌ | ✅ |
| Manage Categories Taxonomy | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 8. Database Layer & 15 Collection Specifications

All 15 collections defined in `database-schema.md` must be implemented as separate Mongoose models in `src/models/`.

```
========================================================================================
                                 LAUNCHPRODUCT DATA MODEL
========================================================================================

      +-----------------+         +-------------------+
      |      users      | <----+  | verification_     |
      |     (DS-1)      |      |  | tokens (DS-14)    |
      +--------+--------+      |  +-------------------+
               |               +--------------+
      +--------+-----------------------+      |
      |                                |      |
+-----v-------------+        +---------v------v----+        +---------------------+
|     products      | <------+      ownership_     |        |   product_revisions |
|      (DS-2)       |        | verifications (DS-9)|        |       (DS-10)       |
+--+---+---+---+----+        +---------------------+        +----------+----------+
   |   |   |   |                                                       |
   |   |   |   +-------------------------------------------------------+
   |   |   +----------------------+
   |   |                          |
   |   |   +-------------------+  |  +-------------------+         +---------------------+
   |   +-> |   votes (DS-4)    |  +->|  reviews (DS-5)   |         | system_settings     |
   |       +-------------------+     +-------------------+         |      (DS-15)        |
   |                                                               +---------------------+
   |       +-------------------+     +-------------------+
   +-----> | campaigns (DS-6)  | --> | payments (DS-7)   | <---+   +---------------------+
   |       +-------------------+     +-------------------+     |   | payment_webhook_    |
   |                                                           +-- |   events (DS-8)     |
   |       +-------------------+     +-------------------+         +---------------------+
   +-----> | activity_events   |     | moderation_actions|
   |       |     (DS-12)       |     |     (DS-13)       |
   |       +-------------------+     +-------------------+
   |
   |       +-------------------+     +-------------------------------+
   +-----> | categories (DS-3) |     | daily_leaderboard_            |
           +-------------------+     | snapshots (DS-11)             |
                                     +-------------------------------+
========================================================================================
```

### 8.1 Summary Table of the 15 Collections

| ID | Collection Name | Purpose & Primary Function | Critical Indexes |
| :--- | :--- | :--- | :--- |
| **DS-1** | `users` | User accounts, auth credentials, roles, reputation scores, activity counters | `email: 1` (unique), `username: 1` (unique), `role: 1` |
| **DS-2** | `products` | Core product entities, launch dates, counters, scoring metrics, status | `slug: 1` (unique), `status: 1, launch_date: -1`, `category_ids: 1` |
| **DS-3** | `categories` | Categorization taxonomy, slugs, display orders, active product counts | `slug: 1` (unique), `is_active: 1, display_order: 1` |
| **DS-4** | `votes` | Record of every upvote/downvote cast, anti-fraud flags, voter IP hash | `product_id: 1, user_id: 1` (unique), `voter_ip_hash: 1, created_at: -1` |
| **DS-5** | `reviews` | Community ratings (1-5 stars), text feedback, pros/cons, founder replies | `product_id: 1, user_id: 1` (unique), `product_id: 1, status: 1` |
| **DS-6** | `campaigns` | Paid advertising slots, tiers, start/end dates, click/impression stats | `product_id: 1`, `placement: 1, start_date: 1, end_date: 1`, `status: 1` |
| **DS-7** | `payments` | Financial ledger records, amounts, provider transaction IDs, refund logs | `provider_transaction_id: 1` (unique), `campaign_id: 1`, `user_id: 1` |
| **DS-8** | `payment_webhook_events` | Webhook idempotency audit log, raw payloads, processing status | `provider_event_id: 1` (unique), `status: 1, created_at: -1` |
| **DS-9** | `ownership_verifications`| Product claim requests, verification method, token, DNS check state | `product_id: 1, user_id: 1`, `verification_token: 1`, `status: 1` |
| **DS-10**| `product_revisions` | History of profile edits by founders awaiting moderator approval | `product_id: 1, status: 1`, `created_at: -1` |
| **DS-11**| `daily_leaderboard_snapshots` | Immutable daily historical archives of ranks, votes, and winners | `snapshot_date: 1` (unique), `snapshot_date: 1, "rankings.rank": 1` |
| **DS-12**| `activity_events` | Append-only event stream (clicks, views, upvotes, shares) | `product_id: 1, created_at: -1`, `event_type: 1, created_at: -1` |
| **DS-13**| `moderation_actions` | Audit log of all moderator and admin sanctions, flags, bans, and edits | `target_type: 1, target_id: 1`, `moderator_id: 1, created_at: -1` |
| **DS-14**| `verification_tokens` | Ephemeral tokens for email validation, password reset, magic links | `token: 1` (unique), `user_id: 1, token_type: 1`, TTL on `expires_at` |
| **DS-15**| `system_settings` | Global dynamic platform parameters, fraud weights, pricing constants | `key: 1` (unique) |

---

## 9. Anti-Fraud & Reputation Engine

The integrity of LaunchProduct depends on the anti-fraud engine. Every vote cast via `POST /api/v1/votes` must pass through the evaluation pipeline before affecting leaderboard rankings.

### 9.1 Signal Weights & Risk Score Computation
When a vote is submitted, the backend gathers real-time telemetry and calculates a composite **Risk Score ($R$)** from 0 to 100 based on dynamic weights stored in `system_settings`:

$$\text{Risk Score } (R) = \sum_{i=1}^{n} w_i \cdot \mathbb{I}(\text{signal}_i)$$

| Signal Code | Description | Default Weight | Condition |
| :--- | :--- | :---: | :--- |
| `SIG_ACCOUNT_NEW` | Account age under 48 hours | `+20` | `user.created_at > (Now - 48h)` |
| `SIG_IP_DATACENTER` | IP belongs to VPN, proxy, or hosting facility | `+25` | Detected via ASN / IP database |
| `SIG_SUBNET_CONCENTRATION`| $\ge 5$ votes for this product from same `/24` subnet in 1 hour | `+35` | Subnet aggregation query |
| `SIG_BURST_VELOCITY` | Voter casting $\ge 10$ votes within a 60-second window | `+25` | Redis rolling rate counter |
| `SIG_ZERO_PRIOR_ACTIVITY` | User has 0 previous reviews, comments, or views | `+15` | `user.reputation_score == 0` |
| `SIG_DEVICE_COLLISION` | Duplicate browser fingerprint canvas/WebGL hash | `+40` | Fingerprint hash match |
| `SIG_HISTORICAL_TRUST` | Account $>30$ days old with positive reputation | `-20` | Trust credit discount |

### 9.2 Vote State Triage Rules

```
                      +-----------------------------+
                      |       Vote Submitted        |
                      +--------------+--------------+
                                     |
                         [ Calculate Risk Score R ]
                                     |
               +---------------------+---------------------+
               |                                           |
           ( R < 30 )                             ( 30 <= R < 70 )
               |                                           |
     +---------v---------+                       +---------v---------+
     |   Status: VALID   |                       |  Status: FLAGGED  |
     |  Counted in Rank  |                       | Counted provision-|
     +-------------------+                       | ally; sent to     |
                                                 | BullMQ triage     |
                                                 +-------------------+
                                                           |
                                                      ( R >= 70 )
                                                           |
                                                 +---------v---------+
                                                 | Status:QUARANTINED|
                                                 | Excluded from Rank|
                                                 | Awaiting Mod Team |
                                                 +-------------------+
```

- **VALID ($R < 30$):** Vote is immediately approved. `is_valid: true`. Increments product's `valid_votes_count`.
- **FLAGGED ($30 \le R < 69$):** Vote is saved as `FLAGGED`. Ingested into the `fraud-triage` BullMQ queue for deep async graph analysis.
- **QUARANTINED ($R \ge 70$):** Vote is isolated. `is_valid: false`. Does not increment `valid_votes_count`. Product owner is not notified.
- **Disposable Email Check:** If the voter's email domain matches a known disposable email provider, mark immediately as `REJECTED_BOT` and return HTTP `200 OK` silently to avoid alerting the bot operator.

---

## 10. Ranking Engine & Mathematical Formulas

The platform features three distinct leaderboards: **Today (Launch)**, **Trending**, and **All-Time**.

### 10.1 Daily Launch Leaderboard ($S_{\text{launch}}$)
Calculated in real-time or via 60-second cached Redis updates. Accounts for valid upvotes, organic clicks, and hourly gravity decay:

$$S_{\text{launch}} = \frac{V_{\text{valid}} \cdot W_v + U_{\text{organic\_clicks}} \cdot W_c}{(\Delta t_{\text{hours}} + 1)^{\gamma_{\text{launch}}}}$$

- $V_{\text{valid}}$: Total votes with `status: 'VALID'` cast for the product during the current launch day.
- $W_v$: Vote weight constant (Default: `1.0`).
- $U_{\text{organic\_clicks}}$: Unique organic outbound clicks (traffic source `ORGANIC` only).
- $W_c$: Click weight constant (Default: `0.2`).
- $\Delta t_{\text{hours}}$: Elapsed hours since the official launch time (`00:00 UTC` of launch day).
- $\gamma_{\text{launch}}$: Gravity decay parameter (Default: `1.8`).

### 10.2 Trending Leaderboard ($S_{\text{trending}}$)
Calculated over a rolling 7-day window. Applies an exponential daily decay factor ($\lambda$):

$$S_{\text{trending}} = \sum_{d=0}^{6} \left( V_d \cdot W_v + U_d \cdot W_c \right) \cdot \lambda^d$$

- $d$: Days ago ($0 = \text{today}, 1 = \text{yesterday}, \dots, 6 = \text{6 days ago}$).
- $\lambda$: Daily decay factor (Default: `0.75`).

### 10.3 All-Time Leaderboard ($S_{\text{alltime}}$)
Balances long-term aggregate popularity with community quality using Bayesian average rating shrinkage:

$$S_{\text{alltime}} = \log_{10}(V_{\text{total}} + 1) \cdot 40 + \left( \frac{V_{\text{reviews}} \cdot \bar{R} + K \cdot \mu}{V_{\text{reviews}} + K} \right) \cdot 12$$

- $V_{\text{total}}$: Lifetime valid upvotes.
- $V_{\text{reviews}}$: Total count of verified reviews for the product.
- $\bar{R}$: Average rating of the product ($1.00 - 5.00$).
- $K$: Bayesian shrinkage confidence constant (Default: `5`).
- $\mu$: Platform-wide mean review rating across all products (Default: `4.0`).

### 10.4 Midnight UTC Snapshot Protocol
At `00:00:00 UTC` sharp every day, the `ranking.worker.ts` executes the snapshot job:
1. Locks the current day's leaderboard rankings.
2. Writes an immutable document into `daily_leaderboard_snapshots` (DS-11) capturing the top 100 products, their final scores, rank positions, and vote counts.
3. Automatically sets `badges.daily_rank` on the top 3 products (Rank 1: `#1 Product of the Day`, Rank 2: `#2 Product of the Day`, Rank 3: `#3 Product of the Day`).
4. Resets the daily launch cycle for the new calendar day.

---

## 11. Monetization, Ad Inventory & Webhook Ingestion

### 11.1 Sponsorship Tiers & Placements

| Tier Code | Placement | Duration | Pricing | Slot Capacity Limit |
| :--- | :--- | :---: | :---: | :--- |
| `LAUNCH_BOOST` | Elevated position on Launch Day feed | 48 Hours | $19.00 | Max 5 per day |
| `CATEGORY_FEATURED`| Pinned top banner within specific category | 7 Days | $49.00 | Max 3 per category concurrently |
| `HOMEPAGE_SPOTLIGHT`| Primary hero banner on homepage | 24 Hours | $149.00 | Max 2 per calendar day |
| `PARTNER_BUNDLE` | Homepage Spotlight + Category Featured | 7 Days | $299.00 | Max 1 per week |

### 11.2 The Checkout & Webhook Lifecycle Flow

```
Founder UI               Express Backend          Merchant of Record (Paddle)
    |                          |                             |
    |-- 1. Create Campaign --->|                             |
    |   (Select Tier & Dates)  |                             |
    |                          |-- 2. Verify Capacity        |
    |                          |-- 3. Create Draft Record    |
    |                          |-- 4. Generate MoR PayLink ->|
    |<-- 5. Return CheckoutURL-|                             |
    |                          |                             |
    |-- 6. Redirect to MoR --->|                             |
    |   (Founder Pays)         |                             |
    |                          |                             |
    |                          |<-- 7. POST /webhooks/mor ---|
    |                          |   (Cryptographic Signature) |
    |                          |-- 8. Verify HMAC Signature  |
    |                          |-- 9. Check Idempotency Key  |
    |                          |-- 10. ACID Transaction:     |
    |                          |       * Save Payment Record |
    |                          |       * Set Campaign ACTIVE |
    |                          |       * Mark Webhook Done   |
    |                          |-- 11. Return 200 OK ------->|
    |                          |                             |
```

### 11.3 Webhook Verification Code Requirements
- Read the raw request body buffer before any JSON parsing.
- Compute the HMAC SHA-256 hash using the configured secret key (`MOR_WEBHOOK_SECRET`).
- Compare the hash using `crypto.timingSafeEqual` to prevent timing attacks.
- Check `payment_webhook_events` for existing `provider_event_id`. If exists, return HTTP 200 immediately.

---

## 12. API Conventions, Envelopes & Error Standard

All HTTP endpoints must strictly adhere to the standards outlined in `API Specification.md`.

### 12.1 Standard Response Envelope Format

#### Success Envelope (HTTP 200 / 201)
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 142,
    "total_pages": 8,
    "timestamp": "2026-09-19T14:30:00.000Z"
  }
}
```

#### Error Envelope (HTTP 4xx / 5xx)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The request payload contains invalid fields.",
    "details": [
      {
        "field": "canonical_url",
        "message": "Must be a valid HTTPS URL."
      }
    ]
  },
  "meta": {
    "timestamp": "2026-09-19T14:30:00.000Z",
    "request_id": "req_8f1a2c4e"
  }
}
```

### 12.2 Standard Error Code Registry
- `UNAUTHORIZED` (401): Missing or expired authentication token.
- `FORBIDDEN` (403): User role lacks required permission.
- `NOT_FOUND` (404): Resource not found.
- `CONFLICT` (409): Unique constraint violation (e.g., duplicate slug or email).
- `VALIDATION_FAILED` (422): Payload failed Zod schema checks.
- `RATE_LIMIT_EXCEEDED` (429): Quota exhausted.
- `SLOT_UNAVAILABLE` (409): Campaign inventory slot capacity reached.
- `ALREADY_VOTED` (409): User has already voted for this product.
- `INTERNAL_SERVER_ERROR` (500): Unhandled exception.

### 12.3 Global Rate Limiting Strategy
- **Public Endpoints (Browsing, Search):** 60 requests/minute per IP.
- **Authenticated General (Profile, Feed):** 300 requests/minute per User ID.
- **Voting Endpoint (`POST /votes`):** 10 requests/minute per User ID.
- **Product Submission (`POST /products`):** 5 requests/hour per User ID.
- **Outbound Click Tracking (`GET /clicks/:productId`):** 120 requests/minute per IP.

---

## 13. Security Architecture & Sandboxing

### 13.1 SSRF Defense on Scraper Workers
The metadata enrichment worker (`scraper.worker.ts`) inspects external URLs submitted by users. It must pass all URLs through the `ssrfGuard` utility:

```typescript
// Architectural Requirement: DNS Resolution & Private IP Blocklist
import dns from 'node:dns/promises';
import ipaddr from 'ipaddr.js';

export async function validateSafeUrl(rawUrl: string): Promise<string> {
  const parsed = new URL(rawUrl);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new BadRequestError('Invalid protocol. Only HTTP and HTTPS are permitted.');
  }

  const addresses = await dns.lookup(parsed.hostname, { all: true });
  for (const { address } of addresses) {
    const addr = ipaddr.parse(address);
    const range = addr.range();
    if (['loopback', 'private', 'linkLocal', 'carrierGradeNat', 'uniqueLocal'].includes(range)) {
      throw new ForbiddenError(`SSRF Block: Address ${address} is in prohibited range (${range}).`);
    }
  }
  return parsed.toString();
}
```

### 13.2 Content Sanitization
- All user-supplied Markdown (product descriptions, reviews, founder replies) must be sanitized on the backend using `DOMPurify` / `sanitize-html` to prevent stored XSS attacks.
- Prohibit raw `<script>`, `<iframe>`, and `onload`/`onerror` attributes.

---

## 14. Background Workers & BullMQ Job Queues

Redis provides the message transport for BullMQ workers. Four separate queues must be implemented:

```
+-------------------+      +--------------------+      +--------------------------------------+
|    Queue Name     |      |    Concurrency     |      |           Job Types Handled          |
+-------------------+      +--------------------+      +--------------------------------------+
| scraper-queue     | ---> | 3 workers          | ---> | Scrape metadata, favicon, OG images  |
| ranking-queue     | ---> | 1 worker (mutex)   | ---> | Hourly score decay, midnight snapshot|
| fraud-queue       | ---> | 5 workers          | ---> | Async graph analysis, subnet sweeps  |
| email-queue       | ---> | 10 workers         | ---> | Magic links, claim tokens, receipts  |
+-------------------+      +--------------------+      +--------------------------------------+
```

### 14.1 Worker Guidelines
1. **Idempotency:** Every job processor must be safe to retry on transient failure.
2. **Backoff Strategy:** Exponential backoff with `attempts: 3`, `backoff: { type: 'exponential', delay: 2000 }`.
3. **Dead Letter Queue (DLQ):** Failed jobs after max retries must be retained in the failed set for manual inspection.

---

## 15. Phase-by-Phase Build Order Reference (`prompt.md`)

When executing the implementation, follow the 19-phase sequence defined in `prompt.md`. Do not jump ahead or implement high-level features before lower-level foundations exist.

```
PHASE 00: Project Scaffold & Infrastructure Setup
   |
PHASE 01: Environment Configuration & Validation
   |
PHASE 02: Database Layer Connection & Resilience
   |
PHASE 03: Mongoose Schemas & Index Strategy (15 Collections)
   |
PHASE 04: Core Middleware, Error Handling & Logging
   |
PHASE 05: Authentication & User Management Module
   |
PHASE 06: Product Submission & Lifecycle Management
   |
PHASE 07: Product Claim & Ownership Verification (DNS/Meta/File)
   |
PHASE 08: Voting & Multi-Signal Anti-Fraud Engine
   |
PHASE 09: Community Review & Rating System
   |
PHASE 10: Outbound Click Tracking & Traffic Isolation
   |
PHASE 11: Ranking Engine & Snapshot Archives
   |
PHASE 12: Monetization & Ad Campaign Reservation
   |
PHASE 13: Merchant of Record Webhooks & Payment Ledger
   |
PHASE 14: Dynamic SVG Badges & OpenGraph Card Generator
   |
PHASE 15: Content Moderation & Administrative Tools
   |
PHASE 16: Headless Scraper Service & BullMQ Worker
   |
PHASE 17: Realistic Seed Generator & Integration Pipeline
   |
PHASE 18: Production Hardening, Security Audit & Readiness
```

---

## 16. Testing, Seed Data & Quality Assurance Strategy

### 16.1 Testing Requirements
- **Unit Tests (`npm run test:unit`):**
  - Anti-fraud risk calculation formula.
  - Time-decay ranking calculation functions.
  - Bayesian rating shrinkage calculations.
  - SSRF IP validator.
- **Integration Tests (`npm run test:integration`):**
  - Full authentication flow (register $\rightarrow$ verify email $\rightarrow$ login $\rightarrow$ refresh).
  - Product submission $\rightarrow$ scraper mock $\rightarrow$ product activation.
  - Upvote cast $\rightarrow$ anti-fraud triage $\rightarrow$ vote count updated.
  - Ownership claim $\rightarrow$ DNS verification mock $\rightarrow$ role upgraded to `FOUNDER`.
  - MoR webhook signed payload $\rightarrow$ transaction commits $\rightarrow$ campaign activated.
- **E2E Smoke Tests (`npm run test:e2e`):**
  - Daily snapshot cron triggers $\rightarrow$ top 3 badges awarded $\rightarrow$ snapshot persisted.

### 16.2 Realistic Database Seeder (`scripts/seed.ts`)
The seed script must populate the database with:
- 1 System Admin, 2 Moderators, 10 Founders, 50 Hunters.
- 10 Main Categories (AI Tools, SaaS, Dev Tools, Productivity, Marketing, etc.).
- 50 Realistic Products across multiple lifecycle states (`ACTIVE`, `PENDING_REVIEW`, `SCHEDULED`).
- 500 Historical Votes with varying risk scores to exercise all 3 triage states.
- 100 Qualitative Reviews with pros, cons, and founder replies.
- 5 Active and Completed Ad Campaigns.
- 7 Days of Historical Daily Leaderboard Snapshots.

---

## 17. Common AI Pitfalls & Anti-Patterns to Avoid

| Anti-Pattern | Correct Implementation Rule |
| :--- | :--- |
| **Allowing sponsored clicks to boost ranking** | In leaderboard aggregation pipelines, **ALWAYS filter `{ "traffic_source": "ORGANIC" }`**. Never aggregate raw clicks without source validation. |
| **Activating campaigns in the redirect URL** | Frontend success return URLs are strictly informational. Only the cryptographically signed server webhook can activate a campaign. |
| **Storing session tokens in `localStorage`** | Always issue auth tokens via secure `HttpOnly` cookies. Prevent XSS token exfiltration. |
| **Missing atomic operators on counters** | Never do `product.votes_count += 1; await product.save()`. Always use atomic `$inc` operators: `Product.updateOne({ _id }, { $inc: { valid_votes_count: 1 } })`. |
| **Unindexed search queries** | Text search must use the compound text index on `name`, `tagline`, and `description`. Leaderboard queries must use compound indexes (`status: 1, launch_date: -1`). |
| **Unsafe scraper requests** | Never run Puppeteer directly against raw user input. Always validate through the SSRF DNS resolver check first. |
| **Missing Mongoose transactions on payments** | Payment recording and campaign activation must be wrapped in a replica-set Mongoose transaction session to prevent orphaned billing states. |
| **Hardcoding fraud weights in code** | Load anti-fraud signal weights dynamically from the `system_settings` collection so admins can adjust parameters in real time without code redeployments. |

---

## 18. Verification Checklist for the AI Agent

Before declaring any phase or the entire project complete, run through this checklist:

- [ ] All 15 Mongoose models match `database-schema.md` down to the exact field names, types, and compound indexes.
- [ ] All API endpoints match the HTTP paths, methods, request bodies, and envelope schemas in `API Specification.md`.
- [ ] The anti-fraud engine calculates composite scores correctly and triages into `VALID`, `FLAGGED`, or `QUARANTINED`.
- [ ] Ranking algorithms implement the exact mathematical decay formulas from Section 10.
- [ ] Organic traffic isolation is strictly verified in click tracking and leaderboard pipelines.
- [ ] Webhook processing is idempotent and immune to replay attacks.
- [ ] The SSRF defense blocks all private IP ranges and localhost lookups.
- [ ] The seed script executes cleanly and creates a fully functioning demo environment.
- [ ] All unit, integration, and security tests pass with zero failures.

---

> **Final Directive to AI Agent:** You are now equipped with the complete technical, architectural, and operational guidelines for LaunchProduct. Proceed to execute the implementation step-by-step according to `prompt.md`, maintaining uncompromising standards of quality, security, and precision.
