"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  ChevronRight,
  Repeat2,
  Store,
  TrendingUp,
  WalletCards,
} from "lucide-react";
import {
  categoryTrend,
  type CategoryChange,
  type MonthlyReport,
  type MonthlyTrendPoint,
  type RecurringExpense,
  type SpendingAnomaly,
  type SpendingCalendarDay,
  type MerchantStat,
} from "@/lib/stats";
import { money } from "@/lib/dates";
import type { Transaction } from "@/types";

export type InsightsTab = "overview" | "trends" | "habits";

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

function walletQuip({
  expense,
  report,
  recurringTotal,
  anomalies,
  merchants,
  monthPercent,
}: {
  expense: number;
  report: MonthlyReport;
  recurringTotal: number;
  anomalies: SpendingAnomaly[];
  merchants: MerchantStat[];
  monthPercent: number | null;
}) {
  if (!expense) return "这个月的钱包安静得像没连上 Wi‑Fi。再记几笔，我再开麦。";
  if (anomalies.length) {
    const top = anomalies[0];
    return `“${top.title}”这笔账从队伍里探出了脑袋：大约是你平时同类消费的 ${top.ratio.toFixed(1)} 倍。`;
  }
  if (merchants[0]?.count >= 8) {
    return `${merchants[0].title} 本月和你碰面 ${merchants[0].count} 次，熟客进度条正在悄悄前进。`;
  }
  if (recurringTotal > expense * 0.3) {
    const recurringShare = Math.min(
      100,
      Math.round((recurringTotal / expense) * 100),
    );
    return `这个月还没开始自由发挥，固定支出已经先切走了约 ${recurringShare}% 的蛋糕。`;
  }
  if (monthPercent != null && monthPercent <= -15) {
    return `这个月钱包踩了点刹车，比上月少花 ${Math.abs(monthPercent)}%。刹得不算急，但确实看得见。`;
  }
  if (monthPercent != null && monthPercent >= 20) {
    return `这个月消费油门比上月深了 ${monthPercent}%。先别慌，看看“趋势”里是谁踩的。`;
  }
  if (report.topCategory && report.topCategory.share >= 35) {
    return `${report.topCategory.name} 本月戏份很足，一个分类就承包了 ${report.topCategory.share}% 的支出。`;
  }
  return "这个月账本没有上演大起大落，属于钱包界的平稳航行。";
}

