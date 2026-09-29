import type { Transaction } from "@/types";
import { cents, localDate, shiftDate } from "./dates";

function expenseRows(rows: Transaction[]) {
  return rows.filter((row) => row.type === "expense");
}

function dayExpense(rows: Transaction[], date: string) {
  return rows
    .filter((row) => row.type === "expense" && row.date === date)
    .reduce((sum, row) => sum + cents(row.amount), 0);
}

function dayCount(rows: Transaction[], date: string) {
  return rows.filter((row) => row.type === "expense" && row.date === date).length;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function daysBetween(from: string, to: string) {
  const start = new Date(`${from}T12:00:00`).getTime();
  const end = new Date(`${to}T12:00:00`).getTime();
  return Math.round((end - start) / 86400000);
}

function historyWindow(rows: Transaction[], date: string, maxDays = 30) {
  const expenses = expenseRows(rows)
    .filter((row) => row.date < date)
    .sort((a, b) => a.date.localeCompare(b.date));
  if (!expenses.length) {
    return { dates: [] as string[], totals: [] as number[], counts: [] as number[], calendarDays: 0 };
  }

  const earliestAllowed = shiftDate(-maxDays, new Date(`${date}T12:00:00`));
  const start = expenses[0].date > earliestAllowed ? expenses[0].date : earliestAllowed;
  const calendarDays = Math.max(0, daysBetween(start, date));
  const dates = Array.from({ length: calendarDays }, (_, index) =>
    shiftDate(index, new Date(`${start}T12:00:00`)),
  );

  return {
    dates,
    totals: dates.map((target) => dayExpense(rows, target)),
    counts: dates.map((target) => dayCount(rows, target)),
    calendarDays,
  };
}

function dominantCategory(rows: Transaction[], date: string) {
  const map = new Map<string, number>();
  rows
    .filter((row) => row.type === "expense" && row.date === date)
    .forEach((row) => {
      map.set(row.category, (map.get(row.category) ?? 0) + cents(row.amount));
    });
  return [...map.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

export type WalletWeather = {
  emoji: string;
  label: string;
  headline: string;
  detail: string;
  todayTotal: number;
  baselineDaily: number;
  ratio: number | null;
  ready: boolean;
};

export function walletWeather(
  rows: Transaction[],
  date = localDate(),
): WalletWeather {
  const todayTotal = dayExpense(rows, date);
  const history = historyWindow(rows, date, 30);
  const baselineDaily = average(history.totals);
  const ready = history.calendarDays >= 7 && baselineDaily > 0;
  const category = dominantCategory(rows, date);

  if (!todayTotal) {
    return {
      emoji: "☀️",
      label: "钱包晴空",
      headline: "今天钱包几乎没出门。",
      detail: ready
        ? `近期日均约 ¥${(baselineDaily / 100).toFixed(0)}，今天暂时是零支出天气。`
        : "今天暂时没有支出，气象站也在安静值班。",
      todayTotal,
      baselineDaily,
      ratio: ready ? 0 : null,
      ready,
    };
  }

  if (!ready) {
    return {
      emoji: "🌱",
      label: "气象站建设中",
      headline: "今天有消费，但还不到下天气预报的时候。",
      detail: `已经积累 ${history.calendarDays} 天观察期，再多记几天会更像你。`,
      todayTotal,
      baselineDaily,
      ratio: null,
      ready: false,
    };
  }

  const ratio = todayTotal / baselineDaily;
  const suffix = category ? `今天主要是「${category}」在活动。` : "";

  if (ratio <= 0.55) {
    return {
      emoji: "☀️",
      label: "晴",
      headline: "钱包今天走的是轻量路线。",
      detail: `支出约为近期日均的 ${Math.round(ratio * 100)}%。${suffix}`,
      todayTotal,
      baselineDaily,
      ratio,
      ready,
    };
  }
  if (ratio <= 1.15) {
    return {
      emoji: "🌤️",
      label: "多云转晴",
      headline: "今天花得挺像平时的你。",
      detail: `支出约为近期日均的 ${Math.round(ratio * 100)}%。${suffix}`,
      todayTotal,
      baselineDaily,
      ratio,
      ready,
    };
  }
  if (ratio <= 1.8) {
    return {
      emoji: "🌦️",
      label: "局部阵雨",
      headline: "钱包今天比平常忙一点。",
      detail: `支出约为近期日均的 ${ratio.toFixed(1)} 倍。${suffix}`,
      todayTotal,
      baselineDaily,
      ratio,
      ready,
    };
  }
  if (ratio <= 2.8) {
    return {
      emoji: "🌧️",
      label: "大雨",
      headline: "今天的钱包存在感明显增强。",
      detail: `支出约为近期日均的 ${ratio.toFixed(1)} 倍。${suffix}`,
      todayTotal,
      baselineDaily,
      ratio,
      ready,
    };
  }
  return {
    emoji: "🌪️",
    label: "钱包台风",
    headline: "今天这波消费成功获得天气命名权。",
    detail: `支出约为近期日均的 ${ratio.toFixed(1)} 倍。${suffix}`,
    todayTotal,
    baselineDaily,
    ratio,
    ready,
  };
}

export type JileIndex = {
  score: number | null;
  label: string;
  detail: string;
  ready: boolean;
};

export function jileIndex(
  rows: Transaction[],
  date = localDate(),
): JileIndex {
  const history = historyWindow(rows, date, 30);
  const baselineDaily = average(history.totals);
  const baselineCount = history.counts.length
    ? history.counts.reduce((sum, value) => sum + value, 0) / history.counts.length
    : 0;
  const today = rows.filter((row) => row.type === "expense" && row.date === date);
  const todayTotal = today.reduce((sum, row) => sum + cents(row.amount), 0);

  if (history.calendarDays < 7 || baselineDaily <= 0) {
    return {
      score: null,
      label: "指数观察中",
      detail: `目前只有 ${history.calendarDays} 天可比历史，先不急着给钱包打分。`,
      ready: false,
    };
  }

  if (!today.length) {
    return {
      score: 0,
      label: "钱包隐身",
      detail: "今天还没发生支出，指数暂时贴着地板走。",
      ready: true,
    };
  }

  const spendRatio = todayTotal / baselineDaily;
  const countRatio = baselineCount > 0 ? today.length / baselineCount : 1;
  const historicalAmounts = expenseRows(rows)
    .filter((row) => row.date < date && history.dates.includes(row.date))
    .map((row) => cents(row.amount))
    .filter((value) => value > 0);
  const typicalTransaction = median(historicalAmounts);
  const largestToday = Math.max(...today.map((row) => cents(row.amount)));
  const singleRatio =
    typicalTransaction > 0 ? largestToday / typicalTransaction : 1;

  const spendScore = Math.min(55, Math.round(spendRatio * 22));
  const frequencyScore = Math.min(20, Math.round(countRatio * 8));
  const singleScore = Math.min(
    25,
    Math.max(0, Math.round((singleRatio - 1) * 7)),
  );
  const score = Math.max(0, Math.min(100, spendScore + frequencyScore + singleScore));

  const label =
    score < 20
      ? "钱包隐身"
      : score < 40
        ? "轻微又寄"
        : score < 60
          ? "有点又寄"
          : score < 80
            ? "明显又寄"
            : "今日大寄";

  return {
    score,
    label,
    detail:
      "这是娱乐指数：越高只表示今天相对你自己的平时更能花，不代表花得好或坏。",
    ready: true,
  };
}

export type SpendingArchaeology = {
  found: boolean;
  emoji: string;
  label: string;
  title: string;
  detail: string;
  transactionId: string | null;
};

function monthDistance(from: string, to: string) {
  const [fy, fm] = from.slice(0, 7).split("-").map(Number);
  const [ty, tm] = to.slice(0, 7).split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

export function spendingArchaeology(
  rows: Transaction[],
  date = localDate(),
): SpendingArchaeology {
  const old = expenseRows(rows)
    .filter((row) => row.date < date && daysBetween(row.date, date) >= 30)
    .sort((a, b) => b.date.localeCompare(a.date));

  if (!old.length) {
    const oldest = expenseRows(rows)
      .filter((row) => row.date < date)
      .sort((a, b) => a.date.localeCompare(b.date))[0];
    const age = oldest ? daysBetween(oldest.date, date) : 0;
    const remaining = Math.max(0, 30 - age);
    return {
      found: false,
      emoji: "🏺",
      label: "消费考古",
      title: "考古层还不够厚。",
      detail: oldest
        ? `再过 ${remaining} 天，第一批旧账就能正式出土。`
        : "先留下些生活痕迹，以后的你才有东西可挖。",
      transactionId: null,
    };
  }

  const day = date.slice(8);
  const monthDay = date.slice(5);
  const exactYear = old.find((row) => row.date.slice(5) === monthDay);
  const exactDay = old.find((row) => row.date.slice(8) === day);
  const candidate = exactYear ?? exactDay ?? old[0];
  const months = monthDistance(candidate.date, date);

  let label = `${candidate.date} 的旧账`;
  if (candidate.date.slice(5) === monthDay && months >= 12) {
    const years = Math.round(months / 12);
    label = years === 1 ? "去年今天" : `${years} 年前的今天`;
  } else if (candidate.date.slice(8) === day && months > 0) {
    label = `${months} 个月前的今天`;
  }

  return {
    found: true,
    emoji: "🏺",
    label,
    title: `${candidate.emoji} ${candidate.title} · ¥${Number(candidate.amount).toFixed(2)}`,
    detail: `那天它被记进了「${candidate.category}${candidate.subcategory ? ` / ${candidate.subcategory}` : ""}」。账单不会说话，但很会留证据。`,
    transactionId: candidate.id,
  };
}
