# Product Discovery & Growth Platform --- Master Plan

> Final Brand: **LaunchProduct** (formerly working title *LaunchRank*)\
> Status: Planning / Research / Architecture Finalized

## 1. Vision

Build a product-discovery and growth platform for SaaS, AI tools and
digital products.

It combines:

-   Product directory
-   Product launch pages
-   Category discovery
-   Organic voting/ranking
-   Head-to-head product battles
-   Sponsored/paid promotion
-   Founder profiles
-   Click/campaign analytics
-   Reviews
-   AI-assisted product submission
-   Launch/marketing kit

**Positioning:** Do not build an Outbid clone. Build a broader
**Discovery + Distribution + Credibility + Measurable Exposure**
platform.

------------------------------------------------------------------------

## 2. What We Observed From Outbid

From the supplied screenshots and the observed flow:

-   Product URL / `@handle`
-   Category selection
-   Claim Rank
-   Monetary rank values
-   All-time and Today rankings
-   Categories
-   Product cards
-   Click counts
-   Latest activity
-   Search/discovery
-   Payment flow after attempting to claim a rank

### Important caveat

A displayed `$17,001` / `$17,006` value should **not automatically be
treated as completed revenue**. It could represent a current claim
value, cumulative value, bid threshold, or another internal metric. The
exact meaning must be verified from rules, transaction history, and
product history.

------------------------------------------------------------------------

## 3. Domain-Age / Authority Investigation

The supplied domain-age screenshot showed `outbid.lol` with a current
registration date of **2026-08-19**, approximately one month before the
observation.

The user also observed an authority metric of 70+. Record the exact
source and metric:

-   **Ahrefs = DR (Domain Rating)**
-   **Moz = DA (Domain Authority)**

A high authority score on a recently registered domain does **not
necessarily mean the website was built from zero recently**.

Possible explanations:

1.  The domain was previously registered and later dropped.
2.  It was acquired as an expired/aged domain.
3.  Historical backlinks or references remain.
4.  A previous website/brand existed on the domain.
5.  The reported metric/source was misunderstood.

### Competitor research checklist

Before concluding that Outbid generated everything organically in \~30
days, investigate:

-   Wayback Machine history
-   Historical ownership/registration
-   Historical site content
-   Ahrefs DR
-   Moz DA
-   Referring domains
-   Referring pages
-   Anchor text
-   New/lost backlinks
-   Organic keywords
-   Organic traffic history
-   Top landing pages
-   Top countries
-   Brand searches
-   X/social account age
-   Founder accounts
-   Product Hunt mentions
-   Hacker News mentions
-   Reddit mentions
-   Indie Hackers mentions
-   Newsletter mentions
-   Press coverage
-   Referral sources
-   Whether the displayed visitor count is independently measured

**Hypothesis to test:** the current domain may be new while some
authority, audience, backlinks, brand assets or distribution existed
before the current launch.

------------------------------------------------------------------------

## 4. Target Users

### Primary

-   SaaS founders
-   AI startup founders
-   Indie hackers
-   Developers launching products
-   Micro-SaaS founders
-   Small software companies
-   AI tool creators

### Secondary

-   Product hunters
-   Startup enthusiasts
-   Marketers
-   Agencies
-   Technology writers
-   Investors/researchers

Start with **AI + SaaS** rather than every industry.

------------------------------------------------------------------------

## 5. Core Product Loop

``` text
Founder submits product
        ↓
AI-assisted profile
        ↓
Product launches
        ↓
Community discovers it
        ↓
Votes / clicks / reviews
        ↓
Organic ranking
        ↓
Founder shares ranking
        ↓
External audience arrives
        ↓
More products + users
        ↓
Paid promotion becomes valuable
        ↓
Revenue
```

The network effect is the real moat: **products + founders + audience +
distribution**.

------------------------------------------------------------------------

## 6. MVP

### Public

-   Homepage
-   Product directory
-   Category pages
-   Product detail pages
-   Today's / weekly / all-time rankings
-   Search
-   Product submission
-   Upvote
-   Launch page
-   Sponsored placements
-   Basic statistics

### Founder

-   Registration/login
-   Founder dashboard
-   Add/edit product
-   Product verification
-   Launch date
-   Ranking position
-   Views
-   Clicks
-   Votes
-   Basic campaign analytics

### Admin

-   Product moderation
-   User moderation
-   Category management
-   Sponsored placement management
-   Payment records
-   Vote-abuse review
-   Reports
-   Settings

------------------------------------------------------------------------

## 7. Differentiating Features

After the MVP:

### Launch Day

A founder can launch a product on a specific day and compete in a daily
leaderboard.

### Head-to-Head Battles

Example:

``` text
AI Tool A     62%
     VS
AI Tool B     38%
```

