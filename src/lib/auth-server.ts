import {
  randomBytes,
  createHash,
  scrypt as scryptCallback,
  timingSafeEqual,
} from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { and, eq, gt, sql } from "drizzle-orm";
import { createClient } from "@supabase/supabase-js";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import type { User } from "@/types";
const scrypt = promisify(scryptCallback);
export const supabaseEnabled = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);
export class ApiError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export function checkOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (
    origin &&
    origin !== new URL(req.url).origin &&
    new URL(origin).host !== req.headers.get("host") &&
    new URL(origin).host !== req.headers.get("x-forwarded-host")
  )
    throw new ApiError("请求来源不受信任", 403);
}
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}
export async function verifyPassword(password: string, stored: string) {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const result = (await scrypt(password, salt, 64)) as Buffer;
  return timingSafeEqual(result, Buffer.from(hash, "hex"));
}
const digest = (token: string) =>
  createHash("sha256").update(token).digest("hex");
export async function makeSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  await db
    .insert(sessions)
    .values({
      token: digest(token),
      userId,
      expiresAt: new Date(Date.now() + 30 * 86400000),
    });
  (await cookies()).set("youjile_session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 30 * 86400,
  });
}
export async function destroySession() {
  const jar = await cookies();
  const token = jar.get("youjile_session")?.value;
  if (token) await db.delete(sessions).where(eq(sessions.token, digest(token)));
  jar.delete("youjile_session");
}
export async function currentUser(req: Request): Promise<User | null> {
  if (supabaseEnabled) {
    const token = req.headers.get("authorization")?.replace(/^Bearer /, "");
    if (!token) return null;
    const client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return null;
    return { id: data.user.id, email: data.user.email || "", isDemo: false };
  }
  const token = (await cookies()).get("youjile_session")?.value;
  if (!token) return null;
  const [row] = await db
    .select({ id: users.id, email: users.email, isDemo: users.isDemo })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(
      and(
        eq(sessions.token, digest(token)),
        gt(sessions.expiresAt, new Date()),
      ),
    );
  return row || null;
}
export async function requireUser(req: Request) {
  const user = await currentUser(req);
  if (!user) throw new ApiError("登录已过期，请重新登录", 401);
  return user;
}
export type DatabaseTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];
export async function withUser<T>(
  userId: string,
  fn: (tx: DatabaseTransaction) => Promise<T>,
): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('request.jwt.claim.sub', ${userId}, true)`,
    );
    if (supabaseEnabled) {
      await tx.execute(
        sql`select set_config('request.jwt.claims', ${JSON.stringify({ sub: userId, role: "authenticated" })}, true)`,
      );
      await tx.execute(sql`set local role authenticated`);
    } else {
      await tx.execute(sql`set local role ledger_user`);
    }
    return fn(tx);
  });
}
export function apiError(error: unknown) {
  if (error instanceof ApiError)
    return Response.json({ error: error.message }, { status: error.status });
  console.error("[API]", error);
  return Response.json(
    { error: "服务暂时不可用，请稍后重试。数据未确认保存。" },
    { status: 500 },
  );
}
