# LaunchProduct — RESTful API Specification (`API Specification.md`)

**Document Version:** 1.0.0  
**Status:** Engineering Ready / Definitive API Specification  
**Architecture Pattern:** Layered Monolith (Next.js 14+ Presentation Layer $\longleftrightarrow$ Express.js 4/5 Authoritative REST API)  
**Base URL:** `https://api.launchproduct.io/api/v1` (Production) / `http://localhost:4000/api/v1` (Development)  
**Primary Database:** MongoDB Atlas (MongoDB 7+)  
**Ephemeral Store & Queues:** Redis 7 (Sorted Sets, Rate Limiters, BullMQ Streams)  
**Specification Sources:** `PRD.md`, `database-schema.md`, `database.md`, and `System Architecture.md`  
**Publication Date:** September 19, 2026  

---

## Table of Contents

1. [Global Standards & Architecture](#1-global-standards--architecture)
   - [1.1 Content Types & Protocol](#11-content-types--protocol)
   - [1.2 Standard Response Envelopes](#12-standard-response-envelopes)
   - [1.3 API Versioning / Version Control](#13-api-versioning--version-control)
     - [1.3.1 URI Path Versioning Strategy](#131-uri-path-versioning-strategy)
     - [1.3.2 Semantic Versioning (SemVer 2.0.0) Specification](#132-semantic-versioning-semver-200-specification)
     - [1.3.3 Backward Compatibility Guarantees](#133-backward-compatibility-guarantees)
     - [1.3.4 Deprecation Policy & Sunset Lifecycle (RFC 8594)](#134-deprecation-policy--sunset-lifecycle-rfc-8594)
     - [1.3.5 Unversioned Fast-Path & Utility Endpoints](#135-unversioned-fast-path--utility-endpoints)
     - [1.3.6 Git Version Control & Contract Schema Governance](#136-git-version-control--contract-schema-governance)
   - [1.4 Error Handling](#14-error-handling)
     - [1.4.1 Guiding Architectural Principles & Security Boundary](#141-guiding-architectural-principles--security-boundary)
     - [1.4.2 Standard Error Response Envelope](#142-standard-error-response-envelope)
     - [1.4.3 Comprehensive Error Code Registry](#143-comprehensive-error-code-registry)
     - [1.4.4 Field-Level Validation Error Model (Zod Integration)](#144-field-level-validation-error-model-zod-integration)
     - [1.4.5 Database & Infrastructure Exception Normalization](#145-database--infrastructure-exception-normalization)
     - [1.4.6 Express.js Centralized Error Handling Middleware Pattern](#146-expressjs-centralized-error-handling-middleware-pattern)
     - [1.4.7 Client Resilience, Idempotency & Retry Guidelines](#147-client-resilience-idempotency--retry-guidelines)
   - [1.5 Authentication & Authorization Matrix](#15-authentication--authorization-matrix)
   - [1.6 Standard HTTP Headers](#16-standard-http-headers)
   - [1.7 Rate Limiting Standards](#17-rate-limiting-standards)
2. [Module 1: Authentication & Session Management (`/api/v1/auth`)](#2-module-1-authentication--session-management-apiv1auth)
3. [Module 2: Products & Sandboxed Ingestion Pipeline (`/api/v1/products`)](#3-module-2-products--sandboxed-ingestion-pipeline-apiv1products)
4. [Module 3: Ownership Verification & Claims (`/api/v1/claims`)](#4-module-3-ownership-verification--claims-apiv1claims)
5. [Module 4: Voting & 6-Factor Anti-Fraud Engine (`/api/v1/votes`)](#5-module-4-voting--6-factor-anti-fraud-engine-apiv1votes)
6. [Module 5: Reviews & Reputation (`/api/v1/reviews` — Phase 2)](#6-module-5-reviews--reputation-apiv1reviews--phase-2)
7. [Module 6: Outbound Click Attribution & Referral (`/api/v1/clicks`)](#7-module-6-outbound-click-attribution--referral-apiv1clicks)
8. [Module 7: Campaign Sponsorship & Monetization (`/api/v1/campaigns`)](#8-module-7-campaign-sponsorship--monetization-apiv1campaigns)
9. [Module 8: Merchant of Record Webhooks (`/api/v1/webhooks`)](#9-module-8-merchant-of-record-webhooks-apiv1webhooks)
10. [Module 9: Leaderboards & Snapshots (`/api/v1/leaderboards`)](#10-module-9-leaderboards--snapshots-apiv1leaderboards)
11. [Module 10: Category Taxonomy (`/api/v1/categories`)](#11-module-10-category-taxonomy-apiv1categories)
12. [Module 11: Dynamic SVG Badges & OpenGraph Cards (`/api/badge`, `/api/og`)](#12-module-11-dynamic-svg-badges--opengraph-cards-apibadge-apiog)
13. [Module 12: Founder Analytics Dashboard (`/api/v1/analytics`)](#13-module-12-founder-analytics-dashboard-apiv1analytics)
14. [Module 13: Moderation Desk & Triage Console (`/api/v1/moderation`)](#14-module-13-moderation-desk--triage-console-apiv1moderation)
15. [Module 14: System Administration & Settings (`/api/v1/admin`)](#15-module-14-system-administration--settings-apiv1admin)
16. [Module 15: Health & Observability (`/api/health`, `/api/metrics`)](#16-module-15-health--observability-apihealth-apimetrics)

---

## 1. Global Standards & Architecture

### 1.1 Content Types & Protocol
- Transport: HTTPS strictly enforced via TLS 1.3 / HSTS headers (`max-age=31536000; includeSubDomains; preload`).
- Request Payload Format: `application/json; charset=utf-8` (unless otherwise noted).
- Response Payload Format: `application/json; charset=utf-8` (except badge `/api/badge/*.svg` which serves `image/svg+xml` and OpenGraph `/api/og/*` which serves `image/png`).

### 1.2 Standard Response Envelopes

Every JSON API response returned by Express.js adheres to a consistent response envelope.

#### Success Response Envelope (HTTP 200, 201, 202)
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_01jk98abc123456789",
    "timestamp": "2026-09-19T14:30:00.000Z",
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 142,
      "totalPages": 8,
      "hasNextPage": true,
      "hasPrevPage": false
    }
  }
}
```
*(Note: `meta.pagination` is included only on paginated list endpoints).*

#### Error Response Envelope (HTTP 4xx, 5xx)
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The request payload failed validation constraints.",
    "details": [
      {
        "field": "websiteUrl",
        "message": "Must be a valid HTTPS URL."
      }
    ]
  },
  "meta": {
    "requestId": "req_01jk98abc123456789",
    "timestamp": "2026-09-19T14:30:00.000Z"
  }
}
```

### 1.3 API Versioning / Version Control

#### 1.3.1 URI Path Versioning Strategy
LaunchProduct enforces **URI Path Versioning** across all authoritative REST API resources using the standard path prefix:
```
https://api.launchproduct.io/api/v1/{resource}
```

**Architectural Rationale & Trade-off Analysis:**
1. **Edge Cacheability & CDN Isolation:** URI path partitioning enables edge reverse proxies (Cloudflare Enterprise, Vercel Edge) to cache public catalog queries without header normalization or variance collisions.
2. **Deterministic Client Routing:** Upstream consumers, frontend Next.js server components, SDKs, and third-party webhook dispatchers can target specific API generations without header manipulation.
3. **Observability & Log Clarity:** Ingress access logs, Prometheus metrics, and distributed traces immediately expose the targeted API generation directly from the request URI path without inspecting request headers.
4. **Transparent Parallel Deployment:** When breaking changes necessitate a new API generation, `/api/v1` and `/api/v2` Express router sub-applications coexist concurrently within the layered monolith architecture throughout transition windows.

#### 1.3.2 Semantic Versioning (SemVer 2.0.0) Specification
All LaunchProduct API contracts adhere strictly to **Semantic Versioning 2.0.0** (`MAJOR.MINOR.PATCH`):
- **Current Production Contract Version:** `1.0.0`

| SemVer Increment | Scope & Impact | Routing & Deployment Strategy | Concrete Examples |
| :--- | :--- | :--- | :--- |
| **MAJOR (`v1` $\to$ `v2`)** | **Breaking Changes.** Any modification that breaks backward compatibility for existing consumers. | Deployed under a new URI prefix (e.g. `/api/v2`). The older major version enters the 180-day deprecation lifecycle. | • Removing or renaming fields in JSON responses.<br>• Changing data types (e.g. `string` $\to$ `array`).<br>• Adding new required fields to request payloads.<br>• Changing HTTP status codes for existing endpoints.<br>• Altering session token structure or auth flow. |
| **MINOR (`v1.0` $\to$ `v1.1`)** | **Non-Breaking Additions.** Additive functionality that preserves existing client integrations. | Deployed in-place on the active `/api/v1` route without client migration. | • Introducing new endpoints (e.g. `/api/v1/analytics/export`).<br>• Adding optional request parameters with safe defaults.<br>• Adding new fields to response `data` or `meta`.<br>• Introducing new allowed enum values. |
| **PATCH (`v1.0.0` $\to$ `v1.0.1`)** | **Backward-Compatible Fixes.** Under-the-hood corrections with zero contract delta. | Deployed continuously on the active `/api/v1` route. | • Bug fixes in anti-fraud score heuristics ($F_{\text{fraud}}$).<br>• Scraper parser improvements for OpenGraph tags.<br>• Database index optimizations and query tuning.<br>• Security patches and dependency updates. |

#### 1.3.3 Backward Compatibility Guarantees (The Invariant Contract)
Within the `/api/v1` namespace, the backend engineering team guarantees the following contractual invariants:
1. **Response Key Preservation:** No existing key inside `data` or `meta` will ever be removed, renamed, or relocated.
2. **Payload Expansion Tolerance:** Clients MUST implement tolerant JSON parsing (e.g., ignoring unrecognized fields). Additive fields may appear in responses at any time.
3. **Optionality Invariant:** No existing optional request field will be converted into a mandatory field. Any newly introduced request field will be optional with server-side defaults.
4. **Enum Extensibility:** When string enums expand (such as new `pricing.model` tiers or `audit_logs.action` types), clients must handle unknown enum variants gracefully rather than failing hard.
5. **Pagination Signature Stability:** The pagination contract (`page`, `limit`, `totalItems`, `totalPages`, `hasNextPage`, `hasPrevPage`) remains permanently immutable across list queries.

#### 1.3.4 Deprecation Policy & Sunset Lifecycle (RFC 8594)
When an endpoint or major API version is slated for retirement, LaunchProduct executes a formal **180-day (6-month) deprecation cycle**:

```
+---------------------+     +-----------------------+     +--------------------+     +---------------------+
| Phase 1: T - 180 d  | --> | Phase 2: T - 90 / 30 d| --> | Phase 3: T - 14 d  | --> | Phase 4: T = 0      |
| RFC 8594 Headers    |     | Developer Outreach    |     | Brownout Testing   |     | Terminal Retirement |
| Warning in Spec     |     | Telemetry Tracking    |     | 1-hr 410 Responses |     | Permanent HTTP 410  |
+---------------------+     +-----------------------+     +--------------------+     +---------------------+
```

1. **RFC 8594 Response Headers:** Express middleware injects standard deprecation headers on all deprecated endpoints:
   - `Deprecation: true`
   - `Deprecation: @1790899200` (Unix timestamp of deprecation declaration)
   - `Sunset: Thu, 01 Oct 2026 00:00:00 GMT` (RFC 1123 HTTP-date of scheduled decommission)
   - `Link: <https://docs.launchproduct.io/api/v2/migration>; rel="sunset"; type="text/html"`
2. **Developer Notification & Telemetry:** Prometheus monitors `launchproduct_deprecated_endpoint_hits_total` tagged by `User-Agent` and `userId` to proactively notify affected founders and integrators.
3. **Brownout Testing:** 14 days prior to sunset, 1-hour scheduled brownout windows simulate retirement by returning `410 Gone` to surface unmigrated clients.
4. **Permanent Decommission:** On the sunset date, the route is permanently removed and returns:
   ```json
   {
     "success": false,
     "error": {
       "code": "ENDPOINT_GONE",
       "message": "This endpoint was permanently decommissioned on 2026-10-01. Please migrate to /api/v2/...",
       "documentationUrl": "https://docs.launchproduct.io/api/v2/migration"
     },
     "meta": {
       "requestId": "req_sunset_001",
       "timestamp": "2026-10-01T00:00:00.000Z"
     }
   }
   ```

#### 1.3.5 Unversioned Fast-Path & Utility Endpoints
Certain operational endpoints deliberately bypass the `/api/v1` prefix:
- **System Health Probes (`/api/health`, `/api/health/live`, `/api/health/ready`):** Unversioned to allow standard container orchestration (Kubernetes, AWS ECS, Docker) health checks to remain invariant across API generations.
- **Application Telemetry (`/api/metrics`):** Standard Prometheus scrape endpoint.
- **Dynamic Assets & Badges (`/api/badge/:slug.svg`, `/api/og/:slug`):** Static embed URLs for GitHub READMEs, product websites, and social OpenGraph tags that must never break when internal API versions advance.

#### 1.3.6 Git Version Control & Contract Schema Governance
1. **Contract as Code:** The authoritative API contract is defined using OpenAPI 3.1.0 specifications stored in the primary git repository under `/specs/openapi.v1.yaml`.
2. **Automated CI Breaking-Change Gate:** Every Pull Request triggers a GitHub Actions workflow running `oasdiff`. If a PR against the `v1` contract introduces a breaking change (such as a deleted property, altered type, or new required field), the CI pipeline halts and blocks merge.
3. **Changelog Governance:** Every contract alteration is documented in `CHANGELOG.md` following [Keep a Changelog](https://keepachangelog.com/) conventions.

---

### 1.4 Error Handling

#### 1.4.1 Guiding Architectural Principles & Security Boundary
LaunchProduct's error handling architecture is built on five core engineering principles:
1. **Strict Envelope Determinism:** Every HTTP 4xx and 5xx error without exception produces a uniform JSON payload with `"success": false`.
2. **Machine-Parseable Error Codes:** Frontend applications, SDKs, and automated workflows branch on uppercase snake_case string codes (`error.code`), never on human-readable error messages.
3. **Zero Information Disclosure (Zero Leak Policy):**
   - In `NODE_ENV=production`, internal database query exceptions, Mongoose driver stack traces, filesystem paths, and third-party API credentials are completely stripped.
   - Database errors are mapped to generic, actionable client messages before reaching the network interface.
   - Internal stack traces are logged exclusively to server-side Winston/Datadog streams and exposed in `error.stack` ONLY when `NODE_ENV !== 'production'`.
4. **End-to-End Distributed Traceability:** Every error response includes `meta.requestId` (UUID v4), correlated across Cloudflare CF-Ray headers, Express request contexts, MongoDB Atlas profiling logs, and Winston log records.
5. **Granular Field-Level Feedback:** Form and payload validation failures provide an array of specific field errors (`error.details[]`) enabling precise UI highlight states.

#### 1.4.2 Standard Error Response Envelope

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The request payload failed validation constraints.",
    "details": [
      {
        "field": "websiteUrl",
        "code": "INVALID_URL",
        "message": "Must be an absolute HTTPS URL with a valid public domain."
      },
      {
        "field": "pricing.startingPrice",
        "code": "INVALID_PRICE",
        "message": "Starting price cannot be negative when pricing model is paid."
      }
    ],
    "target": "body",
    "timestamp": "2026-09-19T14:30:00.000Z",
    "documentationUrl": "https://docs.launchproduct.io/errors/VALIDATION_FAILED"
  },
  "meta": {
    "requestId": "req_01jk98abc123456789",
    "timestamp": "2026-09-19T14:30:00.000Z"
  }
}
```

#### 1.4.3 Comprehensive Error Code Registry

| HTTP Status | Error Code (`error.code`) | Domain Category | Description & Client Remediation |
| :---: | :--- | :--- | :--- |
| **400** | `BAD_REQUEST` | Client Error | Malformed JSON syntax, invalid query parameters, or unrecognized payload structure. |
| **400** | `VALIDATION_FAILED` | Client Error | Zod schema validation failed on `body`, `query`, or `params`. Inspect `error.details[]`. |
| **400** | `INVALID_IDENTIFIER` | Client Error | The supplied ID is not a valid 24-character hexadecimal MongoDB ObjectId or UUID. |
| **401** | `UNAUTHORIZED` | Authentication | Missing, expired, or corrupted `sessionToken` cookie. Redirect to `/login`. |
| **401** | `TOKEN_EXPIRED` | Authentication | Magic link or email verification token has expired (> 15m TTL). Request a new token. |
| **401** | `INVALID_CREDENTIALS` | Authentication | Token hash verification failed or token does not exist in `verification_tokens` (`DS14`). |
| **401** | `MAGIC_LINK_ALREADY_USED` | Authentication | Magic link token has already been consumed (single-use enforcement). |
| **401** | `SESSION_REVOKED` | Authentication | The active session was explicitly invalidated by user logout or security password reset. |
| **403** | `FORBIDDEN` | Authorization | Authenticated user lacks the necessary RBAC role (`HUNTER`, `FOUNDER`, `MODERATOR`, `ADMIN`). |
| **403** | `ACCOUNT_BANNED` | Authorization | User account has been administratively suspended (`users.isBanned: true`). |
| **403** | `NOT_PRODUCT_FOUNDER` | Authorization | User is not the verified founder of the target product (`products.founderId !== user._id`). |
| **403** | `CLAIM_IN_PROGRESS` | Authorization | An active ownership claim challenge is already open for this domain by another founder. |
| **404** | `RESOURCE_NOT_FOUND` | Resource State | Target entity (Product, Category, Review, Claim, Campaign) does not exist or was deleted. |
| **409** | `CONFLICT` | Resource State | General state conflict. Target state conflicts with current server state. |
| **409** | `DUPLICATE_RESOURCE` | Resource State | Unique index collision (e.g. domain already submitted, slug collision, user already exists). |
| **409** | `VOTE_ALREADY_CAST` | Resource State | User has already cast an upvote for this product today (enforced by `(userId, productId, date)` unique index). |
| **409** | `SLOT_UNAVAILABLE` | Advertising | Target category banner or sponsored card slot is already booked or reserved for target dates. |
| **409** | `ACTIVE_CAMPAIGN_CONFLICT` | Advertising | Product already has an active or pending campaign in the same category during the requested window. |
| **410** | `ENDPOINT_GONE` | Lifecycle | Deprecated endpoint has passed its RFC 8594 Sunset date and has been decommissioned. |
| **413** | `PAYLOAD_TOO_LARGE` | Client Error | Request body exceeds the 2MB size threshold (e.g. base64 image or excessive payload). |
| **415** | `UNSUPPORTED_MEDIA_TYPE`| Client Error | `Content-Type` header is not `application/json` for mutating requests. |
| **422** | `UNPROCESSABLE_ENTITY` | Business Logic | Request payload is syntactically valid JSON but violates domain business invariants. |
| **422** | `DISPOSABLE_EMAIL_REJECTED`| Anti-Fraud | Registration or magic link requested using a known disposable or temporary email domain. |
| **422** | `SSRF_ATTEMPT_BLOCKED` | Security | Ingestion scraper URL resolves to private, loopback, link-local, or cloud-metadata IP (RFC 1918). |
| **422** | `CLAIM_DNS_MISMATCH` | Verification | Automated DNS TXT query failed to find the required verification token at `_launchproduct.<domain>`. |
| **422** | `INSUFFICIENT_VOTER_AGE`| Anti-Fraud | Voter account age is below the minimum anti-sybil threshold for this launch category. |
| **429** | `RATE_LIMIT_EXCEEDED` | Anti-Abuse | Client IP or user exceeded sliding-window rate limit quota. Inspect `Retry-After` header. |
| **429** | `VOTE_VELOCITY_TRIGGERED`| Anti-Abuse | Product received an anomalous burst of votes from a single `/24` subnet or fingerprint cluster. |
| **400** | `WEBHOOK_SIGNATURE_INVALID`| Webhook | Inbound MoR webhook HMAC-SHA256 signature verification failed against stored secret. |
| **400** | `WEBHOOK_TIMESTAMP_EXPIRED`| Webhook | Webhook timestamp drift exceeds tolerance window (> 300 seconds), rejecting replay attack. |
| **500** | `INTERNAL_SERVER_ERROR`| Infrastructure | Unhandled server exception. Details logged with `requestId`; sanitized for client. |
| **500** | `TRANSACTION_ABORTED` | Database | Multi-document ACID transaction encountered an unrecoverable write conflict and rolled back. |
| **502** | `BAD_GATEWAY` | Upstream | Upstream service (DNS-over-HTTPS resolver, Paddle API, LLM scraper) returned an invalid response. |
| **503** | `SERVICE_UNAVAILABLE` | Infrastructure | Database maintenance mode active, Redis cluster partition, or scheduled downtime in progress. |
| **504** | `GATEWAY_TIMEOUT` | Upstream | Upstream dependency (e.g. external DNS query or scraper request) exceeded timeout limit. |

#### 1.4.4 Field-Level Validation Error Model (Zod Integration)
When request payload validation fails in Express middleware via Zod, the error pipeline catches the `ZodError` and normalizes it into the canonical schema:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Input validation failed across 2 fields.",
    "details": [
      {
        "field": "tagline",
        "code": "TOO_LONG",
        "message": "Tagline cannot exceed 140 characters."
      },
      {
        "field": "categorySlug",
        "code": "INVALID_ENUM_VALUE",
        "message": "Category must match an existing category slug in DS9."
      }
    ],
    "target": "body"
  },
  "meta": {
    "requestId": "req_01jk98val002",
    "timestamp": "2026-09-19T14:30:00.000Z"
  }
}
```

#### 1.4.5 Database & Infrastructure Exception Normalization
The Express API layer translates low-level database driver exceptions into clean, semantic HTTP error responses:
1. **MongoDB Duplicate Key Error (`code: 11000`):**
   - Translated to `409 CONFLICT` (`DUPLICATE_RESOURCE`).
   - The middleware regex-extracts the colliding index field (e.g. `domain` or `(userId, productId, date)`) and returns:
     `"A resource with the specified domain already exists."`
2. **Mongoose CastError (`Cast to ObjectId failed`):**
   - Translated to `400 BAD_REQUEST` (`INVALID_IDENTIFIER`).
   - Protects database internals: `"The provided resource ID is invalid."`
3. **MongoDB `WriteConflict` & `TransientTransactionError`:**
   - Multi-document ACID transactions automatically retry up to 3 times with exponential backoff.
   - If retries exhaust, translated to `500 INTERNAL_SERVER_ERROR` (`TRANSACTION_ABORTED`) with safe rollback.
4. **Redis Connection Failures:**
   - Rate limiters and caching layers fail **open** for non-critical reads, falling back to MongoDB Atlas.
   - For critical anti-fraud state checks, fails **closed** returning `503 SERVICE_UNAVAILABLE` (`REDIS_CONNECTION_FAILED`).

#### 1.4.6 Express.js Centralized Error Handling Middleware Pattern
All errors are channeled through a single authoritative Express error middleware:

```typescript
// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details: Array<{ field?: string; code?: string; message: string }> = [],
    public readonly target: 'body' | 'query' | 'params' | 'header' = 'body',
    public readonly isOperational = true
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = (req.headers['x-request-id'] as string) || `req_${Date.now()}`;
  const timestamp = new Date().toISOString();

  // 1. Handle Known Operational Application Errors
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details.length > 0 ? err.details : undefined,
        target: err.target,
        timestamp,
        documentationUrl: `https://docs.launchproduct.io/errors/${err.code}`,
      },
      meta: { requestId, timestamp }
    });
    return;
  }

  // 2. Handle Zod Schema Validation Failures
  if (err instanceof ZodError) {
    const details = err.errors.map(e => ({
      field: e.path.join('.'),
      code: e.code.toUpperCase(),
      message: e.message
    }));

    res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Request payload failed schema validation.',
        details,
        target: 'body',
        timestamp,
        documentationUrl: 'https://docs.launchproduct.io/errors/VALIDATION_FAILED'
      },
      meta: { requestId, timestamp }
    });
    return;
  }

  // 3. Handle MongoDB Duplicate Key (E11000)
  if ((err as any).code === 11000) {
    const field = Object.keys((err as any).keyPattern || {})[0] || 'resource';
    res.status(409).json({
      success: false,
      error: {
        code: 'DUPLICATE_RESOURCE',
        message: `A resource with the specified ${field} already exists.`,
        target: 'body',
        timestamp,
        documentationUrl: 'https://docs.launchproduct.io/errors/DUPLICATE_RESOURCE'
      },
      meta: { requestId, timestamp }
    });
    return;
  }

  // 4. Handle Uncaught Unexpected Exceptions (500)
  logger.error('Unhandled Exception occurred', {
    requestId,
    error: err.message,
    stack: err.stack,
    path: req.originalUrl,
    method: req.method
  });

  const isProduction = process.env.NODE_ENV === 'production';
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isProduction
        ? 'An unexpected server error occurred. Please try again later.'
        : err.message,
      ...(isProduction ? {} : { stack: err.stack }),
      timestamp,
      documentationUrl: 'https://docs.launchproduct.io/errors/INTERNAL_SERVER_ERROR'
    },
    meta: { requestId, timestamp }
  });
};
```

#### 1.4.7 Client Resilience, Idempotency & Retry Guidelines
API consumers and frontend clients should implement the following fault-resilience policies:
1. **Retry Matrix:**
   - **Retryable HTTP Status Codes:** `429 Too Many Requests`, `502 Bad Gateway`, `503 Service Unavailable`, `504 Gateway Timeout`.
   - **Non-Retryable HTTP Status Codes:** `400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `422 Unprocessable Entity`. Retrying these without modifying the request will reliably fail.
2. **Exponential Backoff with Full Jitter:**
   For retryable errors, clients must sleep using full jitter to avoid thundering herd conditions:
   $$T_{\text{sleep}} = \text{random}(0, \min(M, T_{\text{base}} \times 2^{\text{attempt}}))$$
   Where $T_{\text{base}} = 500\text{ms}$ and maximum backoff cap $M = 30\text{s}$.
3. **Idempotency Keys for Mutating Operations:**
   For critical mutating operations (such as `/api/v1/campaigns/checkout` and paid sponsorship reservations), clients MUST provide an `Idempotency-Key: <UUIDv4>` header.
   - The server caches completed responses in Redis under `idemp:{key}` with a 24-hour TTL.
   - Replays within 24 hours return the cached response with an added header `X-Cache-Lookup: HIT`, guaranteeing zero duplicate charges.

---

### 1.5 Authentication & Authorization Matrix

| Role Value | Authentication Method | Description & Endpoint Permissions |
| :--- | :--- | :--- |
| **Public (`VISITOR`)** | None | Read-only directory browsing, search, outbound click redirects, SVG badge embeds, and initial auth submission. |
| **`HUNTER`** | HttpOnly Session Cookie | Authenticated community member. Can cast upvotes, submit reviews, submit product URLs, and claim product ownership. |
| **`FOUNDER`** | HttpOnly Session Cookie | Verified owner of at least one product. Inherits `HUNTER` rights + access to founder analytics, product edits, and paid campaign checkout. |
| **`MODERATOR`** | HttpOnly Session Cookie | Staff triage member. Can review pending submissions, inspect quarantined votes, overturn fraud flags, and resolve claim disputes. |
| **`ADMIN`** | HttpOnly Session Cookie | Executive administrator. Full access to system configuration, dynamic weights, user bans, manual DB overrides, and financial audits. |
| **`WEBHOOK_MOR`** | HMAC-SHA256 Header | Inbound server-to-server webhook from Paddle/Lemon Squeezy. Authenticated via cryptographic signature header. |

---

### 1.6 Standard HTTP Headers

#### Inbound Request Headers
- `Cookie`: `sessionToken=<encrypted_jwt>` (HttpOnly, Secure, SameSite=Lax).
- `Content-Type`: `application/json` (Required for POST/PUT/PATCH).
- `Idempotency-Key`: UUID v4 string (Recommended for mutating financial/checkout operations).
- `X-Forwarded-For`: Injected by Cloudflare/Reverse proxy for client IP geolocation and anti-fraud evaluation.
- `User-Agent`: Used in conjunction with IP to generate pseudonymous `sessionHash` for clickstream deduplication.

#### Outbound Response Headers
- `Content-Type`: `application/json; charset=utf-8`
- `X-Request-Id`: Unique request tracing UUID.
- `X-RateLimit-Limit`: Maximum requests permitted in the sliding window.
- `X-RateLimit-Remaining`: Remaining request quota in the current window.
- `X-RateLimit-Reset`: Unix epoch timestamp when the window resets.

---

### 1.7 Rate Limiting Standards

LaunchProduct enforces multi-tiered sliding-window rate limiting managed in Redis via Lua token bucket scripts:

| Tier / Route Pattern | Rate Limit Window | Identification Key | Exceeded Action |
| :--- | :--- | :--- | :--- |
| **Public Directory Browsing** | 60 requests / minute | Client IP (`X-Forwarded-For`) | Returns `429 RATE_LIMIT_EXCEEDED` |
| **Authenticated API Calls** | 120 requests / minute | `userId` from Session Token | Returns `429 RATE_LIMIT_EXCEEDED` |
| **High-Risk Actions (Voting)** | 10 requests / minute | `userId` + `/24` IP Subnet | Returns `429 VOTE_VELOCITY_TRIGGERED` |
| **Outbound Click Fast-Path** | 120 redirects / minute | Client IP (`X-Forwarded-For`) | Returns `429 RATE_LIMIT_EXCEEDED` |
| **Passwordless Magic Links** | 5 requests / hour | `/24` IP Subnet & Email Domain | Returns `429 RATE_LIMIT_EXCEEDED` |
| **Sandboxed Scraper Ingestion**| 10 requests / hour | `userId` from Session Token | Returns `429 RATE_LIMIT_EXCEEDED` |

#### Rate Limit HTTP Response Headers
Every API response includes standard rate limit state headers:
- `X-RateLimit-Limit`: Maximum requests allowed in the active sliding window.
- `X-RateLimit-Remaining`: Remaining request allowance in the current window.
- `X-RateLimit-Reset`: Unix epoch timestamp when the quota completely resets.
- `Retry-After`: Included on `429 Too Many Requests` responses; specifies integer seconds to sleep before retrying.

#### Sample 429 Rate Limit Exceeded Payload
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests. Please wait 42 seconds before attempting this action again.",
    "target": "header",
    "timestamp": "2026-09-19T14:30:00.000Z",
    "documentationUrl": "https://docs.launchproduct.io/errors/RATE_LIMIT_EXCEEDED"
  },
  "meta": {
    "requestId": "req_01jk98rate009",
    "timestamp": "2026-09-19T14:30:00.000Z"
  }
}
```

---

## 2. Module 1: Authentication & Session Management (`/api/v1/auth`)

### 2.1 Request Magic Link
- **Endpoint:** Request Passwordless Magic Link Login
- **HTTP Method:** `POST`
- **Path:** `/api/v1/auth/magic-link`
- **Authentication:** None (Public)
- **Rate Limit:** 5 requests / hour per `/24` IP subnet

#### Request Body
```json
{
  "email": "alex.founder@supasite.io"
}
```

#### Validation Rules (Zod)
- `email`: Required, String, valid RFC 5322 format, lowercased, trimmed. Checked against disposable email domain blacklist.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "message": "If this email is eligible, a secure login link has been dispatched.",
    "expiresInSeconds": 900
  },
  "meta": {
    "requestId": "req_01jk98auth001",
    "timestamp": "2026-09-19T14:30:00.000Z"
  }
}
```

#### Error Responses
- `400 Bad Request` (`VALIDATION_FAILED`): Malformed email syntax.
- `422 Unprocessable Entity` (`DISPOSABLE_EMAIL_REJECTED`): Domain found on temporary email blacklist.
- `429 Too Many Requests` (`RATE_LIMIT_EXCEEDED`): Subnet exceeded 5 requests in 60 minutes.

---

### 2.2 Verify Magic Link Token
- **Endpoint:** Verify Magic Link & Establish Session
- **HTTP Method:** `GET`
- **Path:** `/api/v1/auth/verify`
- **Authentication:** None (Public; token in query)
- **Security:** Hashes token using SHA-256 and executes constant-time string comparison (`crypto.timingSafeEqual`) against `verification_tokens` (`DS14`).

#### Query Parameters
- `token` (String, Required): 32-byte hexadecimal raw token string from email link.

#### Success Response (`200 OK`)
**Headers:**
`Set-Cookie: sessionToken=enc_eyJhbGciOi...; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "66ea00001111222233334401",
      "email": "alex.founder@supasite.io",
      "role": "FOUNDER",
      "founderProfile": {
        "displayName": "Alex Rivera",
        "avatarUrl": "https://assets.launchproduct.io/avatars/alex.webp"
      },
      "createdAt": "2026-09-01T10:00:00.000Z"
    }
  },
  "meta": {
    "requestId": "req_01jk98auth002",
    "timestamp": "2026-09-19T14:31:00.000Z"
  }
}
```

#### Error Responses
- `401 Unauthorized` (`TOKEN_EXPIRED`): Token does not exist or elapsed beyond 15-minute TTL.
- `401 Unauthorized` (`INVALID_CREDENTIALS`): Timing-safe hash comparison failed.
- `403 Forbidden` (`ACCOUNT_BANNED`): User is banned by administrator.

---

### 2.3 Initiate OAuth Flow
- **Endpoint:** Initiate OAuth 2.0 Social Login
- **HTTP Method:** `GET`
- **Path:** `/api/v1/auth/oauth/:provider`
- **Authentication:** None (Public)

#### Path Parameters
- `provider` (String, Required): `'google'` or `'github'`.

#### Query Parameters
- `returnUrl` (String, Optional): Valid relative redirect URI (e.g. `/submit`).

#### Success Response (`302 Found`)
- **Headers:** `Location: https://accounts.google.com/o/oauth2/v2/auth?...`

---

### 2.4 OAuth Callback Handler
- **Endpoint:** Process OAuth Identity Callback
- **HTTP Method:** `GET`
- **Path:** `/api/v1/auth/oauth/:provider/callback`
- **Authentication:** None (Provider callback)

#### Query Parameters
- `code` (String, Required): Authorization code from identity provider.
- `state` (String, Required): Encrypted CSRF state parameter.

#### Success Response (`302 Found`)
- **Headers:**  
  `Set-Cookie: sessionToken=...; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`  
  `Location: https://launchproduct.io/dashboard`

---

### 2.5 Get Current Authenticated User (`/me`)
- **Endpoint:** Retrieve Session User Profile
- **HTTP Method:** `GET`
- **Path:** `/api/v1/auth/me`
- **Authentication:** Required (`HUNTER`, `FOUNDER`, `MODERATOR`, `ADMIN`)

#### Request Body
*None.*

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "66ea00001111222233334401",
      "email": "alex.founder@supasite.io",
      "role": "FOUNDER",
      "founderProfile": {
        "displayName": "Alex Rivera",
        "bio": "Building autonomous site builders.",
        "avatarUrl": "https://assets.launchproduct.io/avatars/alex.webp",
        "twitterHandle": "@alexrivera_dev",
        "githubHandle": "alexriveradev",
        "websiteUrl": "https://alexrivera.io"
      },
      "ownedProductIds": ["66ea00001111222233334420"]
    }
  },
  "meta": {
    "requestId": "req_01jk98auth005",
    "timestamp": "2026-09-19T14:35:00.000Z"
  }
}
```

#### Error Responses
- `401 Unauthorized` (`UNAUTHORIZED`): No valid session cookie found.

---

### 2.6 User Logout
- **Endpoint:** Terminate Active Session
- **HTTP Method:** `POST`
- **Path:** `/api/v1/auth/logout`
- **Authentication:** Required (`HUNTER`, `FOUNDER`, `MODERATOR`, `ADMIN`)

#### Request Body
*None.*

#### Success Response (`200 OK`)
- **Headers:** `Set-Cookie: sessionToken=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly`

```json
{
  "success": true,
  "data": {
    "message": "Session terminated successfully."
  }
}
```

---

## 3. Module 2: Products & Sandboxed Ingestion Pipeline (`/api/v1/products`)

### 3.1 Public Directory Search & Discovery
- **Endpoint:** Query Product Directory with Faceted Filtering
- **HTTP Method:** `GET`
- **Path:** `/api/v1/products`
- **Authentication:** None (Public)

#### Query Parameters
- `q` (String, Optional): Full-text search keyword query.
- `category` (String, Optional): Category slug (e.g. `developer-tools`).
- `pricing` (String, Optional): Filter by pricing tier: `Free`, `Freemium`, `Paid`, `Contact`.
- `sort` (String, Optional, Default: `rank`): `rank`, `votes`, `newest`.
- `date` (String, Optional): Launch date filter (`YYYY-MM-DD`).
- `page` (Integer, Optional, Default: 1): Page number.
- `limit` (Integer, Optional, Default: 20, Max: 50): Items per page.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "66ea00001111222233334420",
        "name": "Supasite",
        "slug": "supasite",
        "canonicalDomain": "getsupasite.com",
        "tagline": "AI-powered static site builder with instant edge deployments",
        "category": {
          "id": "66ea00001111222233334410",
          "name": "Developer Tools",
          "slug": "developer-tools"
        },
        "pricing": {
          "pricingType": "Freemium",
          "startingPriceCents": 1900,
          "currency": "USD"
        },
        "media": {
          "logoUrl": "https://assets.launchproduct.io/logos/supasite-icon.png",
          "bannerUrl": "https://assets.launchproduct.io/banners/supasite-hero.png"
        },
        "liveVoteCount": 428,
        "isClaimed": true,
        "launchDate": "2026-09-18T00:00:00.000Z"
      }
    ]
  },
  "meta": {
    "requestId": "req_01jk98prod001",
    "timestamp": "2026-09-19T14:40:00.000Z",
    "pagination": {
      "page": 1,
      "limit": 20,
      "totalItems": 1,
      "totalPages": 1,
      "hasNextPage": false,
      "hasPrevPage": false
    }
  }
}
```

---

### 3.2 Get Product Detail Page (PDP)
- **Endpoint:** Fetch Detailed Product Profile
- **HTTP Method:** `GET`
- **Path:** `/api/v1/products/:slugOrId`
- **Authentication:** None (Public)

#### Path Parameters
- `slugOrId` (String, Required): Product unique slug (`supasite`) or 24-character ObjectId.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "product": {
      "id": "66ea00001111222233334420",
      "slug": "supasite",
      "canonicalDomain": "getsupasite.com",
      "name": "Supasite",
      "tagline": "AI-powered static site builder with instant edge deployments",
      "description": "Supasite analyzes your repository or plain English prompt...",
      "websiteUrl": "https://getsupasite.com",
      "founder": {
        "id": "66ea00001111222233334401",
        "displayName": "Alex Rivera",
        "avatarUrl": "https://assets.launchproduct.io/avatars/alex.webp"
      },
      "category": {
        "id": "66ea00001111222233334410",
        "name": "Developer Tools",
        "slug": "developer-tools"
      },
      "pricing": {
        "pricingType": "Freemium",
        "startingPriceCents": 1900,
        "currency": "USD"
      },
      "media": {
        "logoUrl": "https://assets.launchproduct.io/logos/supasite-icon.png",
        "bannerUrl": "https://assets.launchproduct.io/banners/supasite-hero.png",
        "screenshotUrls": [
          "https://assets.launchproduct.io/shots/supasite-editor.png"
        ]
      },
      "status": "LIVE",
      "launchDate": "2026-09-18T00:00:00.000Z",
      "historicalRankings": [
        {
          "snapshotDate": "2026-09-18T00:00:00.000Z",
          "rank": 1,
          "score": 3.4892,
          "validVotes": 428
        }
      ]
    }
  }
}
```

#### Error Responses
- `404 Not Found` (`NOT_FOUND`): Product does not exist or status is `DRAFT`/`REJECTED`.

---

### 3.3 Submit Product URL for Scraping
- **Endpoint:** Initiate Sandboxed Scrape & Metadata Extraction
- **HTTP Method:** `POST`
- **Path:** `/api/v1/products/submit`
- **Authentication:** Required (`HUNTER`, `FOUNDER`)
- **Behavior:** Enforces SSRF pre-check, confirms apex domain uniqueness in `products` (`DS2`), enqueues background job into BullMQ `scraper-queue` (`DS16`), and immediately returns HTTP 202.

#### Request Body
```json
{
  "websiteUrl": "https://getacme.com"
}
```

#### Success Response (`202 Accepted`)
```json
{
  "success": true,
  "data": {
    "jobId": "job_scr_01jk98scrape789",
    "canonicalDomain": "getacme.com",
    "status": "QUEUED",
    "statusCheckUrl": "/api/v1/products/submit/status/job_scr_01jk98scrape789"
  },
  "meta": {
    "requestId": "req_01jk98prod003",
    "timestamp": "2026-09-19T14:42:00.000Z"
  }
}
```

#### Error Responses
- `400 Bad Request` (`VALIDATION_FAILED`): Malformed URL.
- `409 Conflict` (`DOMAIN_ALREADY_EXISTS`): Active product already registered under canonical domain.
- `422 Unprocessable Entity` (`SSRF_ATTEMPT_DETECTED`): Resolves to private IP, link-local, or cloud metadata.

---

### 3.4 Poll Scrape Job Status
- **Endpoint:** Retrieve Extraction Progress or Extracted Draft Product
- **HTTP Method:** `GET`
- **Path:** `/api/v1/products/submit/status/:jobId`
- **Authentication:** Required (User who initiated the scrape)

#### Success Response (`200 OK` — Complete)
```json
{
  "success": true,
  "data": {
    "jobId": "job_scr_01jk98scrape789",
    "status": "COMPLETED",
    "draftProduct": {
      "id": "66ea00001111222233334499",
      "canonicalDomain": "getacme.com",
      "name": "Acme AI",
      "tagline": "Autonomous workflow automation for high-growth teams",
      "description": "Acme AI connects into Slack and GitHub...",
      "websiteUrl": "https://getacme.com",
      "suggestedCategoryId": "66ea00001111222233334410",
      "media": {
        "logoUrl": "https://getacme.com/assets/favicon.png",
        "bannerUrl": "https://getacme.com/og-image.png"
      },
      "pricing": {
        "pricingType": "Paid",
        "startingPriceCents": 2900,
        "currency": "USD"
      }
    }
  }
}
```

---

### 3.5 Fallback Manual Product Submission
- **Endpoint:** Submit Product Listing Manually (Bypassing Scraper)
- **HTTP Method:** `POST`
- **Path:** `/api/v1/products/submit/manual`
- **Authentication:** Required (`HUNTER`, `FOUNDER`)

#### Request Body
```json
{
  "name": "Acme Studio",
  "tagline": "Next-generation design tool for modern interfaces",
  "description": "Detailed markdown overview of the platform features...",
  "websiteUrl": "https://acmestudio.design",
  "categoryId": "66ea00001111222233334410",
  "pricing": {
    "pricingType": "Free",
    "startingPriceCents": 0,
    "currency": "USD"
  },
  "media": {
    "logoUrl": "https://assets.launchproduct.io/uploads/acme-logo.png",
    "bannerUrl": "https://assets.launchproduct.io/uploads/acme-banner.png",
    "screenshotUrls": []
  }
}
```

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "product": {
      "id": "66ea00001111222233334488",
      "slug": "acme-studio",
      "status": "PENDING_REVIEW"
    }
  }
}
```

---

### 3.6 Confirm Draft Product
- **Endpoint:** Confirm and Edit Extracted Draft Listing
- **HTTP Method:** `PUT`
- **Path:** `/api/v1/products/:id/confirm`
- **Authentication:** Required (User who created the draft)
- **Behavior:** Updates product status to `PENDING_REVIEW` and writes immutable Version 1 record to `product_revisions` (`DS10`).

#### Request Body
```json
{
  "name": "Acme AI",
  "tagline": "Automate routine engineering workflows with autonomous agents",
  "description": "Sanitized markdown product description with feature highlights...",
  "categoryId": "66ea00001111222233334410",
  "pricing": {
    "pricingType": "Freemium",
    "startingPriceCents": 2900,
    "currency": "USD"
  },
  "media": {
    "logoUrl": "https://assets.launchproduct.io/uploads/acme-logo-confirmed.png",
    "bannerUrl": "https://assets.launchproduct.io/uploads/acme-hero.png",
    "screenshotUrls": ["https://assets.launchproduct.io/uploads/shot-1.png"]
  }
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "productId": "66ea00001111222233334499",
    "status": "PENDING_REVIEW",
    "version": 1,
    "message": "Product submitted for editorial moderation."
  }
}
```

---

### 3.7 Update Live Product Metadata
- **Endpoint:** Update Existing Product Listing
- **HTTP Method:** `PUT`
- **Path:** `/api/v1/products/:id`
- **Authentication:** Required (`FOUNDER` owner of product or `ADMIN`)
- **Behavior:** Archives delta and increments version in `product_revisions` (`DS10`).

#### Request Body
```json
{
  "tagline": "Updated elevator pitch for Q4 release",
  "description": "Revised documentation description...",
  "pricing": {
    "pricingType": "Paid",
    "startingPriceCents": 3900,
    "currency": "USD"
  }
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "productId": "66ea00001111222233334420",
    "currentVersion": 2,
    "status": "LIVE"
  }
}
```

---

### 3.8 Soft-Delete Product
- **Endpoint:** Remove Product Listing from Public Directory
- **HTTP Method:** `DELETE`
- **Path:** `/api/v1/products/:id`
- **Authentication:** Required (`FOUNDER` owner or `ADMIN`)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "productId": "66ea00001111222233334420",
    "status": "DELETED",
    "deletedAt": "2026-09-19T14:45:00.000Z"
  }
}
```

---

### 3.9 Get Product Revision Audit History
- **Endpoint:** Retrieve Versioned Edit History
- **HTTP Method:** `GET`
- **Path:** `/api/v1/products/:id/revisions`
- **Authentication:** Required (`FOUNDER` owner, `MODERATOR`, `ADMIN`)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "revisions": [
      {
        "versionNumber": 2,
        "editorId": "66ea00001111222233334401",
        "delta": {
          "startingPriceCents": { "before": 1900, "after": 3900 }
        },
        "createdAt": "2026-09-19T14:44:00.000Z"
      },
      {
        "versionNumber": 1,
        "editorId": "66ea00001111222233334401",
        "delta": { "status": { "before": "DRAFT", "after": "PENDING_REVIEW" } },
        "createdAt": "2026-09-11T17:00:00.000Z"
      }
    ]
  }
}
```

---

## 4. Module 3: Ownership Verification & Claims (`/api/v1/claims`)

### 4.1 Initiate Ownership Claim Challenge
- **Endpoint:** Start Domain Verification Challenge
- **HTTP Method:** `POST`
- **Path:** `/api/v1/products/:id/claim`
- **Authentication:** Required (`HUNTER`, `FOUNDER`)
- **Behavior:** Generates 32-byte cryptographic token with a 72-hour TTL index in `ownership_verifications` (`DS9`).

#### Request Body
```json
{
  "verificationMethod": "DNS_TXT"
}
```

#### Allowed Values
- `verificationMethod`: `'DNS_TXT'`, `'HTML_META'`, `'EMAIL_DOMAIN'`.

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "claimId": "66ea00001111222233334480",
    "productId": "66ea00001111222233334420",
    "verificationMethod": "DNS_TXT",
    "challenge": {
      "dnsRecordType": "TXT",
      "host": "@",
      "expectedValue": "launchproduct-verify=4f9d3b8e7c2a1059f8e4d3c2b1a0987654321fedcba0987654321fedcba09876"
    },
    "expiresAt": "2026-09-22T14:50:00.000Z"
  }
}
```

#### Error Responses
- `409 Conflict` (`ALREADY_CLAIMED`): Product already has a verified founder.
- `409 Conflict` (`ACTIVE_CLAIM_EXISTS`): You already have an active pending claim for this product.

---

### 4.2 Check Claim Status
- **Endpoint:** Get Current Claim State
- **HTTP Method:** `GET`
- **Path:** `/api/v1/claims/:claimId`
- **Authentication:** Required (Claimant User)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "claimId": "66ea00001111222233334480",
    "status": "CHALLENGE_ISSUED",
    "expiresAt": "2026-09-22T14:50:00.000Z"
  }
}
```

---

### 4.3 Trigger Verification Check
- **Endpoint:** Execute Automated Verification Validation
- **HTTP Method:** `POST`
- **Path:** `/api/v1/claims/:claimId/verify`
- **Authentication:** Required (Claimant User)
- **Behavior:** Queries Google DoH DNS API for TXT record or performs hardened HTTP fetch for `<meta name="launchproduct-verify">`. On match, executes Multi-Document Transaction T-2 (`ownership_verifications` $\to$ `VERIFIED`, `products.founderId` $\to$ claimant, `users.role` $\to$ `FOUNDER`).

#### Request Body
*None.*

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "claimId": "66ea00001111222233334480",
    "status": "VERIFIED",
    "userRole": "FOUNDER",
    "productId": "66ea00001111222233334420",
    "message": "Ownership verified successfully! You have been granted Founder access."
  }
}
```

#### Error Responses
- `422 Unprocessable Entity` (`VERIFICATION_CHECK_FAILED`): DNS TXT record or HTML meta tag not found or mismatched.

---

## 5. Module 4: Voting & 6-Factor Anti-Fraud Engine (`/api/v1/votes`)

### 5.1 Cast Upvote
- **Endpoint:** Cast Product Upvote with Dynamic Risk Scoring
- **HTTP Method:** `POST`
- **Path:** `/api/v1/votes`
- **Authentication:** Required (`HUNTER`, `FOUNDER`)
- **Rate Limit:** 10 votes / minute per user (Redis sliding-window)
- **Anti-Fraud Execution:** Evaluates 6 signals (account age, ASN origin, `/24` subnet burst, velocity, navigation telemetry, canvas fingerprint). Assigns status:
  - `RiskScore < 30`: `VALID` (Atomically increments Redis leaderboard `ZINCRBY`).
  - `30 <= RiskScore < 70`: `FLAGGED_FOR_REVIEW` (Increments score, flags for moderator).
  - `RiskScore >= 70`: `QUARANTINED` (Zero public increment, queued for triage).
  - Known bots: `REJECTED_BOT` (Silent drop).

#### Request Body
```json
{
  "productId": "66ea00001111222233334420",
  "clientFingerprint": "b5d4045c3f466fa91fe2cc6abe79232a1a57cdf104f7a26e716e0a1e2789df78",
  "navTelemetryToken": "nav_tok_valid_01jk98"
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "voteId": "66ea00001111222233334430",
    "status": "VALID",
    "newLiveVoteCount": 429
  },
  "meta": {
    "requestId": "req_01jk98vote001",
    "timestamp": "2026-09-19T14:55:00.000Z"
  }
}
```

#### Error Responses
- `409 Conflict` (`ALREADY_VOTED`): User has already cast an active vote on this product (`{ productId, userId }` unique index).
- `429 Too Many Requests` (`RATE_LIMIT_EXCEEDED`): User exceeded 10 votes in 60 seconds.

---

### 5.2 Retract Upvote
- **Endpoint:** Remove Previously Cast Upvote
- **HTTP Method:** `DELETE`
- **Path:** `/api/v1/votes/:productId`
- **Authentication:** Required (`HUNTER`, `FOUNDER`)
- **Behavior:** Updates vote status to `RETRACTED` and atomically decrements Redis score (`ZINCRBY -1`).

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "productId": "66ea00001111222233334420",
    "status": "RETRACTED",
    "newLiveVoteCount": 428
  }
}
```

---

### 5.3 Get Current User Upvotes
- **Endpoint:** Fetch Products Upvoted by Requesting User
- **HTTP Method:** `GET`
- **Path:** `/api/v1/votes/user`
- **Authentication:** Required (`HUNTER`, `FOUNDER`)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "upvotedProductIds": [
      "66ea00001111222233334420",
      "66ea00001111222233334455"
    ]
  }
}
```

---

### 5.4 Appeal Quarantined Vote
- **Endpoint:** Submit Appeal for a Quarantined Upvote
- **HTTP Method:** `POST`
- **Path:** `/api/v1/votes/:id/appeal`
- **Authentication:** Required (User who cast the vote)

#### Request Body
```json
{
  "reason": "I am a genuine user working from a corporate VPN."
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "message": "Appeal submitted for human moderator inspection.",
    "appealStatus": "PENDING"
  }
}
```

---

## 6. Module 5: Reviews & Reputation (`/api/v1/reviews` — Phase 2)

### 6.1 Get Product Reviews
- **Endpoint:** List Paginated Community Reviews
- **HTTP Method:** `GET`
- **Path:** `/api/v1/products/:id/reviews`
- **Authentication:** None (Public)

#### Query Parameters
- `page` (Integer, Default: 1)
- `limit` (Integer, Default: 10, Max: 30)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "66ea00001111222233334440",
        "author": {
          "id": "66ea00001111222233334401",
          "displayName": "Alex Rivera",
          "avatarUrl": "https://assets.launchproduct.io/avatars/alex.webp"
        },
        "rating": 5,
        "content": "Built my entire agency portfolio in 8 minutes. Edge load times under 15ms!",
        "founderReply": {
          "content": "Thanks for the feedback! Dark mode presets launch next week.",
          "repliedAt": "2026-09-18T10:15:00.000Z"
        },
        "createdAt": "2026-09-18T09:45:00.000Z"
      }
    ]
  }
}
```

---

### 6.2 Submit Product Review
- **Endpoint:** Post Rating & Commentary
- **HTTP Method:** `POST`
- **Path:** `/api/v1/reviews`
- **Authentication:** Required (`HUNTER`, `FOUNDER`)
- **Constraint:** Enforces 1 review per user per product (`{ productId, userId }` unique index).

#### Request Body
```json
{
  "productId": "66ea00001111222233334420",
  "rating": 5,
  "content": "Outstanding developer experience. The automated CI/CD pipeline works out of the box."
}
```

#### Validation Rules
- `rating`: Integer, 1 to 5.
- `content`: String, 20 to 2,000 characters, markdown sanitized.

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "reviewId": "66ea00001111222233334440",
    "rating": 5,
    "createdAt": "2026-09-19T15:00:00.000Z"
  }
}
```

---

### 6.3 Founder Reply to Review
- **Endpoint:** Post Official Founder Response
- **HTTP Method:** `POST`
- **Path:** `/api/v1/reviews/:id/reply`
- **Authentication:** Required (`FOUNDER` owner of product)

#### Request Body
```json
{
  "content": "Thank you for the detailed feedback! We have addressed the issue in v1.2."
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "reply": {
      "content": "Thank you for the detailed feedback! We have addressed the issue in v1.2.",
      "repliedAt": "2026-09-19T15:05:00.000Z"
    }
  }
}
```

---

### 6.4 Flag Review for Moderation
- **Endpoint:** Report Review for Spam / Abuse
- **HTTP Method:** `POST`
- **Path:** `/api/v1/reviews/:id/flag`
- **Authentication:** Required (`HUNTER`, `FOUNDER`)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "message": "Review flagged for moderator investigation."
  }
}
```

---

## 7. Module 6: Outbound Click Attribution & Referral (`/api/v1/clicks`)

### 7.1 Outbound Referral Redirect
- **Endpoint:** Track Outbound Referral & Redirect
- **HTTP Method:** `GET`
- **Path:** `/api/v1/clicks/:id`
- **Authentication:** None (Public)
- **Latency SLA:** $\le 25$ms p95 redirect delivery.
- **Deduplication:** Computes `sessionHash = HMAC-SHA256(IP + UA, DailyRotatingSalt)`. Checks Redis `click:dedup:[productId]:[sessionHash]` (10-minute TTL). Drops duplicate click events while dispatching HTTP 302.
- **Traffic Isolation:** `source=sponsored` clicks are flagged strictly for billing and firewalled from organic rank calculations.

#### Path Parameters
- `id` (String, Required): Product ObjectId or slug.

#### Query Parameters
- `source` (String, Optional, Default: `organic`): `organic` or `sponsored`.

#### Success Response (`302 Found`)
- **Headers:**  
  `Location: https://getsupasite.com?ref=launchproduct`  
  `Referrer-Policy: no-referrer-when-downgrade`  
  `Cache-Control: no-store, no-cache, must-revalidate`

---

## 8. Module 7: Campaign Sponsorship & Monetization (`/api/v1/campaigns`)

### 8.1 Check Advertising Slot Availability
- **Endpoint:** Query Slot Calendar Inventory
- **HTTP Method:** `GET`
- **Path:** `/api/v1/campaigns/inventory`
- **Authentication:** None (Public / Founder)

#### Query Parameters
- `tier` (String, Required): `HOMEPAGE_HERO`, `CATEGORY_BANNER`, `NEWSLETTER_SPONSOR`.
- `startDate` (String, Required): `YYYY-MM-DD`.
- `durationDays` (Integer, Optional, Default: 1).

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "tier": "HOMEPAGE_HERO",
    "startDate": "2026-09-25T00:00:00.000Z",
    "isAvailable": true,
    "availableSlots": ["homepage-hero-1"],
    "priceCents": 29900,
    "currency": "USD"
  }
}
```

---

### 8.2 Reserve Slot & Create MoR Checkout
- **Endpoint:** Reserve Slot & Initiate Merchant of Record Session
- **HTTP Method:** `POST`
- **Path:** `/api/v1/campaigns/checkout`
- **Authentication:** Required (`FOUNDER` verified owner of product)
- **Behavior:**
  1. Validates that user owns the target product (`products.founderId == user._id`).
  2. Acquires distributed 15-minute slot reservation hold in Redis (`SET slot:reserve:[tier]:[slotId] [userId] NX EX 900`).
  3. Creates `RESERVED` campaign record in `campaigns` (`DS6`).
  4. Calls Global MoR API (Paddle) to generate hosted checkout session pre-loaded with custom `campaignId` metadata.

#### Request Body
```json
{
  "productId": "66ea00001111222233334420",
  "slotId": "homepage-hero-1",
  "tier": "HOMEPAGE_HERO",
  "startsAt": "2026-09-25T00:00:00.000Z",
  "durationDays": 1
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "campaignId": "66ea00001111222233334450",
    "checkoutUrl": "https://checkout.paddle.com/checkout/build?txn=txn_paddle_sample123",
    "reservationExpiresAt": "2026-09-19T15:25:00.000Z",
    "amountCents": 29900,
    "currency": "USD"
  }
}
```

#### Error Responses
- `403 Forbidden` (`NOT_PRODUCT_OWNER`): Authenticated user does not own target product.
- `409 Conflict` (`SLOT_UNAVAILABLE`): Slot is currently booked or held by another reservation.

---

### 8.3 Get Founder Campaigns
- **Endpoint:** List Authenticated Founder's Campaigns
- **HTTP Method:** `GET`
- **Path:** `/api/v1/campaigns/my-campaigns`
- **Authentication:** Required (`FOUNDER`)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "campaigns": [
      {
        "id": "66ea00001111222233334450",
        "productName": "Supasite",
        "tier": "HOMEPAGE_HERO",
        "slotId": "homepage-hero-1",
        "status": "ACTIVE",
        "startsAt": "2026-09-18T00:00:00.000Z",
        "endsAt": "2026-09-19T00:00:00.000Z"
      }
    ]
  }
}
```

