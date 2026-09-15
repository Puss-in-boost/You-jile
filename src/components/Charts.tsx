"use client";
import {
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  TrendingUp,
  ChartNoAxesCombined,
} from "lucide-react";
import Link from "next/link";
import { summarize, sevenDay } from "@/lib/stats";
import { money, cents, shiftMonth } from "@/lib/dates";
import type { Transaction } from "@/types";
export function SummaryCards({
  rows,
  month,
}: {
  rows: Transaction[];
  month: string;
}) {
  const stats = summarize(rows, month);
  return (
    <div className="summary-grid">
      <section className="expense-card">
        <div className="summary-label">
          <span>
            <span className="summary-icon">
              <ArrowUpRight size={16} />
            </span>{" "}
            本月支出
          </span>
          <span className="budget-label">每一笔，都算数</span>
        </div>
        <div className="summary-value">
          <span>¥</span>
          {money(stats.expense)}
        </div>
        <div className="expense-bottom">
          <span>
            <span className="light-dot" />{" "}
            {stats.selected.filter((t) => t.type === "expense").length}{" "}
            笔生活的痕迹
          </span>
          <span>
            {month.replace("-", " / ")} <ChevronRight size={13} />
          </span>
        </div>
        <div className="expense-art">
          <div />
          <div />
          <div />
          <svg viewBox="0 0 150 95" fill="none">
            <path
              d="M8 75c30 0 18-38 45-32s19 33 44 5 23-30 43-34"
              stroke="#c6e59c"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx="139" cy="14" r="5" fill="#c6e59c" />
          </svg>
        </div>
      </section>
      <section className="card income-card">
        <div className="summary-label">
          <span>
            <span className="summary-icon">
              <ArrowDownLeft size={16} />
            </span>{" "}
            本月收入
          </span>
        </div>
        <div className="summary-value">
          <span>¥</span>
          {money(stats.income)}
        </div>
        <div className="muted summary-caption">
          好好生活，也有好好进账 <span>↗</span>
        </div>
      </section>
      <section className="card balance-card">
        <div className="summary-label">
          <span>
            <span className="summary-icon">
              <Wallet size={16} />
            </span>{" "}
            本月结余
          </span>
        </div>
        <div className="summary-value">
          <span>¥</span>
          {money(stats.balance)}
        </div>
        <div className="muted summary-caption">
          {stats.balance >= 0
            ? "留一点底气，给未来的自己"
            : "支出超过收入，记得关注收支"}{" "}
          <span>✳</span>
        </div>
      </section>
    </div>
  );
}
export function CategoryChart({
  rows,
  month,
}: {
  rows: Transaction[];
  month: string;
}) {
  const { groups, expense } = summarize(rows, month);
  const shown = groups.slice(0, 4);
  if (groups.length > 4)
    shown.push({
      name: "其他分类",
      emoji: "💸",
      color: "#c7cbc0",
      words: [],
      aliases: [],
      total: groups.slice(4).reduce((s, c) => s + c.total, 0),
    });
  let offset = 0;
  const stops = shown
    .map((c) => {
      const start = offset;
      offset += (c.total / (expense || 1)) * 100;
      return `${c.color} ${start}% ${offset}%`;
    })
    .join(",");
  return (
    <section className="card category-card">
      <div className="section-heading">
        <h2>钱都去哪了</h2>
        <Link href="/insights" className="text-link">
          分类统计 <ChevronRight size={14} />
        </Link>
      </div>
      <div className="category-chart-body">
        <div
          className="donut"
          style={{
            background: expense
              ? `conic-gradient(from -90deg, ${stops})`
              : "#edf0e9",
          }}
        >
          <div>
            <span>本月支出</span>
            <strong>
              <small>¥</small>
              {money(expense).split(".")[0]}
            </strong>
            <span>{groups.length} 个消费分类</span>
          </div>
        </div>
        <div className="chart-legend">
          {shown.length ? (
            shown.map((c) => (
              <div key={c.name}>
                <span className="legend-name">
                  <i style={{ background: c.color }} />
                  {c.name}
                </span>
                <strong>¥{money(c.total)}</strong>
                <span>{Math.round((c.total / expense) * 100)}%</span>
              </div>
            ))
          ) : (
            <p className="muted">记下一笔后，看看钱的去向。</p>
          )}
        </div>
      </div>
      <div className="chart-card-footer">
        <span className="tiny-dot" />
        {groups[0] ? (
          <>
            花在 <strong>{groups[0].name}</strong> 上最多，占总支出{" "}
            {Math.round((groups[0].total / expense) * 100)}%
          </>
        ) : (
          "消费不必完美，记录让它更清晰。"
        )}
      </div>
    </section>
  );
}
export function TrendChart({
  rows,
  monthly = false,
  daily = false,
  month,
}: {
  rows: Transaction[];
  monthly?: boolean;
  daily?: boolean;
  month?: string;
}) {
  const now = new Date();
  const selectedMonth =
    month ||
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const totalFor = (date: string, prefix = false) =>
    rows
      .filter(
        (t) =>
          (prefix ? t.date.startsWith(date) : t.date === date) &&
          t.type === "expense",
      )
      .reduce((s, t) => s + cents(t.amount), 0);
  const values = monthly
    ? Array.from({ length: 6 }, (_, i) => {
        const m = shiftMonth(selectedMonth, i - 5);
        return { date: m, value: totalFor(m, true) };
      })
    : daily
      ? Array.from(
          {
            length: new Date(
              Number(selectedMonth.slice(0, 4)),
              Number(selectedMonth.slice(5)),
              0,
            ).getDate(),
          },
          (_, i) => {
            const date = `${selectedMonth}-${String(i + 1).padStart(2, "0")}`;
            return { date, value: totalFor(date) };
          },
        )
      : sevenDay(rows);
  const max = Math.max(...values.map((x) => x.value), 100);
  const total = values.reduce((s, v) => s + v.value, 0);
  return (
    <section className="card trend-card">
      <div className="section-heading">
        <h2>
          {monthly ? (
            <ChartNoAxesCombined size={17} />
          ) : (
            <TrendingUp size={17} />
          )}{" "}
          {monthly ? "月度支出趋势" : daily ? "每日支出趋势" : "最近 7 天"}
        </h2>
        <span className="muted">
          {daily ? selectedMonth.replace("-", " / ") : "支出趋势"}
        </span>
      </div>
      <div className="trend-total">
        ¥{money(total)}
        <span>
          {monthly
            ? "所选月份及前五个月累计"
            : daily
              ? "所选月份累计"
              : "过去一周累计"}
        </span>
      </div>
      <div className="bar-chart" style={daily ? { gap: 4 } : undefined}>
        <div className="chart-grid-lines">
          <i />
          <i />
          <i />
        </div>
        {values.map((v, i) => (
          <div className="bar-column" key={v.date}>
            <div
              tabIndex={0}
              aria-label={`${v.date} 支出 ${money(v.value)}元`}
              className={`bar ${i === values.length - 1 ? "current" : ""}`}
              style={{ height: `${Math.max((v.value / max) * 100, 2)}%` }}
              title={`${v.date}：¥${money(v.value)}`}
            >
              <span>¥{money(v.value)}</span>
            </div>
            <label>
              {monthly
                ? `${Number(v.date.slice(5))}月`
                : daily
                  ? i === 0 || (i + 1) % 5 === 0
                    ? `${i + 1}日`
                    : ""
                  : i === values.length - 1
                    ? "今天"
                    : v.date.slice(5).replace("-", "/")}
            </label>
          </div>
        ))}
      </div>
    </section>
  );
}
