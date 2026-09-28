import mongoose from 'mongoose';
import { config } from './config';
import { logger } from './logger';

// 3. Set mongoose.set('strictQuery', true)
mongoose.set('strictQuery', true);

let isConnected = false;

/**
 * 1. Connect to MongoDB Atlas using Mongoose 8+
 * 2. Read MONGODB_URI from process.env
 * 4. Configure connection options (serverSelectionTimeoutMS: 5000, socketTimeoutMS: 45000, maxPoolSize: 10, minPoolSize: 2)
 * 5. Listen to connection events (connected, error, disconnected) via Pino logger
 * 6. Export connectDB() async function
 */
export async function connectDB(): Promise<void> {
  if (isConnected) {
    return;
  }

  const mongoUri = process.env.MONGODB_URI || config.MONGODB_URI || 'mongodb://localhost:27017/launchproduct';

  const options: mongoose.ConnectOptions = {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10,
    minPoolSize: 2,
    autoIndex: process.env.NODE_ENV !== 'production',
  };

  // 5. Connection lifecycle event listeners
  mongoose.connection.on('connected', () => {
    isConnected = true;
    logger.info('MongoDB connection established successfully');
  });

  mongoose.connection.on('error', (err) => {
    logger.error({ err }, 'MongoDB connection error');
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('MongoDB connection disconnected');
  });

  if (mongoUri.includes('mongodb+srv://')) {
    try {
      const dns = await import('dns');
      dns.setServers(['8.8.8.8', '1.1.1.1']);
    } catch {
      // Ignore if DNS override fails
    }
  }

  try {
    await mongoose.connect(mongoUri, options);
  } catch (error: any) {
    if (error?.message?.includes('querySrv') || error?.code === 'ECONNREFUSED') {
      try {
        const dns = await import('dns');
        dns.setServers(['8.8.8.8', '1.1.1.1']);
        logger.info('Retrying MongoDB connection using Google public DNS (8.8.8.8)...');
        await mongoose.connect(mongoUri, options);
        return;
      } catch (retryErr) {
        logger.error({ retryErr }, 'MongoDB Atlas connection retry failed');
      }
    }
    logger.error({ error }, 'Failed to connect to MongoDB');
    if (process.env.NODE_ENV === 'production') {
      throw error;
    }
  }
}

export function isDBConnected(): boolean {
  return mongoose.connection.readyState === 1;
}

export async function disconnectDB(): Promise<void> {
  if (isConnected || mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    isConnected = false;
    logger.info('MongoDB disconnected cleanly');
  }
}

// 7. Handle graceful shutdown on SIGINT/SIGTERM: close Mongoose connection and exit
process.on('SIGINT', async () => {
  logger.info('SIGINT signal received: closing MongoDB connection...');
  await disconnectDB();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('SIGTERM signal received: closing MongoDB connection...');
  await disconnectDB();
  process.exit(0);
});

export default connectDB;
