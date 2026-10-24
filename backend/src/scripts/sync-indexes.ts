import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment configuration
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

import {
  Category,
  Product,
  ProductRevision,
  Payment,
  PaymentWebhookEvent,
  DailyLeaderboardSnapshot,
  ActivityEvent,
  SystemSettings,
  RankingLedger,
} from '../models';

const models: Array<mongoose.Model<any>> = [
  Category,
  Product,
  ProductRevision,
  Payment,
  PaymentWebhookEvent,
  DailyLeaderboardSnapshot,
  ActivityEvent,
  SystemSettings,
  RankingLedger,
];

async function syncAllIndexes(): Promise<void> {
  const mongoUri =
    process.env.MONGODB_URI || 'mongodb://localhost:27017/launchproduct';
  const maskedUri = mongoUri.replace(/:[^:@]+@/, ':****@');

  console.log(`[SyncIndexes] Connecting to MongoDB: ${maskedUri}`);

  if (mongoUri.includes('mongodb+srv://')) {
    try {
      const dns = await import('dns');
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch {
      // Ignore if DNS server override is unsupported
    }
  }

  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      autoIndex: false,
    });
    console.log('[SyncIndexes] Connected. Creating schema indexes...');

    for (const Model of models) {
      try {
        await Model.createIndexes();
      } catch (modelErr: any) {
        if (
          modelErr?.code === 86 ||
          modelErr?.codeName === 'IndexKeySpecsConflict' ||
          (modelErr?.message && modelErr.message.includes('IndexKeySpecsConflict'))
        ) {
          console.warn(
            `[SyncIndexes] Index options conflict detected for ${Model.modelName}. Reconciling legacy conflicting indexes...`
          );
          const existingIndexes = await Model.collection.indexes();
          for (const idx of existingIndexes) {
            // Drop legacy sparse index on providerPaymentId or providerEventId if specs changed
            if (
              idx.name !== '_id_' &&
              idx.sparse &&
              (idx.name === 'providerPaymentId_1' || idx.name === 'providerEventId_1')
            ) {
              console.log(
                `[SyncIndexes] Dropping legacy sparse index '${idx.name}' on collection '${Model.collection.collectionName}'...`
              );
              await Model.collection.dropIndex(idx.name);
            }
          }
          // Retry index creation
          await Model.createIndexes();
        } else {
          console.error(
            `[SyncIndexes] ❌ Failed to create indexes for Model '${Model.modelName}' (collection: '${Model.collection.collectionName}'):`,
            modelErr
          );
          await mongoose.disconnect();
          process.exit(1);
        }
      }

      const indexes = await Model.collection.indexes();
      console.log(
        `[SyncIndexes] Model: ${Model.modelName.padEnd(25)} | Collection: ${Model.collection.collectionName.padEnd(25)} | Total Indexes: ${indexes.length}`
      );
    }

    await mongoose.disconnect();
    console.log('[SyncIndexes] ✅ All schema indexes synchronized successfully.');
    process.exit(0);
  } catch (connErr: any) {
    console.error('[SyncIndexes] ❌ Database connection error:', connErr);
    process.exit(1);
  }
}

if (require.main === module) {
  syncAllIndexes();
}

export { syncAllIndexes };
