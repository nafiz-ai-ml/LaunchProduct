# LaunchProduct — Platform Monorepo

> **LaunchProduct** is a product discovery and growth platform for builders of SaaS applications, AI tools, and developer utilities.

## Architecture: Layered Monolith

- **Frontend (`frontend/`)**: Next.js 14+ (App Router, Server Components for SEO, Client Components for Interactivity, Poppins primary typography, Tailwind CSS design system derived from [UI-UX.md](file:///e:/NAFIZ%20DAIRY/AI%20Developers/SAAS%2002/UI-UX.md)).
- **Backend (`backend/`)**: Express.js 4/5 REST API with strict horizontal separation:
  `Routes → Validation Middleware → Controllers → Services → Repositories → Mongoose Models (MongoDB Atlas)`.
- **Primary Database**: MongoDB Atlas (MongoDB 7+), authoritative system of record.
- **Cache & Ephemeral Store**: Redis 7 (ZSET leaderboards, sliding-window rate limiters, reservation locks, BullMQ queue streams).
- **Scraper (`scraper/`)**: Dedicated network-isolated worker process with hardened SSRF protection.

## Monorepo Directory Structure

```text
launchproduct/
├── backend/                           # Express.js REST API Server (:4000)
│   ├── src/
│   │   ├── controllers/               # HTTP Request/Response handling
│   │   ├── routes/                    # API Route definitions
│   │   ├── middleware/                # Auth, Zod Validation, Rate Limiter, Error Handling
│   │   ├── services/                  # Core domain logic, anti-fraud, ranking formulas
│   │   ├── repositories/              # MongoDB data access layer
│   │   ├── models/                    # 15 Mongoose Schema models
│   │   ├── workers/                   # BullMQ async queue workers
│   │   ├── shared/                    # db.ts, redis.ts, logger.ts, errors.ts, constants.ts
│   │   └── server.ts                  # Server bootstrap & lifecycle
│   ├── package.json
│   └── tsconfig.json
├── frontend/                          # Next.js 14+ Presentation Layer (:3000)
│   ├── public/brand/                  # Authoritative LaunchProduct brand & logo assets
│   ├── src/
│   │   ├── app/                       # App Router ((public), (auth), (dashboard), (admin))
│   │   ├── components/                # Reusable UI & domain components
│   │   ├── lib/                       # api-client.ts, auth-client.ts
│   │   └── styles/                    # globals.css with Poppins font & design tokens
│   ├── package.json
│   ├── next.config.js
│   └── tailwind.config.ts
├── scraper/                           # Network-isolated scraper worker process
│   ├── src/
│   │   ├── fetcher.ts                 # SSRF-hardened fetcher
│   │   ├── parser.ts                  # HTML & OpenGraph parser
│   │   ├── llm.ts                     # LLM metadata enrichment
│   │   └── index.ts                   # Worker queue processor
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml                 # Local dev container orchestration
├── package.json                       # Monorepo root workspaces
├── tsconfig.json                      # Monorepo root TypeScript config
└── .env.example                       # Environment template
```

## Getting Started

### Prerequisites
- Node.js 20 LTS (or higher)
- npm 10+
- Docker & Docker Compose (for local MongoDB replica set & Redis)

### Installation
```bash
# Install dependencies across all workspaces
npm install
```

### Running Locally
```bash
# Start MongoDB & Redis containers
docker compose up -d mongodb redis

# Start development servers (Frontend on :3000, Backend on :4000)
npm run dev
```

## Key Documentation
- [PRD.md](file:///e:/NAFIZ%20DAIRY/AI%20Developers/SAAS%2002/PRD.md): Product requirements & dual-engine discovery model
- [System Architecture.md](file:///e:/NAFIZ%20DAIRY/AI%20Developers/SAAS%2002/System%20Architecture.md): System topology & component contracts
- [API Specification.md](file:///e:/NAFIZ%20DAIRY/AI%20Developers/SAAS%2002/API%20Specification.md): Complete RESTful API endpoint contracts
- [UI-UX.md](file:///e:/NAFIZ%20DAIRY/AI%20Developers/SAAS%2002/UI-UX.md): Visual design system, Poppins tokens, & component UX
- [agent.md](file:///e:/NAFIZ%20DAIRY/AI%20Developers/SAAS%2002/agent.md): Autonomous AI agent engineering guidelines
- [prompt.md](file:///e:/NAFIZ%20DAIRY/AI%20Developers/SAAS%2002/prompt.md): Step-by-step sequential build prompts
