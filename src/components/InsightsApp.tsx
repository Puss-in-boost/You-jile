"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  ChevronRight,
  CircleUserRound,
  Home,
  Plus,
  ReceiptText,
  X,
} from "lucide-react";
import { EntryModal } from "./EntryModal";
import { usePWA } from "./InstallPrompt";
import { useLedger } from "@/hooks/use-ledger";
import {
  categoryChanges,
  compareToPreviousMonth,
  discover,
  monthlyReport,
  monthlyTrend,
  spendingCalendar,
  summarize,
} from "@/lib/stats";
import { cents, dateLabel, localDate, money } from "@/lib/dates";
import type { Transaction } from "@/types";

const nav = [
  { href: "/", label: "首页", Icon: Home },
  { href: "/bills", label: "账单", Icon: ReceiptText },
  { href: "/insights", label: "洞察", Icon: BarChart3 },
  { href: "/me", label: "我的", Icon: CircleUserRound },
];

type Drill = {
  category: string;
  subcategory?: string;
};

type BreakdownItem = {
  name: string;
  total: number;
  count: number;
  emoji: string;
};

function clickableResetStyle(): React.CSSProperties {
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

function sumRows(rows: Transaction[]) {
  return rows.reduce((sum, row) => sum + cents(row.amount), 0);
}

function monthLabel(month: string) {
  const [, value] = month.split("-");
  return `${Number(value)}月`;
}

function trendPoints(values: number[], max: number) {
  const width = 520;
  const left = 20;
  const right = 20;
  const top = 16;
  const bottom = 128;
  const span = Math.max(1, values.length - 1);
  return values
    .map((value, index) => {
      const x = left + ((width - left - right) * index) / span;
      const y = bottom - ((bottom - top) * value) / Math.max(1, max);
      return `${x},${y}`;
    })
    .join(" ");
}

function heatLevel(value: number, max: number) {
  if (!value || !max) return 0;
  const ratio = value / max;
  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
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

function InsightModal({
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
  drill: Drill;
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
  const categoryTotal = sumRows(categoryRows);
  const subcategories = groupRows(
    categoryRows,
    (row) => row.subcategory || "未细分",
  );
  const selectedRows = drill.subcategory
    ? categoryRows.filter(
        (row) => (row.subcategory || "未细分") === drill.subcategory,
      )
    : categoryRows;
  const selectedTotal = sumRows(selectedRows);
  const merchants = drill.subcategory
    ? groupRows(selectedRows, (row) => row.title || drill.subcategory || drill.category)
    : [];
  const sortedRows = [...selectedRows].sort(
    (a, b) =>
      b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt),
  );

  return (
    <div className="modal-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="insight-drill-title">
        <div className="modal-header">
          <div>
            <span className="eyebrow">SPENDING BREAKDOWN</span>
            <h2 id="insight-drill-title">
              {drill.subcategory ? `${drill.subcategory} 花在了哪里` : `${drill.category} 都花在哪了`}
            </h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="关闭洞察详情">
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
                const pct = categoryTotal ? Math.round((item.total / categoryTotal) * 100) : 0;
                return (
                  <button
                    key={item.name}
                    type="button"
                    style={clickableResetStyle()}
                    onClick={() => onOpenSubcategory(item.name)}
                  >
                    <div className="yj-bar-row">
                      <div>
                        <span>{item.emoji} {item.name}</span>
                        <span>¥{money(item.total)} · {pct}% · {item.count}笔 <ChevronRight size={14} /></span>
                      </div>
                      <div className="yj-bar-track"><span style={{ width: `${Math.max(4, pct)}%` }} /></div>
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
                  const pct = selectedTotal ? Math.round((item.total / selectedTotal) * 100) : 0;
                  return (
                    <div className="yj-bar-row" key={item.name}>
                      <div>
                        <span>{item.emoji} {item.name}</span>
                        <span>¥{money(item.total)} · {pct}% · {item.count}笔</span>
                      </div>
                      <div className="yj-bar-track"><span style={{ width: `${Math.max(4, pct)}%` }} /></div>
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
                    style={clickableResetStyle()}
                    onClick={() => onEdit(row)}
                  >
                    <div className="yj-row">
                      <span className="yj-row-main" style={{ width: "100%" }}>
                        <span className="yj-row-emoji">{row.emoji}</span>
                        <span className="yj-row-copy">
                          <strong>{row.title}</strong>
                          <small>{dateLabel(row.date)}{row.account && !["未指定", "其他"].includes(row.account) ? ` · ${row.account}` : ""}</small>
                        </span>
                      </span>
                      <div className="yj-row-tail"><strong>−¥{Number(row.amount).toFixed(2)}</strong></div>
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

export function InsightsApp() {
  const ledger = useLedger();
  const pwa = usePWA();
  const [month, setMonth] = useState(localDate().slice(0, 7));
  const [drill, setDrill] = useState<Drill | null>(null);
  const [editing, setEditing] = useState<Transaction | undefined>();
  const [editorOpen, setEditorOpen] = useState(false);

  const stats = summarize(ledger.rows, month);
  const discoveries = discover(ledger.rows, month);
  const monthCompare = compareToPreviousMonth(ledger.rows, month);
  const trend = monthlyTrend(ledger.rows, month, 6);
  const changes = categoryChanges(ledger.rows, month);
  const calendar = spendingCalendar(ledger.rows, month);
  const report = monthlyReport(ledger.rows, month);
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(null);
  const selectedDay = selectedCalendarDay
    ? calendar.days.find((item) => item.day === selectedCalendarDay) ?? null
    : calendar.highest;
  const trendMax = Math.max(
    1,
    ...trend.flatMap((item) => [item.expense, item.income]),
  );
  const expensePoints = trendPoints(trend.map((item) => item.expense), trendMax);
  const incomePoints = trendPoints(trend.map((item) => item.income), trendMax);
  const subgroups = useMemo(() => stats.subgroups.slice(0, 10), [stats.subgroups]);

  const openEdit = (row: Transaction) => {
    setDrill(null);
    setEditing(row);
    setEditorOpen(true);
  };

  return (
    <main className="yj-app">
      <div className="yj-shell">
        {ledger.error && (
          <div className="yj-banner yj-banner-error">
            <span>{ledger.error}</span>
            <button onClick={() => ledger.refresh().catch(() => {})}>重试</button>
          </div>
        )}

        <header className="yj-page-header yj-page-header-stack">
          <div>
            <span>洞察</span>
            <h1>钱都去哪了</h1>
            <p>点一级分类看细分，再点细分类看具体花在了哪里。</p>
          </div>
          <input
            className="yj-month-input"
            type="month"
            value={month}
            onChange={(event) => {
              if (!event.target.value) return;
              setMonth(event.target.value);
              setSelectedCalendarDay(null);
            }}
          />
        </header>

        <div className="yj-stat-grid">
          <div className="yj-card yj-stat"><span>支出</span><strong>¥{money(stats.expense)}</strong></div>
          <div className="yj-card yj-stat"><span>收入</span><strong>¥{money(stats.income)}</strong></div>
          <div className="yj-card yj-stat yj-stat-wide"><span>结余</span><strong>¥{money(stats.balance)}</strong></div>
        </div>

        <section className="yj-card yj-insight-card">
          <div className="yj-card-title">
            <div>
              <strong>近 6 个月资金趋势</strong>
              <small>同时看支出和已记录收入，避免只盯着某一个月</small>
            </div>
          </div>
          {trend.some((item) => item.expense || item.income) ? (
            <>
              <div className="yj-trend-legend" aria-hidden="true">
                <span><i className="yj-trend-dot yj-trend-dot-expense" />支出</span>
                <span><i className="yj-trend-dot yj-trend-dot-income" />收入</span>
              </div>
              <div className="yj-trend-chart" role="img" aria-label="近六个月收入与支出趋势">
                <svg viewBox="0 0 520 145" preserveAspectRatio="none">
                  <line x1="20" y1="128" x2="500" y2="128" className="yj-trend-axis" />
                  <line x1="20" y1="72" x2="500" y2="72" className="yj-trend-gridline" />
                  <polyline points={expensePoints} className="yj-trend-line yj-trend-expense" />
                  <polyline points={incomePoints} className="yj-trend-line yj-trend-income" />
                  {trend.map((item, index) => {
                    const x = 20 + (480 * index) / Math.max(1, trend.length - 1);
                    const expenseY = 128 - (112 * item.expense) / trendMax;
                    const incomeY = 128 - (112 * item.income) / trendMax;
                    return (
                      <g key={item.month}>
                        <circle cx={x} cy={expenseY} r="3.5" className="yj-trend-point yj-trend-point-expense" />
                        <circle cx={x} cy={incomeY} r="3.5" className="yj-trend-point yj-trend-point-income" />
                      </g>
                    );
                  })}
                </svg>
                <div className="yj-trend-labels">
                  {trend.map((item) => <span key={item.month}>{monthLabel(item.month)}</span>)}
                </div>
              </div>
              <div className="yj-trend-summary">
                <span>6个月月均支出</span>
                <strong>
                  ¥{money(Math.round(trend.reduce((sum, item) => sum + item.expense, 0) / trend.length))}
                </strong>
                <small>收入趋势仅反映你已经记录的收入。</small>
              </div>
            </>
          ) : (
            <div className="yj-empty"><span>📈</span><p>连续记录几个月后，这里会出现资金趋势。</p></div>
          )}
        </section>

        <section className="yj-card yj-insight-card">
          <div className="yj-card-title">
            <div>
              <strong>分类占比</strong>
              <small>点任意一级分类，查看它下面的细分类</small>
            </div>
          </div>
          <div className="yj-category-bars">
            {stats.groups.length ? stats.groups.map((group) => {
              const pct = stats.expense ? Math.round((group.total / stats.expense) * 100) : 0;
              return (
                <button
                  key={group.name}
                  type="button"
                  style={clickableResetStyle()}
                  onClick={() => setDrill({ category: group.name })}
                >
                  <div className="yj-bar-row">
                    <div>
                      <span>{group.emoji} {group.name}</span>
                      <span>¥{money(group.total)} · {pct}% <ChevronRight size={14} /></span>
                    </div>
                    <div className="yj-bar-track"><span style={{ width: `${Math.max(4, pct)}%` }} /></div>
                  </div>
                </button>
              );
            }) : <div className="yj-empty"><span>🌱</span><p>先记几笔，分类趋势就会出现在这里。</p></div>}
          </div>
        </section>

        {subgroups.length > 0 && (
          <section className="yj-card yj-insight-card">
            <div className="yj-card-title">
              <div>
                <strong>细分类排行</strong>
                <small>直接点“买菜 / 酒水 / 正餐”等，查看具体花在了哪里</small>
              </div>
            </div>
            <div className="yj-category-bars">
              {subgroups.map((group) => {
                const parent = stats.groups.find((item) => item.name === group.category);
                const pct = parent?.total ? Math.round((group.total / parent.total) * 100) : 0;
                return (
                  <button
                    key={`${group.category}-${group.subcategory}`}
                    type="button"
                    style={clickableResetStyle()}
                    onClick={() => setDrill({ category: group.category, subcategory: group.subcategory })}
                  >
                    <div className="yj-bar-row">
                      <div>
                        <span>{group.emoji} {group.subcategory} <small style={{ opacity: 0.62 }}>· {group.category}</small></span>
                        <span>¥{money(group.total)} · {pct}% <ChevronRight size={14} /></span>
                      </div>
                      <div className="yj-bar-track"><span style={{ width: `${Math.max(4, pct)}%` }} /></div>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="yj-card yj-insight-card">
          <div className="yj-card-title">
            <div><strong>月度变化</strong><small>和上个月比一比，只看支出</small></div>
          </div>
          <div className="yj-compare-grid">
            <div><span>本月</span><strong>¥{money(monthCompare.current)}</strong></div>
            <div><span>上月</span><strong>¥{money(monthCompare.previous)}</strong></div>
            <div className={monthCompare.change > 0 ? "yj-compare-up" : "yj-compare-down"}>
              <span>变化</span>
              <strong>
                {monthCompare.previous === 0
                  ? (monthCompare.current === 0 ? "—" : "新增支出")
                  : `${monthCompare.percent! > 0 ? "+" : ""}${monthCompare.percent}%`}
              </strong>
            </div>
          </div>
        </section>

        <section className="yj-card yj-insight-card">
          <div className="yj-card-title">
            <div><strong>支出变化贡献</strong><small>本月比上月的变化，具体来自哪些分类</small></div>
          </div>
          {changes.length ? (
            <div className="yj-change-list">
              {changes.slice(0, 6).map((item) => {
                const positive = item.change > 0;
                const magnitude = Math.abs(item.change);
                const maxChange = Math.max(1, ...changes.map((change) => Math.abs(change.change)));
                return (
                  <div className="yj-change-row" key={item.category}>
                    <div className="yj-change-main">
                      <span>{item.emoji} {item.category}</span>
                      <strong className={positive ? "up" : "down"}>
                        {positive ? "+" : "−"}¥{money(magnitude)}
                      </strong>
                    </div>
                    <div className="yj-change-track">
                      <span
                        className={positive ? "up" : "down"}
                        style={{ width: `${Math.max(5, Math.round((magnitude / maxChange) * 100))}%` }}
                      />
                    </div>
                    <small>
                      上月 ¥{money(item.previous)} → 本月 ¥{money(item.current)}
                    </small>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="yj-empty"><span>↔️</span><p>本月和上月暂时没有可比较的分类变化。</p></div>
          )}
        </section>

        <section className="yj-card yj-insight-card">
          <div className="yj-card-title">
            <div><strong>消费日历</strong><small>颜色越深，当天支出越高。点日期看当天金额。</small></div>
          </div>
          <div className="yj-calendar-weekdays" aria-hidden="true">
            {["一","二","三","四","五","六","日"].map((day) => <span key={day}>{day}</span>)}
          </div>
          <div className="yj-calendar-grid">
            {Array.from({ length: calendar.leadingBlankDays }, (_, index) => (
              <span className="yj-calendar-blank" key={`blank-${index}`} />
            ))}
            {calendar.days.map((item) => (
              <button
                type="button"
                key={item.date}
                className={`yj-calendar-day level-${heatLevel(item.total, calendar.max)} ${selectedDay?.day === item.day ? "selected" : ""}`}
                onClick={() => setSelectedCalendarDay(item.day)}
                aria-label={`${item.date}，支出 ${money(item.total)} 元，共 ${item.count} 笔`}
                title={`${item.date} · ¥${money(item.total)} · ${item.count}笔`}
              >
                <span>{item.day}</span>
              </button>
            ))}
          </div>
          <div className="yj-calendar-detail">
            {selectedDay ? (
              <>
                <div>
                  <span>{selectedDay.date}</span>
                  <strong>¥{money(selectedDay.total)}</strong>
                </div>
                <small>{selectedDay.count} 笔支出 · 本月 {calendar.zeroSpendDays} 天零支出</small>
              </>
            ) : (
              <small>这个月还没有支出记录。</small>
            )}
          </div>
        </section>

        <section className="yj-card yj-insight-card yj-monthly-report">
          <div className="yj-card-title">
            <div><strong>{Number(month.slice(5))} 月月报</strong><small>把数字压缩成几句真正有用的话</small></div>
          </div>
          <div className="yj-report-hero">
            <span>本月支出</span>
            <strong>¥{money(report.expense)}</strong>
            <small>
              {report.expensePercent == null
                ? "上月暂无可比较记录"
                : `较上月 ${report.expensePercent > 0 ? "增加" : report.expensePercent < 0 ? "减少" : "持平"} ${Math.abs(report.expensePercent)}%`}
            </small>
          </div>
          <div className="yj-report-list">
            {report.topCategory && (
              <div><span>{report.topCategory.emoji}</span><p><strong>{report.topCategory.name}</strong> 是最大支出，¥{money(report.topCategory.total)}，占 {report.topCategory.share}%。</p></div>
            )}
            {report.topIncrease && (
              <div><span>↗</span><p><strong>{report.topIncrease.category}</strong> 是最大增长项，比上月多 ¥{money(report.topIncrease.change)}。</p></div>
            )}
            {report.topDecrease && (
              <div><span>↘</span><p><strong>{report.topDecrease.category}</strong> 比上月少 ¥{money(Math.abs(report.topDecrease.change))}。</p></div>
            )}
            {report.highestDay && (
              <div><span>📅</span><p><strong>{report.highestDay.date.slice(5).replace("-", "月")}日</strong> 是消费最高的一天，支出 ¥{money(report.highestDay.total)}。</p></div>
            )}
          </div>
          <div className="yj-report-balance">
            <span>已记录收入 ¥{money(report.income)}</span>
            <strong className={report.balance >= 0 ? "positive" : "negative"}>
              结余 {report.balance >= 0 ? "+" : "−"}¥{money(Math.abs(report.balance))}
            </strong>
          </div>
        </section>

        <section className="yj-discovery yj-discovery-light">
          <span>✨ 这个月</span>
          <strong>{discoveries[0]?.title ?? "还没有足够的数据"}</strong>
          <p>{discoveries[0]?.text ?? "保持记录，洞察会越来越像你。"}</p>
        </section>

        {ledger.toast && <div className="yj-toast">{ledger.toast}</div>}
      </div>

      <nav className="yj-bottom-nav">
        <Link href="/"><Home size={19} /><span>首页</span></Link>
        <Link href="/bills"><ReceiptText size={19} /><span>账单</span></Link>
        <button
          className="yj-bottom-add"
          onClick={() => {
            setEditing(undefined);
            setEditorOpen(true);
          }}
          aria-label="快速记账"
        >
          <Plus size={24} />
        </button>
        <Link href="/insights" className="active"><BarChart3 size={19} /><span>洞察</span></Link>
        <Link href="/me"><CircleUserRound size={19} /><span>我的</span></Link>
      </nav>

      {drill && (
        <InsightModal
          rows={ledger.rows}
          month={month}
          drill={drill}
          onBack={() => setDrill({ category: drill.category })}
          onClose={() => setDrill(null)}
          onOpenSubcategory={(subcategory) => setDrill({ category: drill.category, subcategory })}
          onEdit={openEdit}
        />
      )}

      {editorOpen && (
        <EntryModal
          initial={editing}
          busy={ledger.busy || pwa.offline}
          defaultAccount={ledger.user?.defaultAccount ?? "未指定"}
          onClose={() => setEditorOpen(false)}
          onSave={ledger.save}
          onDelete={ledger.remove}
        />
      )}
    </main>
  );
}
