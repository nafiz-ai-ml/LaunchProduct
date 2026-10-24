import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

import { Product } from '../models/Product.model';
import { ProductStatus } from '../shared/constants';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0]?.toLowerCase().trim();
  const slug = args[1]?.toLowerCase().trim();

  const validCommands = ['suspend', 'unsuspend', 'delete'];

  if (!command || !slug || !validCommands.includes(command)) {
    console.error('Usage: npm run moderate <suspend|unsuspend|delete> <slug>');
    process.exit(1);
  }

  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/launchproduct';

  console.log(`[Moderate] Connecting to MongoDB: ${mongoUri.replace(/:[^:@]+@/, ':****@')}`);
  await mongoose.connect(mongoUri);

  try {
    const product = await Product.findOne({ slug });
    if (!product) {
      console.error(`[Moderate] Error: Product with slug '${slug}' not found.`);
      process.exit(1);
    }

    const previousStatus = product.status;

    if (command === 'suspend') {
      product.status = ProductStatus.SUSPENDED;
      await product.save();
      console.log(`[Moderate] Product '${slug}' transitioned from ${previousStatus} -> ${ProductStatus.SUSPENDED}`);
    } else if (command === 'unsuspend') {
      // If product has qualifying ranking payments, restore to LIVE; otherwise DRAFT
      const newStatus = (product.paidRankingAmountCents && product.paidRankingAmountCents > 0)
        ? ProductStatus.LIVE
        : ProductStatus.DRAFT;
      product.status = newStatus;
      await product.save();
      console.log(`[Moderate] Product '${slug}' un-suspended: ${previousStatus} -> ${newStatus}`);
    } else if (command === 'delete') {
      product.status = ProductStatus.DELETED;
      await product.save();
      console.log(`[Moderate] Product '${slug}' transitioned from ${previousStatus} -> ${ProductStatus.DELETED}`);
    }

    process.exit(0);
  } catch (err: any) {
    console.error(`[Moderate] Execution failed: ${err.message}`);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
  }
}

main();
