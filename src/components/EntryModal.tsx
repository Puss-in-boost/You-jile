"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Sparkles, Trash2, X } from "lucide-react";
import {
  accounts,
  categories,
  getDisplayEmoji,
  getSubcategories,
} from "@/lib/categories";
import { localDate } from "@/lib/dates";
import type { Draft, Transaction } from "@/types";

function cleanAmountInput(value: string) {
  const normalized = value.replace(/，/g, ".").replace(/[^0-9.]/g, "");
  const [whole = "", ...rest] = normalized.split(".");
  const decimal = rest.join("").slice(0, 2);
  return rest.length ? `${whole}.${decimal}` : whole;
}

function defaultTitle(form: Draft) {
  if (form.title.trim()) return form.title.trim();
  if (form.subcategory) return form.subcategory;
  return form.category || (form.type === "income" ? "收入" : "支出");
}

export function EntryModal({
  initial,
  busy,
  defaultAccount = "未指定",
  onClose,
  onSave,
  onDelete,
}: {
  initial?: Transaction;
  busy: boolean;
  defaultAccount?: string;
  onClose: () => void;
  onSave: (draft: Draft, id?: string) => Promise<{ ok: boolean; error?: string }>;
  onDelete: (row: Transaction) => Promise<void>;
}) {
  const [form, setForm] = useState<Draft>(() =>
    initial
      ? {
          type: initial.type,
          amount: initial.amount,
          category: initial.category,
          subcategory: initial.subcategory,
          emoji: initial.emoji,
          title: initial.title,
          date: initial.date,
          source: initial.source,
          account: initial.account,
        }
      : {
          type: "expense",
          amount: "",
          category: "餐饮",
          subcategory: "正餐",
          emoji: "🍜",
          title: "",
          date: localDate(),
          source: "manual",
          account: accounts.includes(defaultAccount) ? defaultAccount : "未指定",
        },
  );
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [formError, setFormError] = useState("");
  const dialog = useRef<HTMLDivElement>(null);
  const subcategories = getSubcategories(form.category);
  const amountNumber = Number(form.amount);
  const amountValid = Number.isFinite(amountNumber) && amountNumber > 0 && amountNumber <= 9999999999.99;
  const canSubmit = amountValid && Boolean(form.date) && !busy;
  const generatedTitle = useMemo(() => defaultTitle(form), [form]);

  useEffect(() => {
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusBefore = document.activeElement as HTMLElement;
    dialog.current?.querySelector<HTMLInputElement>('input[data-autofocus="true"]')?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
      if (e.key === "Tab") {
        const nodes = dialog.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled),input:not(:disabled),select:not(:disabled)",
        );
        if (!nodes?.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = old;
      window.removeEventListener("keydown", key);
      focusBefore?.focus();
    };
  }, [busy, onClose]);

  const field = (key: keyof Draft, value: string) => {
    setFormError("");
    setForm((f) => ({ ...f, [key]: value }));
  };

  function chooseCategory(category: string) {
    const options = getSubcategories(category);
    setFormError("");
    setForm((f) => ({
      ...f,
      category,
      subcategory: options[0]?.name ?? "",
      emoji: getDisplayEmoji(category, options[0]?.name ?? ""),
    }));
  }

  async function submit() {
    setFormError("");
    if (!amountValid) {
      setFormError("请输入大于 0 的有效金额");
      return;
    }
    if (!form.date) {
      setFormError("请选择记账日期");
      return;
    }
    const draft: Draft = {
      ...form,
      amount: amountNumber.toFixed(2),
      title: generatedTitle,
      account: accounts.includes(form.account) ? form.account : "未指定",
      emoji: getDisplayEmoji(form.category, form.subcategory),
    };
    const result = await onSave(draft, initial?.id);
    if (result.ok) onClose();
    else setFormError(result.error || "这笔账没有保存成功，请检查网络或稍后重试");
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <div
        className="modal"
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="entry-title"
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">A LITTLE NOTE OF LIFE</span>
            <h2 id="entry-title">{initial ? "编辑这笔生活" : "记下一笔生活"}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭" disabled={busy}>
            <X size={21} />
          </button>
        </div>

        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <div className="type-toggle">
            {(["expense", "income"] as const).map((type) => (
              <button
                type="button"
                key={type}
                className={form.type === type ? "selected" : ""}
                onClick={() => {
                  setFormError("");
                  setForm((f) => ({
                    ...f,
                    type,
                    category: type === "income" ? "收入" : "餐饮",
                    subcategory: type === "income" ? "" : "正餐",
                    emoji: type === "income" ? "💰" : "🍜",
                  }));
                }}
              >
                {type === "expense" ? "− 支出" : "+ 收入"}
              </button>
            ))}
          </div>

          <label className="field-label">
            金额 <em className="required-mark">必填</em>
            <div className={`amount-input ${form.amount && !amountValid ? "field-invalid" : ""}`}>
              <span>¥</span>
              <input
                data-autofocus="true"
                type="text"
                inputMode="decimal"
                autoComplete="off"
                maxLength={13}
                placeholder="0.00"
                value={form.amount}
                onChange={(e) => field("amount", cleanAmountInput(e.target.value))}
                onBlur={() => {
                  if (amountValid) field("amount", amountNumber.toFixed(2));
                }}
                aria-invalid={Boolean(form.amount && !amountValid)}
              />
            </div>
          </label>

          <label className="field-label">一级分类</label>
          <div className="category-grid">
            {categories
              .filter((c) =>
                form.type === "income"
                  ? c.name === "收入" || c.name === "其他"
                  : c.name !== "收入",
              )
              .map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => chooseCategory(c.name)}
                  className={form.category === c.name ? "selected" : ""}
                >
                  <span>{c.emoji}</span>
                  {c.name}
                </button>
              ))}
          </div>

          {subcategories.length > 0 && form.type === "expense" && (
            <label className="field-label">
              细分类
              <select
                value={form.subcategory}
                onChange={(e) => {
                  const subcategory = e.target.value;
                  setFormError("");
                  setForm((f) => ({
                    ...f,
                    subcategory,
                    emoji: getDisplayEmoji(f.category, subcategory),
                  }));
                }}
              >
                {subcategories.map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.emoji} {s.name}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="field-label">
            标题 / 备注 <em className="optional-mark">可选</em>
            <input
              maxLength={120}
              placeholder={`不填将自动记为「${generatedTitle}」`}
              value={form.title}
              onChange={(e) => field("title", e.target.value)}
            />
          </label>

          <div className="form-two-col">
            <label className="field-label">
              日期
              <input type="date" value={form.date} onChange={(e) => field("date", e.target.value)} />
            </label>
            <label className="field-label">
              支付账户
              <select value={form.account} onChange={(e) => field("account", e.target.value)}>
                {accounts.map((a) => (
                  <option key={a}>{a}</option>
                ))}
              </select>
            </label>
          </div>

          <p className="learning-note">
            <Sparkles size={14} /> 标题可以不填；支付方式没写时会使用你的默认偏好，没有偏好则记为「未指定」。
          </p>
          {initial && (
            <p className="learning-note">
              <Sparkles size={14} /> 修改分类后，会记住你对「{initial.title}」的分类习惯。
            </p>
          )}

          {formError && <p className="modal-form-error" role="alert">{formError}</p>}

          <div className="modal-actions">
            {initial && (
              <button type="button" className="danger-button" onClick={() => setConfirmDelete(true)} disabled={busy}>
                <Trash2 size={16} /> 删除
              </button>
            )}
            <button type="submit" className="primary" disabled={!canSubmit}>
              <Check size={17} /> {busy ? "保存中…" : "保存账单"}
            </button>
          </div>
        </form>

        {confirmDelete && (
          <div className="delete-confirm">
            <strong>确定删除「{initial?.title}」？</strong>
            <p>删除后可在 10 秒内通过底部提示撤销。</p>
            <div>
              <button onClick={() => setConfirmDelete(false)} className="secondary">取消</button>
              <button
                className="danger-solid"
                disabled={busy}
                onClick={async () => {
                  if (initial) {
                    await onDelete(initial);
                    onClose();
                  }
                }}
              >
                {busy ? "删除中…" : "确认删除"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