### Product of the Day

Winner gets a public badge and shareable social card.

### Founder Profile

Founder identity, products, achievements and launch history.

### Verified Reviews

Reviews from verified users where verification is genuinely possible.

### Launch Kit

Generate:

-   X post
-   LinkedIn post
-   Email announcement
-   Product Hunt-style description
-   Short founder pitch
-   Announcement headline

### AI-Assisted Submission

Founder enters a URL. The system suggests:

-   Product name
-   Tagline
-   Description
-   Category
-   Features
-   Pricing
-   Social links

Founder reviews and approves before publishing.

------------------------------------------------------------------------

## 8. Organic Ranking vs Paid Promotion

This is a critical trust feature.

### Organic Score

Potential signals:

-   Valid votes
-   Engagement
-   Clicks
-   Verified reviews
-   Recency
-   Launch activity
-   Quality signals

### Sponsored Placement

Clearly label:

> **Sponsored** / **Promoted**

Do not secretly mix paid placement with organic ranking.

------------------------------------------------------------------------

## 9. Paid Promotion

Start with reasonable prices rather than trying to reproduce huge
numbers immediately.

Example:

-   Boost: \$9
-   Featured: \$29--\$49
-   Premium: \$99--\$199
-   Campaign: \$299+

Later pricing should be based on actual demand and measurable value.

Potential revenue:

1.  Sponsored placement
2.  Rank/auction fees
3.  Featured listings
4.  Homepage sponsorship
5.  Newsletter sponsorship
6.  Category sponsorship
7.  Premium analytics
8.  Founder subscription
9.  API access
10. Partner promotions

------------------------------------------------------------------------

## 10. Future Auction / Outbid-Style Mechanism

Only add this after normal paid promotion is proven.

Questions that must be explicitly specified:

-   One-time fee or time-based campaign?
-   Minimum increment?
-   Reserve price?
-   Maximum bid?
-   Does the previous bidder get displaced?
-   Refund or credit after displacement?
-   Campaign expiration?
-   Payment failure behavior?
-   Tie resolution?
-   Can an owner bid against themselves?
-   What happens after campaign expiry?

Do not code the auction before these rules are written.

------------------------------------------------------------------------

# 11. Anti-Fake-Voting System --- High Priority

Do **not** rely on `one IP = one vote`.

IP addresses are shared and can be changed/bypassed.

Also do not rely only on browser cookies.

Use a multi-signal risk engine.

### Signals

#### Account

-   Email verified
-   Account age
-   Previous activity
-   Voting history
-   Vote frequency

#### Network

-   Rate limits
-   IP reputation
-   Repeated subnet patterns
-   Proxy/VPN/Tor signals where appropriate

#### Behavior

Detect patterns such as:

-   New account immediately voting many times
-   Large voting burst within minutes
-   Many accounts targeting one product
-   Repeated signup → vote → disappear behavior
-   Similar suspicious behavior across accounts

#### Email

-   Disposable email detection
-   Verification
-   Suspicious patterns

#### CAPTCHA

Use selectively for suspicious behavior rather than unnecessarily
blocking normal visitors.

### Vote pipeline

``` text
Vote submitted
      ↓
Validation
      ↓
Rate limit
      ↓
Risk scoring
      ↓
 ┌────┴────┐
 ↓         ↓
Low risk  Suspicious
 ↓         ↓
Valid     Quarantine
          ↓
      Review queue
```

Internal statuses:

-   `valid`
-   `pending`
-   `rejected`
-   `reversed`

Keep exact fraud thresholds private. Use multiple signals rather than a
single visible rule.

------------------------------------------------------------------------

## 12. Analytics

Paid campaigns must show measurable results.

Example:

``` text
Spend:           $49
Impressions:   18,420
Clicks:         1,294
CTR:             7.02%
Votes:             842
```

Track where appropriate:

-   Referrer
-   Country
-   Device type
-   Date/time
-   Landing page
-   UTM campaign

Do not claim conversions that the platform cannot actually measure.

------------------------------------------------------------------------

## 13. Founder-Driven Marketing Loop

Every product should get:

-   Shareable launch URL
-   Social card
-   Ranking badge
-   X share
-   LinkedIn share
-   Copy link
-   Product-of-the-Day badge when applicable

Example:

> 🏆 #7 AI Product on LaunchProduct

The founder then has a reason to share the platform with their own
audience.

------------------------------------------------------------------------

## 14. SEO Strategy

Create useful, indexable pages:

### Categories

``` text
/ai-tools
/ai-agents
/seo-tools
/marketing-tools
/developer-tools
/productivity
/saas
```

### Discovery pages

``` text
/best-ai-tools
/best-ai-agents
/new-saas
/new-ai-tools
/top-seo-tools
```

