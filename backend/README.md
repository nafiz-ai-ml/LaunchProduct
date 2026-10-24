# LaunchProduct Backend

## Deployment & Database Indexes

In production, Mongoose's automatic index creation (`autoIndex`) is intentionally disabled to avoid blocking server boot and degrading live API performance.

Instead, all database schema indexes (including critical unique and partial unique indexes) are safely synchronized ahead of time via the deployment script:

```bash
npm run sync-indexes:prod
# or directly:
node dist/scripts/sync-indexes.js
```

### Production Start Commands

#### 1. Docker
The `backend/Dockerfile` runs `sync-indexes` automatically before starting the server:
```dockerfile
CMD ["sh", "-c", "node dist/scripts/sync-indexes.js && node dist/server.js"]
```

#### 2. Render / Railway / Heroku / Fly.io
If your deployment platform executes a custom start command, configure it as:
```bash
node dist/scripts/sync-indexes.js && node dist/server.js
```
or simply use the npm start script:
```bash
npm start
```
(which executes `node dist/scripts/sync-indexes.js && node dist/server.js`).

#### 3. Startup Safety Invariant
When `NODE_ENV === 'production'`, the server verifies at boot that the critical unique indexes exist:
- `PaymentWebhookEvent.providerEventId` (unique)
- `Payment.providerPaymentId` (unique partial)
- `Payment.providerEventId` (unique partial)
- `Product.slug` (unique)

If any critical index is missing, the server will log a fatal error and immediately exit (`process.exit(1)`) to prevent serving traffic without integrity protections.
