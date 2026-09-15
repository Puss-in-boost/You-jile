import { databaseConfigured, db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabaseConfigured = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );

  if (!databaseConfigured) {
    return Response.json({
      ok: supabaseConfigured,
      mode: supabaseConfigured ? "supabase-direct" : "unconfigured",
      database: false,
      supabase: supabaseConfigured,
    }, { status: supabaseConfigured ? 200 : 503 });
  }

  try {
    await db.execute(sql`select 1`);
    return Response.json({
      ok: true,
      mode: supabaseConfigured ? "supabase+database" : "local-database",
      database: true,
      supabase: supabaseConfigured,
    });
  } catch {
    return Response.json({
      ok: false,
      mode: "database-error",
      database: true,
      supabase: supabaseConfigured,
    }, { status: 500 });
  }
}
