# LaunchProduct — Complete Build Prompts (`prompt.md`)

**Project:** LaunchProduct — Product Discovery & Growth Platform  
**Architecture:** Layered Monolith | Backend-First Build Order  
**Stack:** Node.js 20 LTS + TypeScript | Express.js 4/5 | MongoDB Atlas 7+ (Mongoose 8+) | Redis 7 + BullMQ | Next.js 14+  
**Primary Brand:** LaunchProduct  
**Primary Font:** Poppins (Google Fonts)  
**Reference Files:** `PRD.md`, `System Architecture.md`, `database.md`, `database-schema.md`, `API Specification.md`, `UI-UX.md`, `agent.md`  
**Build Order:** Project Setup → Database → Middleware → Auth → Products → Ownership → Voting & Anti-Fraud → Reviews → Clicks → Campaigns & Payments → Leaderboards → Analytics → Badges → Moderation → Admin → Workers → Tests → Seed → Deployment  

---

## Mandatory Instructions for Future Coding Agents

Before writing any code or modifying any component in this repository, all engineering agents must strictly observe these 12 directives:

1. **Read All Project Documentation First:** Thoroughly read and cross-reference `PRD.md`, `System Architecture.md`, `database.md`, `database-schema.md`, `API Specification.md`, `UI-UX.md`, and `agent.md`.
2. **Treat LaunchProduct as the Final Brand:** Never use "LaunchRank" as an active brand or product name anywhere in code, UI, routes, comments, or documentation.
3. **Treat `UI-UX.md` as the Visual/UX Source of Truth:** All layouts, spacing, colors, states, badges, modals, and responsive behaviors must strictly follow `UI-UX.md`.
4. **Use Poppins Typography:** Poppins is the official primary typeface for the product UI. Use the standard modern fallback stack (`Poppins, Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`).
5. **Use Supplied LaunchProduct Logo Assets:** The official assets in `/public/brand/` (`primary-horizontal.png`, `logo-light.png`, `logo-dark.png`, `wordmark.png`, `icon.png`, `app-icon.png`, `favicon.png`) are the source of truth. Do not invent, alter, or recolor logos.
6. **Follow the Finalized Layered Monolith Architecture:** Maintain the clean separation: Next.js Frontend (`:3000`) $\longleftrightarrow$ Express.js REST API (`:4000`) $\to$ Controllers $\to$ Services $\to$ Repositories $\to$ MongoDB Atlas.
7. **Maintain Authoritative Tech Stack:** Next.js + Express.js + MongoDB Atlas + Redis 7 + BullMQ + Isolated Scraper Container. Do NOT substitute Supabase, PostgreSQL, or Next.js API routes as the primary backend.
8. **Preserve Security and Anti-Fraud Requirements:** Multi-signal risk engine (`VALID`, `FLAGGED_FOR_REVIEW`, `QUARANTINED`, `REJECTED_BOT`), hardened SSRF defense (DNS re-resolution, TOCTOU protection, redirect hop checks, isolated scraper process), and hashed magic link tokens.
9. **Preserve Organic vs. Sponsored Separation:** Never merge or confuse sponsored placements with organic rankings. Paid placements must always feature transparent Amber badges and disclaimers.
10. **Avoid Inventing New Architecture or Business Requirements:** Strictly follow the finalized specifications. Do not add local payment gateways (bKash/Nagad) or unnecessary microservices.
11. **Implement Phase-by-Phase:** Follow the sequential prompt roadmap below. Never skip phases or write speculative boilerplate out of order.
12. **Validate Existing Requirements Before Changing Them:** If an apparent ambiguity arises, consult `agent.md` and the supreme contracts (`database-schema.md`, `API Specification.md`, `UI-UX.md`) before taking action.

---

## How to Use This File

Each prompt below is a complete, self-contained instruction to give to an AI assistant (or your own engineering team). Prompts are ordered so that each step depends only on what was already built. Execute them in sequence. Do **not** skip prompts.

---

# PHASE 0 — PROJECT SCAFFOLDING & ENVIRONMENT SETUP

---

## PROMPT 0.1 — Monorepo Initialization & Directory Structure

```
You are a Senior Backend Engineer. Initialize the LaunchProduct monorepo project structure.

Project: LaunchProduct — A product discovery and growth platform.
Architecture: Layered Monolith.

Create the following directory structure exactly as specified:

launchproduct/
├── backend/                           # Express.js Layered Monolith (Port 4000)
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── middleware/
│   │   ├── services/
│   │   ├── repositories/
│   │   ├── models/
│   │   ├── workers/
│   │   ├── shared/
│   │   │   ├── db.ts
│   │   │   ├── redis.ts
│   │   │   ├── logger.ts
│   │   │   ├── errors.ts
│   │   │   └── constants.ts
│   │   └── server.ts
│   ├── package.json
│   └── tsconfig.json
├── frontend/                          # Next.js 14+ (Port 3000)
│   ├── src/
│   │   ├── app/
│   │   │   ├── (public)/
│   │   │   ├── (auth)/
│   │   │   ├── (dashboard)/
│   │   │   └── (admin)/
│   │   ├── components/
│   │   └── lib/
│   │       ├── api-client.ts
│   │       └── auth-client.ts
│   ├── package.json
│   └── next.config.js
├── scraper/                           # Network-isolated scraper container
│   ├── src/
│   │   ├── index.ts
│   │   ├── fetcher.ts
│   │   ├── parser.ts
│   │   └── llm.ts
│   ├── Dockerfile
│   └── package.json
├── docker-compose.yml
├── package.json                       # Monorepo root
└── tsconfig.json

Initialize a root package.json using npm workspaces. Install the following for each workspace:

backend: express, mongoose, redis, bullmq, zod, jsonwebtoken, cookie-parser, cors, helmet, morgan, pino, nodemailer, axios, node-fetch, crypto, express-rate-limit, ioredis, @types/express, @types/node, typescript, ts-node, ts-node-dev

frontend: next, react, react-dom, @types/react, @types/node, typescript

scraper: axios, cheerio, playwright, openai, @types/node, typescript

Create docker-compose.yml with services for:
- backend (Node.js, port 4000)
- frontend (Next.js, port 3000)
- scraper (isolated worker, no internal network access)
- mongodb (local dev container, port 27017)
- redis (port 6379)

Create a root .env.example file with these required variables:
NODE_ENV=development
PORT=4000
MONGODB_URI=mongodb://localhost:27017/launchproduct
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-jwt-secret-here
SESSION_COOKIE_SECRET=your-session-secret-here
EMAIL_FROM=noreply@launchproduct.io
RESEND_API_KEY=
OPENAI_API_KEY=
PADDLE_WEBHOOK_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
NEXT_PUBLIC_API_URL=http://localhost:4000
```

---

## PROMPT 0.2 — TypeScript Configuration & Shared Types

```
You are a Senior Backend Engineer. Set up the TypeScript configuration for the LaunchProduct backend.

Create backend/tsconfig.json:
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}

Create backend/src/shared/constants.ts containing:
1. All RBAC role enums: VISITOR, HUNTER, FOUNDER, MODERATOR, ADMIN
2. Product status enums: DRAFT, PENDING_REVIEW, SCHEDULED, LIVE, SUSPENDED, REJECTED, ARCHIVED, DELETED
3. Vote status enums: VALID, FLAGGED, QUARANTINED, REJECTED_BOT
4. Ownership verification status enums: UNVERIFIED, PENDING, VERIFIED, REVOKED, FAILED_EXPIRED
5. Campaign status enums: RESERVED, ACTIVE, EXPIRED, CANCELLED, PAUSED
6. Payment status enums: PENDING, SUCCEEDED, FAILED, REFUNDED, DISPUTED
7. Event source enums: ORGANIC, SPONSORED, INTERNAL, BOT, FRAUD, TEST
8. Anti-fraud risk thresholds: THRESHOLD_LOW = 30, THRESHOLD_HIGH = 70
9. Anti-fraud default signal weights as a typed object:
   SIG_ACCOUNT_NEW: 20
   SIG_IP_DATACENTER: 25
   SIG_SUBNET_CONCENTRATION: 35
   SIG_BURST_VELOCITY: 25
   SIG_ZERO_PRIOR_ACTIVITY: 15
   SIG_DEVICE_COLLISION: 40
   SIG_HISTORICAL_TRUST: -20
10. Ranking formula default weights:
   W_v: 1.0 (vote weight)
   W_c: 0.15 (click weight)
   W_r: 2.5 (review weight)
   GAMMA_LAUNCH: 1.2 (gravity exponent)
   LAMBDA_DECAY: 0.75 (daily decay factor)
11. MVP sponsorship tier prices in cents (USD): LAUNCH_BOOST: 1900, CATEGORY_FEATURED: 4900, HOMEPAGE_SPOTLIGHT: 14900, LAUNCH_PARTNER: 29900

Create backend/src/shared/errors.ts containing a typed AppError class hierarchy:
- AppError base class with statusCode, code, message, details[], isOperational
- Specific subclasses: ValidationError (400), AuthenticationError (401), AuthorizationError (403), NotFoundError (404), ConflictError (409), UnprocessableError (422), RateLimitError (429), InternalError (500)
```

---

## PROMPT 0.3 — Database & Redis Connection Managers

```
You are a Senior Backend Engineer. Create the MongoDB Atlas and Redis connection managers for the LaunchProduct backend.

File: backend/src/shared/db.ts
Requirements:
1. Use Mongoose 8+ to connect to MongoDB Atlas.
2. Read the MONGODB_URI from process.env.
3. Set mongoose.set('strictQuery', true).
4. Configure connection options: serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000, maxPoolSize: 10, minPoolSize: 2.
5. Listen to Mongoose connection events (connected, error, disconnected) and log them using the Pino logger from logger.ts.
6. Export a connectDB() async function.
7. Handle graceful shutdown on SIGINT/SIGTERM: close Mongoose connection and exit.

File: backend/src/shared/redis.ts
Requirements:
1. Use ioredis to connect to Redis.
2. Read the REDIS_URL from process.env.
3. Create a singleton redis client instance.
4. Handle connection errors and reconnection strategy with exponential backoff.
5. Export the redis client as default.
6. Export a separate bullMQRedisConnection configuration object for BullMQ (separate connection, required because BullMQ needs a dedicated connection).

File: backend/src/shared/logger.ts
Requirements:
1. Use pino for structured JSON logging.
2. In development, use pino-pretty for human-readable output.
3. In production, output raw JSON.
4. Export a default logger instance.
5. Export a requestLogger middleware using pino-http for Express.
```

---

## PROMPT 0.4 — Express Server Bootstrap & Middleware Pipeline