---

### 8.4 Get Campaign Delivery Analytics
- **Endpoint:** Fetch Real-Time Sponsored Metrics
- **HTTP Method:** `GET`
- **Path:** `/api/v1/campaigns/:id`
- **Authentication:** Required (`FOUNDER` owner or `ADMIN`)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "campaignId": "66ea00001111222233334450",
    "status": "ACTIVE",
    "impressionsDelivered": 14280,
    "sponsoredClicksDelivered": 842,
    "ctr": 0.0589,
    "spendCents": 29900
  }
}
```

---

## 9. Module 8: Merchant of Record Webhooks (`/api/v1/webhooks`)

### 9.1 Inbound MoR Payment Webhook
- **Endpoint:** Ingest Merchant of Record Webhook Notifications
- **HTTP Method:** `POST`
- **Path:** `/api/v1/webhooks/payment`
- **Authentication:** Cryptographic Webhook Signature Header (`Paddle-Signature`)
- **Security & Execution:**
  1. Validates HMAC-SHA256 signature using provider secret.
  2. Enforces idempotency via `payment_webhook_events` (`DS8`) unique compound index `{ provider, providerEventId }`.
  3. Executes Multi-Document Transaction T-1 (inserts `payments`, transitions `campaigns` to `ACTIVE`, logs `activity_events`).
  4. Returns instant HTTP 200 within 200ms.

#### Request Headers
`Paddle-Signature: ts=1726758735;h1=5d41402abc4b2a76b9719d911017c592...`

#### Request Body
```json
{
  "event_id": "evt_pad_01j789xyz456",
  "event_type": "transaction.completed",
  "data": {
    "id": "txn_paddle_01jk89abc123456789",
    "status": "completed",
    "customer_id": "ctm_paddle_998877",
    "custom_data": {
      "campaignId": "66ea00001111222233334450",
      "userId": "66ea00001111222233334401"
    },
    "details": {
      "totals": {
        "grand_total": "29900",
        "currency_code": "USD"
      }
    }
  }
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "message": "Webhook processed and campaign activated."
  }
}
```

#### Error Responses
- `400 Bad Request` (`INVALID_SIGNATURE`): Cryptographic HMAC verification failed.

---

## 10. Module 9: Leaderboards & Snapshots (`/api/v1/leaderboards`)

### 10.1 Active Real-Time Leaderboard
- **Endpoint:** Get Live Leaderboard for Today's Launches
- **HTTP Method:** `GET`
- **Path:** `/api/v1/leaderboards/today`
- **Authentication:** None (Public)
- **Data Source:** High-speed Redis Sorted Set `leaderboard:today:votes` enriched with product metadata from MongoDB Atlas.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "leaderboardDate": "2026-09-19",
    "products": [
      {
        "rank": 1,
        "productId": "66ea00001111222233334420",
        "name": "Supasite",
        "slug": "supasite",
        "liveVoteCount": 429,
        "media": {
          "logoUrl": "https://assets.launchproduct.io/logos/supasite-icon.png"
        }
      }
    ]
  }
}
```

