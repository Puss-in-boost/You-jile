"use client";

import { ArrowLeft, ChevronRight, X } from "lucide-react";
import { cents, dateLabel, money } from "@/lib/dates";
import type { Transaction } from "@/types";

export type InsightDrill = {
  category: string;
  subcategory?: string;
};

type BreakdownItem = {
  name: string;
  total: number;
  count: number;
  emoji: string;
};

function buttonReset(): React.CSSProperties {
  return {
    width: "100%",
    display: "block",
    border: 0,
    background: "transparent",
    padding: 0,
    textAlign: "inherit",
    color: "inherit",
    font: "inherit",
    cursor: "pointer",
  };
}

function total(rows: Transaction[]) {
  return rows.reduce((sum, row) => sum + cents(row.amount), 0);
}

function groupRows(
  rows: Transaction[],
  nameFor: (row: Transaction) => string,
): BreakdownItem[] {
  const map = new Map<string, BreakdownItem>();
  for (const row of rows) {
    const name = nameFor(row).trim() || "未命名";
    const current = map.get(name);
    if (current) {
      current.total += cents(row.amount);
      current.count += 1;
    } else {
      map.set(name, {
        name,
        total: cents(row.amount),
        count: 1,
        emoji: row.emoji,
      });
    }
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

export function CategoryDrilldown({
  rows,
  month,
  drill,
  onBack,
  onClose,
  onOpenSubcategory,
  onEdit,
}: {
  rows: Transaction[];
  month: string;
  drill: InsightDrill;
  onBack: () => void;
  onClose: () => void;
  onOpenSubcategory: (subcategory: string) => void;
  onEdit: (row: Transaction) => void;
}) {
  const categoryRows = rows.filter(
    (row) =>
      row.type === "expense" &&
      row.date.startsWith(month) &&
      row.category === drill.category,
  );
  const categoryTotal = total(categoryRows);
  const subcategories = groupRows(
    categoryRows,
    (row) => row.subcategory || "未细分",
  );
  const selectedRows = drill.subcategory
    ? categoryRows.filter(
        (row) => (row.subcategory || "未细分") === drill.subcategory,
      )
    : categoryRows;
  const selectedTotal = total(selectedRows);
  const merchants = drill.subcategory
    ? groupRows(
        selectedRows,
        (row) => row.title || drill.subcategory || drill.category,
      )
    : [];
  const sortedRows = [...selectedRows].sort(
    (a, b) =>
      b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => event.target === event.currentTarget && onClose()}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="insight-drill-title"
      >
        <div className="modal-header">
          <div>
            <span className="eyebrow">SPENDING BREAKDOWN</span>
            <h2 id="insight-drill-title">
              {drill.subcategory
                ? `${drill.subcategory} 花在了哪里`
                : `${drill.category} 都花在哪了`}
            </h2>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="关闭洞察详情"
          >
            <X size={21} />
          </button>
        </div>

        {drill.subcategory && (
          <button
            type="button"
            className="login-back"
            onClick={onBack}
            style={{ marginBottom: 14 }}
          >
            <ArrowLeft size={14} /> 返回{drill.category}细分
          </button>
        )}

        <div className="yj-stat-grid" style={{ marginBottom: 18 }}>
          <div className="yj-card yj-stat">
            <span>{drill.subcategory ? "当前细分类" : "当前分类"}</span>
            <strong>¥{money(selectedTotal)}</strong>
          </div>
          <div className="yj-card yj-stat">
            <span>共记录</span>
            <strong>{selectedRows.length} 笔</strong>
          </div>
          <div className="yj-card yj-stat yj-stat-wide">
            <span>占{drill.subcategory ? drill.category : "本月该分类"}</span>
            <strong>
              {drill.subcategory && categoryTotal
                ? `${Math.round((selectedTotal / categoryTotal) * 100)}%`
                : `${subcategories.length} 个细分`}
            </strong>
          </div>
        </div>

        {!drill.subcategory ? (
          <section>
            <div className="yj-card-title">
              <div>
                <strong>细分类</strong>
                <small>继续点进去，可以看到钱具体花在哪些商家或事项</small>
              </div>
            </div>
            <div className="yj-category-bars">
              {subcategories.map((item) => {
                const pct = categoryTotal
                  ? Math.round((item.total / categoryTotal) * 100)
                  : 0;
                return (
                  <button
                    key={item.name}
                    type="button"
                    style={buttonReset()}
                    onClick={() => onOpenSubcategory(item.name)}
                  >
                    <div className="yj-bar-row">
                      <div>
                        <span>{item.emoji} {item.name}</span>
                        <span>
                          ¥{money(item.total)} · {pct}% · {item.count}笔{" "}
                          <ChevronRight size={14} />
                        </span>
                      </div>
                      <div className="yj-bar-track">
                        <span style={{ width: `${Math.max(4, pct)}%` }} />
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        ) : (
          <>
            <section>
              <div className="yj-card-title">
                <div>
                  <strong>花在了哪里</strong>
                  <small>按你记账时填写的标题 / 商家汇总</small>
                </div>
              </div>
              <div className="yj-category-bars">
                {merchants.map((item) => {
                  const pct = selectedTotal
                    ? Math.round((item.total / selectedTotal) * 100)
                    : 0;
                  return (
                    <div className="yj-bar-row" key={item.name}>
                      <div>
                        <span>{item.emoji} {item.name}</span>
                        <span>¥{money(item.total)} · {pct}% · {item.count}笔</span>
                      </div>
                      <div className="yj-bar-track">
                        <span style={{ width: `${Math.max(4, pct)}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <section style={{ marginTop: 22 }}>
              <div className="yj-card-title">
                <div>
                  <strong>具体账单</strong>
                  <small>点一笔可以直接编辑</small>
                </div>
              </div>
              <div className="yj-list">
                {sortedRows.map((row) => (
                  <button
                    key={row.id}
                    type="button"
                    style={buttonReset()}
                    onClick={() => onEdit(row)}
                  >
                    <div className="yj-row">
                      <span className="yj-row-main" style={{ width: "100%" }}>
                        <span className="yj-row-emoji">{row.emoji}</span>
                        <span className="yj-row-copy">
                          <strong>{row.title}</strong>
                          <small>
                            {dateLabel(row.date)}
                            {row.account &&
                            !["未指定", "其他"].includes(row.account)
                              ? ` · ${row.account}`
                              : ""}
                          </small>
                        </span>
                      </span>
                      <div className="yj-row-tail">
                        <strong>−¥{Number(row.amount).toFixed(2)}</strong>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
