import { friendlySupabaseError, getSupabase, hasSupabase } from "./supabase";
import {
  getDisplayEmoji,
  normalize,
  normalizeCategoryPair,
} from "./categories";
import { draftSchema } from "./validation";
import type { Draft, Transaction, CategoryRule, User } from "@/types";

function requireSupabase() {
  const client = getSupabase();
  if (!client) throw new Error("Supabase 尚未配置");
  return client;
}

async function currentSupabaseUser() {
  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error) throw new Error(friendlySupabaseError(error, "登录状态读取失败"));
  if (!data.user) throw new Error("登录已过期，请重新登录");
  return data.user;
}

function mapTransaction(row: Record<string, unknown>): Transaction {
  const pair = normalizeCategoryPair(
    String(row.category),
    String(row.subcategory ?? ""),
  );
  return {
    id: String(row.id),
    userId: String(row.user_id),
    type: row.type as Transaction["type"],
    amount: String(row.amount),
    category: pair.category,
    subcategory: pair.subcategory,
    emoji: getDisplayEmoji(pair.category, pair.subcategory),
    title: String(row.title),
    date: String(row.transaction_date),
    source: row.source as Transaction["source"],
    account: String(row.account ?? "未指定"),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at ?? row.created_at),
  };
}

function mapRule(row: Record<string, unknown>): CategoryRule {
  const pair = normalizeCategoryPair(
    String(row.category),
    String(row.subcategory ?? ""),
  );
  return {
    id: String(row.id),
    keyword: String(row.keyword),
    normalizedKeyword: String(row.normalized_keyword),
    category: pair.category,
    subcategory: pair.subcategory,
  };
}

function editableDraft(draft: Draft): Draft {
  // Only validate fields that are actually editable. Transaction objects also
  // carry id / userId / createdAt / updatedAt metadata; feeding those runtime
  // fields back into the draft validator made edits depend on timestamp format.
  return {
    type: draft.type,
    amount: draft.amount,
    category: draft.category,
    subcategory: draft.subcategory,
    emoji: draft.emoji,
    title: draft.title,
    date: draft.date,
    source: draft.source,
    account: draft.account,
  };
}

function draftValidationMessage(error: { issues?: Array<{ path?: PropertyKey[]; message?: string }> }) {
  const issue = error.issues?.[0];
  const field = issue?.path?.[0];
  const labels: Record<string, string> = {
    amount: "金额",
    category: "一级分类",
    subcategory: "细分类",
    title: "标题",
    date: "日期",
    source: "来源",
    account: "支付账户",
  };
  return field ? `${labels[String(field)] ?? String(field)}无效，请检查后重试` : "账单内容无效，请检查后重试";
}

function throwSupabase(error: { message?: string; code?: string } | null, fallback: string): never {
  throw new Error(friendlySupabaseError(error, fallback));
}

export async function request<T>(
  url: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  headers.set("Content-Type", "application/json");
  const client = getSupabase();
  if (client) {
    const { data } = await client.auth.getSession();
    if (data.session)
      headers.set("Authorization", `Bearer ${data.session.access_token}`);
  }
  const response = await fetch(url, { ...options, headers, cache: "no-store" });
  const raw = await response.text();
  let data: unknown = null;
  if (raw.trim()) {
    try {
      data = JSON.parse(raw);
    } catch {
      if (!response.ok) {
        throw new Error(`服务器返回了无法解析的响应（HTTP ${response.status}）`);
      }
      throw new Error("服务器返回了无法解析的数据，请检查本地数据库/API 配置");
    }
  }
  if (!response.ok) {
    if (response.status === 401 && !url.includes("/auth"))
      window.location.assign("/login");
    const message =
      data && typeof data === "object" && "error" in data
        ? String((data as { error?: unknown }).error || "")
        : "";
    throw new Error(
      message ||
        (response.status >= 500
          ? "服务端暂时不可用，请稍后重试"
          : `操作失败（HTTP ${response.status}）`),
    );
  }
  if (!raw.trim()) return undefined as T;
  return data as T;
}