---

### 10.2 Historical Frozen Leaderboards
- **Endpoint:** Query Immutable Historical Daily/Weekly Rankings
- **HTTP Method:** `GET`
- **Path:** `/api/v1/leaderboards/historical`
- **Authentication:** None (Public)
- **Data Source:** Queries `daily_leaderboard_snapshots` (`DS11`).

#### Query Parameters
- `date` (String, Required): `YYYY-MM-DD`.
- `type` (String, Optional, Default: `DAILY`): `DAILY`, `WEEKLY`, `CATEGORY`.
- `categoryId` (String, Optional): Required if `type=CATEGORY`.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "snapshotDate": "2026-09-18T00:00:00.000Z",
    "leaderboardType": "DAILY",
    "rankings": [
      {
        "rank": 1,
        "productId": "66ea00001111222233334420",
        "name": "Supasite",
        "slug": "supasite",
        "finalScore": 3.4892,
        "validVotes": 428,
        "organicClicks": 1284,
        "badgeAward": "Product of the Day #1"
      }
    ]
  }
}
```

---

## 11. Module 10: Category Taxonomy (`/api/v1/categories`)

### 11.1 Get Category Hierarchy Tree
- **Endpoint:** Retrieve Full Taxonomy Hierarchy
- **HTTP Method:** `GET`
- **Path:** `/api/v1/categories`
- **Authentication:** None (Public)
- **Caching:** In-memory cached on backend server with 1-hour TTL.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "categories": [
      {
        "id": "66ea00001111222233334410",
        "name": "Developer Tools",
        "slug": "developer-tools",
        "description": "SDKs, APIs, and tooling engineered for modern builders.",
        "icon": "code-2",
        "sortOrder": 1,
        "subcategories": [
          {
            "id": "66ea00001111222233334411",
            "name": "Static Site Generators",
            "slug": "static-site-generators",
            "sortOrder": 1
          }
        ]
      }
    ]
  }
}
```

