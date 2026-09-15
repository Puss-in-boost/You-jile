"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import type { User, Transaction, CategoryRule, Draft } from "@/types";
import {
  getUser,
  getTransactions,
  request,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  restoreTransaction,
} from "@/lib/transactions";
import { getSupabase, hasSupabase } from "@/lib/supabase";
let boot: Promise<{ user: User | null; supabase: boolean }> | null = null;
function bootstrap() {
  if (!boot)
    boot = (async () => {
      let result = await getUser();
      if (!result.user && !result.supabase) {
        try {
          await request("/api/auth", {
            method: "POST",
            body: JSON.stringify({ action: "demo" }),
          });
          result = await getUser();
        } catch {
          window.location.assign("/login");
        }
      }
      return result;
    })().catch((e) => {
      boot = null;
      throw e;
    });
  return boot;
}
export function useLedger() {
  const [user, setUser] = useState<User | null>(null);
  const [rows, setRows] = useState<Transaction[]>([]);
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [lastDeleted, setLastDeleted] = useState<Transaction | null>(null);
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const version = useRef(0);
  const deletionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const refresh = useCallback(async () => {
    const v = ++version.current;
    const data = await getTransactions();
    if (v === version.current) {
      setRows(data.transactions);
      setRules(data.rules);
      setError("");
    }
  }, []);
  const refreshUser = useCallback(async () => {
    const result = await getUser();
    if (result.user) setUser(result.user);
    return result.user;
  }, []);
  useEffect(() => {
    let active = true;
    bootstrap()
      .then(async (result) => {
        if (!active) return;
        if (!result.user) {
          window.location.replace("/login");
          return;
        }
        setUser(result.user);
        await refresh();
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [refresh]);
  useEffect(() => {
    if (!user) return;
    const sync = () => {
      if (document.visibilityState === "visible")
        refresh().catch((e) => setError(e.message));
    };
    const interval = setInterval(sync, 15000);
    window.addEventListener("focus", sync);
    window.addEventListener("online", sync);
    const client = getSupabase();
    const channel = client
      ?.channel(`ledger-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${user.id}`,
        },
        sync,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "user_category_rules",
          filter: `user_id=eq.${user.id}`,
        },
        sync,
      )
      .subscribe();
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", sync);
      window.removeEventListener("online", sync);
      if (channel) void client?.removeChannel(channel);
    };
  }, [user, refresh]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 4200);
    return () => clearTimeout(timer);
  }, [toast]);
  const save = async (draft: Draft, id?: string): Promise<{ ok: boolean; error?: string }> => {
    if (lock.current) return { ok: false, error: "正在保存上一笔账，请稍候" };
    lock.current = true;
    setBusy(true);
    try {
      const row = id
        ? await updateTransaction(id, draft)
        : await createTransaction(draft);
      ++version.current;
      setRows((prev) =>
        [row, ...prev.filter((t) => t.id !== row.id)].sort(
          (a, b) =>
            b.date.localeCompare(a.date) ||
            b.createdAt.localeCompare(a.createdAt),
        ),
      );
      setToast(
        id
          ? "账单已更新，分类偏好会在下次记账时生效"
          : `${draft.type === "expense" ? "又寄了" : "到账了"} ¥${draft.amount} ${draft.emoji}`,
      );
      await refresh().catch(() => setError("账单已保存，刷新暂时失败，请重试"));
      return { ok: true };
    } catch (e) {
      const message = e instanceof Error ? e.message : "保存失败";
      setToast(message);
      return { ok: false, error: message };
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const saveMany = async (drafts: Draft[]): Promise<{ ok: boolean; saved: number; error?: string }> => {
    if (!drafts.length) return { ok: true, saved: 0 };
    if (lock.current) return { ok: false, saved: 0, error: "正在保存上一笔账，请稍候" };
    lock.current = true;
    setBusy(true);
    const savedRows: Transaction[] = [];
    const mergeSavedRows = () => {
      if (!savedRows.length) return;
      ++version.current;
      const savedIds = new Set(savedRows.map((row) => row.id));
      setRows((prev) =>
        [...savedRows, ...prev.filter((row) => !savedIds.has(row.id))].sort(
          (a, b) =>
            b.date.localeCompare(a.date) ||
            b.createdAt.localeCompare(a.createdAt),
        ),
      );
    };
    try {
      for (const draft of drafts) {
        savedRows.push(await createTransaction(draft));
      }
      mergeSavedRows();
      setToast(`已补记 ${savedRows.length} 笔账`);
      await refresh().catch(() => setError("账单已保存，刷新暂时失败，请重试"));
      return { ok: true, saved: savedRows.length };
    } catch (e) {
      mergeSavedRows();
      const message = e instanceof Error ? e.message : "批量保存失败";
      if (savedRows.length) {
        setToast(`已保存 ${savedRows.length} 笔，后续保存中断`);
        await refresh().catch(() => {});
      } else {
        setToast(message);
      }
      return { ok: false, saved: savedRows.length, error: message };
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const remove = async (row: Transaction) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      const deleted = await deleteTransaction(row.id);
      ++version.current;
      setRows((prev) => prev.filter((t) => t.id !== row.id));
      setLastDeleted(deleted);
      if (deletionTimer.current) clearTimeout(deletionTimer.current);
      deletionTimer.current = setTimeout(() => setLastDeleted(null), 10000);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "删除失败");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const undo = async () => {
    if (!lastDeleted || lock.current) return;
    lock.current = true;
    setBusy(true);
    try {
      await restoreTransaction(lastDeleted);
      setLastDeleted(null);
      if (deletionTimer.current) clearTimeout(deletionTimer.current);
      await refresh();
      setToast("账单已恢复");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "恢复失败");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const logout = async () => {
    try {
      if (hasSupabase) {
        const result = await getSupabase()!.auth.signOut();
        if (result.error) throw result.error;
      } else
        await request("/api/auth", {
          method: "POST",
          body: JSON.stringify({ action: "logout" }),
        });
      boot = null;
      window.location.assign("/login");
    } catch {
      setToast("退出失败，请重试");
    }
  };
  return {
    user,
    rows,
    rules,
    loading,
    error,
    toast,
    setToast,
    lastDeleted,
    busy,
    refresh,
    refreshUser,
    save,
    saveMany,
    remove,
    undo,
    logout,
  };
}
