import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users, authAttempts } from "@/db/schema";
import {
  apiError,
  ApiError,
  checkOrigin,
  currentUser,
  destroySession,
  hashPassword,
  makeSession,
  supabaseEnabled,
  verifyPassword,
} from "@/lib/auth-server";
import { createDemo } from "@/lib/demo";
export async function GET(req: Request) {
  try {
    return Response.json({
      user: await currentUser(req),
      supabase: supabaseEnabled,
    });
  } catch (e) {
    return apiError(e);
  }
}
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const body = await req.json();
    if (supabaseEnabled) throw new ApiError("请使用 Supabase 登录", 400);
    if (body.action === "logout") {
      await destroySession();
      return Response.json({ ok: true });
    }
    if (body.action === "demo") {
      if (process.env.VERCEL || process.env.DISABLE_DEMO === "true")
        throw new ApiError("体验模式已关闭", 403);
      const existing = await currentUser(req);
      if (existing) return Response.json({ ok: true });
      const id = await createDemo();
      await makeSession(id);
      return Response.json({ ok: true });
    }
    const parsed = z
      .object({
        action: z.enum(["login", "register"]),
        email: z.email().max(254),
        password: z.string().min(8).max(128),
      })
      .safeParse(body);
    if (!parsed.success) throw new ApiError("请输入有效邮箱和至少 8 位密码");
    const { action, password } = parsed.data;
    const email = parsed.data.email.toLowerCase().trim();
    const [attempt] = await db
      .insert(authAttempts)
      .values({
        key: email,
        count: "1",
        resetAt: new Date(Date.now() + 900000),
      })
      .onConflictDoUpdate({
        target: authAttempts.key,
        set: {
          count: sql`case when ${authAttempts.resetAt} < now() then 1 else ${authAttempts.count}+1 end`,
          resetAt: sql`case when ${authAttempts.resetAt} < now() then now()+interval '15 minutes' else ${authAttempts.resetAt} end`,
        },
      })
      .returning();
    if (Number(attempt.count) > 15)
      throw new ApiError("尝试次数过多，请 15 分钟后重试", 429);
    const [existing] = await db
      .select()
      .from(users)
      .where(eq(users.email, email));
    if (action === "register") {
      if (existing) throw new ApiError("该邮箱无法注册，请尝试登录");
      const [user] = await db
        .insert(users)
        .values({ email, passwordHash: await hashPassword(password) })
        .returning();
      await destroySession();
      await makeSession(user.id);
    } else {
      if (
        !existing ||
        existing.isDemo ||
        !(await verifyPassword(password, existing.passwordHash))
      )
        throw new ApiError("邮箱或密码错误", 401);
      await destroySession();
      await makeSession(existing.id);
    }
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