---

### 11.2 Get Category By Slug
- **Endpoint:** Get Category Metadata & SEO Details
- **HTTP Method:** `GET`
- **Path:** `/api/v1/categories/:slug`
- **Authentication:** None (Public)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "category": {
      "id": "66ea00001111222233334410",
      "name": "Developer Tools",
      "slug": "developer-tools",
      "description": "SDKs, APIs, and tooling engineered for modern builders.",
      "productCount": 184
    }
  }
}
```

---

### 11.3 Create Taxonomy Category
- **Endpoint:** Provision New Directory Category
- **HTTP Method:** `POST`
- **Path:** `/api/v1/categories`
- **Authentication:** Required (`ADMIN`)

#### Request Body
```json
{
  "name": "Autonomous AI Agents",
  "slug": "autonomous-ai-agents",
  "description": "AI systems capable of multi-step decision making.",
  "icon": "bot",
  "parentId": null,
  "sortOrder": 2
}
```

#### Success Response (`201 Created`)
```json
{
  "success": true,
  "data": {
    "category": {
      "id": "66ea00001111222233334415",
      "slug": "autonomous-ai-agents"
    }
  }
}
```

---

## 12. Module 11: Dynamic SVG Badges & OpenGraph Cards (`/api/badge`, `/api/og`)

### 12.1 Dynamic Real-Time SVG Badge
- **Endpoint:** Render Dynamic SVG Ranks / Awards
- **HTTP Method:** `GET`
- **Path:** `/api/badge/:slug.svg`
- **Authentication:** None (Public)
- **Response Format:** `image/svg+xml`
- **Edge Cache:** `Cache-Control: public, s-maxage=300, stale-while-revalidate=600`

#### Query Parameters
- `style` (String, Optional, Default: `flat`): `flat`, `pill`, `badge`.
- `theme` (String, Optional, Default: `dark`): `dark`, `light`.

#### Success Response (`200 OK`)
- **Headers:** `Content-Type: image/svg+xml; charset=utf-8`
- **Body:** Raw XML SVG string embedding current rank or award title.

---

### 12.2 Dynamic OpenGraph Social Image
- **Endpoint:** Render 1200x630 Social Preview PNG Card
- **HTTP Method:** `GET`
- **Path:** `/api/og/:slug`
- **Authentication:** None (Public)
- **Response Format:** `image/png`
- **Edge Cache:** `Cache-Control: public, s-maxage=86400, stale-while-revalidate=43200`

#### Success Response (`200 OK`)
- **Headers:** `Content-Type: image/png`
- **Body:** Binary PNG buffer.

---

## 13. Module 12: Founder Analytics Dashboard (`/api/v1/analytics`)

### 13.1 Get 30-Day Product Analytics
- **Endpoint:** Retrieve Aggregated Funnel & Trajectory
- **HTTP Method:** `GET`
- **Path:** `/api/v1/analytics/products/:id`
- **Authentication:** Required (`FOUNDER` verified owner of product)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "productId": "66ea00001111222233334420",
    "summary": {
      "totalImpressions": 48200,
      "totalOrganicClicks": 3840,
      "organicCtr": 0.0796,
      "totalValidVotes": 428
    },
    "dailyMetrics": [
      {
        "date": "2026-09-18",
        "impressions": 18200,
        "organicClicks": 1284,
        "votes": 428
      }
    ]
  }
}
```

