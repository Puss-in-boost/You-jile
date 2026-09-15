"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CornerDownLeft,
  ListPlus,
  X,
} from "lucide-react";
import { parseEntry } from "@/lib/parser";
import { cents, dateLabel, localDate, money } from "@/lib/dates";
import type { CategoryRule, Draft, ParsedDraft, Transaction } from "@/types";

interface SaveManyResult {
  ok: boolean;
  saved: number;
  error?: string;
}

interface BackfillModeProps {
  rows: Transaction[];
  rules: CategoryRule[];
  defaultAccount: string;
  busy: boolean;
  offline: boolean;
  onSave: (draft: Draft, id?: string) => Promise<{ ok: boolean; error?: string }>;
  onSaveMany: (drafts: Draft[]) => Promise<SaveManyResult>;
  onEdit: (row: Transaction) => void;
  onDelete: (row: Transaction) => void;
  onClose: () => void;
}

interface ParsedLine {
  raw: string;
  line: number;
  draft?: ParsedDraft;
  error?: string;
}

const STORAGE_KEY = "youjile-backfill-date";

function shiftIsoDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00`);
  date.setDate(date.getDate() + days);
  return localDate(date);
}

function fullDateLabel(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function applyLockedDate(
  raw: string,
  date: string,
  rules: CategoryRule[],
  defaultAccount: string,
): ParsedDraft {
  const parsed = parseEntry(raw, rules);
  return {
    ...parsed,
    date,
    account:
      parsed.account === "未指定" && defaultAccount && defaultAccount !== "未指定"
        ? defaultAccount
        : parsed.account,
  };
}

export function BackfillMode({
  rows,
  rules,
  defaultAccount,
  busy,
  offline,
  onSave,
  onSaveMany,
  onEdit,
  onDelete,
  onClose,
}: BackfillModeProps) {
  const today = localDate();
  const [selectedDate, setSelectedDate] = useState(today);
  const [singleText, setSingleText] = useState("");
  const [singleError, setSingleError] = useState("");
  const [batchText, setBatchText] = useState("");
  const [batchError, setBatchError] = useState("");
  const singleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const remembered = window.localStorage.getItem(STORAGE_KEY);
    if (remembered && /^\d{4}-\d{2}-\d{2}$/.test(remembered) && remembered <= today) {
      setSelectedDate(remembered);
    }
    window.setTimeout(() => singleRef.current?.focus(), 80);
  }, [today]);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.altKey && event.key === "ArrowLeft") {
        event.preventDefault();
        setSelectedDate((value) => shiftIsoDate(value, -1));
      }
      if (event.altKey && event.key === "ArrowRight") {
        event.preventDefault();
        setSelectedDate((value) => {
          const next = shiftIsoDate(value, 1);
          return next > today ? value : next;
        });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, today]);

  const dayRows = useMemo(
    () => rows.filter((row) => row.date === selectedDate),
    [rows, selectedDate],
  );
  const dayExpense = dayRows
    .filter((row) => row.type === "expense")
    .reduce((sum, row) => sum + cents(row.amount), 0);
  const dayIncome = dayRows
    .filter((row) => row.type === "income")
    .reduce((sum, row) => sum + cents(row.amount), 0);

  const singleDraft = useMemo<ParsedDraft | null>(() => {
    if (!singleText.trim()) return null;
    try {
      return applyLockedDate(singleText, selectedDate, rules, defaultAccount);
    } catch {
      return null;
    }
  }, [singleText, selectedDate, rules, defaultAccount]);

  const batchLines = useMemo<ParsedLine[]>(() => {
    const rawLines = batchText
      .split(/\r?\n/)
      .map((raw, index) => ({ raw: raw.trim(), line: index + 1 }))
      .filter((item) => item.raw);

    return rawLines.map((item) => {
      try {
        return {
          ...item,
          draft: applyLockedDate(item.raw, selectedDate, rules, defaultAccount),
        };
      } catch (error) {
        return {
          ...item,
          error: error instanceof Error ? error.message : "无法识别这一行",
        };
      }
    });
  }, [batchText, selectedDate, rules, defaultAccount]);

  const invalidBatchCount = batchLines.filter((item) => !item.draft).length;
  const validBatchDrafts = batchLines.flatMap((item) => (item.draft ? [item.draft] : []));
  const disabled = busy || offline;

  function changeDate(next: string) {
    if (!next || next > today) return;
    setSelectedDate(next);
    setSingleError("");
    setBatchError("");
    window.setTimeout(() => singleRef.current?.focus(), 40);
  }

  async function saveSingle(event: React.FormEvent) {
    event.preventDefault();
    setSingleError("");
    if (disabled) {
      setSingleError(offline ? "当前离线，联网后再补账" : "正在保存，请稍候");
      return;
    }
    try {
      const draft = applyLockedDate(singleText, selectedDate, rules, defaultAccount);
      const result = await onSave(draft);
      if (!result.ok) {
        setSingleError(result.error || "保存失败，请稍后重试");
        return;
      }
      setSingleText("");
      window.setTimeout(() => singleRef.current?.focus(), 40);
    } catch (error) {
      setSingleError(error instanceof Error ? error.message : "无法识别这笔账");
    }
  }

  async function saveBatch() {
    setBatchError("");
    if (disabled) {
      setBatchError(offline ? "当前离线，联网后再批量补账" : "正在保存，请稍候");
      return;
    }
    if (!batchLines.length) {
      setBatchError("先粘贴或输入几笔账，每行一笔");
      return;
    }
    if (batchLines.length > 100) {
      setBatchError("一次最多保存 100 笔，分两次补会更稳妥");
      return;
    }
    if (invalidBatchCount) {
      setBatchError(`还有 ${invalidBatchCount} 行没有识别成功，先按下方提示修正`);
      return;
    }

    const result = await onSaveMany(validBatchDrafts);
    if (result.ok) {
      setBatchText("");
      window.setTimeout(() => singleRef.current?.focus(), 40);
      return;
    }

    if (result.saved > 0) {
      const remaining = batchLines.slice(result.saved).map((item) => item.raw).join("\n");
      setBatchText(remaining);
      setBatchError(`前 ${result.saved} 笔已经保存；${result.error || "后续保存失败，请重试"}`);
    } else {
      setBatchError(result.error || "批量保存失败，请稍后重试");
    }
  }

  return (
    <div
      className="yj-backfill-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="补旧账"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="yj-backfill-modal">
        <header className="yj-backfill-header">
          <div>
            <span>历史补账</span>
            <h2>按一天连续记</h2>
            <p>日期锁定后，一笔接一笔记；补完这天再切到前一天。</p>
          </div>
          <button className="yj-backfill-close" onClick={onClose} aria-label="关闭补账模式">
            <X size={20} />
          </button>
        </header>

        <div className="yj-backfill-datebar">
          <button onClick={() => changeDate(shiftIsoDate(selectedDate, -1))}>
            <ChevronLeft size={16} /> 前一天
          </button>
          <label>
            <CalendarDays size={16} />
            <input
              type="date"
              max={today}
              value={selectedDate}
              onChange={(event) => changeDate(event.target.value)}
            />
          </label>
          <button
            disabled={selectedDate >= today}
            onClick={() => changeDate(shiftIsoDate(selectedDate, 1))}
          >
            后一天 <ChevronRight size={16} />
          </button>
          {selectedDate !== today && (
            <button className="yj-backfill-today" onClick={() => changeDate(today)}>
              回到今天
            </button>
          )}
        </div>

        <div className="yj-backfill-day-summary">
          <div>
            <strong>{fullDateLabel(selectedDate)}</strong>
            <span>{dateLabel(selectedDate)}</span>
          </div>
          <p>
            已有 <strong>{dayRows.length}</strong> 笔 · 支出 <strong>¥{money(dayExpense)}</strong>
            {dayIncome > 0 ? <> · 收入 <strong>¥{money(dayIncome)}</strong></> : null}
          </p>
        </div>

        <section className="yj-backfill-section">
          <div className="yj-backfill-section-title">
            <div>
              <strong>连续记一笔</strong>
              <small>日期已锁定，不用每笔再选时间。按 Enter 保存后继续输入。</small>
            </div>
            <CornerDownLeft size={17} />
          </div>
          <form onSubmit={saveSingle} className="yj-backfill-quick-form">
            <input
              ref={singleRef}
              value={singleText}
              onChange={(event) => {
                setSingleText(event.target.value);
                setSingleError("");
              }}
              maxLength={150}
              placeholder="35 午饭 / 20 瑞幸 微信 / 16 地铁支付宝"
            />
            <button className="yj-primary" disabled={!singleDraft || disabled}>记下</button>
          </form>
          {singleDraft && (
            <div className="yj-backfill-preview">
              <Check size={14} />
              <span>
                {singleDraft.emoji} {singleDraft.type === "expense" ? "−" : "+"}¥{singleDraft.amount} · {singleDraft.category}
                {singleDraft.subcategory ? ` / ${singleDraft.subcategory}` : ""}
                {singleDraft.account !== "未指定" ? ` · ${singleDraft.account}` : ""}
              </span>
              <em>{selectedDate}</em>
            </div>
          )}
          {singleError && <p className="yj-form-error">{singleError}</p>}
        </section>

        <section className="yj-backfill-section">
          <div className="yj-backfill-section-title">
            <div>
              <strong>一次粘贴多笔</strong>
              <small>从微信/支付宝账单对着抄时，每行一笔，确认后一次保存。</small>
            </div>
            <ListPlus size={18} />
          </div>
          <textarea
            className="yj-backfill-textarea"
            value={batchText}
            onChange={(event) => {
              setBatchText(event.target.value);
              setBatchError("");
            }}
            placeholder={"35 午饭\n20 瑞幸 微信\n16 地铁 支付宝\n68 晚饭"}
          />
          {batchLines.length > 0 && (
            <div className="yj-backfill-batch-preview">
              <div className="yj-backfill-batch-head">
                <span>解析预览</span>
                <span>{batchLines.length} 行 · {invalidBatchCount ? `${invalidBatchCount} 行需修改` : "全部可保存"}</span>
              </div>
              <div className="yj-backfill-batch-list">
                {batchLines.slice(0, 20).map((item) => (
                  <div className={item.draft ? "ok" : "error"} key={`${item.line}-${item.raw}`}>
                    <span>{item.line}</span>
                    {item.draft ? (
                      <>
                        <strong>{item.draft.emoji} {item.draft.title}</strong>
                        <small>
                          {item.draft.type === "expense" ? "−" : "+"}¥{item.draft.amount} · {item.draft.category}
                          {item.draft.subcategory ? ` / ${item.draft.subcategory}` : ""}
                          {item.draft.account !== "未指定" ? ` · ${item.draft.account}` : ""}
                        </small>
                      </>
                    ) : (
                      <>
                        <strong>{item.raw}</strong>
                        <small>{item.error}</small>
                      </>
                    )}
                  </div>
                ))}
                {batchLines.length > 20 && <p>还有 {batchLines.length - 20} 行，保存时会一起处理。</p>}
              </div>
            </div>
          )}
          {batchError && <p className="yj-form-error">{batchError}</p>}
          <button
            type="button"
            className="yj-backfill-batch-save"
            disabled={!batchLines.length || Boolean(invalidBatchCount) || disabled || batchLines.length > 100}
            onClick={() => void saveBatch()}
          >
            <ListPlus size={16} />
            {batchLines.length ? `一次保存 ${validBatchDrafts.length} 笔到 ${selectedDate}` : "一次保存多笔"}
          </button>
        </section>

        <section className="yj-backfill-section yj-backfill-day-list">
          <div className="yj-backfill-section-title">
            <div>
              <strong>这一天已经记了什么</strong>
              <small>随时核对，点一笔可以编辑。</small>
            </div>
          </div>
          {dayRows.length ? (
            <div className="yj-backfill-existing">
              {dayRows.map((row) => (
                <div key={row.id}>
                  <button className="yj-backfill-existing-main" onClick={() => onEdit(row)}>
                    <span>{row.emoji}</span>
                    <span>
                      <strong>{row.title}</strong>
                      <small>{row.category}{row.subcategory ? ` / ${row.subcategory}` : ""}{row.account && row.account !== "未指定" ? ` · ${row.account}` : ""}</small>
                    </span>
                  </button>
                  <strong className={row.type === "income" ? "income" : ""}>
                    {row.type === "expense" ? "−" : "+"}¥{Number(row.amount).toFixed(2)}
                  </strong>
                  <button className="yj-backfill-delete" onClick={() => onDelete(row)} aria-label={`删除${row.title}`}>×</button>
                </div>
              ))}
            </div>
          ) : (
            <div className="yj-backfill-empty">这一天还没有账。上面记下第一笔后，会立即出现在这里。</div>
          )}
        </section>

        <footer className="yj-backfill-footer">
          <span>快捷键：Alt + ← / → 切换日期 · Esc 退出</span>
          <button onClick={onClose}>完成补账</button>
        </footer>
      </section>
    </div>
  );
}
