import { neon } from "@neondatabase/serverless";
import { env } from "@/lib/config";

export function getSqlClient() {
  if (!env.DATABASE_URL) {
    return null;
  }
  return neon(env.DATABASE_URL);
}