```
You are a Senior Backend Engineer. Create the Express.js server bootstrap and global middleware pipeline for LaunchProduct.

File: backend/src/server.ts
Requirements:
1. Create an Express app instance.
2. Apply global middleware in this exact order:
   a. helmet() — Security headers
   b. cors() — Allow frontend origin (NEXT_PUBLIC_API_URL) with credentials: true
   c. express.json({ limit: '2mb' }) — JSON body parser
   d. express.urlencoded({ extended: true }) — URL-encoded body parser
   e. cookieParser(SESSION_COOKIE_SECRET) — Cookie parser
   f. requestLogger — Pino HTTP request logging
   g. mongo-sanitize — Prevent NoSQL injection
3. Mount health check routes at /api/health (return { status: 'ok', timestamp })
4. Mount all API routes at /api/v1 (import from routes/index.ts)
5. Apply the global error handler middleware last (import from middleware/error.middleware.ts)
6. Export a startServer() async function that:
   a. Calls connectDB()
   b. Connects Redis
   c. Starts the Express HTTP server on process.env.PORT (default 4000)
   d. Logs "LaunchProduct API server running on port 4000"
7. Call startServer() at the bottom of server.ts.

File: backend/src/routes/index.ts
Requirements:
- Import and mount all sub-routers:
  router.use('/auth', authRoutes)
  router.use('/products', productRoutes)
  router.use('/votes', voteRoutes)
  router.use('/claims', claimRoutes)
  router.use('/reviews', reviewRoutes)
  router.use('/clicks', clickRoutes)
  router.use('/campaigns', campaignRoutes)
  router.use('/webhooks', webhookRoutes)
  router.use('/leaderboards', leaderboardRoutes)
  router.use('/categories', categoryRoutes)
  router.use('/analytics', analyticsRoutes)
  router.use('/moderation', moderationRoutes)
  router.use('/admin', adminRoutes)
- Export the aggregated router.
```

---

# PHASE 1 — DATABASE LAYER (MONGOOSE MODELS)

---

## PROMPT 1.1 — User & Verification Token Models

```
You are a Senior Database Engineer using Mongoose 8+ and TypeScript. Create the User and VerificationToken Mongoose models for LaunchProduct.

File: backend/src/models/User.model.ts

TypeScript interface IUser must include all fields from the users (DS1) collection in database-schema.md:
- _id: Types.ObjectId
- email: string (unique, lowercase, trimmed, valid email)
- role: 'VISITOR' | 'HUNTER' | 'FOUNDER' | 'MODERATOR' | 'ADMIN' (default: 'HUNTER')
- oauthProviders: Array<{ provider: 'google' | 'github', providerUserId: string, linkedAt: Date }>
- founderProfile: { displayName?, bio?, avatarUrl?, twitterHandle?, githubHandle?, linkedinUrl?, websiteUrl? }
- isBanned: boolean (default: false)
- banReason?: string
- lastLoginAt?: Date
- createdAt: Date
- updatedAt: Date

Schema requirements:
1. Use { timestamps: true } for createdAt and updatedAt.
2. Index: { email: 1 } unique
3. Index: { role: 1 }
4. Index: { 'oauthProviders.provider': 1, 'oauthProviders.providerUserId': 1 } unique sparse
5. Add a toJSON transform that removes __v.

File: backend/src/models/VerificationToken.model.ts

TypeScript interface IVerificationToken:
- _id: Types.ObjectId
- userId: Types.ObjectId (ref: 'User')
- tokenHash: string (SHA-256 hash of the raw token)
- type: 'MAGIC_LINK' | 'EMAIL_VERIFY'
- expiresAt: Date
- isUsed: boolean (default: false)
- createdAt: Date

Schema requirements:
1. TTL index: { expiresAt: 1 } with expireAfterSeconds: 0 (MongoDB handles expiry based on expiresAt value)
2. Index: { tokenHash: 1 } unique
3. Index: { userId: 1, type: 1 }
```

---

## PROMPT 1.2 — Category & Product Models

```
You are a Senior Database Engineer using Mongoose 8+ and TypeScript. Create the Category and Product Mongoose models for LaunchProduct.

File: backend/src/models/Category.model.ts

TypeScript interface ICategory:
- _id: Types.ObjectId
- slug: string (unique, lowercase)
- name: string (2-80 chars)
- description?: string
- parentId?: Types.ObjectId (ref: 'Category', null for top-level)
- iconUrl?: string
- sortOrder: number (default: 0)
- productCount: number (default: 0)
- isActive: boolean (default: true)
- createdAt: Date
- updatedAt: Date

Schema requirements:
1. Use { timestamps: true }
2. Index: { slug: 1 } unique
3. Index: { parentId: 1, isActive: 1 }
4. Index: { sortOrder: 1 }

Seed the 8 MVP categories as a constant array exported from this file:
AI Tools (/ai-tools), AI Agents (/ai-agents), SaaS (/saas), Developer Tools (/developer-tools), Productivity (/productivity), Marketing Tools (/marketing-tools), SEO Tools (/seo-tools), Design Tools (/design-tools)

File: backend/src/models/Product.model.ts

TypeScript interface IProduct including all DS2 fields from database-schema.md:
- _id, slug (unique), canonicalDomain (unique), name, tagline, description
- websiteUrl, founderId? (ref: User), submittedById (ref: User), categoryId (ref: Category)
- pricing: { model: 'free'|'freemium'|'paid'|'open_source', startingPrice?, currency? }
- media: { logoUrl?, bannerUrl?, screenshotUrls: string[] }
- status: ProductStatus enum (default: 'DRAFT')
- launchDate?: Date
- rejectionReason?: string
- initialVersion: number (default: 1)
- createdAt, updatedAt

Schema requirements:
1. Use { timestamps: true }
2. Compound index: { categoryId: 1, status: 1, launchDate: -1 } — for category page queries
3. Compound index: { status: 1, launchDate: 1 } — for leaderboard queries
4. Compound index: { founderId: 1, status: 1 } — for founder dashboard
5. Compound index: { submittedById: 1, createdAt: -1 }
6. Unique index: { slug: 1 }
7. Unique index: { canonicalDomain: 1 }
8. Text index: { name: 'text', tagline: 'text', description: 'text' } with weights { name: 10, tagline: 5, description: 1 }
```

---

## PROMPT 1.3 — Vote, Review & Product Revision Models

```
You are a Senior Database Engineer using Mongoose 8+ and TypeScript. Create Vote, Review, and ProductRevision Mongoose models for LaunchProduct.

File: backend/src/models/Vote.model.ts

TypeScript interface IVote (DS4):
- _id: Types.ObjectId
- productId: Types.ObjectId (ref: 'Product')
- userId: Types.ObjectId (ref: 'User')
- status: 'VALID' | 'FLAGGED' | 'QUARANTINED' | 'REJECTED_BOT' (default: 'VALID')
- riskScore: number (0-100, default: 0)
- riskAssessment: { triggeredSignals: string[], notes?: string }
- ipHash: string (HMAC-SHA256 of IP + daily salt, never raw IP)
- subnetHash: string (/24 subnet hash for concentration counting)
- deviceFingerprint?: string
- retractedAt?: Date
- createdAt: Date

Schema requirements:
1. Compound UNIQUE index: { productId: 1, userId: 1 } — one vote per user per product
2. Compound index: { productId: 1, status: 1, createdAt: -1 } — for leaderboard score aggregation
3. Compound index: { subnetHash: 1, productId: 1, createdAt: -1 } — for subnet concentration anti-fraud
4. Index: { status: 1, createdAt: -1 } — for moderation queue
5. Index: { userId: 1 } — for user vote history

File: backend/src/models/Review.model.ts

TypeScript interface IReview (DS5 — Phase 2):
- _id, productId (ref: Product), userId (ref: User)
- rating: number (1-5, integer)
- title: string (5-100 chars)
- body: string (50-2000 chars)
- status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'FLAGGED' (default: 'PENDING')
- conflictOfInterestDisclosed: boolean
- founderReply?: { body: string, repliedAt: Date }
- moderationReason?: string
- createdAt, updatedAt

Schema requirements:
1. Compound UNIQUE index: { productId: 1, userId: 1 } — one review per user per product
2. Compound index: { productId: 1, status: 1, createdAt: -1 }

File: backend/src/models/ProductRevision.model.ts

TypeScript interface IProductRevision (DS10):
- _id, productId (ref: Product)
- editorId: Types.ObjectId (ref: User) — the user who made the change
- versionNumber: number (increments per product)
- snapshot: { name, tagline, description, websiteUrl, categoryId, pricing }
- changeReason?: string
- createdAt: Date

Schema requirements:
1. Compound UNIQUE index: { productId: 1, versionNumber: 1 }
2. Index: { productId: 1, createdAt: -1 }
```

---

## PROMPT 1.4 — Campaign, Payment, Webhook Event & Ownership Verification Models

```
You are a Senior Database Engineer using Mongoose 8+ and TypeScript. Create Campaign, Payment, PaymentWebhookEvent, and OwnershipVerification Mongoose models for LaunchProduct.

File: backend/src/models/Campaign.model.ts (DS6)
Fields:
- _id, productId (ref: Product), founderId (ref: User)
- tier: 'LAUNCH_BOOST' | 'CATEGORY_FEATURED' | 'HOMEPAGE_SPOTLIGHT' | 'LAUNCH_PARTNER'
- status: 'RESERVED' | 'PENDING_PAYMENT' | 'ACTIVE' | 'EXPIRED' | 'CANCELLED' | 'PAUSED'
- slotKey: string (e.g., 'homepage:1', 'category:ai-tools:banner')
- startsAt: Date, endsAt: Date
- amountCents: number (price paid in USD cents)
- providerCheckoutUrl?: string
- providerSessionId?: string
- metadata: { targetCategorySlug?: string, displayLabel?: string }
- createdAt, updatedAt

Indexes:
1. { productId: 1, status: 1 }
2. { slotKey: 1, status: 1, startsAt: 1, endsAt: 1 } — slot availability checking
3. { founderId: 1, createdAt: -1 }
4. { status: 1, endsAt: 1 } — for expiry worker

File: backend/src/models/Payment.model.ts (DS7)
Fields:
- _id, campaignId (ref: Campaign), founderId (ref: User)
- provider: 'paddle' | 'lemonsqueezy'
- providerCustomerId?, providerPaymentId (unique sparse), providerOrderId?, providerEventId (unique sparse)
- amountCents: number, currency: string (default: 'USD')
- status: 'PENDING' | 'SUCCEEDED' | 'FAILED' | 'REFUNDED' | 'DISPUTED'
- createdAt, updatedAt

Indexes:
1. { providerPaymentId: 1 } unique sparse
2. { providerEventId: 1 } unique sparse
3. { campaignId: 1 }
4. { founderId: 1, createdAt: -1 }

File: backend/src/models/PaymentWebhookEvent.model.ts (DS8)
Fields:
- _id, provider: string, providerEventId (unique), eventType: string
- rawPayload: object (the full parsed webhook body for audit)
- processingStatus: 'RECEIVED' | 'PROCESSED' | 'FAILED' | 'DUPLICATE'
- processedAt?: Date
- createdAt: Date

Indexes:
1. { providerEventId: 1 } unique
2. { processingStatus: 1, createdAt: -1 }

File: backend/src/models/OwnershipVerification.model.ts (DS9)
Fields:
- _id, productId (ref: Product), userId (ref: User)
- method: 'EMAIL_DOMAIN' | 'DNS_TXT' | 'HTML_META'
- status: 'PENDING' | 'VERIFIED' | 'REVOKED' | 'FAILED_EXPIRED'
- tokenHash: string (SHA-256 of the raw 32-byte verification token)
- expiresAt: Date (72 hours from creation)
- verifiedAt?: Date, revokedAt?: Date
- adminNote?: string
- createdAt, updatedAt

Indexes:
1. Partial UNIQUE: { productId: 1 } where status == 'VERIFIED' — only one verified claim per product
2. { userId: 1, status: 1 }
3. { tokenHash: 1 } unique sparse
4. TTL: { expiresAt: 1 } expireAfterSeconds: 0
```