### Product pages

``` text
/products/product-name
```

Each page should have unique metadata, canonical URL, Open Graph data,
structured data where appropriate, and useful content.

Avoid mass-producing thin SEO pages.

------------------------------------------------------------------------

## 15. Content Marketing

Potential recurring content:

-   Top AI Products This Week
-   New SaaS Products This Week
-   Fastest Rising AI Products
-   Top Developer Tools
-   Top Marketing Tools
-   Product of the Month
-   Founder interviews
-   Product comparisons
-   AI/SaaS trend reports

The strongest content should use **original platform data**.

------------------------------------------------------------------------

## 16. First-Traffic Strategy

### Phase 1 --- Seed supply

Target the first 100--500 quality products.

Offer:

-   Free listing
-   Permanent profile
-   Launch badge
-   Basic analytics
-   Share card

### Phase 2 --- Founder distribution

Every listed product becomes a distribution opportunity.

### Phase 3 --- Community

Build:

-   X account
-   LinkedIn page
-   Newsletter
-   Founder community
-   Weekly launch events
-   Product battles

### Phase 4 --- Data-driven SEO/social

Publish rankings, reports and comparisons using platform data.

------------------------------------------------------------------------

## 17. Launch Campaign Ideas

### Campaign: 1,000 SaaS Products

> Submit your SaaS for free and join the first 1,000 products.

### Product of the Day

Daily winner gets a badge and social asset.

### Weekly Top 50

Publish a weekly leaderboard.

### Founder Friday

Interview one founder every week.

### Launch Battle

Two products compete for votes and attention.

### Embeddable Badge

Example:

> 🏆 Featured on LaunchProduct

The badge can link back to the platform if the publisher agrees to it.

------------------------------------------------------------------------

## 18. Competitor Research

Study:

-   Outbid
-   Product Hunt
-   AlternativeTo
-   There's An AI For That
-   BetaList
-   Uneed
-   SaaSHub
-   Futurepedia
-   Other product directories and launch platforms

For each competitor record:

  Field              Research
  ------------------ ----------
  Target audience    
  Core proposition   
  Submission flow    
  Free vs paid       
  Ranking model      
  Voting model       
  Sponsored model    
  Traffic sources    
  SEO pages          
  Social strategy    
  Referral loop      
  Revenue model      
  Differentiators    
  Weaknesses         

------------------------------------------------------------------------

## 19. Technical Direction

A dedicated application is preferable for the eventual product because
of:

-   Real-time rankings
-   Fraud detection
-   Payments
-   Bidding
-   Analytics
-   Background jobs
-   Crawling
-   API

WordPress can be useful for a quick marketing prototype, but the core
application will likely be better as a dedicated web app.

### Candidate stack

Frontend:

-   Next.js / React

Backend:

-   Node.js / TypeScript

Database:

-   PostgreSQL

Cache/queue:

-   Redis

Search:

-   PostgreSQL initially
-   Dedicated search later if required

Payments:

-   Stripe or another processor suitable for target markets

Automation:

-   n8n where appropriate

Analytics:

-   First-party event tracking

The final stack should be frozen after requirements are finalized.

------------------------------------------------------------------------

## 20. Initial Data Model

Core entities:

``` text
User
 ├── FounderProfile
 ├── Product
 ├── Submission
 └── Notification

Product
 ├── Category
 ├── ProductVote
 ├── ProductClick
 ├── Review
 ├── RankingSnapshot
 └── Campaign

Campaign
 ├── CampaignPlacement
 ├── Payment
 ├── Impression
 └── Click
```

Anti-abuse/audit data should be designed separately.

------------------------------------------------------------------------

## 21. Ranking Engine

Do not hard-code ranking logic into UI.

Create a ranking service.

### Organic

``` text
Valid votes
+ Engagement
+ Clicks
+ Reviews
+ Recency
+ Quality signals
```

### Sponsored

``` text
Campaign status
+ Placement
+ Bid/price
+ Campaign time
```

Keep organic and sponsored ranking conceptually separate.

------------------------------------------------------------------------

## 22. Payment Architecture

Never activate a paid placement just because the browser reaches a
success page.

Correct flow:

``` text
Checkout
   ↓
Payment provider
   ↓
Server-side webhook
   ↓
Payment verified
   ↓
Campaign activated
```

Store:

-   Payment ID
-   User
-   Campaign
-   Amount
-   Currency
-   Status
-   Provider response
-   Created time
-   Refund state

------------------------------------------------------------------------

## 23. Development Roadmap

### Sprint 0 --- Research

-   Competitor analysis
-   Outbid mechanics
-   Domain/backlink investigation
-   Pricing research
-   Legal/payment research
-   Positioning

### Sprint 1 --- Foundation