export async function getTransactions(): Promise<{
  transactions: Transaction[];
  rules: CategoryRule[];
}> {
  if (!hasSupabase) {
    return request<{ transactions: Transaction[]; rules: CategoryRule[] }>(
      "/api/transactions",
    );
  }

  const client = requireSupabase();
  const user = await currentSupabaseUser();
  const [transactionsResult, rulesResult] = await Promise.all([
    client
      .from("transactions")
      .select("*")
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })
      .order("created_at", { ascending: false }),
    client
      .from("user_category_rules")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
  ]);

  if (transactionsResult.error)
    throwSupabase(transactionsResult.error, "读取账单失败");
  if (rulesResult.error) throwSupabase(rulesResult.error, "读取分类规则失败");

  return {
    transactions: (transactionsResult.data ?? []).map((row) =>
      mapTransaction(row as Record<string, unknown>),
    ),
    rules: (rulesResult.data ?? []).map((row) =>
      mapRule(row as Record<string, unknown>),
    ),
  };
}

export async function createTransaction(draft: Draft): Promise<Transaction> {
  if (!hasSupabase) {
    return request<Transaction>("/api/transactions", {
      method: "POST",
      body: JSON.stringify(draft),
    });
  }

  const parsed = draftSchema.safeParse(editableDraft(draft));
  if (!parsed.success) throw new Error(draftValidationMessage(parsed.error));
  const client = requireSupabase();
  const user = await currentSupabaseUser();
  const payload = parsed.data;
  const pair = normalizeCategoryPair(payload.category, payload.subcategory);
  const { data, error } = await client
    .from("transactions")
    .insert({
      user_id: user.id,
      type: payload.type,
      amount: payload.amount,
      category: pair.category,
      subcategory: pair.subcategory,
      emoji: getDisplayEmoji(pair.category, pair.subcategory),
      title: payload.title,
      transaction_date: payload.date,
      source: payload.source,
      account: payload.account,
    })
    .select("*")
    .single();
  if (error || !data) throwSupabase(error, "保存账单失败");
  return mapTransaction(data as Record<string, unknown>);
}

