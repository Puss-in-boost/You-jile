"use client";
import { useState, useMemo } from "react";
import {
  Sparkles,
  ArrowUpRight,
  CornerDownLeft,
  PenLine,
  Check,
  CalendarDays,
} from "lucide-react";
import { parseEntry } from "@/lib/parser";
import type { CategoryRule, Draft } from "@/types";
export function QuickEntry({
  rules,
  busy,
  onSave,
  onManual,
}: {
  rules: CategoryRule[];
  busy: boolean;
  onSave: (draft: Draft) => Promise<boolean>;
  onManual: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const parsed = useMemo(() => {
    if (!text.trim()) return null;
    try {
      return parseEntry(text, rules);
    } catch {
      return null;
    }
  }, [text, rules]);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const draft = parseEntry(text, rules);
      if (await onSave(draft)) setText("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "无法识别，请换一种表达");
    }
  }
  return (
    <section className="card quick-card">
      <div className="quick-heading">
        <span className="sparkle-icon">
          <Sparkles size={19} />
        </span>
        <h2>今天又寄了多少？</h2>
        <span className="ai-label">一句话，记一笔</span>
      </div>
      <p className="muted quick-subtitle">
        不用填表格，像聊天一样，把生活记下来。
      </p>
      <form onSubmit={submit}>
        <div className={`quick-input-wrap ${error ? "has-error" : ""}`}>
          <input
            aria-label="快速文字记账"
            placeholder="比如：35 午饭，昨天打车26"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setError("");
            }}
            maxLength={150}
          />
          <button
            className="primary quick-submit"
            type="submit"
            disabled={busy}
          >
            {busy ? "保存中" : "记一笔"} <ArrowUpRight size={17} />
          </button>
        </div>
        {parsed ? (
          <div className="parse-preview">
            <Check size={13} />
            <span>
              {parsed.emoji} {parsed.title}
            </span>
            <strong>¥{parsed.amount}</strong>
            <span>{parsed.category}</span>
            <span>
              <CalendarDays size={12} /> {parsed.date.slice(5)}
            </span>
            {parsed.matchSource === "user_rule" && <em>按你的习惯</em>}
          </div>
        ) : (
          <div className="quick-examples">
            <span>试试看</span>
            {["☕ 18 瑞幸", "🚕 昨天打车26", "💰 工资8500"].map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => setText(s.replace(/^\S+\s/, ""))}
              >
                {s}
              </button>
            ))}
          </div>
        )}
        {error && <p className="form-error">{error}</p>}
        <div className="quick-footer">
          <span>
            <span className="tiny-dot" /> 自动识别金额、分类与日期
          </span>
          <button type="button" onClick={onManual}>
            <PenLine size={13} /> 手动记账{" "}
            <span className="enter-key">
              <CornerDownLeft size={12} />
            </span>
          </button>
        </div>
      </form>
    </section>
  );
}
