"use client";
import { Pencil, ArrowUpRight, ReceiptText } from "lucide-react";
import { dateLabel, cents, money } from "@/lib/dates";
import { getCategory } from "@/lib/categories";
import type { Transaction } from "@/types";
export function TransactionList({
  rows,
  onEdit,
  compact = false,
  onAdd,
}: {
  rows: Transaction[];
  onEdit: (t: Transaction) => void;
  compact?: boolean;
  onAdd: () => void;
}) {
  if (!rows.length)
    return (
      <div className="empty-state">
        <ReceiptText size={34} />
        <h3>这里还是一张白纸</h3>
        <p>记下第一笔，让每一分钱都有去处。</p>
        <button className="secondary" onClick={onAdd}>
          记一笔 <ArrowUpRight size={15} />
        </button>
      </div>
    );
  const dates = [...new Set(rows.map((t) => t.date))];
  return (
    <div className={`transaction-list ${compact ? "compact" : ""}`}>
      {dates.map((date) => (
        <div key={date} className="date-group">
          <div className="date-group-title">
            <span>
              {dateLabel(date)}{" "}
              <small>{date.slice(5).replace("-", " / ")}</small>
            </span>
            <span>
              支出 ¥
              {money(
                rows
                  .filter((t) => t.date === date && t.type === "expense")
                  .reduce((s, t) => s + cents(t.amount), 0),
              )}
            </span>
          </div>
          {rows
            .filter((t) => t.date === date)
            .map((t) => (
              <button
                key={t.id}
                className="transaction-row"
                onClick={() => onEdit(t)}
                aria-label={`编辑 ${t.title} ${t.amount}元`}
              >
                <span
                  className="transaction-emoji"
                  style={{ background: getCategory(t.category).color + "1b" }}
                >
                  {getCategory(t.category).emoji}
                </span>
                <span className="transaction-description">
                  <strong>{t.title}</strong>
                  <span>
                    {t.category}
                    <i /> {t.account}
                    {!compact && (
                      <>
                        {" "}
                        <i /> {t.source === "text" ? "文字记账" : "手动记账"}
                      </>
                    )}
                  </span>
                </span>
                <span className="category-tag">{t.category}</span>
                <span
                  className={`transaction-amount ${t.type === "income" ? "income" : ""}`}
                >
                  {t.type === "income" ? "+" : "−"} {money(cents(t.amount))}
                  <small>
                    {new Date(t.createdAt).toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </small>
                </span>
                <Pencil className="row-edit" size={14} />
              </button>
            ))}
        </div>
      ))}
    </div>
  );
}
