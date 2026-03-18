import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().url().optional(),
  ANTHROPIC_API_KEY: z.string().min(10).optional(),
  ANTHROPIC_MODEL: z.string().default("claude-4-5-haiku-latest"),
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

const parsed = envSchema.safeParse({
  DATABASE_URL: process.env.DATABASE_URL,
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
  ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

if (!parsed.success) {
  throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
}

export const env = parsed.data;
export const hasDatabase = Boolean(env.DATABASE_URL);
export const hasAnthropic = Boolean(env.ANTHROPIC_API_KEY);
