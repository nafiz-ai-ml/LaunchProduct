import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env file from backend root or monorepo root
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'staging', 'production', 'test']).default('development'),
    PORT: z.string().transform(Number).default('4000'),
    FRONTEND_URL: z.string().optional().default('http://localhost:3000'),
    BACKEND_URL: z.string().optional().default(''),
    MONGODB_URI: z.string().default('mongodb://localhost:27017/launchproduct'),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    EMAIL_FROM: z.string().default('noreply@launchproduct.io'),
    RESEND_API_KEY: z.string().optional().default(''),
    PADDLE_WEBHOOK_SECRET: z.string().optional(),
    METRICS_TOKEN: z.string().optional(),
    BULL_BOARD_USER: z.string().optional(),
    BULL_BOARD_PASSWORD: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production' || data.NODE_ENV === 'staging') {
      const missing: string[] = [];

      if (!data.PADDLE_WEBHOOK_SECRET || data.PADDLE_WEBHOOK_SECRET.trim().length < 32) {
        missing.push('PADDLE_WEBHOOK_SECRET');
      }

      if (missing.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Required production/staging secrets missing or under 32 characters: ${missing.join(', ')}`,
        });
      }
    }
  });

export type Config = z.infer<typeof envSchema>;

export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = envSchema.safeParse(env);

  if (!parsed.success) {
    const errorMessages = parsed.error.issues.map((i) => i.message).join('; ');
    console.error(`❌ Invalid environment configuration: ${errorMessages}`);
    throw new Error(`Invalid environment configuration: ${errorMessages}`);
  }

  return parsed.data;
}

export const config = loadConfig();
export default config;
