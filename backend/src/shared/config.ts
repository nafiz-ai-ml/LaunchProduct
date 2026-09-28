import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file from backend root or monorepo root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('4000'),
  FRONTEND_URL: z.string().optional().default('http://localhost:3000'),
  BACKEND_URL: z.string().optional().default(''),
  MONGODB_URI: z.string().default('mongodb://localhost:27017/launchproduct'),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_SECRET: z.string().min(16).default('dev_jwt_secret_launchproduct_minimum_64_characters_hash_key_12345'),
  SESSION_COOKIE_SECRET: z.string().min(16).default('dev_session_cookie_secret_launchproduct_minimum_64_characters_key_secure_67890'),
  EMAIL_FROM: z.string().default('noreply@launchproduct.io'),
  RESEND_API_KEY: z.string().optional().default(''),
  OPENAI_API_KEY: z.string().optional().default(''),
  OPENAI_BASE_URL: z.string().optional().default(''),
  OPENAI_MODEL: z.string().optional().default('gpt-4o'),
  PADDLE_WEBHOOK_SECRET: z.string().optional().default(''),
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GITHUB_CLIENT_ID: z.string().optional().default(''),
  GITHUB_CLIENT_SECRET: z.string().optional().default(''),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', JSON.stringify(parsed.error.format(), null, 2));
  throw new Error('Invalid environment configuration');
}

export const config = parsed.data;