export function OverviewTab({
  stats,
  report,
  monthPercent,
  recurring,
  merchants,
  anomalies,
  onOpenCategory,
  onChangeTab,
}: {
  stats: {
    expense: number;
    income: number;
    balance: number;
    groups: Array<{ name: string; emoji: string; total: number }>;
  };
  report: MonthlyReport;
  monthPercent: number | null;
  recurring: RecurringExpense[];
  merchants: MerchantStat[];
  anomalies: SpendingAnomaly[];
  onOpenCategory: (category: string) => void;
  onChangeTab: (tab: InsightsTab) => void;
}) {
  const recurringTotal = recurring.reduce(
    (sum, item) => sum + item.averageMonthly,
    0,
  );
  const quip = walletQuip({
    expense: stats.expense,
    report,
    recurringTotal,
    anomalies,
    merchants,
    monthPercent,
  });
  const biggestMove =
    !report.topIncrease
      ? report.topDecrease
      : !report.topDecrease
        ? report.topIncrease
        : Math.abs(report.topIncrease.change) >= Math.abs(report.topDecrease.change)
          ? report.topIncrease
          : report.topDecrease;

  return (
    <div className="yj-insight-tab-panel" role="tabpanel">
      <div className="yj-overview-stat-grid">
        <div className="yj-card yj-stat">
          <span>支出</span>
          <strong>¥{money(stats.expense)}</strong>
        </div>
        <div className="yj-card yj-stat">
          <span>已记录收入</span>
          <strong>¥{money(stats.income)}</strong>
        </div>
        <div className="yj-card yj-stat">
          <span>结余</span>
          <strong className={stats.balance < 0 ? "negative" : "positive"}>
            {stats.balance < 0 ? "−" : ""}¥{money(Math.abs(stats.balance))}
          </strong>
        </div>
      </div>

      <section className="yj-wallet-voice">
        <span>🪙 钱包旁白</span>
        <p>{quip}</p>
      </section>

      <section className="yj-card yj-insight-card yj-monthly-report">
        <div className="yj-card-title">
          <div>
            <strong>这个月发生了什么</strong>
            <small>总览只放结论，证据留给后面的趋势和习惯</small>
          </div>
        </div>
        <div className="yj-report-pulse">
          <span>环比节奏</span>
          <strong
            className={
              report.expensePercent == null
                ? ""
                : report.expensePercent > 0
                  ? "up"
                  : report.expensePercent < 0
                    ? "down"
                    : ""
            }
          >
            {report.expensePercent == null
              ? "暂无对照"
              : report.expensePercent === 0
                ? "持平"
                : `${report.expensePercent > 0 ? "↑" : "↓"} ${Math.abs(report.expensePercent)}%`}
          </strong>
          <small>
            {report.expensePercent == null
              ? "再多一个月，就能开始比较节奏。"
              : report.expenseChange === 0
                ? "和上月几乎同速巡航。"
                : `比上月${report.expenseChange > 0 ? "多" : "少"} ¥${money(Math.abs(report.expenseChange))}`}
          </small>
        </div>
        <div className="yj-report-list">
          {report.topCategory && (
            <div>
              <span>{report.topCategory.emoji}</span>
              <p>
                <strong>{report.topCategory.name}</strong> 是最大支出，
                ¥{money(report.topCategory.total)}，占 {report.topCategory.share}%。
              </p>
            </div>
          )}
          {biggestMove && (
            <div>
              <span>{biggestMove.change > 0 ? "↗" : "↘"}</span>
              <p>
                <strong>{biggestMove.category}</strong> 是本月最明显的分类变化，
                比上月{biggestMove.change > 0 ? "多" : "少"} ¥{money(Math.abs(biggestMove.change))}。
              </p>
            </div>
          )}
          {report.highestDay && (
            <div>
              <span>📅</span>
              <p>
                <strong>{report.highestDay.date.slice(5).replace("-", "月")}日</strong>
                是消费最高的一天，支出 ¥{money(report.highestDay.total)}。
              </p>
            </div>
          )}
        </div>
      </section>

      <section className="yj-card yj-insight-card">
        <div className="yj-card-title">
          <div>
            <strong>消费结构</strong>
            <small>先看主角，想深挖再点进去</small>
          </div>
          <button
            type="button"
            className="yj-text-link"
            onClick={() => onChangeTab("trends")}
          >
            看趋势 <ChevronRight size={14} />
          </button>
        </div>
        <div className="yj-overview-structure">
          {stats.groups.slice(0, 4).map((group) => {
            const pct = stats.expense
              ? Math.round((group.total / stats.expense) * 100)
              : 0;
            return (
              <button
                type="button"
                key={group.name}
                onClick={() => onOpenCategory(group.name)}
              >
                <span>{group.emoji}</span>
                <div>
                  <strong>{group.name}</strong>
                  <small>¥{money(group.total)} · {pct}%</small>
                </div>
                <ChevronRight size={15} />
              </button>
            );
          })}
        </div>
      </section>

      <section className="yj-overview-signals">
        <button type="button" onClick={() => onChangeTab("habits")}>
          <Repeat2 size={18} />
          <div>
            <span>固定支出</span>
            <strong>
              {recurring.length
                ? `约 ¥${money(recurringTotal)}/月`
                : "暂未识别"}
            </strong>
          </div>
          <small>{recurring.length ? `${recurring.length} 个候选` : "继续记录会更准"}</small>
        </button>
        <button type="button" onClick={() => onChangeTab("habits")}>
          <AlertTriangle size={18} />
          <div>
            <span>异常消费</span>
            <strong>{anomalies.length ? `${anomalies.length} 笔` : "暂无"}</strong>
          </div>
          <small>{anomalies.length ? "去看看哪笔冒头了" : "钱包今天很守规矩"}</small>
        </button>
      </section>
    </div>
  );
}