---

## PROMPT 1.5 — Leaderboard Snapshot, Activity Events, Moderation Actions & System Settings Models

```
You are a Senior Database Engineer using Mongoose 8+ and TypeScript. Create the remaining Mongoose models for LaunchProduct.

File: backend/src/models/DailyLeaderboardSnapshot.model.ts (DS11)
Fields:
- _id, snapshotDate: Date (UTC midnight), leaderboardType: 'LAUNCH_DAY' | 'TRENDING' | 'ALL_TIME'
- productId (ref: Product), rank: number, score: number
- algorithmVersion: string (e.g., '1.0.0')
- voteCount: number, reviewCount: number (default: 0), qualifiedClickCount: number
- generatedAt: Date

Indexes:
1. Compound UNIQUE: { snapshotDate: 1, leaderboardType: 1, rank: 1 }
2. { snapshotDate: 1, leaderboardType: 1, score: -1 }
3. { productId: 1, leaderboardType: 1, snapshotDate: -1 }

File: backend/src/models/ActivityEvent.model.ts (DS12)
Fields:
- _id, userId?: Types.ObjectId, productId?: Types.ObjectId
- eventType: string (VOTE_CAST, VOTE_QUARANTINED, OUTBOUND_CLICK, CAMPAIGN_STARTED, PRODUCT_SUBMITTED, AUTH_MAGIC_LINK_REQUESTED, OWNERSHIP_CLAIM_INITIATED, etc.)
- eventSource: 'ORGANIC' | 'SPONSORED' | 'INTERNAL' | 'BOT' | 'FRAUD' | 'TEST'
- sessionHash?: string (HMAC-SHA256(IP + UserAgent, DailySalt))
- metadata: object (flexible key-value pairs)
- createdAt: Date

Indexes:
1. { productId: 1, eventSource: 1, eventType: 1, createdAt: -1 } — for analytics aggregation
2. { userId: 1, eventType: 1, createdAt: -1 }
3. TTL: { createdAt: 1 } expireAfterSeconds: 7776000 (90 days)

File: backend/src/models/ModerationAction.model.ts (DS13)
Fields:
- _id, moderatorId (ref: User), targetType: 'PRODUCT' | 'VOTE' | 'REVIEW' | 'USER' | 'CLAIM'
- targetId: Types.ObjectId, action: string (APPROVE, REJECT, QUARANTINE, BAN_USER, OVERTURN_VOTE, etc.)
- reason?: string (max 1000 chars)
- previousState: object (snapshot before action), newState: object (snapshot after action)
- createdAt: Date

Indexes:
1. { targetType: 1, targetId: 1, createdAt: -1 }
2. { moderatorId: 1, createdAt: -1 }
3. { createdAt: -1 } — recent actions feed

File: backend/src/models/SystemSettings.model.ts (DS15)
Fields:
- _id, key: string (unique — e.g., 'antiFraudWeights', 'rankingWeights')
- value: object (flexible JSON value)
- description?: string
- updatedById?: Types.ObjectId (ref: User)
- updatedAt: Date

Index: { key: 1 } unique
```

---

# PHASE 2 — MIDDLEWARE LAYER

---

## PROMPT 2.1 — Authentication & RBAC Middleware

```
You are a Senior Backend Engineer. Create the authentication and RBAC guard middleware for LaunchProduct Express.js backend.

File: backend/src/middleware/auth.middleware.ts

Requirements:
1. Create a requireAuth middleware:
   - Read the sessionToken cookie (HttpOnly, signed).
   - Verify the JWT using JWT_SECRET from process.env.
   - If invalid or missing, throw AuthenticationError (401, code: 'UNAUTHORIZED').
   - Attach the decoded user payload ({ userId, email, role }) to req.user.
   - Fetch the full user from MongoDB (using UserRepository) to check isBanned.
   - If isBanned is true, throw AuthorizationError (403, code: 'ACCOUNT_BANNED').

2. Create a requireRole(...allowedRoles: string[]) middleware factory:
   - Must be chained AFTER requireAuth.
   - Check req.user.role is in the allowedRoles array.
   - If not, throw AuthorizationError (403, code: 'FORBIDDEN').
   - Usage: router.post('/admin/action', requireAuth, requireRole('ADMIN'), controller)

3. Create an optionalAuth middleware:
   - Same as requireAuth but does not throw on missing token — simply sets req.user = null.
   - Used on public endpoints that want to know if the user is logged in (e.g., product detail page).

All middleware must call next(error) for errors — do not send responses directly.
```

---

## PROMPT 2.2 — Validation, Rate Limiting & Error Middleware

```
You are a Senior Backend Engineer. Create the validation, rate limiting, and centralized error handling middleware for LaunchProduct.

File: backend/src/middleware/validate.middleware.ts
Requirements:
1. Create a validate(schema: ZodSchema, target: 'body' | 'query' | 'params' = 'body') middleware factory.
2. Parse req[target] through the Zod schema.
3. On ZodError, normalize each issue into { field, code, message } and throw ValidationError (400).
4. On success, replace req[target] with the parsed, type-safe output.

File: backend/src/middleware/rate-limit.middleware.ts
Requirements:
Create the following Redis-backed sliding window rate limiters using ioredis + a Lua script:
1. publicRateLimit: 60 req/min per IP
2. authRateLimit: 120 req/min per userId (falls back to IP if not authenticated)
3. voteRateLimit: 10 req/min per userId + /24 IP subnet
4. magicLinkRateLimit: 5 req/hour per /24 IP subnet + email domain
5. submissionRateLimit: 10 req/hour per userId

Each limiter must set X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset response headers.
On limit exceeded, call next(new RateLimitError(429, 'RATE_LIMIT_EXCEEDED')).

File: backend/src/middleware/error.middleware.ts
Requirements:
Implement the centralized 4-argument Express error handler exactly as specified in API Specification.md section 1.4.6:
1. Handle AppError instances → return appropriate HTTP status with structured JSON.
2. Handle ZodError → 400 VALIDATION_FAILED with field-level details array.
3. Handle MongoDB E11000 duplicate key → 409 DUPLICATE_RESOURCE.
4. Handle Mongoose CastError → 400 INVALID_IDENTIFIER.
5. Handle all other errors → 500 INTERNAL_SERVER_ERROR; log full stack trace with Pino; sanitize for client in production.
6. Always include meta.requestId and meta.timestamp in every error response.
```

---

# PHASE 3 — AUTHENTICATION MODULE

---

## PROMPT 3.1 — Auth Repository & Service

```
You are a Senior Backend Engineer. Implement the Authentication repository and service layer for LaunchProduct.

File: backend/src/repositories/user.repository.ts
Implement these methods using Mongoose models:
- findById(id: string): Promise<IUser | null>
- findByEmail(email: string): Promise<IUser | null>
- findOrCreateByOAuth(provider: string, providerUserId: string, email: string): Promise<IUser>
- create(data: Partial<IUser>): Promise<IUser>
- updateById(id: string, data: Partial<IUser>): Promise<IUser | null>
- findByOAuthProvider(provider: string, providerUserId: string): Promise<IUser | null>

File: backend/src/repositories/token.repository.ts
Methods:
- createToken(userId: string, type: string, expiresAt: Date, tokenHash: string): Promise<IVerificationToken>
- findByHash(tokenHash: string, type: string): Promise<IVerificationToken | null>
- markUsed(tokenId: string): Promise<void>
- deleteByUserId(userId: string, type: string): Promise<void>

File: backend/src/services/auth.service.ts
Implement the following business logic methods exactly as documented in System Architecture.md Flow A and API Specification.md Module 1:

1. requestMagicLink(email: string, ipAddress: string): Promise<void>
   - Normalize and validate email (lowercase, trimmed).
   - Check disposable email blacklist (maintain a hardcoded list of common disposable domains).
   - Find or create user in DB.
   - Generate a 32-byte cryptographically secure random token using crypto.randomBytes(32).toString('hex').
   - Hash the token: tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex').
   - Delete any existing MAGIC_LINK tokens for this user.
   - Store { userId, tokenHash, type: 'MAGIC_LINK', expiresAt: now + 15 minutes }.
   - Enqueue email job to BullMQ with the raw magic link URL: https://launchproduct.io/auth/verify?token={rawToken}.
   - Log activity_event: AUTH_MAGIC_LINK_REQUESTED.

2. verifyMagicLink(rawToken: string): Promise<{ user: IUser, sessionToken: string }>
   - Compute tokenHash from rawToken.
   - Find token by hash in DB; check isUsed === false and expiresAt > now.
   - If not found or expired: throw AuthenticationError (401, 'TOKEN_EXPIRED').
   - Use crypto.timingSafeEqual() to prevent timing attacks.
   - Mark token as used.
   - Fetch user; update lastLoginAt.
   - Sign a JWT: { userId, email, role } with expiresIn: '30d'.
   - Return { user, sessionToken }.

3. getSessionUser(userId: string): Promise<IUser>
   - Return user by ID; throw NotFoundError if not found or banned.

4. oauthCallback(provider: string, providerUserId: string, email: string): Promise<{ user: IUser, sessionToken: string }>
   - Find or create user via findOrCreateByOAuth.
   - Link oauthProvider if not already linked.
   - Sign JWT and return.
```

---

## PROMPT 3.2 — Auth Controller & Routes

```
You are a Senior Backend Engineer. Implement the Auth HTTP controller and Express router for LaunchProduct.

File: backend/src/controllers/auth.controller.ts

Implement handlers for all endpoints in API Specification.md Module 1 (Authentication & Sessions):

1. POST /api/v1/auth/magic-link
   - Validate body: { email: string (required, valid email) }
   - Call authService.requestMagicLink(email, req.ip)
   - Always return 200 OK with generic message (security: don't reveal if email exists)
   - Response: { success: true, data: { message: "If eligible, a login link has been dispatched.", expiresInSeconds: 900 } }

2. GET /api/v1/auth/verify?token=<token>
   - Validate query.token is present.
   - Call authService.verifyMagicLink(token).
   - Set HttpOnly, Secure, SameSite=Lax, Max-Age=2592000 cookie: sessionToken=<jwt>.
   - Redirect to /dashboard on success or return 200 with user data for API clients.

3. GET /api/v1/auth/oauth/:provider (provider: 'google' | 'github')
   - Redirect to OAuth authorization URL.

4. GET /api/v1/auth/oauth/:provider/callback
   - Handle OAuth callback; exchange code for tokens; get user profile.
   - Call authService.oauthCallback(provider, providerUserId, email).
   - Set session cookie and redirect to /dashboard.

5. GET /api/v1/auth/me
   - Requires requireAuth middleware.
   - Call authService.getSessionUser(req.user.userId).
   - Return full user profile.

6. POST /api/v1/auth/logout
   - Clear the sessionToken cookie (same attributes, empty value, Max-Age=0).
   - Log activity_event: AUTH_LOGOUT.
   - Return 200 OK.

File: backend/src/routes/auth.routes.ts
Wire all routes with appropriate middleware (validate, magicLinkRateLimit, requireAuth).
Apply magicLinkRateLimit to the magic-link endpoint.
```

---

# PHASE 4 — PRODUCT SUBMISSION & SCRAPER PIPELINE

---

## PROMPT 4.1 — Product Repository

