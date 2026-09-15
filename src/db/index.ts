import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL?.trim();
export const databaseConfigured = Boolean(databaseUrl);

const globalForDb = globalThis as typeof globalThis & {
  __youJilePostgresqlPool?: Pool;
};

export const pool = databaseConfigured
  ? (globalForDb.__youJilePostgresqlPool ??
      new Pool({
        connectionString: databaseUrl,
        max: 5,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      }))
  : null;

if (process.env.NODE_ENV !== "production" && pool) {
  globalForDb.__youJilePostgresqlPool = pool;
}

// Cloud/Supabase mode performs ledger CRUD through supabase-js + RLS and does
// not require DATABASE_URL. Local-account/API mode still uses Drizzle.  Keep
// imports build-safe when DATABASE_URL is intentionally absent, and fail only
// if a local API path actually touches the database.
const unavailableDb = new Proxy({} as ReturnType<typeof drizzle>, {
  get() {
    throw new Error(
      "DATABASE_URL is not configured. Supabase cloud mode can run without it; local database API mode cannot.",
    );
  },
});

export const db = pool ? drizzle(pool) : unavailableDb;
