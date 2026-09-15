import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const hasSupabase = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
);

let client: SupabaseClient | null = null;

export function getSupabase() {
  if (!hasSupabase) return null;
  if (!client) {
    client = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      },
    );
  }
  return client;
}

export function friendlySupabaseError(
  error: { message?: string; code?: string } | null | undefined,
  fallback = "操作失败，请稍后重试",
) {
  const raw = `${error?.message ?? ""}`.trim();
  const lower = raw.toLowerCase();
  if (!raw) return fallback;
  if (lower.includes("invalid login credentials")) return "邮箱或密码错误";
  if (lower.includes("email not confirmed")) return "邮箱还没有完成验证，请先打开确认邮件";
  if (lower.includes("email rate limit exceeded")) return "邮件发送过于频繁，请稍后再试";
  if (lower.includes("user already registered")) return "这个邮箱已经注册过，请直接登录";
  if (lower.includes("password should be at least")) return "密码至少需要 8 位字符";
  if (lower.includes("same password")) return "新密码不能与当前密码相同";
  if (lower.includes("jwt expired") || lower.includes("invalid jwt")) return "登录已过期，请重新登录";
  if (lower.includes("failed to fetch") || lower.includes("network")) return "网络连接失败，请检查网络后重试";
  if (lower.includes("row-level security") || lower.includes("rls")) return "没有权限访问这笔数据，请重新登录后重试";
  if (lower.includes("duplicate key")) return "这条记录已经存在，请刷新后重试";
  if (lower.includes("schema cache") && lower.includes("profiles")) return "个人资料功能尚未初始化：请在 Supabase SQL Editor 执行 supabase/repair_1_0_1.sql";
  if (lower.includes("bucket not found")) return "头像存储尚未初始化：请在 Supabase SQL Editor 执行 supabase/repair_1_0_1.sql";
  if (lower.includes("relation") && lower.includes("does not exist")) return "云端数据表尚未完成升级，请执行项目里的 Supabase 升级脚本";
  if (lower.includes("column") && lower.includes("does not exist")) return "云端数据结构版本较旧，请执行项目里的 Supabase 升级脚本";
  return raw || fallback;
}