```
You are a Senior Backend Engineer. Implement the Product Repository for LaunchProduct.

File: backend/src/repositories/product.repository.ts

Implement these methods using Mongoose:
1. findById(id: string): Promise<IProduct | null>
2. findBySlug(slug: string): Promise<IProduct | null>
3. findByCanonicalDomain(domain: string): Promise<IProduct | null>
4. create(data: Partial<IProduct>): Promise<IProduct>
5. updateById(id: string, data: Partial<IProduct>): Promise<IProduct | null>
6. softDelete(id: string, requestedBy: string): Promise<void>
7. search(params: { query?, categoryId?, pricingType?, sortBy?, page?, limit? }): Promise<{ products: IProduct[], total: number }>
   - Use MongoDB text index for keyword search ($text query).
   - Apply $match filters for categoryId, pricingType, status: 'LIVE'.
   - Use $skip and $limit for pagination.
   - Default limit: 25.
8. findByFounderId(founderId: string, status?: string): Promise<IProduct[]>
9. findBySubmitterId(submitterId: string): Promise<IProduct[]>
10. updateStatus(id: string, status: string, reason?: string): Promise<IProduct | null>
11. findPendingReview(limit?: number): Promise<IProduct[]>
12. countByCategory(categoryId: string): Promise<number>

Also implement a generateSlug(name: string): string utility that:
- Lowercases, removes special chars, replaces spaces with hyphens.
- Ensures uniqueness by appending -2, -3, etc. if slug already exists in DB.
```

---

## PROMPT 4.2 — Scraper Worker (Network-Isolated Container)

```
You are a Senior Backend Engineer. Implement the network-isolated scraper worker for LaunchProduct.

File: scraper/src/fetcher.ts

Implement a secureProductFetch(url: string): Promise<string> function that:
1. Validates the URL scheme is https:// or http:// (reject file://, ftp://, data:, gopher://).
2. Resolves DNS using Node.js dns.promises.resolve4() to get the target IP address.
3. Checks the resolved IP against ALL of these SSRF block ranges:
   - 0.0.0.0/8, 10.0.0.0/8, 100.64.0.0/10, 127.0.0.0/8
   - 169.254.0.0/16 (cloud metadata — critical: 169.254.169.254)
   - 172.16.0.0/12, 192.168.0.0/16
   - ::1/128, fc00::/7, fe80::/10
   Use the 'ipaddr.js' library for CIDR matching.
4. If IP is in any blocked range: throw SsrfBlockedError and log the attempt.
5. Fetch the URL:
   - Set a timeout of 5000ms (use AbortController).
   - Set a maximum download of 2MB (abort if Content-Length > 2MB or byte counter exceeds 2MB during streaming).
   - Follow max 3 redirects; re-validate each redirect target URL against SSRF rules.
   - Send User-Agent: 'LaunchProductBot/1.0 (+https://launchproduct.io/bot)'.
   - Accept only: 'text/html, application/xhtml+xml'.
6. Return the HTML body as a string.
7. Respect robots.txt: fetch /robots.txt first; if Disallow: / or Disallow for LaunchProductBot, throw ScraperDisallowedError and fall back to manual input mode.

File: scraper/src/parser.ts
Implement extractMetadata(html: string, url: string): ScrapedMetadata that extracts:
- og:title, og:description, og:image, og:url
- <title> tag fallback
- <meta name="description"> fallback
- Main body text (first 2000 chars, strip HTML tags)
Return: { title, description, imageUrl, bodyText, canonicalDomain }

File: scraper/src/llm.ts
Implement enrichWithAI(scrapedData: ScrapedMetadata, targetUrl: string): Promise<AIEnrichedMetadata>:
- Call OpenAI GPT-4o with a structured JSON prompt.
- Prompt must extract: suggestedName (2-100 chars), tagline (10-120 chars), categorySlug (one of the 8 MVP slugs), pricingModel (free/freemium/paid/open_source), startingPrice (number or null), bulletPoints (3-5 key features as string array).
- Use JSON mode (response_format: { type: 'json_object' }).
- Return typed AIEnrichedMetadata object.

File: scraper/src/index.ts
BullMQ worker that consumes jobs from the 'scraper-jobs' queue:
1. Read job data: { url, userId, jobId }.
2. Call secureProductFetch(url).
3. Call extractMetadata(html, url).
4. Call enrichWithAI(scraped, url).
5. Write the DRAFT product document to MongoDB with status: 'DRAFT'.
6. Emit a job completion event to Redis for the frontend polling endpoint.
7. On any SSRF or scraper error: write a failed job result to Redis.
```

---

## PROMPT 4.3 — Product Service & Controller

```
You are a Senior Backend Engineer. Implement the Product Service and Controller for LaunchProduct.

File: backend/src/services/product.service.ts

Implement the following methods:

1. submitProductUrl(url: string, userId: string): Promise<{ jobId: string }>
   - Normalize URL (add https:// if missing, lowercase domain).
   - Extract canonicalDomain (apex domain, strip www, subdomains).
   - Check for duplicate: productRepository.findByCanonicalDomain(domain).
   - If duplicate found: throw ConflictError (409, 'DUPLICATE_RESOURCE').
   - Enqueue a job to BullMQ 'scraper-jobs' queue with { url, userId, jobId }.
   - Return { jobId }.

2. getScrapeJobStatus(jobId: string, userId: string): Promise<JobStatus>
   - Read job result from Redis (set by scraper worker on completion).
   - Return current status: PENDING, PROCESSING, COMPLETED, FAILED.
   - If COMPLETED, include the draft productId.

3. confirmDraftProduct(productId: string, userId: string, editedData: ProductDraftInput): Promise<IProduct>
   - Find product by ID; verify status is 'DRAFT' and submittedById matches userId.
   - Validate all required fields from editedData.
   - Generate slug from editedData.name.
   - Update product: { ...editedData, status: 'PENDING_REVIEW', slug }.
   - Create initial ProductRevision document (version 1).
   - Log activity_event: PRODUCT_SUBMITTED.
   - Return updated product.

4. getProductBySlug(slug: string): Promise<IProduct>
5. searchProducts(params): Promise<{ products, total, page, limit }>
6. updateProduct(productId: string, founderId: string, updates: Partial<IProduct>): Promise<IProduct>
   - Verify user is founderId of the product.
   - Save ProductRevision snapshot BEFORE applying changes.
   - Apply updates.
   - Log activity_event: PRODUCT_UPDATED.

7. getRevisionHistory(productId: string): Promise<IProductRevision[]>
8. softDeleteProduct(productId: string, userId: string): Promise<void>

File: backend/src/controllers/product.controller.ts
Implement all handlers matching API Specification.md Module 2 endpoints:
- POST /api/v1/products/scrape-preview — Submit URL for scraping
- GET /api/v1/products/scrape-status/:jobId — Poll scrape job status
- POST /api/v1/products — Manual fallback submission
- PUT /api/v1/products/:id/confirm — Confirm draft product
- GET /api/v1/products — Public search & directory browse
- GET /api/v1/products/:slug — Public product detail page
- PATCH /api/v1/products/:id — Founder update (requires requireAuth + requireRole('FOUNDER'))
- DELETE /api/v1/products/:id — Soft delete (requires requireAuth)
- GET /api/v1/products/:id/revisions — Revision audit history

File: backend/src/routes/product.routes.ts
Apply appropriate middleware: publicRateLimit on GET, authRateLimit + requireAuth on POST/PATCH/DELETE, submissionRateLimit on scrape-preview.
```

---

# PHASE 5 — OWNERSHIP VERIFICATION MODULE

---

## PROMPT 5.1 — Ownership Service & Controller

```
You are a Senior Backend Engineer. Implement the complete Ownership Verification module for LaunchProduct.

Business Rules (from PRD.md Section 7.2 FR-SUB-04):
- Three verification methods: EMAIL_DOMAIN, DNS_TXT, HTML_META.
- Tokens are 32-byte cryptographically secure hex strings, valid for 72 hours.
- Only ONE verified ownership per product (partial unique index).
- New claims on verified products create a dispute flow.

File: backend/src/services/ownership.service.ts

1. initiateOwnershipClaim(productId: string, userId: string, method: VerificationMethod): Promise<{ token: string, instructions: string }>
   - Check product exists and is in LIVE or SCHEDULED state.
   - Check if product already has a VERIFIED claim (by another user) → log dispute.
   - Check if EMAIL_DOMAIN: compare user's email apex domain with product's canonicalDomain.
     If match: auto-verify immediately without token → call verifyOwnershipClaim directly.
   - Generate 32-byte random token.
   - Hash token with SHA-256.
   - Create ownership_verifications document: { productId, userId, method, tokenHash, status: 'PENDING', expiresAt: now + 72h }.
   - Return { rawToken, instructions } — instructions are tailored to the method:
     DNS_TXT: "Add TXT record _launchproduct.{domain} with value: launchproduct-verify={token}"
     HTML_META: "Add <meta name='launchproduct-site-verification' content='{token}'> to your homepage <head>"
   - Log activity_event: OWNERSHIP_CLAIM_INITIATED.

2. verifyOwnershipClaim(claimId: string, userId: string): Promise<IOwnershipVerification>
   - Find the PENDING claim; verify userId matches.
   - Check expiresAt > now; if expired → update to FAILED_EXPIRED, throw.
   - Execute verification based on method:
     DNS_TXT: Query Google DoH API (https://dns.google/resolve?name=_launchproduct.{domain}&type=TXT). Check for 'launchproduct-verify={token}' in answer.
     HTML_META: Use scraper fetcher (without LLM) to fetch homepage; parse <meta name="launchproduct-site-verification">.
   - On success:
     - Update claim: { status: 'VERIFIED', verifiedAt: now }.
     - Update product: { founderId: userId }.
     - Update user role to 'FOUNDER' if not already.
     - Log activity_event: OWNERSHIP_VERIFIED.
   - On failure: throw UnprocessableError (422, 'CLAIM_DNS_MISMATCH').

3. getClaimStatus(claimId: string, userId: string): Promise<IOwnershipVerification>

File: backend/src/controllers/ownership.controller.ts & routes/claims.routes.ts
Implement all endpoints from API Specification.md Module 3.
```

---

# PHASE 6 — VOTING & ANTI-FRAUD ENGINE

---

## PROMPT 6.1 — Anti-Fraud Risk Engine Service

