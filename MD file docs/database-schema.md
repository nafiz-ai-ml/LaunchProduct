# LaunchProduct — Database Schema Specification (`database-schema.md`)

**Document Version:** 1.0.0  
**Status:** Engineering Ready / Definitive Architecture  
**Database Platform:** MongoDB Atlas (M10+ Dedicated Cluster, Multi-AZ Replica Set, MongoDB 7+)  
**Object Document Mapper (ODM):** Mongoose 8+ / Native MongoDB Driver 6+  
**Specification Source:** Extracted from `database.md` (aligned with PRD v1.2.0, System Architecture v1.3.0, and DFD v1.0.0)  
**Publication Date:** September 19, 2026  

---

## Overview

This document provides the definitive, isolated **Database Schema Specification** for all 15 core collections powering the **LaunchProduct** product discovery and growth platform. All schemas are designed for strict runtime enforcement under Mongoose 8+ and MongoDB 7+ Native JSON Schema Validation (`$jsonSchema`).

### Table of Contents

1. [`users` (`DS1`) — Identity, Roles & Founder Profiles](#1-collection-users-ds1)
2. [`products` (`DS2`) — Canonical Product Catalog](#2-collection-products-ds2)
3. [`categories` (`DS3`) — Directory Taxonomy Tree](#3-collection-categories-ds3)
4. [`votes` (`DS4`) — Authenticated Upvotes & 6-Factor Risk](#4-collection-votes-ds4)
5. [`reviews` (`DS5`) — User Reviews & Ratings (Phase 2 Post-MVP)](#5-collection-reviews-ds5--phase-2-post-mvp)
6. [`campaigns` (`DS6`) — Promotional Slot Reservations](#6-collection-campaigns-ds6)
7. [`payments` (`DS7`) — Merchant of Record Financial Ledger](#7-collection-payments-ds7)
8. [`payment_webhook_events` (`DS8`) — Webhook Idempotency Audit](#8-collection-payment_webhook_events-ds8)
9. [`ownership_verifications` (`DS9`) — Domain Ownership Claims (72h TTL)](#9-collection-ownership_verifications-ds9)
10. [`product_revisions` (`DS10`) — Versioned Audit Trail](#10-collection-product_revisions-ds10)
11. [`daily_leaderboard_snapshots` (`DS11`) — Frozen Leaderboard Archives](#11-collection-daily_leaderboard_snapshots-ds11)
12. [`activity_events` (`DS12`) — Operational Event Stream (90d TTL)](#12-collection-activity_events-ds12)
13. [`moderation_actions` (`DS13`) — Staff Governance Decision Log](#13-collection-moderation_actions-ds13)
14. [`verification_tokens` (`DS14`) — Magic Link Auth Tokens (15m TTL)](#14-collection-verification_tokens-ds14)
15. [`system_settings` (`DS15`) — Dynamic System Configuration](#15-collection-system_settings-ds15)

---

## 1. Collection: `users` (`DS1`)

**Purpose:** Primary identity and authentication store. Stores user accounts, RBAC authorization tiers, external OAuth identity bindings, and verified founder identity metadata.

### 1.1 Document Fields

| Field | BSON Type | Req | Default | Constraints / Allowed Values | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | `ObjectId()` | Auto-generated 24-char hex | Canonical user identifier. |
| `email` | `String` | Yes | None | Unique, lowercased, valid RFC 5322 | User's primary login credential. |
| `role` | `String` | Yes | `'HUNTER'` | Enum: `VISITOR`, `HUNTER`, `FOUNDER`, `MODERATOR`, `ADMIN` | Platform authorization role governing permissions. |
| `oauthProviders` | `Array` | No | `[]` | Array of subdocuments (see below) | Connected OAuth identity providers (Google, GitHub). |
| `founderProfile` | `Object` | No | `{}` | Embedded subdocument (see below) | Verified founder identity metadata. |
| `isBanned` | `Boolean` | Yes | `false` | `true`, `false` | Account administrative ban flag. |
| `banReason` | `String` | No | `null` | Max 500 chars | Justification note for administrative suspension. |
| `lastLoginAt` | `Date` | No | `null` | Valid ISO Date | Timestamp of most recent authentication. |
| `createdAt` | `Date` | Yes | `Date.now()` | Managed by `{ timestamps: true }` | Account creation timestamp. |
| `updatedAt` | `Date` | Yes | `Date.now()` | Managed by `{ timestamps: true }` | Last profile modification timestamp. |

### 1.2 Embedded Subdocuments

#### `users.oauthProviders` (Array of Objects)
- `provider`: `String` (Required, Enum: `'google'`, `'github'`) — Identity provider source.
- `providerUserId`: `String` (Required) — Provider-assigned alphanumeric subject ID.
- `linkedAt`: `Date` (Required, Default: `Date.now()`) — Association timestamp.

#### `users.founderProfile` (Embedded Object)
- `displayName`: `String` (Trimmed, 2–80 chars) — Public founder display name.
- `bio`: `String` (Max 300 chars) — Concise biographical note.
- `avatarUrl`: `String` (Valid HTTPS URL) — Profile image endpoint.
- `twitterHandle`: `String` (Regex: `^@?[A-Za-z0-9_]{1,15}$`) — Official X/Twitter handle.
- `githubHandle`: `String` (Max 39 chars) — Official GitHub username.
- `linkedinUrl`: `String` (Valid HTTPS URL) — Professional LinkedIn profile URL.
- `websiteUrl`: `String` (Valid HTTPS URL) — Personal or studio homepage URL.

---

## 2. Collection: `products` (`DS2`)

**Purpose:** The central catalog entity representing software products, tools, and SaaS platforms discovered and ranked on the platform.

### 2.1 Document Fields

| Field | BSON Type | Req | Default | Constraints / Allowed Values | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | `ObjectId()` | Auto-generated 24-char hex | Canonical product identifier. |
| `slug` | `String` | Yes | None | Unique, lowercase, slug format | URL slug for routing and directory URLs. |
| `canonicalDomain`| `String` | Yes | None | Unique, lowercase ASCII domain | Domain extracted from URL (e.g. `getacme.com`). |
| `name` | `String` | Yes | None | 2–100 chars, trimmed | Commercial product name. |
| `tagline` | `String` | Yes | None | 10–120 chars, trimmed | Concise elevator pitch. |
| `description` | `String` | Yes | None | Max 5,000 chars, sanitized markdown | Long-form product overview. |
| `websiteUrl` | `String` | Yes | None | Valid HTTPS URL, max 2,048 chars | External destination website URL. |
| `founderId` | `ObjectId` | No | `null` | Ref: `users._id` | Verified product founder/owner (promoted via claim). |
| `submittedById` | `ObjectId` | Yes | None | Ref: `users._id` | Hunter or founder who originally submitted the listing. |
| `categoryId` | `ObjectId` | Yes | None | Ref: `categories._id` | Primary classification category. |
| `pricing` | `Object` | Yes | None | Embedded subdocument (see below) | Standardized pricing structure. |
| `media` | `Object` | Yes | None | Embedded subdocument (see below) | Logos, banners, screenshots. |
| `status` | `String` | Yes | `'DRAFT'` | Enum: `DRAFT`, `PENDING_REVIEW`, `SCHEDULED`, `LIVE`, `SUSPENDED`, `REJECTED`, `ARCHIVED`, `DELETED` | Lifecycle state. |
| `launchDate` | `Date` | No | `null` | UTC midnight (`YYYY-MM-DD`) | Scheduled platform launch date. |
| `rejectionReason`| `String`| No | `null` | Max 500 chars | Reason for editorial rejection. |
| `initialVersion`| `Number` | Yes | `1` | Integer >= 1 | Current revision pointer. |
| `createdAt` | `Date` | Yes | `Date.now()` | Managed by `{ timestamps: true }` | Ingestion timestamp. |
| `updatedAt` | `Date` | Yes | `Date.now()` | Managed by `{ timestamps: true }` | Update timestamp. |

### 2.2 Embedded Subdocuments

#### `products.pricing` (Embedded Object)
- `pricingType`: `String` (Required, Enum: `'Free'`, `'Freemium'`, `'Paid'`, `'Contact'`) — Standardized pricing classification.
- `startingPriceCents`: `Number` (Integer, Min: 0, Default: 0) — Lowest base tier entry price in cents.
- `currency`: `String` (Required, Enum: `'USD'`, Default: `'USD'`) — ISO currency code.

#### `products.media` (Embedded Object)
- `logoUrl`: `String` (Required, Valid HTTPS URL) — Square brand avatar/logo icon.
- `bannerUrl`: `String` (Optional, Valid HTTPS URL) — Hero promotional card banner.
- `screenshotUrls`: `[String]` (Max 5 valid HTTPS URLs) — UI gallery screenshots.

---

## 3. Collection: `categories` (`DS3`)

**Purpose:** Two-tier hierarchical taxonomy structure providing organized categorization for product listings and faceted directory navigation.

### 3.1 Document Fields

| Field | BSON Type | Req | Default | Constraints / Allowed Values | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | `ObjectId()` | Auto-generated 24-char hex | Category identifier. |
| `slug` | `String` | Yes | None | Unique, lowercase slug | Routing identifier (e.g. `ai-copywriting`). |
| `name` | `String` | Yes | None | 2–50 chars, trimmed | Display title of category. |
| `description` | `String` | No | `null` | Max 300 chars | SEO meta description for category page. |
| `icon` | `String` | No | `null` | Lucide icon token or SVG path | Visual icon identifier. |
| `parentId` | `ObjectId` | No | `null` | Ref: `categories._id` | Parent category reference (two-tier maximum).|
| `sortOrder` | `Number` | Yes | `0` | Integer | Display ordering index. |
| `isActive` | `Boolean` | Yes | `true` | `true`, `false` | Directory visibility flag. |
| `createdAt` | `Date` | Yes | `Date.now()` | Managed by `{ timestamps: true }` | Creation timestamp. |
| `updatedAt` | `Date` | Yes | `Date.now()` | Managed by `{ timestamps: true }` | Modification timestamp. |

---

## 4. Collection: `votes` (`DS4`)

**Purpose:** Tracks authenticated community upvotes and captures embedded 6-factor anti-fraud telemetry at the moment of voting.

### 4.1 Document Fields

| Field | BSON Type | Req | Default | Constraints / Allowed Values | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | `ObjectId()` | Auto-generated 24-char hex | Vote record identifier. |
| `productId` | `ObjectId` | Yes | None | Ref: `products._id` | Target product receiving the upvote. |
| `userId` | `ObjectId` | Yes | None | Ref: `users._id` | Authenticated user casting the vote. |
| `status` | `String` | Yes | `'VALID'` | Enum: `VALID`, `FLAGGED_FOR_REVIEW`, `QUARANTINED`, `REJECTED_BOT`, `RETRACTED`, `APPROVED_BY_MOD` | Fraud disposition status. |
| `riskAssessment` | `Object` | Yes | None | Embedded subdocument (see below) | 6-factor anti-fraud evaluation telemetry. |
| `createdAt` | `Date` | Yes | `Date.now()` | Managed by `{ timestamps: true }` | Vote casting timestamp. |
| `updatedAt` | `Date` | Yes | `Date.now()` | Managed by `{ timestamps: true }` | Vote disposition modification timestamp. |

### 4.2 Embedded Subdocuments

#### `votes.riskAssessment` (Embedded Object)
- `riskScore`: `Number` (Required, Integer: 0–100) — Composite score computed by anti-fraud engine.
- `riskSignals`: `[String]` (Required) — Triggered risk indicators (`NEW_ACCOUNT`, `DATACENTER_ASN`, `SUBNET_BURST`, `VELOCITY_SPIKE`, `NO_NAV_TELEMETRY`, `FINGERPRINT_MATCH`, `PROXY_VPN`, `RATE_LIMIT_BURST`).
- `ipHash`: `String` (Required, 64-char hex) — SHA-256 HMAC of client IP with rotating daily salt.
- `subnetHash`: `String` (Required, 64-char hex) — SHA-256 HMAC of `/24` IPv4 subnet.
- `asnNumber`: `Number` (Optional, Integer) — BGP Autonomous System Number from MaxMind database.
- `accountAgeHours`: `Number` (Required, Float >= 0) — User account age in hours at moment of vote.
- `fingerprintHash`: `String` (Optional, 64-char hex) — Canvas/browser hardware signature.

---

## 5. Collection: `reviews` (`DS5`) — *Phase 2 (Post-MVP)*

**Purpose:** Captures post-MVP qualitative community reviews, 1–5 integer star ratings, and optional founder responses.

### 5.1 Document Fields

| Field | BSON Type | Req | Default | Constraints / Allowed Values | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | `ObjectId()` | Auto-generated 24-char hex | Review identifier. |
| `productId` | `ObjectId` | Yes | None | Ref: `products._id` | Target product. |
| `userId` | `ObjectId` | Yes | None | Ref: `users._id` | Review author. |
| `rating` | `Number` | Yes | None | Integer: 1–5 | Star rating score. |
| `content` | `String` | Yes | None | 20–2,000 chars, markdown sanitized| Review body commentary. |
| `founderReply` | `Object` | No | `null` | Embedded subdocument (see below) | Official founder response or rebuttal. |
| `isFlagged` | `Boolean` | Yes | `false` | `true`, `false` | Flagged for moderator inspection. |
| `createdAt` | `Date` | Yes | `Date.now()` | Managed by `{ timestamps: true }` | Submission timestamp. |
| `updatedAt` | `Date` | Yes | `Date.now()` | Managed by `{ timestamps: true }` | Edit timestamp. |

### 5.2 Embedded Subdocuments

#### `reviews.founderReply` (Embedded Object)
- `content`: `String` (Required, Max 1,000 chars) — Founder reply text.
- `repliedAt`: `Date` (Required, Default: `Date.now()`) — Response timestamp.

---

## 6. Collection: `campaigns` (`DS6`)

**Purpose:** Manages monetized promotional inventory placements, checkout holds, scheduling, and active display states.

### 6.1 Document Fields

| Field | BSON Type | Req | Default | Constraints / Allowed Values | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | `ObjectId()` | Auto-generated 24-char hex | Campaign identifier. |
| `productId` | `ObjectId` | Yes | None | Ref: `products._id` | Sponsored product. |
| `userId` | `ObjectId` | Yes | None | Ref: `users._id` | Sponsoring founder user ID. |
| `slotId` | `String` | Yes | None | E.g. `homepage-hero-1`, `category-banner-3` | Fixed advertising slot position. |
| `tier` | `String` | Yes | None | Enum: `HOMEPAGE_HERO`, `CATEGORY_BANNER`, `NEWSLETTER_SPONSOR` | Sponsorship product package. |
| `status` | `String` | Yes | `'RESERVED'` | Enum: `RESERVED`, `PENDING_PAYMENT`, `ACTIVE`, `PAUSED`, `COMPLETED`, `CANCELLED` | Placement state. |
| `startsAt` | `Date` | Yes | None | ISO Date (UTC Midnight) | Campaign active launch date. |
| `endsAt` | `Date` | Yes | None | ISO Date (UTC Midnight) | Campaign natural expiration date. |
| `paymentId` | `ObjectId` | No | `null` | Ref: `payments._id` | Bound financial payment record. |
| `reservationExpiresAt`| `Date`| Yes | None | `startsAt + 15 minutes` | Slot hold expiration timestamp. |
| `createdAt` | `Date` | Yes | `Date.now()` | Managed by `{ timestamps: true }` | Booking creation timestamp. |
| `updatedAt` | `Date` | Yes | `Date.now()` | Managed by `{ timestamps: true }` | State update timestamp. |

---

## 7. Collection: `payments` (`DS7`)

**Purpose:** Financial transaction ledger for merchant of record checkout transactions (Paddle / Lemon Squeezy).

### 7.1 Document Fields

| Field | BSON Type | Req | Default | Constraints / Allowed Values | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | `ObjectId()` | Auto-generated 24-char hex | Payment transaction identifier. |
| `campaignId` | `ObjectId` | Yes | None | Ref: `campaigns._id` | Associated campaign slot. |
| `userId` | `ObjectId` | Yes | None | Ref: `users._id` | Purchasing user ID. |
| `amountCents` | `Number` | Yes | None | Positive Integer >= 0 | Amount in smallest currency unit (cents). |
| `currency` | `String` | Yes | `'USD'` | ISO 4217 currency code | Transaction currency. |
| `provider` | `String` | Yes | None | Enum: `'paddle'`, `'lemon_squeezy'` | Merchant of Record provider. |
| `providerPaymentId` | `String`| No | `null` | Unique Sparse string | Provider transaction / charge ID. |
| `providerCustomerId` | `String`| No | `null` | Provider customer ID | External customer token. |
| `status` | `String` | Yes | `'PENDING'` | Enum: `PENDING`, `SUCCEEDED`, `FAILED`, `REFUNDED` | Settlement status. |
| `metadata` | `Object` | No | `{}` | Key-value store | Provider-specific receipt details. |
| `createdAt` | `Date` | Yes | `Date.now()` | Managed by `{ timestamps: true }` | Payment record created. |
| `updatedAt` | `Date` | Yes | `Date.now()` | Managed by `{ timestamps: true }` | Payment status finalized. |

---

## 8. Collection: `payment_webhook_events` (`DS8`)

**Purpose:** Idempotency ledger recording all inbound signed webhook notifications from the Global Merchant of Record to guarantee at-most-once execution.

### 8.1 Document Fields

| Field | BSON Type | Req | Default | Constraints / Allowed Values | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | `ObjectId()` | Auto-generated 24-char hex | Webhook event identifier. |
| `provider` | `String` | Yes | None | Enum: `'paddle'`, `'lemon_squeezy'` | MoR webhook source. |
| `providerEventId`| `String` | Yes | None | Unique provider event ID | Provider's unique notification UUID. |
| `eventType` | `String` | Yes | None | E.g. `transaction.completed` | External event topic name. |
| `payload` | `Object` | Yes | None | Full raw parsed JSON payload | Exact webhook payload for audit. |
| `processedAt` | `Date` | Yes | `Date.now()` | ISO Date | Timestamp of fulfillment processing. |
| `createdAt` | `Date` | Yes | `Date.now()` | Managed by `{ timestamps: true }` | Arrival timestamp. |

---

## 9. Collection: `ownership_verifications` (`DS9`)

**Purpose:** Manages domain ownership claim verification challenges with a strict 72-hour TTL.

### 9.1 Document Fields

| Field | BSON Type | Req | Default | Constraints / Allowed Values | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | `ObjectId()` | Auto-generated 24-char hex | Claim challenge identifier. |
| `productId` | `ObjectId` | Yes | None | Ref: `products._id` | Target product listing. |
| `userId` | `ObjectId` | Yes | None | Ref: `users._id` | Claimant user ID. |
| `verificationMethod`| `String`| Yes| None | Enum: `DNS_TXT`, `HTML_META`, `EMAIL_DOMAIN` | Claim technique selected. |
| `challengeToken` | `String` | Yes | None | 32-byte cryptographically secure token | Expected validation token. |
| `status` | `String` | Yes | `'PENDING'` | Enum: `PENDING`, `CHALLENGE_ISSUED`, `VERIFIED`, `REJECTED`, `DISPUTED`, `FAILED_EXPIRED` | Claim lifecycle state. |
| `expiresAt` | `Date` | Yes | `now + 72h` | TTL Index target (`72 hours`) | Automatic drop timestamp. |
| `verifiedAt` | `Date` | No | `null` | ISO Date | Timestamp of successful verification. |
| `createdAt` | `Date` | Yes | `Date.now()` | Managed by `{ timestamps: true }` | Claim initiation timestamp. |
| `updatedAt` | `Date` | Yes | `Date.now()` | Managed by `{ timestamps: true }` | Claim update timestamp. |

---

## 10. Collection: `product_revisions` (`DS10`)

**Purpose:** Immutable versioned audit trail recording field-level delta changes to product listings. Protects parent `products` documents from 16MB bloat.

### 10.1 Document Fields

| Field | BSON Type | Req | Default | Constraints / Allowed Values | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | `ObjectId()` | Auto-generated 24-char hex | Revision record identifier. |
| `productId` | `ObjectId` | Yes | None | Ref: `products._id` | Target product listing. |
| `versionNumber` | `Number` | Yes | None | Integer >= 1 | Incremental revision number. |
| `editorId` | `ObjectId` | Yes | None | Ref: `users._id` | User or moderator who made the edit. |
| `delta` | `Object` | Yes | None | BSON diff mapping | Diff capturing before/after modifications. |
| `snapshot` | `Object` | Yes | None | Complete frozen product document | Point-in-time full document snapshot. |
| `createdAt` | `Date` | Yes | `Date.now()` | Immutable write | Timestamp revision was authored. |

---

## 11. Collection: `daily_leaderboard_snapshots` (`DS11`)

**Purpose:** Immutable historical archive of daily competitive leaderboard rankings frozen at UTC 23:59:59. Serves badges and historical directory archives.

### 11.1 Document Fields

| Field | BSON Type | Req | Default | Constraints / Allowed Values | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | `ObjectId()` | Auto-generated 24-char hex | Snapshot item identifier. |
| `snapshotDate` | `Date` | Yes | None | UTC Midnight (`YYYY-MM-DD`) | Historical date of the frozen leaderboard. |
| `leaderboardType`| `String`| Yes| `'DAILY'`| Enum: `'DAILY'`, `'WEEKLY'`, `'CATEGORY'` | Leaderboard scope. |
| `categoryId` | `ObjectId` | No | `null` | Ref: `categories._id` | Present only when `leaderboardType = 'CATEGORY'`.|
| `rank` | `Number` | Yes | None | Integer >= 1 | Competitive finish position. |
| `productId` | `ObjectId` | Yes | None | Ref: `products._id` | Product placed in this rank. |
| `score` | `Number` | Yes | None | Float >= 0 | Final calculated $S_{\text{launch}}$ score. |
| `validVotes` | `Number` | Yes | None | Integer >= 0 | Total valid unquarantined upvotes. |
| `organicClicks` | `Number` | Yes | None | Integer >= 0 | Qualified unique organic outbound clicks. |
| `algorithmVersion`| `String`| Yes| None | E.g. `'v1.0.0-algo'` | Formula version utilized for calculation. |
| `createdAt` | `Date` | Yes | `Date.now()` | Immutable write | Frozen execution timestamp. |

---

## 12. Collection: `activity_events` (`DS12`)

**Purpose:** High-throughput operational ledger capturing all analytical events with a 90-day native TTL. Enforces structural isolation between organic and sponsored traffic.

### 12.1 Document Fields

| Field | BSON Type | Req | Default | Constraints / Allowed Values | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | `ObjectId()` | Auto-generated 24-char hex | Event stream identifier. |
| `eventType` | `String` | Yes | None | Enum (see below) | Domain event classification. |
| `eventSource` | `String` | Yes | `'ORGANIC'` | Enum: `ORGANIC`, `SPONSORED`, `BOT`, `FRAUD`, `INTERNAL`, `TEST` | Traffic classification firewall tag. |
| `productId` | `ObjectId` | No | `null` | Ref: `products._id` | Associated product (if applicable). |
| `userId` | `ObjectId` | No | `null` | Ref: `users._id` | Actor user ID (if authenticated). |
| `sessionHash` | `String` | No | `null` | 64-char hex HMAC | Rotating daily salt session hash for dedup. |
| `metadata` | `Object` | No | `{}` | Event-specific context payload | Source path, campaign tier, latency, etc. |
| `createdAt` | `Date` | Yes | `Date.now()` | TTL Index Target (`90 days`) | Event arrival timestamp. |

### 12.2 Permitted `activity_events.eventType` Values

- `AUTH_MAGIC_LINK_VERIFIED` — User authenticated via passwordless magic link.
- `AUTH_OAUTH_LOGIN` — User logged in via OAuth identity provider.
- `PRODUCT_SUBMITTED` — Product URL submitted and DRAFT created.
- `PRODUCT_CONFIRMED` — Founder confirmed metadata and moved to PENDING_REVIEW.
- `PRODUCT_APPROVED` — Moderator approved product to LIVE or SCHEDULED.
- `PRODUCT_REJECTED` — Moderator rejected product listing.
- `VOTE_CAST` — User upvote passed 6-factor check as VALID.
- `VOTE_FLAGGED` — User upvote scored 30–69 and flagged for review.
- `VOTE_QUARANTINED` — User upvote scored >= 70 and held in quarantine.
- `OUTBOUND_CLICK` — Referral click to product website.
- `CAMPAIGN_RESERVED` — Ad slot held for 15 minutes during checkout.
- `CAMPAIGN_STARTED` — Ad placement confirmed and active.
- `CAMPAIGN_EXPIRED` — Ad placement naturally completed.
- `OWNERSHIP_CLAIMED` — Domain ownership verified.
- `LEADERBOARD_FROZEN` — Scheduled midnight UTC aggregation freeze executed.

---

## 13. Collection: `moderation_actions` (`DS13`)

**Purpose:** Immutable governance decision log recording all moderator and administrator interventions with rationale.

### 13.1 Document Fields

| Field | BSON Type | Req | Default | Constraints / Allowed Values | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | `ObjectId()` | Auto-generated 24-char hex | Action audit identifier. |
| `moderatorId` | `ObjectId` | Yes | None | Ref: `users._id` | Staff member executing the action. |
| `actionType` | `String` | Yes | None | Enum: `APPROVE_PRODUCT`, `REJECT_PRODUCT`, `OVERTURN_VOTE`, `RESOLVE_CLAIM`, `BAN_USER`, `UPDATE_SETTINGS` | Action category. |
| `targetEntity` | `String` | Yes | None | Enum: `'product'`, `'vote'`, `'claim'`, `'user'`, `'setting'` | Target collection type. |
| `targetEntityId`| `ObjectId`| Yes| None | Target document `_id` | Referenced document identifier. |
| `reason` | `String` | Yes | None | 5–1,000 chars | Justification note. |
| `previousState` | `Object` | Yes | None | Document sub-snapshot | State prior to modification. |
| `newState` | `Object` | Yes | None | Document sub-snapshot | Resulting modified state. |
| `createdAt` | `Date` | Yes | `Date.now()` | Immutable write | Decision timestamp. |

---

## 14. Collection: `verification_tokens` (`DS14`)

**Purpose:** Single-use ephemeral tokens with a 15-minute native TTL for passwordless authentication.

### 14.1 Document Fields

| Field | BSON Type | Req | Default | Constraints / Allowed Values | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | `ObjectId()` | Auto-generated 24-char hex | Token record identifier. |
| `email` | `String` | Yes | None | Lowercased RFC 5322 string | Target user email address. |
| `magicTokenHash`| `String` | Yes | None | Unique SHA-256 hex digest (64 chars)| Hashed secret verified timing-safely. |
| `expiresAt` | `Date` | Yes | `now + 15m` | TTL Index Target (`15 minutes`) | Automatic TTL drop timestamp. |
| `createdAt` | `Date` | Yes | `Date.now()` | ISO Date | Issuance timestamp. |

---

## 15. Collection: `system_settings` (`DS15`)

**Purpose:** Dynamic system-wide algorithmic, anti-fraud, and rate limit configuration parameters managed by administrators.

### 15.1 Document Fields

| Field | BSON Type | Req | Default | Constraints / Allowed Values | Description |
| :--- | :--- | :---: | :--- | :--- | :--- |
| `_id` | `ObjectId` | Yes | `ObjectId()` | Auto-generated 24-char hex | Setting document identifier. |
| `key` | `String` | Yes | None | Unique, uppercase identifier | Configuration key name. |
| `value` | `Mixed` | Yes | None | Structured BSON / JSON | Setting payload. |
| `version` | `Number` | Yes | `1` | Integer >= 1 | Incremental configuration version. |
| `description` | `String` | Yes | None | Max 300 chars | Documentation of config utility. |
| `updatedById` | `ObjectId` | Yes | None | Ref: `users._id` | Administrator who made the update. |
| `createdAt` | `Date` | Yes | `Date.now()` | Managed by `{ timestamps: true }` | Initialization timestamp. |
| `updatedAt` | `Date` | Yes | `Date.now()` | Managed by `{ timestamps: true }` | Last modified timestamp. |

---

*Document compiled and verified by Senior Database Architect.*  
*Maintained under version control for engineering schema migrations.*  
*Original `database.md` remains intact as the comprehensive database architecture specification.*