---

### 13.2 Export Referral Click Telemetry
- **Endpoint:** Export Referral Event Logs
- **HTTP Method:** `GET`
- **Path:** `/api/v1/analytics/products/:id/export`
- **Authentication:** Required (`FOUNDER` verified owner of product)

#### Query Parameters
- `format` (String, Optional, Default: `json`): `json` or `csv`.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://assets.launchproduct.io/exports/analytics-supasite-2026-09-19.csv",
    "expiresAt": "2026-09-19T18:00:00.000Z"
  }
}
```

---

## 14. Module 13: Moderation Desk & Triage Console (`/api/v1/moderation`)

### 14.1 Get Pending Product Submissions
- **Endpoint:** Retrieve Product Triage Queue
- **HTTP Method:** `GET`
- **Path:** `/api/v1/moderation/queue/products`
- **Authentication:** Required (`MODERATOR`, `ADMIN`)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "queue": [
      {
        "productId": "66ea00001111222233334499",
        "name": "Acme AI",
        "canonicalDomain": "getacme.com",
        "submittedById": "66ea00001111222233334401",
        "status": "PENDING_REVIEW",
        "submittedAt": "2026-09-19T14:40:00.000Z"
      }
    ]
  }
}
```

---

### 14.2 Get Quarantined Votes Queue
- **Endpoint:** Retrieve Flagged Anti-Fraud Votes
- **HTTP Method:** `GET`
- **Path:** `/api/v1/moderation/queue/votes`
- **Authentication:** Required (`MODERATOR`, `ADMIN`)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "flaggedVotes": [
      {
        "voteId": "66ea00001111222233334439",
        "productId": "66ea00001111222233334420",
        "voterUserId": "66ea00001111222233334499",
        "status": "QUARANTINED",
        "riskAssessment": {
          "riskScore": 85,
          "riskSignals": ["DATACENTER_ASN", "SUBNET_BURST", "NEW_ACCOUNT"],
          "asnNumber": 16509
        },
        "createdAt": "2026-09-19T14:50:00.000Z"
      }
    ]
  }
}
```

---

### 14.3 Get Disputed Ownership Claims
- **Endpoint:** Retrieve Conflicting Domain Claims
- **HTTP Method:** `GET`
- **Path:** `/api/v1/moderation/queue/claims`
- **Authentication:** Required (`MODERATOR`, `ADMIN`)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "disputedClaims": [
      {
        "claimId": "66ea00001111222233334481",
        "productId": "66ea00001111222233334420",
        "claimantUserId": "66ea00001111222233334477",
        "status": "DISPUTED",
        "createdAt": "2026-09-19T13:00:00.000Z"
      }
    ]
  }
}
```