```
You are a Senior Backend Security Engineer. Implement the 6-factor Anti-Fraud Risk Engine for LaunchProduct.

Business Rules (from PRD.md Section 7.6):
- THRESHOLD_LOW = 30: Vote is VALID
- 30 <= score < 70: Vote is FLAGGED (counts toward score + moderator queue)
- score >= 70: Vote is QUARANTINED (does NOT count toward score)
- Hard reject (disposable email): REJECTED_BOT, return HTTP 200 silently

File: backend/src/services/fraud.service.ts

Implement evaluateVoteRisk(voteInput: VoteRiskInput): Promise<FraudEvaluationResult>

Input type VoteRiskInput:
{ userId, productId, ip, userAgent, deviceFingerprint?, subnetHash }

Step 1: Hard-reject checks (return REJECTED_BOT immediately if any true):
- Is email domain on the disposable email blacklist?
- Is the account banned (isBanned: true)?

Step 2: Compute risk score (additively sum weighted signals):
- SIG_ACCOUNT_NEW (+20): User's createdAt < 2 hours ago
- SIG_IP_DATACENTER (+25): IP's ASN is a known hosting/datacenter/VPN/Tor exit node
  (Use MaxMind GeoLite2-ASN database via @maxmind/geoip2-node)
- SIG_SUBNET_CONCENTRATION (+35): More than 3 votes for this productId from same /24 subnet in last 1 hour
  (Query votes collection: { productId, subnetHash, createdAt: { $gt: now - 1h } }.count() > 3)
- SIG_BURST_VELOCITY (+25): Current vote rate for this product > 5x the product's 3-day average rate
  (Compare current hourly rate vs 3-day average hourly rate)
- SIG_ZERO_PRIOR_ACTIVITY (+15): User has 0 activity_events prior to this vote
  (Check activity_events count for userId)
- SIG_DEVICE_COLLISION (+40): The deviceFingerprint has been used by more than 1 userId in the last 24 hours
  (Query votes: { deviceFingerprint, userId: { $ne: userId }, createdAt: { $gt: now - 24h } }.exists())
- SIG_HISTORICAL_TRUST (-20): Account age > 30 days AND historical valid vote count > 5
  (Query votes: { userId, status: 'VALID' }.count() > 5 && accountAge > 30 days)

Step 3: Determine VoteStatus:
- totalScore < 30: VALID
- 30 <= totalScore < 70: FLAGGED
- totalScore >= 70: QUARANTINED

Return: { status: VoteStatus, riskScore, triggeredSignals: string[], ipHash, subnetHash }

Load signal weights dynamically from system_settings collection (with Redis cache, TTL 5min), falling back to constants.ts defaults.
```

---

## PROMPT 6.2 — Voting Service & Controller

```
You are a Senior Backend Engineer. Implement the Voting Service and Controller for LaunchProduct.

File: backend/src/repositories/vote.repository.ts
Methods:
- findByUserAndProduct(userId, productId): Promise<IVote | null>
- create(data): Promise<IVote>
- getUserVotes(userId): Promise<IVote[]>
- updateStatus(voteId, status, moderatorNote?): Promise<IVote>
- getProductVoteCount(productId, statuses?: VoteStatus[]): Promise<number>
- getQuarantinedQueue(limit?, offset?): Promise<IVote[]>
- retractVote(voteId, userId): Promise<IVote>
- getSubnetVoteCount(subnetHash, productId, since: Date): Promise<number>
- getProductVelocity(productId, hours: number): Promise<number>

File: backend/src/services/voting.service.ts

1. castVote(productId: string, userId: string, clientMetadata: ClientMetadata): Promise<VoteResult>
   - Verify product is LIVE.
   - Check idempotency: if vote already exists for (productId, userId) → throw ConflictError (409, 'VOTE_ALREADY_CAST').
   - Call fraudService.evaluateVoteRisk(...).
   - If REJECTED_BOT: insert vote silently with status REJECTED_BOT; return HTTP 200 (honeypot).
   - Compute: ipHash = HMAC-SHA256(ip, dailySalt), subnetHash = HMAC-SHA256(subnet/24, dailySalt).
   - Insert vote document with full risk assessment.
   - If VALID or FLAGGED: atomically increment Redis sorted set: ZINCRBY 'leaderboard:today:{date}:votes' 1 {productId}.
   - Log activity_event: VOTE_CAST or VOTE_QUARANTINED.
   - Return { status, currentVoteCount }.

2. retractVote(productId: string, userId: string): Promise<void>
   - Find existing VALID/FLAGGED vote by (productId, userId).
   - Check: vote was cast within the last 15 minutes (retract window). If older → throw UnprocessableError (422).
   - Mark vote as retracted (set retractedAt = now, status = 'RETRACTED').
   - Decrement Redis sorted set: ZINCRBY -1 {productId}.
   - Log activity_event: VOTE_RETRACTED.

3. getUserVoteStatus(userId: string, productIds: string[]): Promise<Map<string, VoteStatus | null>>

File: backend/src/controllers/vote.controller.ts & routes/vote.routes.ts
Implement all endpoints from API Specification.md Module 4.
Apply: requireAuth + voteRateLimit on POST /votes.
```

---

# PHASE 7 — OUTBOUND CLICK ATTRIBUTION & REDIRECTOR

---

## PROMPT 7.1 — Click Tracking Service & Controller

```
You are a Senior Backend Engineer. Implement the outbound click attribution and redirector for LaunchProduct.

Critical Business Rule (PRD.md Section 7.7):
ONLY clicks with source=ORGANIC can contribute to ranking formulas.
Sponsored clicks are STRICTLY isolated from all organic ranking calculations.
Redirect latency MUST be <= 25ms p95.

File: backend/src/services/analytics.service.ts

1. processOutboundClick(productId: string, source: 'organic' | 'sponsored', clientMetadata: ClickMetadata): Promise<{ destinationUrl: string }>
   - Fetch product by ID (use Redis cache with 5-min TTL to avoid DB round-trip on hot products).
   - If product not found or not LIVE: throw NotFoundError.
   - Classify source: detect bot User-Agents (Googlebot, bingbot, etc.) → force source = 'BOT'.
   - Compute sessionHash = HMAC-SHA256(ip + userAgent, dailySalt).
   - Check Redis deduplication key: 'click:dedup:{productId}:{sessionHash}' (10-minute TTL).
     - If key exists → isDuplicate = true (still redirect, but don't count).
     - If key does not exist → SET key with 10-minute expiry → isDuplicate = false.
   - If NOT duplicate and source == 'ORGANIC':
     - Enqueue BullMQ job 'click-events' to asynchronously log the click and update ranking counters.
   - If source == 'SPONSORED':
     - Enqueue BullMQ job 'sponsored-click-events' for campaign analytics ONLY (never touches ranking).
   - Always log activity_event asynchronously (NEVER block the redirect).
   - Return { destinationUrl: product.websiteUrl }.

2. getFounderAnalytics(productId: string, founderId: string, days: number = 30): Promise<AnalyticsData>
   - Verify user is founderId of product.
   - Run MongoDB aggregation on activity_events for last N days:
     - Daily counts: ORGANIC clicks, SPONSORED clicks, vote events.
     - CTR: organic clicks / page views.
     - UTM breakdown: group by metadata.referrer.
   - Return time series data.

File: backend/src/controllers/analytics.controller.ts
GET /api/v1/clicks/:productId?source=organic|sponsored
  - This must be the FASTEST possible endpoint.
  - Immediately issue HTTP 302 redirect BEFORE logging anything (async fire-and-forget for logging).
  - Target latency: <= 25ms p95.
  - Set headers: Location: {websiteUrl}, rel="noopener noreferrer".

File: backend/src/routes/click.routes.ts
Apply publicRateLimit only (this endpoint must be public — no auth required).
```

---

# PHASE 8 — CAMPAIGN & MONETIZATION MODULE

---

## PROMPT 8.1 — Campaign Service & Controller

```
You are a Senior Backend Engineer. Implement the Campaign Sponsorship and Monetization module for LaunchProduct.

Business Rules (PRD.md Section 8):
- Checkout creates a 15-minute RESERVED slot.
- Only server-side verified MoR webhooks activate campaigns.
- Frontend return URLs NEVER activate campaigns directly.
- Slot limits: Homepage Spotlight max 3 concurrent, Category Featured max 2 per category.

Sponsorship Tiers and Prices (from constants.ts):
LAUNCH_BOOST: $19 / 48 hours
CATEGORY_FEATURED: $49 / 7 days
HOMEPAGE_SPOTLIGHT: $149 / 24 hours
LAUNCH_PARTNER: $299 (Homepage + Category + 7 days)

File: backend/src/repositories/campaign.repository.ts
Methods:
- checkSlotAvailability(slotKey: string, startDate: Date, endDate: Date): Promise<boolean>
- createReservation(data): Promise<ICampaign>
- activateCampaign(campaignId: string, paymentData: Partial<IPayment>): Promise<void> (ACID transaction)
- findActiveBySlot(slotKey: string): Promise<ICampaign[]>
- findByFounderId(founderId: string): Promise<ICampaign[]>
- expireCampaign(campaignId: string): Promise<void>
- findExpiredActive(): Promise<ICampaign[]>

File: backend/src/services/campaign.service.ts

1. checkSlotAvailability(tier, targetCategorySlug?, startDate, endDate): Promise<AvailabilityResult>
   - Determine slotKey from tier and category.
   - Count existing ACTIVE/RESERVED campaigns for the slotKey in the date range.
   - Check against tier max slots.
   - Return { available: boolean, nextAvailableDate? }.

2. createCampaignCheckout(tier, productId, founderId, startDate, targetCategorySlug?): Promise<{ checkoutUrl: string, campaignId: string }>
   - Verify user is VERIFIED founder of product.
   - Call checkSlotAvailability; throw ConflictError if unavailable.
   - Calculate endsAt from tier duration.
   - Create Campaign doc: { status: 'RESERVED', expiresAt: now + 15min for reservation }.
   - Call PaymentProvider.createCheckoutSession({ tier, amountCents, campaignId, successUrl, cancelUrl }).
   - Update campaign with providerSessionId.
   - Set Redis key: 'slot:reserved:{slotKey}:{campaignId}' TTL 15 minutes.
   - Return { checkoutUrl, campaignId }.

3. getFounderCampaigns(founderId: string): Promise<ICampaign[]>

4. getCampaignAnalytics(campaignId: string, founderId: string): Promise<CampaignAnalytics>
   - Query activity_events for SPONSORED clicks on this campaignId.
   - Return: totalImpressions, uniqueClicks, CTR, dailyBreakdown.

File: backend/src/services/payment.service.ts
Implement a PaymentProvider abstraction interface:
interface IPaymentProvider {
  createCheckoutSession(params): Promise<{ checkoutUrl, sessionId }>
  verifyWebhookSignature(rawBody, signatureHeader): boolean
  parseWebhookEvent(rawBody): ParsedWebhookEvent
}

Implement PaddleProvider and LemonSqueezyProvider classes.
Export a factory: getPaymentProvider(provider: string): IPaymentProvider.

File: backend/src/controllers/campaign.controller.ts & routes/campaign.routes.ts
Implement all endpoints from API Specification.md Module 7.
```

---

## PROMPT 8.2 — MoR Webhook Handler (ACID Transaction)

```
You are a Senior Backend Engineer. Implement the Merchant of Record webhook handler with ACID transaction for LaunchProduct.

Critical Business Rules (PRD.md Section 8.4):
- Verify HMAC-SHA256 webhook signature BEFORE processing anything.
- Implement idempotency: skip if providerEventId already processed.
- Activation MUST be atomic: payment record + campaign activation in one MongoDB ACID transaction.

File: backend/src/services/payment.service.ts (additions)

handlePaymentWebhook(provider: string, rawBody: Buffer, signatureHeader: string): Promise<void>

1. Get provider instance from factory.
2. Verify signature: provider.verifyWebhookSignature(rawBody, signatureHeader). If fails → throw AuthenticationError (400, 'WEBHOOK_SIGNATURE_INVALID').
3. Parse event: provider.parseWebhookEvent(rawBody).
4. Check timestamp drift: if event timestamp > 300 seconds old → throw AuthenticationError (400, 'WEBHOOK_TIMESTAMP_EXPIRED').
5. Check idempotency: find PaymentWebhookEvent by providerEventId.
   - If already exists and status 'PROCESSED': log duplicate and return 200 immediately.
6. Record webhook: insert PaymentWebhookEvent { status: 'RECEIVED' }.
7. If event is a payment success (transaction.completed, payment.succeeded):
   - Extract campaignId from event metadata.
   - Start MongoDB ACID transaction (session.withTransaction):
     a. Insert Payment document { status: 'SUCCEEDED', providerPaymentId, providerEventId, amountCents }.
     b. Update Campaign document { status: 'ACTIVE', startsAt, endsAt }.
     c. Update PaymentWebhookEvent { status: 'PROCESSED', processedAt }.
     d. Insert activity_event: CAMPAIGN_STARTED.
   - If transaction commits: enqueue BullMQ delayed job for campaign expiration at endsAt.
   - Emit notification to founder (email queue).
8. If event is a chargeback/refund: pause campaign, notify admin.

File: backend/src/routes/webhook.routes.ts
IMPORTANT: Use express.raw({ type: 'application/json' }) middleware ONLY on this route.
This is required because signature verification needs the raw body buffer, not the parsed JSON body.
POST /api/v1/webhooks/payment/:provider
```