export async function updateTransaction(
  id: string,
  draft: Draft,
): Promise<Transaction> {
  if (!hasSupabase) {
    return request<Transaction>("/api/transactions", {
      method: "PUT",
      body: JSON.stringify({ ...draft, id }),
    });
  }

  const parsed = draftSchema.safeParse(editableDraft(draft));
  if (!parsed.success) throw new Error(draftValidationMessage(parsed.error));
  const client = requireSupabase();
  const user = await currentSupabaseUser();

  const { data: old, error: oldError } = await client
    .from("transactions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (oldError) throwSupabase(oldError, "读取原账单失败");
  if (!old) throw new Error("账单不存在或已被删除");

  const payload = parsed.data;
  const pair = normalizeCategoryPair(payload.category, payload.subcategory);
  const oldPair = normalizeCategoryPair(
    String(old.category),
    String(old.subcategory ?? ""),
  );
  const { data, error } = await client
    .from("transactions")
    .update({
      type: payload.type,
      amount: payload.amount,
      category: pair.category,
      subcategory: pair.subcategory,
      emoji: getDisplayEmoji(pair.category, pair.subcategory),
      title: payload.title,
      transaction_date: payload.date,
      source: payload.source,
      account: payload.account,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (error || !data) throwSupabase(error, "更新账单失败");

  if (
    oldPair.category !== pair.category ||
    oldPair.subcategory !== pair.subcategory
  ) {
    const keyword = String(old.title);
    const { error: ruleError } = await client.from("user_category_rules").upsert(
      {
        user_id: user.id,
        keyword,
        normalized_keyword: normalize(keyword),
        category: pair.category,
        subcategory: pair.subcategory,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,normalized_keyword" },
    );
    if (ruleError) console.warn("分类偏好保存失败", friendlySupabaseError(ruleError));
  }

  return mapTransaction(data as Record<string, unknown>);
}

export async function deleteTransaction(id: string): Promise<Transaction> {
  if (!hasSupabase) {
    return request<Transaction>(`/api/transactions?id=${id}`, {
      method: "DELETE",
    });
  }

  const client = requireSupabase();
  const user = await currentSupabaseUser();
  const { data, error } = await client
    .from("transactions")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id)
    .select("*")
    .single();
  if (error || !data) throwSupabase(error, "删除账单失败");
  return mapTransaction(data as Record<string, unknown>);
}

export async function restoreTransaction(row: Transaction): Promise<Transaction> {
  if (!hasSupabase) {
    return request<Transaction>("/api/transactions", {
      method: "POST",
      body: JSON.stringify(row),
    });
  }

  const client = requireSupabase();
  const user = await currentSupabaseUser();
  const pair = normalizeCategoryPair(row.category, row.subcategory);
  const { data, error } = await client
    .from("transactions")
    .insert({
      id: row.id,
      user_id: user.id,
      type: row.type,
      amount: row.amount,
      category: pair.category,
      subcategory: pair.subcategory,
      emoji: getDisplayEmoji(pair.category, pair.subcategory),
      title: row.title,
      transaction_date: row.date,
      source: row.source,
      account: row.account,
      created_at: row.createdAt,
      updated_at: row.updatedAt,
    })
    .select("*")
    .single();
  if (error || !data) throwSupabase(error, "恢复账单失败");
  return mapTransaction(data as Record<string, unknown>);
}

function fallbackProfile(email: string) {
  return {
    displayName: email.split("@")[0] || "又寄了用户",
    avatarUrl: "",
    avatarPath: "",
    defaultAccount: "未指定",
    currency: "CNY",
  };
}

async function signedAvatarUrl(path: string) {
  if (!path) return "";
  const client = requireSupabase();
  const { data, error } = await client.storage.from("avatars").createSignedUrl(path, 3600);
  if (error) return "";
  return data?.signedUrl ?? "";
}

export async function getUser(): Promise<{ user: User | null; supabase: boolean }> {
  if (!hasSupabase) {
    return request<{ user: User | null; supabase: boolean }>("/api/auth");
  }

  const client = requireSupabase();
  const { data, error } = await client.auth.getUser();
  if (error) {
    return { user: null, supabase: true };
  }
  if (!data.user) return { user: null, supabase: true };

  const email = data.user.email || "";
  const fallback = fallbackProfile(email);
  const { data: profile, error: profileError } = await client
    .from("profiles")
    .select("display_name,avatar_path,default_account,currency")
    .eq("user_id", data.user.id)
    .maybeSingle();

  let resolved = profile as Record<string, unknown> | null;
  if (profileError) {
    const message = profileError.message.toLowerCase();
    if (!message.includes("profiles") && !message.includes("does not exist")) {
      console.warn("个人资料读取失败", friendlySupabaseError(profileError));
    }
  } else if (!profile) {
    const { data: inserted, error: insertError } = await client
      .from("profiles")
      .upsert({
        user_id: data.user.id,
        display_name: fallback.displayName,
        default_account: fallback.defaultAccount,
        currency: fallback.currency,
      })
      .select("display_name,avatar_path,default_account,currency")
      .single();
    if (!insertError) resolved = inserted as Record<string, unknown>;
  }

  const avatarPath = String(resolved?.avatar_path ?? "");
  const avatarUrl = await signedAvatarUrl(avatarPath);
  return {
    user: {
      id: data.user.id,
      email,
      isDemo: false,
      displayName: String(resolved?.display_name ?? fallback.displayName),
      avatarUrl,
      avatarPath,
      defaultAccount: String(resolved?.default_account ?? fallback.defaultAccount),
      currency: String(resolved?.currency ?? fallback.currency),
    },
    supabase: true,
  };
}

export async function updateUserProfile(input: {
  displayName: string;
  defaultAccount: string;
  currency?: string;
}) {
  if (!hasSupabase) throw new Error("云端账号未启用，无法编辑个人资料");
  const displayName = input.displayName.trim();
  if (!displayName) throw new Error("昵称不能为空");
  if (displayName.length > 40) throw new Error("昵称最多 40 个字符");
  const client = requireSupabase();
  const user = await currentSupabaseUser();
  const { error } = await client.from("profiles").upsert({
    user_id: user.id,
    display_name: displayName,
    default_account: input.defaultAccount,
    currency: input.currency || "CNY",
    updated_at: new Date().toISOString(),
  });
  if (error) throwSupabase(error, "个人资料保存失败");
}

export async function uploadUserAvatar(file: File) {
  if (!hasSupabase) throw new Error("云端账号未启用，无法上传头像");
  if (!file.type.match(/^image\/(jpeg|png|webp)$/)) {
    throw new Error("头像只支持 JPG、PNG 或 WebP");
  }
  if (file.size > 3 * 1024 * 1024) throw new Error("头像大小不能超过 3MB");
  const client = requireSupabase();
  const user = await currentSupabaseUser();
  const { data: existingProfile } = await client
    .from("profiles")
    .select("avatar_path")
    .eq("user_id", user.id)
    .maybeSingle();
  const previousPath = String(existingProfile?.avatar_path ?? "");
  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${user.id}/avatar.${ext}`;
  const { error: uploadError } = await client.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type, cacheControl: "3600" });
  if (uploadError) throwSupabase(uploadError, "头像上传失败");
  const { error: profileError } = await client.from("profiles").upsert({
    user_id: user.id,
    avatar_path: path,
    updated_at: new Date().toISOString(),
  });
  if (profileError) throwSupabase(profileError, "头像保存失败");
  if (previousPath && previousPath !== path) {
    await client.storage.from("avatars").remove([previousPath]);
  }
  return path;
}

export async function removeUserAvatar() {
  if (!hasSupabase) return;
  const client = requireSupabase();
  const user = await currentSupabaseUser();
  const { data: profile } = await client
    .from("profiles")
    .select("avatar_path")
    .eq("user_id", user.id)
    .maybeSingle();
  const avatarPath = String(profile?.avatar_path ?? "");
  if (avatarPath) await client.storage.from("avatars").remove([avatarPath]);
  const { error } = await client
    .from("profiles")
    .upsert({ user_id: user.id, avatar_path: "", updated_at: new Date().toISOString() });
  if (error) throwSupabase(error, "头像移除失败");
}

export async function upsertUserCategoryRule(
  keyword: string,
  category: string,
  subcategory = "",
) {
  if (!hasSupabase) {
    return request("/api/rules", {
      method: "POST",
      body: JSON.stringify({ keyword, category, subcategory }),
    });
  }

  const trimmed = keyword.trim();
  if (!trimmed) throw new Error("请输入关键词");
  const pair = normalizeCategoryPair(category, subcategory);
  const client = requireSupabase();
  const user = await currentSupabaseUser();
  const { data, error } = await client
    .from("user_category_rules")
    .upsert(
      {
        user_id: user.id,
        keyword: trimmed,
        normalized_keyword: normalize(trimmed),
        category: pair.category,
        subcategory: pair.subcategory,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,normalized_keyword" },
    )
    .select("*")
    .single();
  if (error) throwSupabase(error, "分类偏好保存失败");
  return data;
}

export async function deleteUserCategoryRule(id: string) {
  if (!hasSupabase) {
    return request(`/api/rules?id=${id}`, { method: "DELETE" });
  }

  const client = requireSupabase();
  const user = await currentSupabaseUser();
  const { error } = await client
    .from("user_category_rules")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throwSupabase(error, "删除分类偏好失败");
  return { ok: true };
}