---

### 14.4 Submit Moderation Action
- **Endpoint:** Execute Triage Verdict & Record Audit
- **HTTP Method:** `POST`
- **Path:** `/api/v1/moderation/action`
- **Authentication:** Required (`MODERATOR`, `ADMIN`)
- **Behavior:** Mutates target document status and writes an immutable audit record to `moderation_actions` (`DS13`).

#### Request Body
```json
{
  "targetEntity": "product",
  "targetEntityId": "66ea00001111222233334499",
  "actionType": "APPROVE_PRODUCT",
  "reason": "Verified corporate domain registration and working landing page.",
  "meta": {
    "assignedLaunchDate": "2026-09-22T00:00:00.000Z"
  }
}
```

#### Allowed `actionType` Values
- `APPROVE_PRODUCT`, `REJECT_PRODUCT`, `OVERTURN_VOTE`, `RESOLVE_CLAIM`, `BAN_USER`, `UPDATE_SETTINGS`.

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "actionId": "66ea000011112222333344C0",
    "actionType": "APPROVE_PRODUCT",
    "targetEntityId": "66ea00001111222233334499",
    "executedAt": "2026-09-19T15:10:00.000Z"
  }
}
```

---

## 15. Module 14: System Administration & Settings (`/api/v1/admin`)

### 15.1 Get Dynamic System Settings
- **Endpoint:** Retrieve Global Algorithmic Weights & Rate Limits
- **HTTP Method:** `GET`
- **Path:** `/api/v1/admin/settings`
- **Authentication:** Required (`ADMIN`)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "settings": [
      {
        "key": "RANKING_WEIGHTS",
        "value": {
          "wv": 1.0,
          "wc": 0.4,
          "lambda": 0.05,
          "algorithmVersion": "v1.0.0-algo"
        },
        "version": 1,
        "description": "Production weights for logarithmic daily score calculation.",
        "updatedById": "66ea00001111222233334401"
      }
    ]
  }
}
```