---

# PHASE 9 — LEADERBOARDS & RANKING ENGINE

---

## PROMPT 9.1 — Ranking Engine & Leaderboard Snapshot Worker

```
You are a Senior Backend Engineer. Implement the Ranking Engine and Daily Leaderboard Snapshot Worker for LaunchProduct.

Ranking Formulas (PRD.md Section 7.7):
S_launch = (V_valid * W_v + U_organic_clicks * W_c) / (delta_t_hours + 1)^gamma_launch
S_trending = sum over 7 days: (V_d * W_v + R_d * W_r + log10(U_clicks_d + 1) * W_u) * lambda^(d-1)
S_alltime = log10(V_total + 1) * 40 + (avg_rating * N_reviews / (N_reviews + 5)) * 60

CRITICAL: ONLY organic clicks (source = 'ORGANIC') contribute to ranking. Sponsored clicks are strictly excluded.

File: backend/src/services/ranking.service.ts

1. computeLaunchScore(productId: string, launchDate: Date, now: Date): Promise<number>
   - Get V_valid: count votes where { productId, status: 'VALID', createdAt >= launchDate }.
   - Get U_organic_clicks: count activity_events where { productId, eventType: 'OUTBOUND_CLICK', eventSource: 'ORGANIC', createdAt >= launchDate }.
   - delta_t = hours elapsed since 00:00:00 UTC of launchDate.
   - Load weights from system_settings (cached).
   - Compute formula.

2. computeAllTimeScore(productId: string): Promise<number>
   - Aggregate total valid votes, average rating, review count.
   - Apply Bayesian shrinkage K=5.

3. generateDailyLeaderboard(date: Date, leaderboardType: string): Promise<LeaderboardEntry[]>
   - Fetch all LIVE products.
   - Compute score for each.
   - Sort descending.
   - Return ranked list.

4. freezeDailyLeaderboard(date: Date): Promise<void>
   - Called by the snapshot worker at 23:59:59 UTC.
   - Call generateDailyLeaderboard for LAUNCH_DAY type.
   - Bulk insert DailyLeaderboardSnapshot documents (upsert to prevent duplicates).
   - Update Redis sorted sets with final scores for cache warming.

File: backend/src/workers/ranking.worker.ts
BullMQ worker for the 'ranking-jobs' queue:
- Job type 'DAILY_FREEZE': call rankingService.freezeDailyLeaderboard(yesterday).
- Register a repeatable cron job on worker startup: '59 23 * * *' UTC → enqueue 'DAILY_FREEZE' job.

File: backend/src/repositories/snapshot.repository.ts
Methods:
- insertMany(snapshots: Partial<IDailyLeaderboardSnapshot>[]): Promise<void>
- findByDate(date: Date, type: string, limit?: number): Promise<IDailyLeaderboardSnapshot[]>
- findByProductAndType(productId: string, type: string, limit?: number): Promise<IDailyLeaderboardSnapshot[]>
```

---

## PROMPT 9.2 — Leaderboard Controller & Routes

```
You are a Senior Backend Engineer. Implement the Leaderboard Controller and Routes for LaunchProduct.

File: backend/src/controllers/leaderboard.controller.ts

1. GET /api/v1/leaderboards — Active real-time leaderboard
   - Read from Redis sorted set 'leaderboard:today:{date}:launch' (fast path, < 5ms).
   - If Redis miss or cache cold: fallback to rankingService.generateDailyLeaderboard().
   - Hydrate product details for top N results from MongoDB.
   - Return paginated list with rank, score, voteCount, organicClicks.

2. GET /api/v1/leaderboards/daily/:date — Historical frozen snapshots
   - Validate date format YYYY-MM-DD.
   - Query DailyLeaderboardSnapshot by { snapshotDate: date, leaderboardType: 'LAUNCH_DAY' }.
   - Hydrate product details.
   - Return frozen historical ranking.

3. GET /api/v1/leaderboards/all-time — All-time authority scores
   - Query recent ALL_TIME snapshots or compute from products collection.
   - Cache results in Redis with 1-hour TTL.

File: backend/src/routes/leaderboard.routes.ts
Apply publicRateLimit. All leaderboard endpoints are public (no auth required).
```

---

# PHASE 10 — CATEGORIES, BADGES & OPENGRAPH

---

## PROMPT 10.1 — Category Module & Dynamic Badge/OG Generator

```
You are a Senior Backend Engineer. Implement the Category module and the dynamic SVG Badge / OpenGraph card generators for LaunchProduct.

File: backend/src/controllers/category.controller.ts
1. GET /api/v1/categories — Return full category hierarchy tree (parent + children).
   Cache result in Redis with 1-hour TTL (categories rarely change).
2. GET /api/v1/categories/:slug — Category detail with live product count.
3. POST /api/v1/categories — Create taxonomy category (requires ADMIN role).
4. PATCH /api/v1/categories/:id — Update category (requires ADMIN role).

File: backend/src/controllers/badge.controller.ts
GET /api/badge/:slug.svg?style=flat|pill&theme=dark|light

Requirements:
1. Fetch product by slug.
2. Get current rank: read from Redis sorted set or latest DailyLeaderboardSnapshot.
3. Generate SVG XML dynamically:
   - If rank == 1: "#1 Product of the Day — LaunchProduct"
   - If rank <= 5: "Top 5 Daily Launch — LaunchProduct"
   - Otherwise: "Featured on LaunchProduct"
   - Display vote count.
   - Apply theme (dark/light) and style (flat/pill) variants.
4. Set response headers:
   - Content-Type: image/svg+xml
   - Cache-Control: public, s-maxage=300, stale-while-revalidate=600
   - (Short cache to keep rank reasonably fresh)
5. Return raw SVG XML string.

File: backend/src/controllers/og.controller.ts
GET /api/og/:slug

Requirements:
1. Fetch product + latest leaderboard rank.
2. Generate 1200x630 OG image using the 'satori' library (or sharp if simpler):
   - Product logo (top-left)
   - Product name (large, bold)
   - Tagline (subtitle)
   - Rank badge (top-right corner)
   - LaunchProduct branding (bottom)
3. Set response headers:
   - Content-Type: image/png
   - Cache-Control: public, s-maxage=86400 (24 hours)
4. Return PNG buffer.

File: backend/src/routes/badge.routes.ts & og.routes.ts
Mount at /api/badge/:slug.svg and /api/og/:slug respectively.
These are UNVERSIONED — not under /api/v1 — to ensure embed URLs remain stable across API versions.
```

---

# PHASE 11 — MODERATION CONSOLE & ADMIN MODULE

---

## PROMPT 11.1 — Moderation Service & Controller

```
You are a Senior Backend Engineer. Implement the Moderation Console for LaunchProduct.

All moderation actions are immutable — every decision is recorded in moderation_actions with before/after state.

File: backend/src/services/moderation.service.ts

1. getPendingProducts(limit, offset): Promise<IProduct[]>
2. approveProduct(productId: string, moderatorId: string): Promise<void>
   - Update product status: PENDING_REVIEW → SCHEDULED (or LIVE if no launchDate).
   - Log ModerationAction: { action: 'APPROVE', previousState: { status: 'PENDING_REVIEW' }, newState: { status: 'SCHEDULED' } }.
   - Notify submitter via email queue.
3. rejectProduct(productId: string, moderatorId: string, reason: string): Promise<void>
   - Update product status to REJECTED; set rejectionReason.
   - Log ModerationAction.
4. getQuarantinedVotes(limit, offset): Promise<IVote[]>
5. approveVote(voteId: string, moderatorId: string): Promise<void>
   - Update vote status: QUARANTINED → VALID.
   - Increment Redis leaderboard score: ZINCRBY +1.
   - Log ModerationAction.
6. rejectVote(voteId: string, moderatorId: string, reason: string): Promise<void>
   - Update vote status: QUARANTINED → REJECTED_BOT.
   - Log ModerationAction.
7. getDisputedClaims(limit, offset): Promise<IOwnershipVerification[]>
8. resolveClaimDispute(claimId, moderatorId, decision: 'APPROVE' | 'REJECT', note: string): Promise<void>
9. submitModerationAction(action: ModerationActionInput): Promise<void>
10. banUser(userId: string, moderatorId: string, reason: string): Promise<void>
    - Update user: { isBanned: true, banReason: reason }.
    - Invalidate all user sessions (delete session tokens).
    - Log ModerationAction.

File: backend/src/controllers/moderation.controller.ts & routes/moderation.routes.ts
Implement all endpoints from API Specification.md Module 13.
All routes require: requireAuth + requireRole('MODERATOR', 'ADMIN').
```

---

## PROMPT 11.2 — System Admin Module

```
You are a Senior Backend Engineer. Implement the System Administration module for LaunchProduct.

File: backend/src/controllers/admin.controller.ts

All endpoints require requireAuth + requireRole('ADMIN').

1. GET /api/v1/admin/settings — Get all system settings (anti-fraud weights, ranking weights, etc.)
2. PATCH /api/v1/admin/settings/:key — Update a system setting value.
   - Invalidate the Redis cache for that setting key immediately.
   - Log activity_event: SYSTEM_SETTING_UPDATED.
3. POST /api/v1/admin/leaderboard/recompute — Manually trigger leaderboard recomputation.
   - Enqueue a BullMQ 'MANUAL_RECOMPUTE' job.
4. GET /api/v1/admin/audit-logs — Paginated audit log from moderation_actions + activity_events.
5. GET /api/v1/admin/users — List users with search, filter by role, banned status.
6. PATCH /api/v1/admin/users/:id — Update user role or ban status.
7. GET /api/v1/admin/campaigns — Campaign inventory overview with slot utilization.

File: backend/src/routes/admin.routes.ts
All routes gated by requireAuth + requireRole('ADMIN').
```

---

# PHASE 12 — BACKGROUND WORKERS

---

## PROMPT 12.1 — All Background Workers

