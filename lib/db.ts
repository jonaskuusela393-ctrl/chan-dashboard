import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

export const sql = databaseUrl
  ? neon(databaseUrl)
  : (() => {
      // fallback dummy query (prevents build crash)
      return async () => [];
    })() as any;