-   Project setup
-   Auth
-   Database
-   User model
-   Product model
-   Categories
-   Admin

### Sprint 2 --- Directory

-   Submission
-   Product pages
-   Categories
-   Search
-   Moderation

### Sprint 3 --- Ranking

-   Voting
-   Ranking engine
-   Daily/weekly/all-time
-   Activity feed

### Sprint 4 --- Anti-abuse

-   Rate limiting
-   Email verification
-   Risk scoring
-   Suspicious vote queue
-   Audit logs

### Sprint 5 --- Monetization

-   Sponsored campaigns
-   Checkout
-   Webhooks
-   Campaign management
-   Sponsored labels

### Sprint 6 --- Analytics

-   Views
-   Clicks
-   Campaign statistics
-   Founder dashboard

### Sprint 7 --- Launch

-   SEO
-   Social sharing
-   Badges
-   Newsletter
-   Founder outreach
-   First 100 products

------------------------------------------------------------------------

## 24. Do Not Build Initially

Defer:

-   Mobile app
-   Complex AI recommendation engine
-   Full public API
-   Multiple payment providers
-   Complex subscription tiers
-   Advanced auction system
-   Huge category taxonomy
-   Chat
-   Enterprise accounts

First prove:

> **Products → users → discovery → clicks → founder value → paid
> promotion**

------------------------------------------------------------------------

## 25. Metrics

### Supply

-   Products submitted
-   Products approved
-   Active products
-   New products/week

### Audience

-   Daily active users
-   Weekly active users
-   Returning users
-   Product views
-   Unique visitors

### Engagement

-   Votes
-   Reviews
-   Clicks
-   Searches
-   Category visits

### Growth

-   Founder referrals
-   Social shares
-   Organic traffic
-   Referral traffic
-   Signup conversion

### Revenue

-   Paid campaigns
-   Campaign conversion
-   Average campaign value
-   Revenue per founder
-   Repeat purchases

### Marketplace health

-   Products competing
-   Paid campaigns
-   Sponsored-position fill rate
-   Demand per category

------------------------------------------------------------------------

## 26. North Star Metric

Candidate North Star:

> **Qualified product discovery sessions per week**

The platform should create useful connections:

``` text
Visitor
   ↓
Discovers product
   ↓
Clicks
   ↓
Potential customer
```

Revenue should follow genuine marketplace value.

------------------------------------------------------------------------

## 27. Biggest Risks

### No audience

Seed products, founder outreach, community marketing, SEO and shareable
rankings.

### Fake votes

Multi-signal fraud detection, verification, rate limits, risk scoring
and review.

### Empty marketplace

Curate initial products and make early submission free.

### Paid rankings destroy trust

Separate organic and sponsored rankings and label paid placements.

### SEO spam

Build genuinely useful product/category pages rather than thin mass
pages.

### Payment disputes

Clear terms, webhook confirmation, campaign rules and audit trail.

------------------------------------------------------------------------

## 28. Product Principles

Before adding a feature, ask:

1.  Does it help visitors discover useful products?
2.  Does it help founders get legitimate exposure, feedback or
    customers?
3.  Can it create sustainable business value?
4.  Does it increase trust?
5.  Can it work at 10,000+ products?

If not, defer it.

------------------------------------------------------------------------

## 29. Antigravity Development Rule

Antigravity should **not invent product requirements**.

Development order:

``` text
PLAN.md
   ↓
PRD
   ↓
Architecture
   ↓
Database / ERD
   ↓
API contracts
   ↓
UI/UX
   ↓
Implementation
   ↓
Testing
   ↓
Security
   ↓
Launch
```

If implementation conflicts with product rules, stop and review the
requirement before proceeding.

------------------------------------------------------------------------

## 30. Immediate Next Steps

1.  Investigate Outbid's Rules and exact claim/payment mechanics.
2.  Investigate domain history and backlinks.
3.  Verify whether the reported authority metric is Ahrefs DR or Moz DA.
4.  Investigate traffic sources rather than assuming the displayed
    visitor count is independently verified.
5.  Research competitor acquisition channels.
6.  Freeze positioning.
7.  Freeze MVP.
8.  Create PRD.
9.  Create ERD.
10. Create API specification.
11. Create detailed anti-fraud specification.
12. Create payment/auction specification.
13. Begin implementation in Antigravity only after the above are
    reviewed.

------------------------------------------------------------------------

## Final Direction

The goal is **not**:

> "Make another Outbid."

The goal is:

> **Build a product discovery and growth marketplace where founders can
> launch, get discovered, build credibility, promote their products
> transparently, and measure the exposure they receive.**

Do not sell ranking alone.

Sell:

> **Discovery + Distribution + Credibility + Measurable Exposure**

Ranking is the engagement mechanism, not the entire product.