```
You are a Senior Backend Engineer. Implement all BullMQ background workers for LaunchProduct.

File: backend/src/workers/email.worker.ts
Queue: 'email-jobs'
Job types:
- MAGIC_LINK: Send magic link email with HTML template containing the verification URL.
- PRODUCT_APPROVED: Notify submitter their product was approved.
- PRODUCT_REJECTED: Notify submitter of rejection with reason.
- CAMPAIGN_ACTIVATED: Notify founder their campaign is live.
- OWNERSHIP_VERIFIED: Notify founder they've been verified.
- SECURITY_ALERT: Notify existing verified founder of a new claim dispute.
Use Resend API (or SES) for delivery. Implement retry with 3 attempts, exponential backoff.

File: backend/src/workers/campaign.worker.ts
Queue: 'campaign-jobs'
Job types:
- EXPIRE_CAMPAIGN (delayed job): 
  - Update campaign status to EXPIRED.
  - Release the slot (update slot booking status).
  - Log activity_event: CAMPAIGN_EXPIRED.
  - Notify founder.
- RELEASE_RESERVATION: Release a RESERVED campaign slot after 15-minute checkout timeout.
Register a repeatable cron job: '*/5 * * * *' (every 5 min) → scan for expired ACTIVE campaigns and queue EXPIRE_CAMPAIGN jobs.

File: backend/src/workers/events.worker.ts
Queue: 'click-events' and 'sponsored-click-events'
For ORGANIC click events:
- Log ActivityEvent to MongoDB.
- Increment organic click counter on Redis sorted set: ZINCRBY 'leaderboard:today:{date}:organic_clicks' 1 {productId}.
For SPONSORED click events:
- Log ActivityEvent to MongoDB with eventSource: 'SPONSORED'.
- Update campaign impression/click counters (NEVER touches organic ranking sets).

File: backend/src/workers/index.ts
Bootstrap all workers on server startup. Register all queues and workers.
Set up BullMQ board (optional: bull-board for admin visibility at /admin/queues).
```

---

# PHASE 13 — REVIEWS MODULE (PHASE 2)

---

## PROMPT 13.1 — Reviews Service & Controller

```
You are a Senior Backend Engineer. Implement the Reviews & Reputation module for LaunchProduct (Phase 2 Post-MVP feature).

Business Rules (PRD.md Section 7.5):
- Reviewer must be authenticated, email-verified, account age >= 48 hours.
- No self-reviews (founder cannot review their own product).
- One review per user per product (enforced by compound unique index).
- Founder can reply once per review.

File: backend/src/services/review.service.ts

1. submitReview(productId, userId, reviewData: { rating, title, body, conflictOfInterestDisclosed }): Promise<IReview>
   - Verify product is LIVE.
   - Verify user account age >= 48 hours.
   - Check user is NOT the verified founder of this product (block self-reviews).
   - Check no existing review from this user for this product.
   - Create review with status 'PENDING' (moderation queue) or 'APPROVED' (if auto-approve enabled).
   - Log activity_event: REVIEW_SUBMITTED.

2. getProductReviews(productId, { page, limit, sortBy }): Promise<{ reviews, total }>
   - Return only APPROVED reviews.
   - Compute aggregate: { averageRating, totalCount, ratingDistribution }.

3. founderReplyToReview(reviewId, founderId, replyBody): Promise<IReview>
   - Verify the review is for a product owned by founderId.
   - Verify no existing founderReply.
   - Update review: { founderReply: { body, repliedAt: now } }.

4. flagReview(reviewId, userId, reason): Promise<void>
   - Create moderation flag.
   - If flag count >= threshold: auto-set review status to FLAGGED.

File: backend/src/controllers/review.controller.ts & routes/review.routes.ts
Implement all endpoints from API Specification.md Module 5.
```

---

# PHASE 14 — HEALTH & OBSERVABILITY

---

## PROMPT 14.1 — Health Check & Prometheus Metrics Endpoints

```
You are a Senior Backend Engineer. Implement the health check and observability endpoints for LaunchProduct.

File: backend/src/controllers/health.controller.ts

GET /api/health — Liveness & Readiness Probe
Requirements:
1. Check MongoDB connection: run db.ping() (admin command).
2. Check Redis connection: run client.ping().
3. Check BullMQ worker health: verify 'email-jobs' queue is accessible.
4. If ALL dependencies healthy: return 200 { status: 'healthy', dependencies: { mongodb: { status: 'connected', latencyMs }, redis: { status: 'connected', latencyMs }, bullmq: { status: 'active', activeWorkers } } }
5. If ANY dependency fails: return 503 { status: 'unhealthy', dependencies: { ... } }

GET /api/health/live — Kubernetes liveness probe (simple 200 OK, no DB check)
GET /api/health/ready — Kubernetes readiness probe (full dependency check)

GET /api/metrics — Prometheus Scrape Endpoint
Requirements:
1. Protect with internal IP whitelist or Basic Auth.
2. Use prom-client library to expose:
   - launchproduct_http_requests_total (counter, labeled by method, route, status)
   - launchproduct_active_votes_total (gauge — live VALID vote count)
   - launchproduct_scraper_queue_waiting (gauge — BullMQ pending jobs)
   - launchproduct_quarantine_queue_depth (gauge — QUARANTINED vote count)
   - launchproduct_campaign_slots_active (gauge — active campaigns)
   - launchproduct_deprecated_endpoint_hits_total (counter — for RFC 8594 sunset monitoring)
3. Return in text/plain; version=0.0.4 Prometheus exposition format.
```

---

# PHASE 15 — ZOD VALIDATION SCHEMAS

---

## PROMPT 15.1 — All Zod Validation Schemas

```
You are a Senior Backend Engineer. Create all Zod validation schemas for LaunchProduct request validation.

File: backend/src/shared/zod-schemas.ts

Export the following Zod schemas:

AuthSchemas:
- MagicLinkRequestSchema: { email: z.string().email().toLowerCase().trim() }
- OAuthCallbackSchema: { code: z.string(), state: z.string().optional() }

ProductSchemas:
- ScrapeSubmitSchema: { websiteUrl: z.string().url().startsWith('https://') }
- ProductDraftConfirmSchema: { name (2-100 chars), tagline (10-120 chars), description (max 5000 chars), websiteUrl (valid HTTPS URL), categoryId (valid ObjectId), pricing: { model, startingPrice? } }
- ProductUpdateSchema: Partial version of ProductDraftConfirmSchema
- ProductSearchQuerySchema: { q?, categoryId?, pricingType?, sortBy? ('trending'|'newest'|'top'), page?, limit? (max 50) }

VoteSchemas:
- CastVoteSchema: { productId: z.string().length(24) (valid ObjectId), deviceFingerprint?: z.string().max(256) }

ClaimSchemas:
- InitiateClaimSchema: { productId: z.string().length(24), method: z.enum(['EMAIL_DOMAIN','DNS_TXT','HTML_META']) }

CampaignSchemas:
- CampaignCheckoutSchema: { tier: z.enum(['LAUNCH_BOOST','CATEGORY_FEATURED','HOMEPAGE_SPOTLIGHT','LAUNCH_PARTNER']), productId: z.string().length(24), startDate: z.string().datetime(), targetCategorySlug?: z.string() }

ReviewSchemas:
- SubmitReviewSchema: { productId, rating (1-5 integer), title (5-100 chars), body (50-2000 chars), conflictOfInterestDisclosed: z.boolean() }
- FounderReplySchema: { body: z.string().min(10).max(1000) }

ModerationSchemas:
- ModerationActionSchema: { targetType, targetId, action, reason?: z.string().max(1000) }
```

---

# PHASE 16 — SEED DATA

---

## PROMPT 16.1 — Database Seeding Script

```
You are a Senior Backend Engineer. Create the database seeding script for LaunchProduct.

File: backend/src/shared/seed.ts

Create a comprehensive seed script that:

1. Seeds the 8 MVP categories in exact order:
{ slug: 'ai-tools', name: 'AI Tools', description: 'Artificial intelligence tools and assistants', sortOrder: 1 }
{ slug: 'ai-agents', name: 'AI Agents', description: 'Autonomous AI agent frameworks and platforms', sortOrder: 2 }
{ slug: 'saas', name: 'SaaS', description: 'Software as a Service applications', sortOrder: 3 }
{ slug: 'developer-tools', name: 'Developer Tools', description: 'Tools for software developers', sortOrder: 4 }
{ slug: 'productivity', name: 'Productivity', description: 'Productivity and workflow tools', sortOrder: 5 }
{ slug: 'marketing-tools', name: 'Marketing Tools', description: 'Marketing and growth tools', sortOrder: 6 }
{ slug: 'seo-tools', name: 'SEO Tools', description: 'SEO and content optimization tools', sortOrder: 7 }
{ slug: 'design-tools', name: 'Design Tools', description: 'Design and creative tools', sortOrder: 8 }

2. Seeds system_settings with default values:
- key: 'antiFraudWeights', value: { SIG_ACCOUNT_NEW: 20, SIG_IP_DATACENTER: 25, SIG_SUBNET_CONCENTRATION: 35, SIG_BURST_VELOCITY: 25, SIG_ZERO_PRIOR_ACTIVITY: 15, SIG_DEVICE_COLLISION: 40, SIG_HISTORICAL_TRUST: -20, THRESHOLD_LOW: 30, THRESHOLD_HIGH: 70 }
- key: 'rankingWeights', value: { W_v: 1.0, W_c: 0.15, W_r: 2.5, GAMMA_LAUNCH: 1.2, LAMBDA_DECAY: 0.75 }
- key: 'voteRetractWindowMinutes', value: 15
- key: 'minAccountAgeHours', value: 2
- key: 'reviewMinAccountAgeDays', value: 2
- key: 'campaignSlotLimits', value: { HOMEPAGE_SPOTLIGHT: 3, CATEGORY_FEATURED: 2 }

3. Seeds an ADMIN user:
{ email: 'admin@launchproduct.io', role: 'ADMIN', isBanned: false }

4. Seeds 5-10 sample LIVE products with realistic data (use the Supasite product from database.md sample data as template).

5. Use upsert (findOneAndUpdate with upsert: true) for all seed operations so the script is idempotent.

Add npm script: "seed": "ts-node src/shared/seed.ts"
```

---

# PHASE 17 — TESTING

---

## PROMPT 17.1 — Unit Tests (Anti-Fraud Engine & Ranking)

```
You are a Senior Backend Engineer. Write unit tests for the Anti-Fraud Risk Engine and Ranking Engine for LaunchProduct.

Testing Framework: Jest + @types/jest
Mocking: jest.mock() for repositories; use in-memory MongoDB (mongodb-memory-server) for integration tests.

File: backend/src/__tests__/fraud.service.test.ts

Test cases for fraudService.evaluateVoteRisk():
1. Account age < 2 hours triggers SIG_ACCOUNT_NEW (+20).
2. Known datacenter ASN triggers SIG_IP_DATACENTER (+25).
3. >3 votes from same /24 subnet in 1 hour triggers SIG_SUBNET_CONCENTRATION (+35).
4. Burst velocity > 5x baseline triggers SIG_BURST_VELOCITY (+25).
5. Zero prior activity triggers SIG_ZERO_PRIOR_ACTIVITY (+15).
6. Same device fingerprint from different accounts triggers SIG_DEVICE_COLLISION (+40).
7. Account >30 days with >5 valid votes applies SIG_HISTORICAL_TRUST (-20).
8. Disposable email returns REJECTED_BOT immediately.
9. Score < 30: status is VALID.
10. Score 30-69: status is FLAGGED.
11. Score >= 70: status is QUARANTINED.
12. Score combinations of multiple signals sum correctly.

File: backend/src/__tests__/ranking.service.test.ts

Test cases for rankingService:
1. computeLaunchScore returns 0 when no votes or clicks.
2. computeLaunchScore increases with more valid votes.
3. computeLaunchScore gravity dampening increases as hours elapse.
4. Sponsored clicks do NOT contribute to S_launch.
5. Quarantined votes do NOT contribute to S_launch.
6. computeAllTimeScore uses Bayesian shrinkage (K=5) correctly.
7. computeAllTimeScore handles zero reviews gracefully.
8. generateDailyLeaderboard returns products sorted by descending score.
```

