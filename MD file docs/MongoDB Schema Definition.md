# LaunchProduct — MongoDB Schema Definition

**Document Version:** 1.0.0  
**Status:** Engineering Ready  
**Source Requirements:** PRD v1.2.0 · System Architecture v1.3.0  
**Last Updated:** September 18, 2026  
**Database Platform:** MongoDB Atlas (Dedicated M10+ Cluster, Multi-AZ Replica Set)  
**Application ODM:** Mongoose 8+ / MongoDB Native Driver 6+  
**MongoDB Version:** MongoDB 7+  

---

## Table of Contents

1. [Schema Design Principles](#1-schema-design-principles)
2. [Collections Overview](#2-collections-overview)
3. [Collection: `users`](#3-collection-users)
4. [Collection: `verification_tokens`](#4-collection-verification_tokens)
5. [Collection: `products`](#5-collection-products)
6. [Collection: `categories`](#6-collection-categories)
7. [Collection: `product_revisions`](#7-collection-product_revisions)
8. [Collection: `ownership_verifications`](#8-collection-ownership_verifications)
9. [Collection: `votes`](#9-collection-votes)
10. [Collection: `reviews`](#10-collection-reviews-phase-2-post-mvp)
11. [Collection: `campaigns`](#11-collection-campaigns)
12. [Collection: `payments`](#12-collection-payments)
13. [Collection: `payment_webhook_events`](#13-collection-payment_webhook_events)
14. [Collection: `daily_leaderboard_snapshots`](#14-collection-daily_leaderboard_snapshots)
15. [Collection: `activity_events`](#15-collection-activity_events)
16. [Collection: `moderation_actions`](#16-collection-moderation_actions)
17. [Collection: `system_settings`](#17-collection-system_settings)
18. [Index Summary](#18-index-summary)
19. [Transaction Boundaries](#19-transaction-boundaries)
20. [Enum Reference Tables](#20-enum-reference-tables)

---

## 1. Schema Design Principles

### 1.1 Authoritative Design Decisions

| Decision | Rule |
| :--- | :--- |
| **Primary Database** | MongoDB Atlas is the sole durable system of record |
| **ODM** | Mongoose 8+ with strict schema mode enabled |
| **Timestamps** | All documents include `createdAt` and `updatedAt` (auto-managed by Mongoose `{ timestamps: true }`) |
| **ObjectId** | All `_id` fields use MongoDB `ObjectId` (BSON type) |
| **References** | Cross-collection references use `ObjectId` stored as `ref` fields; never embedded foreign keys as strings |
| **Embedded vs Referenced** | See Section 1.2 below |
| **Transactions** | Multi-document ACID transactions strictly isolated to cross-collection critical paths |
| **TTL Cleanup** | Time-expiring data managed via MongoDB TTL indexes; no application-layer polling for cleanup |
| **Immutability** | `activity_events` and `daily_leaderboard_snapshots` are append-only; never updated after insert |
| **Soft Deletes** | Products use `status: 'DELETED'` + anonymization; hard deletes are not used except for GDPR erasure |
| **Validation** | MongoDB Atlas JSON Schema validation enforced at the collection level *and* at the Mongoose schema level |
| **Index Discipline** | Only business-justified indexes are defined; over-indexing is explicitly avoided |

### 1.2 Embedded vs. Referenced Strategy

| Entity | Strategy | Rationale |
| :--- | :--- | :--- |
| `users.founderProfile` | **Embedded** | 1:1 bounded data; co-fetched with auth state on every request |
| `products.pricing` | **Embedded** | 1:1 bounded metadata; rendered atomically with product cards |
| `votes.riskAssessment` | **Embedded** | 1:1 audit metadata tied exclusively to one vote document |
| `categories` | **Referenced** (`categoryId`) | Shared hierarchical taxonomy across thousands of products |
| `product_revisions` | **Referenced** (`productId`) | Unbounded historical records; isolated to prevent document bloat |
| `votes`, `reviews` | **Referenced** (`productId`, `userId`) | High-cardinality; require independent indexing and aggregation |
| `campaigns`, `payments` | **Referenced** (`campaignId`) | Independent lifecycle; queried independently by finance/admin |
| `activity_events` | **Append-Only Ledger** | Ephemeral audit stream; isolated from transactional collections |
| `daily_leaderboard_snapshots` | **Immutable Snapshot** | Frozen historical records; queried for archival and badge views |

---

## 2. Collections Overview

| # | Collection | Purpose | TTL | Immutable |
| :---: | :--- | :--- | :---: | :---: |
| 1 | `users` | Identity, roles, founder profile | No | No |
| 2 | `verification_tokens` | Magic link & OAuth tokens | 15 min | No |
| 3 | `products` | Canonical live product catalog | No | No |
| 4 | `categories` | Hierarchical taxonomy (parent/child) | No | No |
| 5 | `product_revisions` | Immutable audit history of content edits | No | Yes |
| 6 | `ownership_verifications` | 5-state domain ownership lifecycle | 72 h | No |
| 7 | `votes` | Authenticated upvotes with embedded risk scores | No | No |
| 8 | `reviews` | User reviews & ratings *(Phase 2 / Post-MVP)* | No | No |
| 9 | `campaigns` | Promotional slot reservations and active placements | No | No |
| 10 | `payments` | Provider-agnostic payment records | No | No |
| 11 | `payment_webhook_events` | Webhook idempotency audit log | No | Yes |
| 12 | `daily_leaderboard_snapshots` | Frozen historical leaderboard rankings | No | Yes |
| 13 | `activity_events` | Append-only operational event ledger | 90 days | Yes |
| 14 | `moderation_actions` | Immutable moderation decision log | No | Yes |
| 15 | `system_settings` | Dynamic fraud weights, rate limits, algorithm params | No | No |

---

## 3. Collection: `users`

### 3.1 Purpose
Stores user identity, authentication state, role, and embedded founder profile. This is the primary identity document — every authenticated action in LaunchProduct resolves to a `users` document.

### 3.2 Document Structure

```json
{
  "_id": "ObjectId",
  "email": "alex@getacme.com",
  "emailVerifiedAt": "ISODate | null",
  "role": "FOUNDER",
  "authProviders": [
    {
      "provider": "google",
      "providerUserId": "1023842938492",
      "linkedAt": "ISODate"
    }
  ],
  "founderProfile": {
    "bio": "Building developer tools for indie hackers",
    "twitterHandle": "alexbuilds",
    "linkedinUrl": "https://linkedin.com/in/alex",
    "githubHandle": "alexbuilds"
  },
  "isDisabled": false,
  "lastLoginAt": "ISODate | null",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

### 3.3 Mongoose Schema (TypeScript)

```typescript
import { Schema, model, Document } from 'mongoose';

export type UserRole = 'VISITOR' | 'HUNTER' | 'FOUNDER' | 'MODERATOR' | 'ADMIN';

const AuthProviderSchema = new Schema({
  provider:       { type: String, enum: ['google', 'github', 'magic_link'], required: true },
  providerUserId: { type: String, required: true },
  linkedAt:       { type: Date, default: Date.now },
}, { _id: false });

const FounderProfileSchema = new Schema({
  bio:           { type: String, maxlength: 500, default: '' },
  twitterHandle: { type: String, maxlength: 50, default: null },
  linkedinUrl:   { type: String, maxlength: 255, default: null },
  githubHandle:  { type: String, maxlength: 50, default: null },
}, { _id: false });

const UserSchema = new Schema({
  email:           { type: String, required: true, lowercase: true, trim: true },
  emailVerifiedAt: { type: Date, default: null },
  role:            { type: String, enum: ['VISITOR','HUNTER','FOUNDER','MODERATOR','ADMIN'], default: 'HUNTER' },
  authProviders:   { type: [AuthProviderSchema], default: [] },
  founderProfile:  { type: FounderProfileSchema, default: () => ({}) },
  isDisabled:      { type: Boolean, default: false },
  lastLoginAt:     { type: Date, default: null },
}, { timestamps: true });

export const User = model('User', UserSchema);
```

### 3.4 Indexes

```javascript
// Unique: email must be unique across all users
db.users.createIndex({ email: 1 }, { unique: true, name: 'idx_users_email_unique' });

// Query: RBAC lookups, admin user filtering
db.users.createIndex({ role: 1 }, { name: 'idx_users_role' });

// Query: Identifying unverified accounts
db.users.createIndex({ emailVerifiedAt: 1 }, { name: 'idx_users_email_verified' });
```

### 3.5 Business Rules
- `email` must be unique, lowercased, and trimmed before storage.
- `emailVerifiedAt` must be non-null before a user can vote, submit, or review.
- `role` escalation: `HUNTER` to `FOUNDER` is triggered automatically when an `ownership_verification` reaches `VERIFIED` status.
- A disabled user (`isDisabled: true`) receives `HTTP 403` on all authenticated routes.
- On GDPR erasure: `email` is replaced with `deleted_<ObjectId>@deleted.launchproduct.com`, `founderProfile` fields are set to `null`, and `role` is set to `HUNTER`.

---

## 4. Collection: `verification_tokens`

### 4.1 Purpose
Stores short-lived cryptographic tokens for Magic Link authentication and OAuth state parameters. Tokens auto-expire via TTL index.

### 4.2 Document Structure

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId | null",
  "email": "alex@getacme.com",
  "tokenHash": "sha256-hex-of-raw-token",
  "type": "MAGIC_LINK",
  "used": false,
  "expiresAt": "ISODate (T+15 minutes)",
  "createdAt": "ISODate"
}
```

### 4.3 Mongoose Schema (TypeScript)

```typescript
const VerificationTokenSchema = new Schema({
  userId:    { type: Schema.Types.ObjectId, ref: 'User', default: null },
  email:     { type: String, required: true, lowercase: true },
  tokenHash: { type: String, required: true },
  type:      { type: String, enum: ['MAGIC_LINK', 'OAUTH_STATE'], required: true },
  used:      { type: Boolean, default: false },
  expiresAt: { type: Date, required: true },
}, { timestamps: true });

export const VerificationToken = model('VerificationToken', VerificationTokenSchema);
```

### 4.4 Indexes

```javascript
// TTL: Auto-delete expired tokens (15-minute magic links)
db.verification_tokens.createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: 'ttl_verification_tokens_expiry' }
);

// Query: Token hash lookup on verify callback
db.verification_tokens.createIndex({ tokenHash: 1 }, { name: 'idx_verification_tokens_hash' });

// Query: User's active tokens (prevent spamming)
db.verification_tokens.createIndex({ email: 1, used: 1 }, { name: 'idx_verification_tokens_email_used' });
```

### 4.5 Business Rules
- Raw token is a 32-byte cryptographically secure random hex string (`crypto.randomBytes(32).toString('hex')`).
- Only the `SHA-256` hash of the raw token is stored in MongoDB; the raw token is sent via email only.
- Token must be verified using `crypto.timingSafeEqual()` to prevent timing attacks.
- After a successful verification, `used` is set to `true` and the document is deleted atomically in the same session.

---

## 5. Collection: `products`

### 5.1 Purpose
The canonical live product catalog. Every product that has been submitted, approved, or is active in the directory is stored here. This is the primary read target for all directory, search, and leaderboard queries.

### 5.2 Document Structure

```json
{
  "_id": "ObjectId",
  "submittedByUserId": "ObjectId (ref: users)",
  "name": "Acme AI",
  "slug": "acme-ai",
  "tagline": "Automate your workflows with intelligent agents",
  "description": "Full product description in markdown...",
  "websiteUrl": "https://getacme.com",
  "canonicalDomain": "getacme.com",
  "categoryId": "ObjectId (ref: categories)",
  "logoUrl": "https://cdn.launchproduct.com/logos/acme-ai.png",
  "screenshotUrls": ["https://cdn.launchproduct.com/screenshots/acme-ai-1.png"],
  "pricing": {
    "type": "Freemium",
    "metadata": {
      "hasFreeTier": true,
      "startingPrice": 29,
      "currency": "USD"
    }
  },
  "status": "LIVE",
  "launchDate": "ISODate('2026-09-18T00:00:00.000Z')",
  "moderatorNotes": null,
  "rejectionReason": null,
  "isFeatured": false,
  "voteCount": 142,
  "qualifiedClickCount": 38,
  "algorithmVersion": "v1.0.0-algo",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

### 5.3 Mongoose Schema (TypeScript)

```typescript
import { Schema, model } from 'mongoose';

export type ProductStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'SCHEDULED'
  | 'LIVE'
  | 'SUSPENDED'
  | 'REJECTED'
  | 'ARCHIVED'
  | 'DELETED';

export type PricingType = 'Free' | 'Freemium' | 'Paid' | 'Open Source';

const PricingSchema = new Schema({
  type:     { type: String, enum: ['Free','Freemium','Paid','Open Source'], required: true },
  metadata: {
    hasFreeTier:   { type: Boolean, default: false },
    startingPrice: { type: Number, default: null },
    currency:      { type: String, default: 'USD', uppercase: true, maxlength: 3 },
  },
}, { _id: false });

const ProductSchema = new Schema({
  submittedByUserId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
  name:                { type: String, required: true, trim: true, maxlength: 100 },
  slug:                { type: String, required: true, lowercase: true, trim: true, maxlength: 120 },
  tagline:             { type: String, required: true, trim: true, maxlength: 80 },
  description:         { type: String, required: true, maxlength: 5000 },
  websiteUrl:          { type: String, required: true },
  canonicalDomain:     { type: String, required: true, lowercase: true },
  categoryId:          { type: Schema.Types.ObjectId, ref: 'Category', required: true },
  logoUrl:             { type: String, default: null },
  screenshotUrls:      { type: [String], default: [] },
  pricing:             { type: PricingSchema, required: true },
  status: {
    type: String,
    enum: ['DRAFT','PENDING_REVIEW','SCHEDULED','LIVE','SUSPENDED','REJECTED','ARCHIVED','DELETED'],
    default: 'DRAFT',
  },
  launchDate:          { type: Date, default: null },
  moderatorNotes:      { type: String, default: null },
  rejectionReason:     { type: String, default: null },
  isFeatured:          { type: Boolean, default: false },
  voteCount:           { type: Number, default: 0, min: 0 },
  qualifiedClickCount: { type: Number, default: 0, min: 0 },
  algorithmVersion:    { type: String, default: 'v1.0.0-algo' },
}, { timestamps: true });

export const Product = model('Product', ProductSchema);
```

### 5.4 Indexes

```javascript
// Unique: One product per slug
db.products.createIndex({ slug: 1 }, { unique: true, name: 'idx_products_slug_unique' });

// Partial Unique: One active product per canonical domain
db.products.createIndex(
  { canonicalDomain: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['DRAFT','PENDING_REVIEW','SCHEDULED','LIVE','SUSPENDED'] } },
    name: 'idx_products_canonical_domain_unique_active'
  }
);

// Query: Category listing pages + status filter
db.products.createIndex({ categoryId: 1, status: 1 }, { name: 'idx_products_category_status' });

// Query: Daily leaderboard + ranking (today view)
db.products.createIndex({ launchDate: 1, status: 1 }, { name: 'idx_products_launchdate_status' });

// Query: Admin moderation queue
db.products.createIndex({ status: 1, createdAt: -1 }, { name: 'idx_products_status_created' });

// Text Search: MongoDB Atlas compound text search
db.products.createIndex(
  { name: 'text', tagline: 'text', description: 'text' },
  { weights: { name: 10, tagline: 5, description: 1 }, name: 'idx_products_text_search' }
);
```

### 5.5 Business Rules
- `slug` must be URL-safe, lowercase, hyphenated, derived from `name`. Conflicts resolved with numeric suffix (`acme-ai-2`).
- `canonicalDomain` is the normalized apex domain (e.g., `acme.com` from `https://app.acme.com/pricing`).
- Only ONE document per `canonicalDomain` may exist in non-terminal states (`DRAFT`, `PENDING_REVIEW`, `SCHEDULED`, `LIVE`, `SUSPENDED`). Terminal states (`REJECTED`, `ARCHIVED`, `DELETED`) are excluded via partial index.
- `voteCount` and `qualifiedClickCount` are denormalized counters incremented atomically via `$inc` for performance. They are reconciled against `votes` and `activity_events` during the daily snapshot freeze.
- `status` transitions follow the PRD state machine. Invalid transitions are rejected at the Service Layer.
- On `DELETED` status: `name`, `tagline`, `description`, `websiteUrl`, `canonicalDomain`, `logoUrl`, `screenshotUrls` are replaced with anonymized placeholders. `submittedByUserId` is nullified.

### 5.6 Product State Machine Constraints

| Transition | Permitted By | Condition |
| :--- | :--- | :--- |
| `DRAFT` to `PENDING_REVIEW` | Founder | Founder confirms metadata after scraping |
| `PENDING_REVIEW` to `SCHEDULED` | Moderator/Admin | Review approved; launch date set |
| `PENDING_REVIEW` to `REJECTED` | Moderator/Admin | Fails content guidelines |
| `REJECTED` to `PENDING_REVIEW` | Founder | Founder resubmits with corrections |
| `SCHEDULED` to `LIVE` | Background Worker | `launchDate` UTC midnight reached |
| `LIVE` to `SUSPENDED` | Admin/Anti-Fraud | Abuse detected |
| `SUSPENDED` to `LIVE` | Admin | Dispute resolved |
| `LIVE` / `ARCHIVED` to `ARCHIVED` | Founder/Admin | Voluntary deactivation |
| Any to `DELETED` | Admin (GDPR) | Hard erasure requested |

---

## 6. Collection: `categories`

### 6.1 Purpose
Stores the hierarchical product directory taxonomy. Supports parent/child category trees via a nullable `parentId` self-reference. Circular hierarchy prevention is enforced at the Service Layer.

### 6.2 Document Structure

```json
{
  "_id": "ObjectId",
  "parentId": "ObjectId (ref: categories) | null",
  "name": "AI Tools",
  "slug": "ai-tools",
  "description": "Artificial intelligence tools and agent frameworks",
  "icon": "robot-emoji",
  "sortOrder": 1,
  "isActive": true,
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

### 6.3 Mongoose Schema (TypeScript)

```typescript
const CategorySchema = new Schema({
  parentId:    { type: Schema.Types.ObjectId, ref: 'Category', default: null },
  name:        { type: String, required: true, trim: true, maxlength: 80 },
  slug:        { type: String, required: true, lowercase: true, trim: true, maxlength: 100 },
  description: { type: String, default: '', maxlength: 500 },
  icon:        { type: String, default: null },
  sortOrder:   { type: Number, default: 0 },
  isActive:    { type: Boolean, default: true },
}, { timestamps: true });

export const Category = model('Category', CategorySchema);
```

### 6.4 Indexes

```javascript
// Unique: Each slug must be globally unique
db.categories.createIndex({ slug: 1 }, { unique: true, name: 'idx_categories_slug_unique' });

// Query: Fetching child categories for a parent
db.categories.createIndex({ parentId: 1 }, { name: 'idx_categories_parentid' });

// Query: Sorted active categories for navigation menu
db.categories.createIndex({ isActive: 1, sortOrder: 1 }, { name: 'idx_categories_active_sort' });
```

### 6.5 MVP Seed Data (8 Top-Level Categories)

```javascript
const mvpCategories = [
  { slug: 'ai-tools',        name: 'AI Tools',         parentId: null, sortOrder: 1 },
  { slug: 'ai-agents',       name: 'AI Agents',         parentId: null, sortOrder: 2 },
  { slug: 'saas',            name: 'SaaS',              parentId: null, sortOrder: 3 },
  { slug: 'developer-tools', name: 'Developer Tools',   parentId: null, sortOrder: 4 },
  { slug: 'productivity',    name: 'Productivity',      parentId: null, sortOrder: 5 },
  { slug: 'marketing-tools', name: 'Marketing Tools',   parentId: null, sortOrder: 6 },
  { slug: 'seo-tools',       name: 'SEO Tools',         parentId: null, sortOrder: 7 },
  { slug: 'design-tools',    name: 'Design Tools',      parentId: null, sortOrder: 8 },
];
```

---

## 7. Collection: `product_revisions`

### 7.1 Purpose
Append-only audit trail of significant content edits to approved, scheduled, or live products. Supports rollback inspection and compliance auditing.

### 7.2 Document Structure

```json
{
  "_id": "ObjectId",
  "productId": "ObjectId (ref: products)",
  "changedByUserId": "ObjectId (ref: users)",
  "versionNumber": 2,
  "snapshot": {
    "name": "Acme AI",
    "tagline": "Automate your workflows with intelligent agents",
    "description": "Full product description in markdown...",
    "websiteUrl": "https://getacme.com",
    "categoryId": "ObjectId",
    "pricing": { "type": "Freemium", "metadata": { "hasFreeTier": true, "startingPrice": 29 } }
  },
  "changeReason": "Updated pricing model and added new agent features",
  "changedFields": ["pricing", "description"],
  "createdAt": "ISODate"
}
```

### 7.3 Mongoose Schema (TypeScript)

```typescript
const ProductRevisionSchema = new Schema({
  productId:       { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  changedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  versionNumber:   { type: Number, required: true, min: 1 },
  snapshot: {
    name:        String,
    tagline:     String,
    description: String,
    websiteUrl:  String,
    categoryId:  Schema.Types.ObjectId,
    pricing:     Schema.Types.Mixed,
  },
  changeReason:  { type: String, maxlength: 1000, default: null },
  changedFields: { type: [String], default: [] },
}, { timestamps: { createdAt: true, updatedAt: false } }); // Immutable: no updatedAt

export const ProductRevision = model('ProductRevision', ProductRevisionSchema);
```

### 7.4 Indexes

```javascript
// Unique: One document per product + version combination
db.product_revisions.createIndex(
  { productId: 1, versionNumber: 1 },
  { unique: true, name: 'idx_revisions_product_version_unique' }
);

// Query: Fetch revision history for a product (newest first)
db.product_revisions.createIndex({ productId: 1, createdAt: -1 }, { name: 'idx_revisions_product_created' });
```

### 7.5 Business Rules
- Revisions are only created when a product is in `SCHEDULED`, `LIVE`, or `ARCHIVED` status.
- Edits during the initial `DRAFT` stage do NOT generate revision documents.
- Changes to `websiteUrl` or `categoryId` on a `LIVE` product trigger a re-verification flag on the product document.
- `versionNumber` increments from 1 for each product; the Service Layer computes this via `$max` query before insert.
- Documents are never updated after insertion.

---

## 8. Collection: `ownership_verifications`

### 8.1 Purpose
Tracks the 5-state ownership verification lifecycle for each product. Enforces that only one user can hold `VERIFIED` status per product at any given time.

### 8.2 Document Structure

```json
{
  "_id": "ObjectId",
  "productId": "ObjectId (ref: products)",
  "userId": "ObjectId (ref: users)",
  "method": "DNS_TXT",
  "status": "PENDING",
  "tokenHash": "sha256-hex-of-verification-token",
  "rawTokenPrefix": "launchproduct-verify=",
  "verifiedAt": "ISODate | null",
  "revokedAt": "ISODate | null",
  "expiresAt": "ISODate (T+72h from creation)",
  "disputeFlag": false,
  "adminNotes": null,
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

### 8.3 Mongoose Schema (TypeScript)

```typescript
export type OwnershipMethod = 'EMAIL_DOMAIN' | 'DNS_TXT' | 'HTML_META';
export type OwnershipStatus = 'UNVERIFIED' | 'PENDING' | 'VERIFIED' | 'REVOKED' | 'FAILED_EXPIRED';

const OwnershipVerificationSchema = new Schema({
  productId:      { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  userId:         { type: Schema.Types.ObjectId, ref: 'User', required: true },
  method:         { type: String, enum: ['EMAIL_DOMAIN', 'DNS_TXT', 'HTML_META'], required: true },
  status:         { type: String, enum: ['UNVERIFIED','PENDING','VERIFIED','REVOKED','FAILED_EXPIRED'], default: 'PENDING' },
  tokenHash:      { type: String, default: null },
  rawTokenPrefix: { type: String, default: 'launchproduct-verify=' },
  verifiedAt:     { type: Date, default: null },
  revokedAt:      { type: Date, default: null },
  expiresAt:      { type: Date, required: true },
  disputeFlag:    { type: Boolean, default: false },
  adminNotes:     { type: String, default: null },
}, { timestamps: true });

export const OwnershipVerification = model('OwnershipVerification', OwnershipVerificationSchema);
```

### 8.4 Indexes

```javascript
// Partial Unique: Only ONE VERIFIED claim per product at a time
db.ownership_verifications.createIndex(
  { productId: 1 },
  {
    unique: true,
    partialFilterExpression: { status: 'VERIFIED' },
    name: 'idx_ownership_product_verified_unique'
  }
);

// TTL: Auto-expire PENDING tokens after 72 hours
db.ownership_verifications.createIndex(
  { expiresAt: 1 },
  { expireAfterSeconds: 0, name: 'ttl_ownership_expiry' }
);

// Query: Look up verifications for a user's claimed products
db.ownership_verifications.createIndex({ userId: 1, status: 1 }, { name: 'idx_ownership_user_status' });

// Query: Admin dispute desk
db.ownership_verifications.createIndex({ disputeFlag: 1, status: 1 }, { name: 'idx_ownership_dispute' });
```

### 8.5 Business Rules
- Token is 32-byte `crypto.randomBytes(32).toString('hex')`; only SHA-256 hash is stored.
- TTL index auto-deletes expired documents; Service Layer also explicitly transitions `PENDING` to `FAILED_EXPIRED` for UI display before TTL fires.
- New claim against an already `VERIFIED` product: Creates a new `PENDING` document with `disputeFlag: true` and sends automated security alert to current verified owner.
- Partial unique index ensures enforcement at the database layer, not just the application layer.

---

## 9. Collection: `votes`

### 9.1 Purpose
Stores authenticated upvotes with embedded anti-fraud risk assessment. This is the transactional source of truth for vote counts and risk states.

### 9.2 Document Structure

```json
{
  "_id": "ObjectId",
  "productId": "ObjectId (ref: products)",
  "userId": "ObjectId (ref: users)",
  "status": "VALID",
  "riskScore": 15,
  "riskAssessment": {
    "signals": ["SIG_ACCOUNT_NEW"],
    "evaluatedAt": "ISODate",
    "notes": "Low risk: new account but all other signals clean"
  },
  "ipHash": "hmac-sha256-salted-hash",
  "subnetHash": "hmac-sha256-of-/24-subnet",
  "userAgent": null,
  "retractedAt": "ISODate | null",
  "moderatorOverrideBy": "ObjectId | null",
  "moderatorOverrideAt": "ISODate | null",
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

### 9.3 Mongoose Schema (TypeScript)

```typescript
export type VoteStatus = 'VALID' | 'FLAGGED' | 'QUARANTINED' | 'REJECTED_BOT' | 'RETRACTED' | 'APPROVED_BY_MOD';

const RiskAssessmentSchema = new Schema({
  signals:     { type: [String], default: [] },
  evaluatedAt: { type: Date, default: Date.now },
  notes:       { type: String, default: '' },
}, { _id: false });

const VoteSchema = new Schema({
  productId:           { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  userId:              { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status:              { type: String, enum: ['VALID','FLAGGED','QUARANTINED','REJECTED_BOT','RETRACTED','APPROVED_BY_MOD'], default: 'VALID' },
  riskScore:           { type: Number, required: true, min: 0, max: 200 },
  riskAssessment:      { type: RiskAssessmentSchema, required: true },
  ipHash:              { type: String, required: true },
  subnetHash:          { type: String, required: true },
  userAgent:           { type: String, default: null },
  retractedAt:         { type: Date, default: null },
  moderatorOverrideBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  moderatorOverrideAt: { type: Date, default: null },
}, { timestamps: true });

export const Vote = model('Vote', VoteSchema);
```

### 9.4 Indexes

```javascript
// Unique: One vote per user per product (enforces idempotency)
db.votes.createIndex(
  { productId: 1, userId: 1 },
  { unique: true, name: 'idx_votes_product_user_unique' }
);

// Query: Aggregation of valid votes per product (ranking pipeline)
db.votes.createIndex({ productId: 1, status: 1, createdAt: 1 }, { name: 'idx_votes_product_status_date' });

// Query: Moderation quarantine desk
db.votes.createIndex({ status: 1, createdAt: -1 }, { name: 'idx_votes_status_created' });

// Query: Anti-fraud subnet concentration check (sliding 1-hour window)
db.votes.createIndex({ subnetHash: 1, productId: 1, createdAt: 1 }, { name: 'idx_votes_subnet_product_date' });

// Query: User vote history
db.votes.createIndex({ userId: 1, createdAt: -1 }, { name: 'idx_votes_user_created' });
```

### 9.5 Business Rules
- `{ productId, userId }` unique index enforces exactly one vote per user per product across the product's entire lifecycle.
- A vote can be retracted within **15 minutes** of creation (`retractedAt` set; `products.voteCount` decremented via `$inc -1`). After 15 minutes, `status` cannot revert to `RETRACTED`.
- Vote status effect on `products.voteCount`:
  - `VALID`: +1 to `products.voteCount`
  - `FLAGGED`: +1 to `products.voteCount` (score increments but mod flag is set)
  - `QUARANTINED`: **No increment** to `products.voteCount`
  - `REJECTED_BOT`: **No increment**; silently returns HTTP 200
  - `APPROVED_BY_MOD`: Moderator approves a `QUARANTINED` vote; `products.voteCount` is incremented by +1 at that moment
- `ipHash` and `subnetHash` use HMAC-SHA256 with a **daily rotating salt** (salt stored in `system_settings`); raw IPs are never stored.
- `RETRACTED` vote documents are retained for audit purposes; they are not hard-deleted.

---

## 10. Collection: `reviews` *(Phase 2 / Post-MVP)*

### 10.1 Purpose
Stores structured 1–5 star user reviews. Architecturally defined now but not activated for the MVP.

### 10.2 Document Structure

```json
{
  "_id": "ObjectId",
  "productId": "ObjectId (ref: products)",
  "userId": "ObjectId (ref: users)",
  "rating": 4,
  "body": "This tool completely transformed my workflow. The AI suggestions are surprisingly accurate...",
  "conflictOfInterest": false,
  "status": "PUBLISHED",
  "founderReply": {
    "body": "Thank you for the kind words! We are working on the next major feature.",
    "publishedAt": "ISODate"
  },
  "disputeStatus": null,
  "disputeCategory": null,
  "disputeInitiatedAt": null,
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

### 10.3 Mongoose Schema (TypeScript)

```typescript
export type ReviewStatus = 'PUBLISHED' | 'PENDING_MODERATION' | 'REMOVED';
export type DisputeCategory = 'COMPETITOR_SMEAR' | 'HARASSMENT' | 'FALSE_TECHNICAL_FACTS' | 'SPAM';

const FounderReplySchema = new Schema({
  body:        { type: String, required: true, maxlength: 1000 },
  publishedAt: { type: Date, default: Date.now },
}, { _id: false });

const ReviewSchema = new Schema({
  productId:          { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  userId:             { type: Schema.Types.ObjectId, ref: 'User', required: true },
  rating:             { type: Number, required: true, min: 1, max: 5 },
  body:               { type: String, required: true, minlength: 50, maxlength: 2000 },
  conflictOfInterest: { type: Boolean, required: true, default: false },
  status:             { type: String, enum: ['PUBLISHED','PENDING_MODERATION','REMOVED'], default: 'PUBLISHED' },
  founderReply:       { type: FounderReplySchema, default: null },
  disputeStatus:      { type: String, default: null },
  disputeCategory:    { type: String, enum: ['COMPETITOR_SMEAR','HARASSMENT','FALSE_TECHNICAL_FACTS','SPAM', null], default: null },
  disputeInitiatedAt: { type: Date, default: null },
}, { timestamps: true });

export const Review = model('Review', ReviewSchema);
```

### 10.4 Indexes

```javascript
// Unique: One review per user per product
db.reviews.createIndex(
  { productId: 1, userId: 1 },
  { unique: true, name: 'idx_reviews_product_user_unique' }
);

// Query: Public review listing (newest first)
db.reviews.createIndex({ productId: 1, status: 1, createdAt: -1 }, { name: 'idx_reviews_product_status_date' });

// Query: Dispute moderation queue
db.reviews.createIndex({ disputeStatus: 1, disputeInitiatedAt: 1 }, { name: 'idx_reviews_dispute' });
```

### 10.5 Business Rules
- Reviewer must have a verified email and account age >= 48 hours.
- A verified founder cannot review their own product.
- `AggregateRating` Schema.org markup is only rendered on the frontend when a product has >= 3 published reviews.
- Founder may post exactly one `founderReply` per review.
- Offering incentives for reviews is prohibited; `conflictOfInterest` checkbox is mandatory at submission.

---

## 11. Collection: `campaigns`

### 11.1 Purpose
Manages the lifecycle of fixed-price promotional inventory: slot reservation, payment pending, active, and expired.

### 11.2 Document Structure

```json
{
  "_id": "ObjectId",
  "productId": "ObjectId (ref: products)",
  "userId": "ObjectId (ref: users — verified owner)",
  "tier": "HOMEPAGE_SPOTLIGHT",
  "status": "ACTIVE",
  "slotId": "homepage-spotlight-slot-1",
  "startsAt": "ISODate('2026-09-19T00:00:00.000Z')",
  "endsAt": "ISODate('2026-09-20T00:00:00.000Z')",
  "amountCents": 14900,
  "currency": "USD",
  "paymentId": "ObjectId (ref: payments) | null",
  "reservationExpiresAt": "ISODate (T+15min from checkout init) | null",
  "cancelledAt": "ISODate | null",
  "cancellationReason": null,
  "impressionCount": 0,
  "sponsoredClickCount": 0,
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

### 11.3 Mongoose Schema (TypeScript)

```typescript
export type CampaignTier = 'LAUNCH_BOOST' | 'CATEGORY_FEATURED' | 'HOMEPAGE_SPOTLIGHT' | 'LAUNCH_PARTNER_BUNDLE';
export type CampaignStatus = 'RESERVED' | 'PENDING_PAYMENT' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PAUSED';

const CampaignSchema = new Schema({
  productId:            { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  userId:               { type: Schema.Types.ObjectId, ref: 'User', required: true },
  tier:                 { type: String, enum: ['LAUNCH_BOOST','CATEGORY_FEATURED','HOMEPAGE_SPOTLIGHT','LAUNCH_PARTNER_BUNDLE'], required: true },
  status:               { type: String, enum: ['RESERVED','PENDING_PAYMENT','ACTIVE','EXPIRED','CANCELLED','PAUSED'], default: 'RESERVED' },
  slotId:               { type: String, required: true },
  startsAt:             { type: Date, required: true },
  endsAt:               { type: Date, required: true },
  amountCents:          { type: Number, required: true, min: 0 },
  currency:             { type: String, default: 'USD', uppercase: true, maxlength: 3 },
  paymentId:            { type: Schema.Types.ObjectId, ref: 'Payment', default: null },
  reservationExpiresAt: { type: Date, default: null },
  cancelledAt:          { type: Date, default: null },
  cancellationReason:   { type: String, default: null },
  impressionCount:      { type: Number, default: 0, min: 0 },
  sponsoredClickCount:  { type: Number, default: 0, min: 0 },
}, { timestamps: true });

export const Campaign = model('Campaign', CampaignSchema);
```

### 11.4 Indexes

```javascript
// Query: Active campaigns by product (founder dashboard)
db.campaigns.createIndex({ productId: 1, status: 1 }, { name: 'idx_campaigns_product_status' });

// Query: Slot inventory availability check (no double-booking)
db.campaigns.createIndex({ slotId: 1, startsAt: 1, endsAt: 1 }, { name: 'idx_campaigns_slot_schedule' });

// Query: Campaign expiration worker (finding ACTIVE campaigns past endsAt)
db.campaigns.createIndex({ status: 1, endsAt: 1 }, { name: 'idx_campaigns_status_ends' });

// Query: Reservation expiry cleanup
db.campaigns.createIndex({ status: 1, reservationExpiresAt: 1 }, { name: 'idx_campaigns_status_reservation' });
```

### 11.5 Campaign Tiers & Pricing

| Tier Enum | Display Name | Price (USD) | Duration | Max Concurrent Slots |
| :--- | :--- | :---: | :--- | :---: |
| `LAUNCH_BOOST` | Launch Boost | $19 | 48 hours | Unlimited |
| `CATEGORY_FEATURED` | Category Featured | $49 | 7 days | 2 per category |
| `HOMEPAGE_SPOTLIGHT` | Homepage Spotlight | $149 | 24 hours | 3 |
| `LAUNCH_PARTNER_BUNDLE` | Launch Partner Bundle | $299 | Composite | N/A |

### 11.6 Business Rules
- User must be `VERIFIED` owner of the product before creating a campaign.
- On checkout initiation: Campaign inserted as `RESERVED` + 15-minute Redis `NX EX 900` slot hold.
- On `payment.succeeded` webhook: Atomic MongoDB transaction updates `status` to `ACTIVE` and inserts `payments` document.
- On timeout (no webhook in 15 min): BullMQ delayed job transitions `RESERVED` to `CANCELLED`; slot is released.
- Chargeback webhook immediately transitions `ACTIVE` to `PAUSED` and notifies administrators.
- Cancellation policy: 100% refund if cancelled >= 24 hours before `startsAt`; non-refundable once `ACTIVE`. `[LEGAL REVIEW REQUIRED]`
- `impressionCount` and `sponsoredClickCount` are atomically incremented via `$inc`; **never used as ranking inputs**.

---

## 12. Collection: `payments`

### 12.1 Purpose
Provider-agnostic payment records. Each successful payment corresponds to one campaign activation. Serves as the financial audit trail.

### 12.2 Document Structure

```json
{
  "_id": "ObjectId",
  "campaignId": "ObjectId (ref: campaigns)",
  "userId": "ObjectId (ref: users)",
  "provider": "paddle",
  "providerCustomerId": "ctm_01h8abc...",
  "providerPaymentId": "txn_01h8abc...",
  "providerOrderId": "ord_01h8xyz...",
  "amountCents": 14900,
  "currency": "USD",
  "status": "SUCCEEDED",
  "refundedAt": "ISODate | null",
  "refundAmountCents": null,
  "refundReason": null,
  "metadata": {},
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

### 12.3 Mongoose Schema (TypeScript)

```typescript
export type PaymentStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED' | 'DISPUTED';

const PaymentSchema = new Schema({
  campaignId:         { type: Schema.Types.ObjectId, ref: 'Campaign', required: true },
  userId:             { type: Schema.Types.ObjectId, ref: 'User', required: true },
  provider:           { type: String, enum: ['paddle', 'lemonsqueezy'], required: true },
  providerCustomerId: { type: String, required: true },
  providerPaymentId:  { type: String, required: true },
  providerOrderId:    { type: String, required: true },
  amountCents:        { type: Number, required: true, min: 0 },
  currency:           { type: String, default: 'USD', uppercase: true, maxlength: 3 },
  status:             { type: String, enum: ['PENDING','SUCCEEDED','FAILED','REFUNDED','DISPUTED'], default: 'PENDING' },
  refundedAt:         { type: Date, default: null },
  refundAmountCents:  { type: Number, default: null },
  refundReason:       { type: String, default: null },
  metadata:           { type: Schema.Types.Mixed, default: {} },
}, { timestamps: true });

export const Payment = model('Payment', PaymentSchema);
```

### 12.4 Indexes

```javascript
// Unique: One payment per provider transaction ID (idempotency)
db.payments.createIndex(
  { providerPaymentId: 1 },
  { unique: true, sparse: true, name: 'idx_payments_provider_payment_id_unique' }
);

// Query: Payments for a specific campaign
db.payments.createIndex({ campaignId: 1 }, { name: 'idx_payments_campaign' });

// Query: Financial reporting by provider and status
db.payments.createIndex({ provider: 1, status: 1, createdAt: -1 }, { name: 'idx_payments_provider_status_date' });

// Query: User payment history
db.payments.createIndex({ userId: 1, createdAt: -1 }, { name: 'idx_payments_user_created' });
```

---

## 13. Collection: `payment_webhook_events`

### 13.1 Purpose
Immutable idempotency log for MoR provider webhook events. Prevents double-processing of webhook retries.

### 13.2 Document Structure

```json
{
  "_id": "ObjectId",
  "provider": "paddle",
  "providerEventId": "evt_01h8abc...",
  "eventType": "transaction.completed",
  "campaignId": "ObjectId (ref: campaigns) | null",
  "paymentId": "ObjectId (ref: payments) | null",
  "rawPayload": "serialized JSON string of full webhook body",
  "processedSuccessfully": true,
  "processingError": null,
  "processedAt": "ISODate",
  "createdAt": "ISODate"
}
```

### 13.3 Mongoose Schema (TypeScript)

```typescript
const PaymentWebhookEventSchema = new Schema({
  provider:              { type: String, enum: ['paddle', 'lemonsqueezy'], required: true },
  providerEventId:       { type: String, required: true },
  eventType:             { type: String, required: true },
  campaignId:            { type: Schema.Types.ObjectId, ref: 'Campaign', default: null },
  paymentId:             { type: Schema.Types.ObjectId, ref: 'Payment', default: null },
  rawPayload:            { type: String, required: true },
  processedSuccessfully: { type: Boolean, required: true },
  processingError:       { type: String, default: null },
  processedAt:           { type: Date, default: Date.now },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const PaymentWebhookEvent = model('PaymentWebhookEvent', PaymentWebhookEventSchema);
```

### 13.4 Indexes

```javascript
// Unique: Prevent double-processing of the same webhook event
db.payment_webhook_events.createIndex(
  { provider: 1, providerEventId: 1 },
  { unique: true, name: 'idx_webhook_events_provider_event_unique' }
);
```

---

## 14. Collection: `daily_leaderboard_snapshots`

### 14.1 Purpose
Immutable frozen historical rankings. Written once by the daily UTC freeze worker. Never updated after insertion. Source of truth for historical "Product of the Day" awards and embeddable badges.

### 14.2 Document Structure

```json
{
  "_id": "ObjectId",
  "snapshotDate": "ISODate('2026-09-18T00:00:00.000Z')",
  "leaderboardType": "LAUNCH_DAY",
  "productId": "ObjectId (ref: products)",
  "rank": 1,
  "score": 284.73,
  "algorithmVersion": "v1.0.0-algo",
  "voteCount": 142,
  "qualifiedClickCount": 38,
  "reviewCount": 0,
  "generatedAt": "ISODate('2026-09-18T23:59:59.000Z')",
  "createdAt": "ISODate"
}
```

### 14.3 Mongoose Schema (TypeScript)

```typescript
export type LeaderboardType = 'LAUNCH_DAY' | 'TRENDING_7D' | 'ALL_TIME';

const SnapshotSchema = new Schema({
  snapshotDate:        { type: Date, required: true },
  leaderboardType:     { type: String, enum: ['LAUNCH_DAY','TRENDING_7D','ALL_TIME'], required: true },
  productId:           { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  rank:                { type: Number, required: true, min: 1 },
  score:               { type: Number, required: true },
  algorithmVersion:    { type: String, required: true },
  voteCount:           { type: Number, required: true, min: 0 },
  qualifiedClickCount: { type: Number, required: true, min: 0 },
  reviewCount:         { type: Number, required: true, min: 0, default: 0 },
  generatedAt:         { type: Date, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const Snapshot = model('Snapshot', SnapshotSchema);
```

### 14.4 Indexes

```javascript
// Unique: One rank position per leaderboard type per snapshot date (guarantees idempotency)
db.daily_leaderboard_snapshots.createIndex(
  { snapshotDate: 1, leaderboardType: 1, rank: 1 },
  { unique: true, name: 'idx_snapshots_date_type_rank_unique' }
);

// Query: Product's historical rank over time (badge rendering)
db.daily_leaderboard_snapshots.createIndex(
  { productId: 1, snapshotDate: -1 },
  { name: 'idx_snapshots_product_date' }
);

// Query: Top N products for a given date + leaderboard type (archive pages)
db.daily_leaderboard_snapshots.createIndex(
  { snapshotDate: 1, leaderboardType: 1, score: -1 },
  { name: 'idx_snapshots_date_type_score' }
);
```

### 14.5 Business Rules
- Documents are **never updated** after insertion.
- The compound unique index `{ snapshotDate, leaderboardType, rank }` guarantees idempotency if the snapshot worker re-runs for the same date.
- Writes are executed inside a MongoDB multi-document ACID transaction to ensure the complete leaderboard set is either fully committed or fully rolled back.

---

## 15. Collection: `activity_events`

### 15.1 Purpose
Append-only operational audit event ledger. Records clickstream, vote events, auth events, campaign events, and submission events. **Not** the transactional source of truth — it supplements audit logging only. Auto-purged after 90 days via TTL index.

### 15.2 Document Structure

```json
{
  "_id": "ObjectId",
  "userId": "ObjectId (ref: users) | null",
  "productId": "ObjectId (ref: products) | null",
  "eventType": "OUTBOUND_CLICK",
  "eventSource": "ORGANIC",
  "sessionHash": "hmac-sha256-daily-salted-hash",
  "metadata": {
    "targetUrl": "https://getacme.com",
    "referrer": "twitter.com",
    "utmSource": "twitter",
    "utmMedium": "social"
  },
  "createdAt": "ISODate"
}
```

### 15.3 Event Type Catalog

| `eventType` | `eventSource` | Description |
| :--- | :--- | :--- |
| `OUTBOUND_CLICK` | `ORGANIC` / `SPONSORED` / `BOT` | User clicked external product link |
| `VOTE_CAST` | `ORGANIC` | Valid vote submitted |
| `VOTE_FLAGGED` | `ORGANIC` | Vote assigned `FLAGGED` status |
| `VOTE_QUARANTINED` | `ORGANIC` | Vote assigned `QUARANTINED` status |
| `VOTE_RETRACTED` | `ORGANIC` | User retracted vote within 15-min window |
| `PRODUCT_SUBMITTED` | `INTERNAL` | Founder confirmed product submission |
| `PRODUCT_APPROVED` | `INTERNAL` | Moderator approved product |
| `PRODUCT_REJECTED` | `INTERNAL` | Moderator rejected product |
| `CAMPAIGN_STARTED` | `INTERNAL` | Campaign activated via webhook |
| `CAMPAIGN_EXPIRED` | `INTERNAL` | Campaign slot expired naturally |
| `OWNERSHIP_CLAIM_INITIATED` | `INTERNAL` | Founder initiated ownership claim |
| `OWNERSHIP_VERIFIED` | `INTERNAL` | Ownership verification succeeded |
| `AUTH_MAGIC_LINK_REQUESTED` | `INTERNAL` | Magic link email sent |
| `AUTH_LOGIN_SUCCESS` | `INTERNAL` | User successfully authenticated |

### 15.4 Mongoose Schema (TypeScript)

```typescript
const ActivityEventSchema = new Schema({
  userId:      { type: Schema.Types.ObjectId, ref: 'User', default: null },
  productId:   { type: Schema.Types.ObjectId, ref: 'Product', default: null },
  eventType:   { type: String, required: true },
  eventSource: { type: String, enum: ['ORGANIC','SPONSORED','BOT','FRAUD','INTERNAL','TEST'], required: true },
  sessionHash: { type: String, default: null },
  metadata:    { type: Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const ActivityEvent = model('ActivityEvent', ActivityEventSchema);
```

### 15.5 Indexes

```javascript
// TTL: Auto-purge raw events after 90 days
db.activity_events.createIndex(
  { createdAt: 1 },
  { expireAfterSeconds: 7776000, name: 'ttl_activity_events_90d' }
);

// Query: Founder analytics dashboard (organic clicks for a product)
db.activity_events.createIndex(
  { productId: 1, eventSource: 1, eventType: 1, createdAt: 1 },
  { name: 'idx_events_product_source_type_date' }
);

// Query: Session deduplication check (same session + product within 10-min window)
db.activity_events.createIndex(
  { sessionHash: 1, productId: 1, eventType: 1 },
  { name: 'idx_events_session_product_type' }
);
```

### 15.6 Business Rules
- `sessionHash = HMAC-SHA256(ClientIP + UserAgent, DailyRotatingSalt)`. Raw IP is **never** stored.
- Click deduplication: Same `sessionHash + productId` within 10-minute window is tagged as duplicate and excluded from `qualifiedClickCount`.
- After 90 days, raw documents are purged by TTL index. A daily aggregation worker (Phase 2) materializes daily summary stats into a `product_analytics_daily` collection before purge.
- Documents are never updated after insertion.

---

## 16. Collection: `moderation_actions`

### 16.1 Purpose
Immutable audit log of all administrative and moderator decisions. Supports compliance, audit trails, and dispute resolution.

### 16.2 Document Structure

```json
{
  "_id": "ObjectId",
  "performedByUserId": "ObjectId (ref: users)",
  "actionType": "APPROVE_PRODUCT",
  "targetType": "PRODUCT",
  "targetId": "ObjectId",
  "reason": "Product passes all content guidelines",
  "previousStatus": "PENDING_REVIEW",
  "newStatus": "SCHEDULED",
  "metadata": {},
  "createdAt": "ISODate"
}
```

### 16.3 Mongoose Schema (TypeScript)

```typescript
const ModerationActionSchema = new Schema({
  performedByUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  actionType:        { type: String, required: true },
  targetType:        { type: String, enum: ['PRODUCT','VOTE','REVIEW','USER','CAMPAIGN','OWNERSHIP'], required: true },
  targetId:          { type: Schema.Types.ObjectId, required: true },
  reason:            { type: String, maxlength: 2000, default: null },
  previousStatus:    { type: String, default: null },
  newStatus:         { type: String, default: null },
  metadata:          { type: Schema.Types.Mixed, default: {} },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const ModerationAction = model('ModerationAction', ModerationActionSchema);
```

### 16.4 Indexes

```javascript
// Query: Full audit trail for a specific target (e.g., all actions on a product)
db.moderation_actions.createIndex({ targetType: 1, targetId: 1, createdAt: -1 }, { name: 'idx_mod_target_date' });

// Query: Actions performed by a specific moderator
db.moderation_actions.createIndex({ performedByUserId: 1, createdAt: -1 }, { name: 'idx_mod_performer_date' });
```

---

## 17. Collection: `system_settings`

### 17.1 Purpose
Dynamic runtime configuration for anti-fraud risk weights, ranking formula parameters, rate limits, and feature flags. Loaded at startup; cached in Redis for hot-path performance. MongoDB is the authoritative source.

### 17.2 Document Structure

```json
{
  "_id": "ObjectId",
  "key": "FRAUD_SIGNAL_WEIGHTS",
  "value": {
    "SIG_EMAIL_DISPOSABLE": "HARD_REJECT",
    "SIG_ACCOUNT_NEW": 20,
    "SIG_IP_DATACENTER": 25,
    "SIG_SUBNET_CONCENTRATION": 35,
    "SIG_BURST_VELOCITY": 25,
    "SIG_ZERO_PRIOR_ACTIVITY": 15,
    "SIG_DEVICE_COLLISION": 40,
    "SIG_HISTORICAL_TRUST": -20,
    "THRESHOLD_LOW": 30,
    "THRESHOLD_HIGH": 70
  },
  "description": "Anti-fraud risk signal weights and scoring thresholds",
  "lastModifiedBy": "ObjectId (ref: users)",
  "version": 3,
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

### 17.3 Known Setting Keys

| `key` | Purpose |
| :--- | :--- |
| `FRAUD_SIGNAL_WEIGHTS` | Anti-fraud signal weights and thresholds |
| `RANKING_PARAMS_LAUNCH` | Wv, Wc, gamma for S_launch |
| `RANKING_PARAMS_TRENDING` | Wv, Wr, Wu, lambda for S_trending |
| `RANKING_PARAMS_ALLTIME` | Bayesian K and weight splits for S_alltime |
| `RATE_LIMITS` | Per-route rate limit configurations |
| `DAILY_SALT` | Current and previous day HMAC salts for session hashing |
| `ALGORITHM_VERSION` | Current active algorithm version string |

### 17.4 Indexes

```javascript
// Unique: One document per setting key
db.system_settings.createIndex({ key: 1 }, { unique: true, name: 'idx_settings_key_unique' });
```

---

## 18. Index Summary

### 18.1 Unique Indexes

| Collection | Index Fields | Constraint Type |
| :--- | :--- | :--- |
| `users` | `{ email: 1 }` | Global unique |
| `products` | `{ slug: 1 }` | Global unique |
| `products` | `{ canonicalDomain: 1 }` where `status` in active states | Partial unique |
| `categories` | `{ slug: 1 }` | Global unique |
| `votes` | `{ productId: 1, userId: 1 }` | Global unique |
| `reviews` | `{ productId: 1, userId: 1 }` | Global unique |
| `product_revisions` | `{ productId: 1, versionNumber: 1 }` | Global unique |
| `ownership_verifications` | `{ productId: 1 }` where `status == 'VERIFIED'` | Partial unique |
| `payments` | `{ providerPaymentId: 1 }` | Sparse unique |
| `payment_webhook_events` | `{ provider: 1, providerEventId: 1 }` | Global unique |
| `daily_leaderboard_snapshots` | `{ snapshotDate: 1, leaderboardType: 1, rank: 1 }` | Global unique |
| `system_settings` | `{ key: 1 }` | Global unique |

### 18.2 TTL Indexes

| Collection | Field | Duration | Purpose |
| :--- | :--- | :--- | :--- |
| `verification_tokens` | `expiresAt` | 0s (date-driven) | Magic link expiry (15 min) |
| `ownership_verifications` | `expiresAt` | 0s (date-driven) | Verification token expiry (72 h) |
| `activity_events` | `createdAt` | 7,776,000s (90 days) | Raw event auto-purge |

### 18.3 Compound Query Indexes

| Collection | Index | Purpose |
| :--- | :--- | :--- |
| `products` | `{ categoryId: 1, status: 1 }` | Category listing pages |
| `products` | `{ launchDate: 1, status: 1 }` | Daily leaderboard queries |
| `products` | `{ status: 1, createdAt: -1 }` | Admin moderation queue |
| `votes` | `{ productId: 1, status: 1, createdAt: 1 }` | Vote aggregation pipeline |
| `votes` | `{ status: 1, createdAt: -1 }` | Moderation quarantine desk |
| `votes` | `{ subnetHash: 1, productId: 1, createdAt: 1 }` | Subnet concentration check |
| `activity_events` | `{ productId: 1, eventSource: 1, eventType: 1, createdAt: 1 }` | Founder analytics dashboard |
| `activity_events` | `{ sessionHash: 1, productId: 1, eventType: 1 }` | Click deduplication |
| `campaigns` | `{ slotId: 1, startsAt: 1, endsAt: 1 }` | Slot availability check |
| `campaigns` | `{ status: 1, endsAt: 1 }` | Campaign expiration worker |
| `daily_leaderboard_snapshots` | `{ productId: 1, snapshotDate: -1 }` | Badge rendering history |
| `daily_leaderboard_snapshots` | `{ snapshotDate: 1, leaderboardType: 1, score: -1 }` | Leaderboard archive pages |

### 18.4 Text Search Index

| Collection | Fields | Weights |
| :--- | :--- | :--- |
| `products` | `name`, `tagline`, `description` | `name: 10`, `tagline: 5`, `description: 1` |

---

## 19. Transaction Boundaries

MongoDB multi-document ACID transactions (`session.withTransaction()`) are strictly isolated to the following critical cross-collection paths:

| # | Transaction Scope | Collections Involved | Trigger |
| :---: | :--- | :--- | :--- |
| T-1 | Payment confirmation + campaign activation | `payments` (insert), `campaigns` (update), `payment_webhook_events` (insert), `activity_events` (insert) | MoR `payment.succeeded` webhook |
| T-2 | Ownership verification approval + founder role promotion | `ownership_verifications` (update status to VERIFIED), `users` (update role to FOUNDER) | DNS / Meta / Email token verified |
| T-3 | UTC daily leaderboard freeze | `daily_leaderboard_snapshots` (bulk insert), `products` (score reconciliation update) | `23:59:59 UTC` scheduled BullMQ cron |

> **Rule**: Do NOT introduce multi-document transactions outside of T-1, T-2, and T-3 without explicit Principal Architect review and approval.

All other operations use **single-document atomicity** (e.g., vote insertion with embedded `riskAssessment`, product status transitions via `findOneAndUpdate`).

---

## 20. Enum Reference Tables

### 20.1 User Roles (`users.role`)

| Value | Permissions |
| :--- | :--- |
| `VISITOR` | Read-only directory access (unauthenticated) |
| `HUNTER` | Authenticated; can vote, review, and submit community products |
| `FOUNDER` | Hunter + verified product owner; dashboard, analytics, campaigns |
| `MODERATOR` | Triage quarantine queue, approve/reject products and reviews |
| `ADMIN` | Full platform control, system settings, audit logs |

### 20.2 Product Statuses (`products.status`)

| Value | Public Visible | Votes | Campaigns | SEO |
| :--- | :---: | :---: | :---: | :--- |
| `DRAFT` | No | No | No | `noindex` / 404 |
| `PENDING_REVIEW` | No | No | No | `noindex` / 404 |
| `SCHEDULED` | Teaser only | No | Pre-book | `noindex` / 200 |
| `LIVE` | Full | Yes | Yes | `index, follow` |
| `SUSPENDED` | Hidden | No | Paused | `noindex` / 451 |
| `REJECTED` | No | No | No | `noindex` / 404 |
| `ARCHIVED` | Historical | No | No | `index, nofollow` |
| `DELETED` | No | Purged | Cancelled | 410 Gone |

### 20.3 Vote Statuses (`votes.status`)

| Value | Score Contribution | Admin Moderation Queue |
| :--- | :---: | :---: |
| `VALID` | +1 | No |
| `FLAGGED` | +1 | Yes |
| `QUARANTINED` | 0 | Yes |
| `REJECTED_BOT` | 0 | No |
| `RETRACTED` | -1 (decremented) | No |
| `APPROVED_BY_MOD` | +1 (on approval) | No |

### 20.4 Ownership Verification Statuses (`ownership_verifications.status`)

| Value | Description |
| :--- | :--- |
| `UNVERIFIED` | Community-submitted product; no founder claimed |
| `PENDING` | Claim initiated; awaiting token validation (72h window) |
| `VERIFIED` | Token confirmed; user granted `FOUNDER` role for this product |
| `REVOKED` | Verification invalidated by token removal, domain transfer, or admin action |
| `FAILED_EXPIRED` | 72-hour validation window elapsed without successful check |

### 20.5 Campaign Statuses (`campaigns.status`)

| Value | Description |
| :--- | :--- |
| `RESERVED` | Slot held for 15 minutes during checkout; payment not yet received |
| `PENDING_PAYMENT` | Checkout initiated; awaiting MoR webhook confirmation |
| `ACTIVE` | Webhook confirmed; campaign actively running in promotional slots |
| `EXPIRED` | Campaign ended naturally at `endsAt` |
| `CANCELLED` | Cancelled before activation or by admin action |
| `PAUSED` | Suspended due to chargeback or admin enforcement |

### 20.6 Traffic Event Sources (`activity_events.eventSource`)

| Value | Included in Organic Ranking |
| :--- | :---: |
| `ORGANIC` | Yes — qualified organic clicks only |
| `SPONSORED` | No — campaign metrics only |
| `BOT` | No — discarded |
| `FRAUD` | No — quarantine log only |
| `INTERNAL` | No — operational events only |
| `TEST` | No — engineering / QA only |

---

*Document maintained by: Engineering Team*  
*Aligned with: PRD v1.2.0 and System Architecture v1.3.0*  
*Next review: Prior to Sprint 0 kickoff*