export function TrendsTab({
  rows,
  month,
  trend,
  changes,
  current,
  previous,
  percent,
}: {
  rows: Transaction[];
  month: string;
  trend: MonthlyTrendPoint[];
  changes: CategoryChange[];
  current: number;
  previous: number;
  percent: number | null;
}) {
  const trendMax = Math.max(
    1,
    ...trend.flatMap((item) => [item.expense, item.income]),
  );
  const expensePoints = trendPoints(
    trend.map((item) => item.expense),
    trendMax,
  );
  const incomePoints = trendPoints(
    trend.map((item) => item.income),
    trendMax,
  );
  const mix = categoryTrend(rows, month, 6, 4);
  const [selectedTrendIndex, setSelectedTrendIndex] = useState(
    Math.max(0, trend.length - 1),
  );

  useEffect(() => {
    setSelectedTrendIndex(Math.max(0, trend.length - 1));
  }, [month, trend.length]);

  const selectedTrend =
    trend[selectedTrendIndex] ?? trend[trend.length - 1] ?? null;

  return (
    <div className="yj-insight-tab-panel" role="tabpanel">
      <section className="yj-card yj-insight-card">
        <div className="yj-card-title">
          <div>
            <strong>近 6 个月资金趋势</strong>
            <small>收入只统计已经录入的部分</small>
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
                {trend.map((item, index) => (
                  <button
                    type="button"
                    key={item.month}
                    className={selectedTrendIndex === index ? "active" : ""}
                    onClick={() => setSelectedTrendIndex(index)}
                    aria-label={`查看 ${item.month} 数据`}
                  >
                    {monthLabel(item.month)}
                  </button>
                ))}
              </div>
            </div>
            {selectedTrend && (
              <div className="yj-trend-inspector">
                <div>
                  <span>{selectedTrend.month}</span>
                  <strong>支出 ¥{money(selectedTrend.expense)}</strong>
                </div>
                <div>
                  <span>已记录收入</span>
                  <strong>¥{money(selectedTrend.income)}</strong>
                </div>
                <div>
                  <span>结余</span>
                  <strong className={selectedTrend.balance < 0 ? "negative" : "positive"}>
                    {selectedTrend.balance < 0 ? "−" : ""}¥{money(Math.abs(selectedTrend.balance))}
                  </strong>
                </div>
              </div>
            )}
            <div className="yj-trend-summary">
              <span>6个月月均支出</span>
              <strong>
                ¥{money(
                  Math.round(
                    trend.reduce((sum, item) => sum + item.expense, 0) /
                      trend.length,
                  ),
                )}
              </strong>
              <small>曲线负责讲过程，不负责替你做道德审判。</small>
            </div>
          </>
        ) : (
          <div className="yj-empty">
            <span>📈</span>
            <p>连续记录几个月后，这里会长出一条属于你的资金曲线。</p>
          </div>
        )}
      </section>

      <section className="yj-card yj-insight-card">
        <div className="yj-card-title">
          <div>
            <strong>月度变化</strong>
            <small>先看总量，再追问是谁推动了变化</small>
          </div>
        </div>
        <div className="yj-compare-grid">
          <div><span>本月</span><strong>¥{money(current)}</strong></div>
          <div><span>上月</span><strong>¥{money(previous)}</strong></div>
          <div className={(percent ?? 0) > 0 ? "yj-compare-up" : "yj-compare-down"}>
            <span>变化</span>
            <strong>
              {percent == null
                ? current === 0
                  ? "—"
                  : "新增支出"
                : `${percent > 0 ? "+" : ""}${percent}%`}
            </strong>
          </div>
        </div>
      </section>

      <section className="yj-card yj-insight-card">
        <div className="yj-card-title">
          <div>
            <strong>支出变化贡献</strong>
            <small>本月比上月的变化，到底是谁动了手脚</small>
          </div>
        </div>
        {changes.length ? (
          <div className="yj-change-list">
            {changes.slice(0, 6).map((item) => {
              const positive = item.change > 0;
              const magnitude = Math.abs(item.change);
              const maxChange = Math.max(
                1,
                ...changes.map((change) => Math.abs(change.change)),
              );
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
                      style={{
                        width: `${Math.max(
                          5,
                          Math.round((magnitude / maxChange) * 100),
                        )}%`,
                      }}
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
          <div className="yj-empty">
            <span>↔️</span>
            <p>本月和上月暂时没有可比较的分类变化。</p>
          </div>
        )}
      </section>

      <section className="yj-card yj-insight-card">
        <div className="yj-card-title">
          <div>
            <strong>消费结构怎么变</strong>
            <small>近 6 个月各类支出的占比变化</small>
          </div>
        </div>
        <div className="yj-composition-legend">
          {mix.categories.map((category, index) => (
            <span key={category.name}>
              <i className={`series-${index}`} />
              {category.emoji} {category.name}
            </span>
          ))}
          <span><i className="series-other" />其他</span>
        </div>
        <div className="yj-composition-list">
          {mix.points.map((point) => {
            const trackedTotal = Object.values(point.categories).reduce(
              (sum, value) => sum + value,
              0,
            );
            const other = Math.max(0, point.total - trackedTotal);
            return (
              <div className="yj-composition-row" key={point.month}>
                <span>{monthLabel(point.month)}</span>
                <div>
                  {mix.categories.map((category, index) => {
                    const value = point.categories[category.name] ?? 0;
                    const pct = point.total ? (value / point.total) * 100 : 0;
                    return (
                      <i
                        key={category.name}
                        className={`series-${index}`}
                        style={{ width: `${pct}%` }}
                        title={`${category.name} ${Math.round(pct)}%`}
                      />
                    );
                  })}
                  <i
                    className="series-other"
                    style={{
                      width: `${point.total ? (other / point.total) * 100 : 100}%`,
                    }}
                    title="其他"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export function HabitsTab({
  month,
  calendar,
  recurring,
  recurringTotal,
  merchants,
  anomalies,
  rows,
  onEdit,
}: {
  month: string;
  calendar: {
    days: SpendingCalendarDay[];
    leadingBlankDays: number;
    max: number;
    highest: SpendingCalendarDay | null;
    zeroSpendDays: number;
  };
  recurring: RecurringExpense[];
  recurringTotal: number;
  merchants: MerchantStat[];
  anomalies: SpendingAnomaly[];
  rows: Transaction[];
  onEdit: (row: Transaction) => void;
}) {
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<number | null>(
    null,
  );

  useEffect(() => {
    setSelectedCalendarDay(null);
  }, [month]);

  const selectedDay = selectedCalendarDay
    ? calendar.days.find((item) => item.day === selectedCalendarDay) ?? null
    : calendar.highest;

  return (
    <div className="yj-insight-tab-panel" role="tabpanel">
      <section className="yj-card yj-insight-card">
        <div className="yj-card-title">
          <div>
            <strong>消费日历</strong>
            <small>颜色越深，当天的钱包越忙</small>
          </div>
        </div>
        <div className="yj-calendar-weekdays" aria-hidden="true">
          {["一", "二", "三", "四", "五", "六", "日"].map((day) => (
            <span key={day}>{day}</span>
          ))}
        </div>
        <div className="yj-calendar-grid">
          {Array.from(
            { length: calendar.leadingBlankDays },
            (_, index) => (
              <span className="yj-calendar-blank" key={`blank-${index}`} />
            ),
          )}
          {calendar.days.map((item) => (
            <button
              type="button"
              key={item.date}
              className={`yj-calendar-day level-${heatLevel(
                item.total,
                calendar.max,
              )} ${selectedDay?.day === item.day ? "selected" : ""}`}
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
              <small>
                {selectedDay.count} 笔支出 · 本月 {calendar.zeroSpendDays} 天零支出
              </small>
            </>
          ) : (
            <small>这个月还没有支出记录，钱包正在安静围观。</small>
          )}
        </div>
      </section>

      <section className="yj-card yj-insight-card">
        <div className="yj-card-title">
          <div>
            <strong>常去哪里花钱</strong>
            <small>金额和见面次数一起看，熟客身份无处遁形</small>
          </div>
          <Store size={18} />
        </div>
        {merchants.length ? (
          <div className="yj-merchant-list">
            {merchants.slice(0, 6).map((item, index) => (
              <div className="yj-merchant-row" key={`${item.title}-${index}`}>
                <span className="yj-merchant-rank">{index + 1}</span>
                <span className="yj-merchant-emoji">{item.emoji}</span>
                <div className="yj-merchant-copy">
                  <strong>{item.title}</strong>
                  <small>{item.count} 次 · 单次均价 ¥{money(item.average)}</small>
                </div>
                <strong className="yj-merchant-total">¥{money(item.total)}</strong>
              </div>
            ))}
          </div>
        ) : (
          <div className="yj-empty"><span>🧾</span><p>这个月还没有足够的消费记录。</p></div>
        )}
      </section>

      <section className="yj-card yj-insight-card">
        <div className="yj-card-title">
          <div>
            <strong>疑似固定支出</strong>
            <small>每个月准时出现的那些“老熟人”</small>
          </div>
          <Repeat2 size={18} />
        </div>
        {recurring.length ? (
          <>
            <div className="yj-pattern-summary">
              <span>估算每月固定支出</span>
              <strong>¥{money(recurringTotal)}</strong>
              <small>{recurring.length} 个候选 · 仅根据已记录流水推断</small>
            </div>
            <div className="yj-recurring-list">
              {recurring.slice(0, 5).map((item) => (
                <div
                  className="yj-recurring-row"
                  key={`${item.title}-${item.category}-${item.subcategory}`}
                >
                  <span className="yj-recurring-emoji">{item.emoji}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      {item.category}
                      {item.subcategory ? ` / ${item.subcategory}` : ""} ·
                      近 6 月出现 {item.months} 个月
                    </small>
                  </div>
                  <div className="yj-recurring-tail">
                    <strong>¥{money(item.averageMonthly)}/月</strong>
                    <span
                      className={
                        item.confidence === "high" ? "high" : "medium"
                      }
                    >
                      {item.confidence === "high" ? "较稳定" : "可能固定"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="yj-empty">
            <span>🔁</span>
            <p>暂时没有足够稳定的重复支出。连续记录两三个月后会更准。</p>
          </div>
        )}
      </section>

      <section className="yj-card yj-insight-card">
        <div className="yj-card-title">
          <div>
            <strong>异常消费</strong>
            <small>和你自己的历史相比，谁突然长高了</small>
          </div>
          <AlertTriangle size={18} />
        </div>
        {anomalies.length ? (
          <div className="yj-anomaly-list">
            {anomalies.map((item) => {
              const row = rows.find((candidate) => candidate.id === item.id);
              return (
                <button
                  type="button"
                  key={item.id}
                  className="yj-anomaly-row"
                  onClick={() => row && onEdit(row)}
                >
                  <span>{item.emoji}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <small>
                      {item.date} · 平时约 ¥{money(item.typical)} ·
                      本次约为 {item.ratio.toFixed(1)} 倍
                    </small>
                  </div>
                  <strong>¥{money(item.amount)}</strong>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="yj-empty">
            <span>✓</span>
            <p>暂未发现明显异常，或者历史样本还不足。今天的钱包没有举手发言。</p>
          </div>
        )}
      </section>
    </div>
  );
}

export function InsightsTabs({
  active,
  onChange,
}: {
  active: InsightsTab;
  onChange: (tab: InsightsTab) => void;
}) {
  const items: Array<{
    id: InsightsTab;
    label: string;
    icon: typeof WalletCards;
  }> = [
    { id: "overview", label: "总览", icon: WalletCards },
    { id: "trends", label: "趋势", icon: TrendingUp },
    { id: "habits", label: "习惯", icon: CalendarDays },
  ];

  return (
    <div className="yj-insights-tabs" role="tablist" aria-label="洞察视角">
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={active === id}
          className={active === id ? "active" : ""}
          onClick={() => onChange(id)}
        >
          <Icon size={15} />
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