---

## PROMPT 17.2 — Integration & API Tests

```
You are a Senior Backend Engineer. Write integration tests for the LaunchProduct Express.js API using supertest and mongodb-memory-server.

File: backend/src/__tests__/auth.integration.test.ts

Test the full magic link authentication flow:
1. POST /api/v1/auth/magic-link with valid email → 200 + generic message.
2. POST /api/v1/auth/magic-link with invalid email → 400 VALIDATION_FAILED.
3. POST /api/v1/auth/magic-link with disposable email domain → 422 DISPOSABLE_EMAIL_REJECTED.
4. GET /api/v1/auth/verify?token=validToken → 200 + Set-Cookie header.
5. GET /api/v1/auth/verify?token=expiredToken → 401 TOKEN_EXPIRED.
6. GET /api/v1/auth/verify?token=usedToken → 401 MAGIC_LINK_ALREADY_USED.
7. GET /api/v1/auth/me without cookie → 401 UNAUTHORIZED.
8. GET /api/v1/auth/me with valid cookie → 200 + user data.
9. POST /api/v1/auth/logout → 200 + clears cookie.

File: backend/src/__tests__/voting.integration.test.ts

Test the voting API:
1. POST /api/v1/votes without auth → 401.
2. POST /api/v1/votes with banned account → 403 ACCOUNT_BANNED.
3. POST /api/v1/votes for non-LIVE product → 422.
4. POST /api/v1/votes → 200 { status: 'VALID', currentVoteCount: 1 }.
5. POST /api/v1/votes again for same product → 409 VOTE_ALREADY_CAST.
6. DELETE /api/v1/votes within 15 minutes → 200.
7. DELETE /api/v1/votes after 15 minutes → 422.

File: backend/src/__tests__/webhook.integration.test.ts

Test MoR webhook handler:
1. POST /api/v1/webhooks/payment/paddle with invalid signature → 400 WEBHOOK_SIGNATURE_INVALID.
2. POST with valid signature + duplicate providerEventId → 200 (idempotency).
3. POST with valid signature + new event → 200 + campaign activated (check DB).
4. POST with valid signature + old timestamp (>300s) → 400 WEBHOOK_TIMESTAMP_EXPIRED.
```

---

# PHASE 18 — DEPLOYMENT & PRODUCTION HARDENING

---

## PROMPT 18.1 — Docker, Environment & Production Configuration

```
You are a Senior DevOps and Backend Engineer. Create the production Docker configuration and environment setup for LaunchProduct.

File: docker-compose.yml (local development)
Services:
- backend: Node.js 20 LTS, mounts ./backend/src, port 4000, env_file .env
- frontend: Node.js 20 LTS, mounts ./frontend/src, port 3000, env_file .env
- scraper: Custom Dockerfile, NO network access to internal services (network_mode: none for external traffic only — allow only outbound via explicit proxy)
- mongodb: mongo:7.0, port 27017, volume for data persistence
- redis: redis:7-alpine, port 6379, volume for persistence

File: backend/Dockerfile (production)
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build (tsc output to /dist)

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
ENV NODE_ENV=production
EXPOSE 4000
CMD ["node", "dist/server.js"]

File: scraper/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# No internal network routes — only outbound internet access
# iptables rules added via Docker network configuration
CMD ["node", "dist/index.js"]

Required environment variables for production (.env.production):
NODE_ENV=production
PORT=4000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxxx.mongodb.net/launchproduct?retryWrites=true&w=majority
REDIS_URL=redis://:<password>@redis-host:6379
JWT_SECRET=<minimum 64 char random string>
SESSION_COOKIE_SECRET=<minimum 64 char random string>
DAILY_SALT_ROTATION_KEY=<32 byte hex key for HMAC session hashing>
EMAIL_FROM=LaunchProduct <noreply@launchproduct.io>
RESEND_API_KEY=re_xxxxxxxx
OPENAI_API_KEY=sk-xxxxxxxx
PADDLE_WEBHOOK_SECRET=pdl_xxxxxxxx
PADDLE_API_KEY=pdl_xxxxxxxx
GOOGLE_CLIENT_ID=xxxxxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxx
GITHUB_CLIENT_ID=Iv1.xxxxxxxx
GITHUB_CLIENT_SECRET=xxxxxxxx
NEXT_PUBLIC_API_URL=https://api.launchproduct.io
NEXT_PUBLIC_SITE_URL=https://launchproduct.io
MAXMIND_DB_PATH=/app/data/GeoLite2-ASN.mmdb

Security hardening checklist:
1. MongoDB Atlas: enable IP allowlist, create dedicated DB user with least-privilege roles (readWrite on launchproduct DB only).
2. Redis: enable AUTH password, disable CONFIG command in production.
3. All cookies: HttpOnly, Secure, SameSite=Lax.
4. Express Helmet: enable all headers including contentSecurityPolicy, hsts, noSniff, frameguard.
5. CORS: whitelist only https://launchproduct.io and https://www.launchproduct.io.
6. Rate limiting: all limiters applied before business logic.
7. Webhook routes: use raw body parser (express.raw), never express.json.
```

---

## PROMPT 18.2 — Final Launch Checklist & Load Testing

```
You are a Senior Backend Engineer. Create the final launch checklist and load testing plan for LaunchProduct.

Pre-Launch Checklist:
1. Verify all MongoDB Atlas indexes are created:
   - Run backend/src/shared/seed.ts to create categories and system_settings.
   - Manually verify in Atlas dashboard: users.email (unique), products.slug (unique), products.canonicalDomain (unique), votes.(productId,userId) (compound unique), etc.

2. Load test with k6 (install k6):
   Create backend/load-tests/k6-script.js that:
   a. Simulates 50 RPS on GET /api/v1/products (directory browse).
   b. Simulates 10 RPS on GET /api/v1/leaderboards (Redis hot path).
   c. Simulates 5 RPS on POST /api/v1/votes (with auth tokens).
   d. Simulates 100 RPS on GET /api/v1/clicks/:id (redirect fast path).
   Target thresholds:
   - http_req_duration p95 < 150ms for GET /products and /leaderboards
   - http_req_duration p95 < 25ms for GET /clicks/:id
   - http_req_duration p95 < 80ms for POST /votes
   - http_req_failed < 1%

3. Security Audit checklist:
   - Test SSRF: attempt submission of http://169.254.169.254/latest/meta-data/ → expect 422.
   - Test duplicate vote: attempt two votes same user same product → expect 409.
   - Test rate limit: burst 15 magic link requests from same IP → expect 429 after 5.
   - Test RBAC: attempt GET /api/v1/admin with HUNTER role → expect 403.
   - Test webhook signature: POST /api/v1/webhooks/payment with wrong signature → expect 400.
   - Test XSS: submit product description with <script>alert(1)</script> → verify it is sanitized.

4. Seed 100 curated AI/SaaS products for cold-start supply before public launch.

5. Final smoke test: verify the following user flow end-to-end:
   a. User registers via magic link.
   b. User submits a product URL (scraper pipeline).
   c. Admin approves the product.
   d. User claims ownership via DNS_TXT.
   e. User casts an upvote.
   f. Anti-fraud engine classifies the vote.
   g. Daily leaderboard snapshot freezes at 23:59:59 UTC.
   h. Badge endpoint returns correct SVG rank.
   i. MoR checkout flow creates a campaign reservation.
   j. Webhook fires and activates the campaign.
```

---

# APPENDIX — QUICK REFERENCE

---

## Collections Summary (15 Collections)

| Collection | Code | Purpose |
|:---|:---:|:---|
| `users` | DS1 | Identity, RBAC, founder profiles |
| `products` | DS2 | Canonical product catalog |
| `categories` | DS3 | Directory taxonomy tree (8 MVP categories) |
| `votes` | DS4 | Authenticated upvotes + risk assessment |
| `reviews` | DS5 | User reviews & ratings (Phase 2) |
| `campaigns` | DS6 | Promotional slot reservations |
| `payments` | DS7 | MoR financial ledger |
| `payment_webhook_events` | DS8 | Webhook idempotency audit |
| `ownership_verifications` | DS9 | Domain ownership claims (72h TTL) |
| `product_revisions` | DS10 | Versioned content audit trail |
| `daily_leaderboard_snapshots` | DS11 | Frozen historical leaderboards |
| `activity_events` | DS12 | Operational event stream (90d TTL) |
| `moderation_actions` | DS13 | Staff governance decision log |
| `verification_tokens` | DS14 | Magic link tokens (15m TTL) |
| `system_settings` | DS15 | Dynamic platform configuration |

## API Modules Summary (15 Modules)

| # | Module | Base Route |
|:---:|:---|:---|
| 1 | Authentication & Sessions | `/api/v1/auth` |
| 2 | Products & Scraper Pipeline | `/api/v1/products` |
| 3 | Ownership Claims | `/api/v1/claims` |
| 4 | Voting & Anti-Fraud | `/api/v1/votes` |
| 5 | Reviews (Phase 2) | `/api/v1/reviews` |
| 6 | Click Attribution | `/api/v1/clicks` |
| 7 | Campaigns & Monetization | `/api/v1/campaigns` |
| 8 | MoR Webhooks | `/api/v1/webhooks` |
| 9 | Leaderboards | `/api/v1/leaderboards` |
| 10 | Categories | `/api/v1/categories` |
| 11 | Badges & OG Cards | `/api/badge`, `/api/og` |
| 12 | Founder Analytics | `/api/v1/analytics` |
| 13 | Moderation Console | `/api/v1/moderation` |
| 14 | System Admin | `/api/v1/admin` |
| 15 | Health & Observability | `/api/health`, `/api/metrics` |

## Recommended Execution Order

```
Phase 0: PROMPT 0.1 → 0.2 → 0.3 → 0.4
Phase 1: PROMPT 1.1 → 1.2 → 1.3 → 1.4 → 1.5
Phase 2: PROMPT 2.1 → 2.2
Phase 3: PROMPT 3.1 → 3.2
Phase 4: PROMPT 4.1 → 4.2 → 4.3
Phase 5: PROMPT 5.1
Phase 6: PROMPT 6.1 → 6.2
Phase 7: PROMPT 7.1
Phase 8: PROMPT 8.1 → 8.2
Phase 9: PROMPT 9.1 → 9.2
Phase 10: PROMPT 10.1
Phase 11: PROMPT 11.1 → 11.2
Phase 12: PROMPT 12.1
Phase 13: PROMPT 13.1
Phase 14: PROMPT 14.1
Phase 15: PROMPT 15.1
Phase 16: PROMPT 16.1
Phase 17: PROMPT 17.1 → 17.2
Phase 18: PROMPT 18.1 → 18.2
```

---

*This prompt.md file is the complete, sequential build guide for the LaunchProduct platform. Every prompt is self-contained and references the authoritative specification documents: PRD.md, System Architecture.md, database.md, database-schema.md, API Specification.md, and UI-UX.md.*