---

### 15.2 Update Dynamic System Setting
- **Endpoint:** Mutate System Configuration Parameter
- **HTTP Method:** `PUT`
- **Path:** `/api/v1/admin/settings/:key`
- **Authentication:** Required (`ADMIN`)

#### Request Body
```json
{
  "value": {
    "wv": 1.1,
    "wc": 0.45,
    "lambda": 0.04,
    "algorithmVersion": "v1.1.0-algo"
  },
  "description": "Tuned gravity decay for weekend launches."
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "key": "RANKING_WEIGHTS",
    "newVersion": 2,
    "updatedAt": "2026-09-19T15:15:00.000Z"
  }
}
```

---

### 15.3 Administratively Ban User Account
- **Endpoint:** Suspend Abusive User
- **HTTP Method:** `POST`
- **Path:** `/api/v1/admin/users/:id/ban`
- **Authentication:** Required (`ADMIN`)

#### Request Body
```json
{
  "banReason": "Repeated sybil voting attacks identified from datacenter IPs."
}
```

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "userId": "66ea00001111222233334499",
    "isBanned": true,
    "bannedAt": "2026-09-19T15:16:00.000Z"
  }
}
```

---

### 15.4 Query Platform Audit Logs
- **Endpoint:** Query Immutable Activity & Moderation Ledgers
- **HTTP Method:** `GET`
- **Path:** `/api/v1/admin/audit-logs`
- **Authentication:** Required (`ADMIN`)

#### Query Parameters
- `eventType` (String, Optional)
- `moderatorId` (String, Optional)
- `page` (Integer, Default: 1)
- `limit` (Integer, Default: 20)

#### Success Response (`200 OK`)
```json
{
  "success": true,
  "data": {
    "logs": [
      {
        "id": "66ea000011112222333344C0",
        "actionType": "APPROVE_PRODUCT",
        "moderatorId": "66ea00001111222233334401",
        "targetEntityId": "66ea00001111222233334420",
        "reason": "Verified legitimate startup product.",
        "createdAt": "2026-09-12T09:00:00.000Z"
      }
    ]
  }
}
```

---

## 16. Module 15: Health & Observability (`/api/health`, `/api/metrics`)

### 16.1 System Liveness & Readiness Probe
- **Endpoint:** Backend Health & Dependency Check
- **HTTP Method:** `GET`
- **Path:** `/api/health`
- **Authentication:** None (Public / Infrastructure Probe)

#### Success Response (`200 OK`)
```json
{
  "status": "healthy",
  "uptimeSeconds": 86420,
  "timestamp": "2026-09-19T15:20:00.000Z",
  "dependencies": {
    "mongodb": {
      "status": "connected",
      "latencyMs": 2
    },
    "redis": {
      "status": "connected",
      "latencyMs": 1
    },
    "bullmq": {
      "status": "active",
      "activeWorkers": 4
    }
  }
}
```

#### Degraded Response (`503 Service Unavailable`)
```json
{
  "status": "unhealthy",
  "dependencies": {
    "mongodb": { "status": "disconnected" },
    "redis": { "status": "connected" }
  }
}
```

---

### 16.2 Prometheus Metrics Scrape Endpoint
- **Endpoint:** Application & Business Telemetry Export
- **HTTP Method:** `GET`
- **Path:** `/api/metrics`
- **Authentication:** Protected (Internal Scrape IP Whitelist / Basic Auth)
- **Response Format:** `text/plain; version=0.0.4`

#### Sample Response Payload
```text
# HELP launchproduct_http_requests_total Total number of HTTP requests processed.
# TYPE launchproduct_http_requests_total counter
launchproduct_http_requests_total{method="POST",route="/api/v1/votes",status="200"} 429
launchproduct_http_requests_total{method="GET",route="/api/v1/products",status="200"} 3840

# HELP launchproduct_active_votes_total Current unquarantined valid votes today.
# TYPE launchproduct_active_votes_total gauge
launchproduct_active_votes_total 429

# HELP launchproduct_scraper_queue_waiting Jobs waiting in the sandboxed scraper queue.
# TYPE launchproduct_scraper_queue_waiting gauge
launchproduct_scraper_queue_waiting 0
```

---

*Document compiled and approved by Senior Backend Engineer and API Designer.*  
*Aligned with LaunchProduct PRD v1.2.0, System Architecture v1.3.0, database-schema.md, and database.md.*  
*Engineering Ready for Sprint 1 Controller & Route Implementation.*
