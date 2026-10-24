# LaunchProduct Deployment Guide

## Production Database Index Synchronization

In production (`NODE_ENV=production`), `autoIndex: false` is configured on Mongoose connections to prevent synchronous, blocking index builds during runtime web traffic.

All schema indexes must be synchronized pre-boot on every deployment.

### Production Start Commands

#### Docker
The backend image entrypoint runs index synchronization followed by server boot:
```dockerfile
CMD ["sh", "-c", "node dist/scripts/sync-indexes.js && node dist/server.js"]
```

#### Render / Railway / PaaS
Set the **Start Command** to:
```bash
node dist/scripts/sync-indexes.js && node dist/server.js
```
or:
```bash
npm start
```
(Defined in `backend/package.json` as `"start": "node dist/scripts/sync-indexes.js && node dist/server.js"`).

### Startup Verification
When `NODE_ENV === 'production'`, `backend/src/server.ts` performs a fatal assertion verifying the existence of critical unique indexes:
1. `PaymentWebhookEvent.providerEventId` (unique)
2. `Payment.providerPaymentId` (unique partial)
3. `Payment.providerEventId` (unique partial)
4. `Product.slug` (unique)

If any index is missing, the service immediately terminates (`process.exit(1)`) to ensure data safety.
