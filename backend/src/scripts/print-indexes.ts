import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

async function printIndexes(): Promise<void> {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/launchproduct';
  if (mongoUri.includes('mongodb+srv://')) {
    try {
      const dns = await import('dns');
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch {}
  }

  await mongoose.connect(mongoUri);
  const db = mongoose.connection.db!;

  const collections = ['payments', 'paymentwebhookevents', 'products'];

  for (const collName of collections) {
    const indexes = await db.collection(collName).indexes();
    console.log(`\n=================== INDEXES FOR: ${collName.toUpperCase()} ===================`);
    console.log(JSON.stringify(indexes, null, 2));
  }

  await mongoose.disconnect();
}

printIndexes().catch((err) => {
  console.error(err);
  process.exit(1);
});
