import type { Transaction } from "@/types";
import { cents, localDate, shiftDate, shiftMonth } from "./dates";
import {
  getCategory,
  getDisplayEmoji,
  normalizeCategoryPair,
} from "./categories";

export function summarize(rows: Transaction[], month: string) {
  const selected = rows.filter((t) => t.date.startsWith(month));
  const expense = selected
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + cents(t.amount), 0);
  const income = selected
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + cents(t.amount), 0);

  const map = new Map<string, number>();
  const subMap = new Map<string, { category: string; subcategory: string; total: number }>();
  selected
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const pair = normalizeCategoryPair(t.category, t.subcategory);
      map.set(pair.category, (map.get(pair.category) || 0) + cents(t.amount));
      if (pair.subcategory) {
        const key = `${pair.category}::${pair.subcategory}`;
        const current = subMap.get(key);
        subMap.set(key, {
          category: pair.category,
          subcategory: pair.subcategory,
          total: (current?.total ?? 0) + cents(t.amount),
        });
      }
    });

  const groups = [...map]
    .map(([name, total]) => ({ ...getCategory(name), total }))
    .sort((a, b) => b.total - a.total);
  const subgroups = [...subMap.values()]
    .map((item) => ({
      ...item,
      emoji: getDisplayEmoji(item.category, item.subcategory),
    }))
    .sort((a, b) => b.total - a.total);

  return {
    selected,
    expense,
    income,
    balance: income - expense,
    groups,
    subgroups,
  };
}

export function discover(rows: Transaction[], month: string) {
  const { groups, expense, selected, subgroups } = summarize(rows, month);
  if (!selected.length)
    return [
      {
        icon: "sprout",
        title: "了解自己的钱，从第一笔开始",
        text: "记下今天的一杯咖啡，让每一笔小钱都有迹可循。",
      },
    ];
  const top = groups[0];
  const results = [];
  if (top) {
    const topSubs = subgroups.filter((item) => item.category === top.name);
    const detail = topSubs.length > 1
      ? `其中 ${topSubs[0].subcategory} 最多，花了 ¥${(topSubs[0].total / 100).toLocaleString("zh-CN")}。`
      : "钱花在哪里，生活就在哪里。";
    results.push({
      icon: "pie",
      title: `${top.name}，是这个月的消费主角`,
      text: `累计 ¥${(top.total / 100).toLocaleString("zh-CN")}，占本月支出的 ${expense ? Math.round((top.total / expense) * 100) : 0}%。${detail}`,
    });
  }
  const today = localDate();
  const end = month === today.slice(0, 7) ? today.slice(8) : "31";
  const previous = shiftMonth(month, -1);
  const prev = rows
    .filter(
      (t) =>
        t.type === "expense" &&
        t.date.startsWith(previous) &&
        t.date.slice(8) <= end,
    )
    .reduce((s, t) => s + cents(t.amount), 0);
  const current = selected
    .filter((t) => t.type === "expense" && t.date.slice(8) <= end)
    .reduce((s, t) => s + cents(t.amount), 0);
  if (prev > 0) {
    const pct = Math.round((Math.abs(current - prev) / prev) * 100);
    results.push({
      icon: "trend",
      title:
        current <= prev
          ? `比上月同期少花了 ${pct}%`
          : `比上月同期多花了 ${pct}%`,
      text:
        current <= prev
          ? "节奏刚刚好，生活的快乐不一定要多花钱。"
          : "看看分类排行，找到支出变化的原因。",
    });
  } else
    results.push({
      icon: "sparkles",
      title: `这个月，认真记录了 ${selected.length} 笔生活`,
      text: "每一笔记录，都是更了解自己的开始。保持这个好习惯。",
    });
  return results.slice(0, 2);
}

export function sevenDay(rows: Transaction[]) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = shiftDate(i - 6);
    return {
      date,
      value: rows
        .filter((t) => t.date === date && t.type === "expense")
        .reduce((s, t) => s + cents(t.amount), 0),
    };
  });
}

export function compareToPreviousMonth(rows: Transaction[], month: string) {
  const current = summarize(rows, month).expense;
  const previousMonth = shiftMonth(month, -1);
  const previous = summarize(rows, previousMonth).expense;
  const change = current - previous;
  const percent = previous > 0 ? Math.round((change / previous) * 100) : null;
  return { current, previous, previousMonth, change, percent };
}

export function dailyExpenseSeries(rows: Transaction[], month: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const days = new Date(year, monthNumber, 0).getDate();
  return Array.from({ length: days }, (_, index) => {
    const day = index + 1;
    const date = `${month}-${String(day).padStart(2, "0")}`;
    const value = rows
      .filter((t) => t.type === "expense" && t.date === date)
      .reduce((sum, t) => sum + cents(t.amount), 0);
    return { day, date, value };
  });
}


export type MonthlyTrendPoint = {
  month: string;
  expense: number;
  income: number;
  balance: number;
};

export function monthlyTrend(
  rows: Transaction[],
  month: string,
  count = 6,
): MonthlyTrendPoint[] {
  return Array.from({ length: count }, (_, index) => {
    const target = shiftMonth(month, index - count + 1);
    const summary = summarize(rows, target);
    return {
      month: target,
      expense: summary.expense,
      income: summary.income,
      balance: summary.balance,
    };
  });
}

export type CategoryChange = {
  category: string;
  emoji: string;
  current: number;
  previous: number;
  change: number;
};

export function categoryChanges(rows: Transaction[], month: string): CategoryChange[] {
  const previousMonth = shiftMonth(month, -1);
  const current = summarize(rows, month).groups;
  const previous = summarize(rows, previousMonth).groups;
  const names = new Set([
    ...current.map((item) => item.name),
    ...previous.map((item) => item.name),
  ]);

  return [...names]
    .map((category) => {
      const currentItem = current.find((item) => item.name === category);
      const previousItem = previous.find((item) => item.name === category);
      const definition = getCategory(category);
      const currentTotal = currentItem?.total ?? 0;
      const previousTotal = previousItem?.total ?? 0;
      return {
        category,
        emoji: definition.emoji,
        current: currentTotal,
        previous: previousTotal,
        change: currentTotal - previousTotal,
      };
    })
    .filter((item) => item.change !== 0)
    .sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
}

export type SpendingCalendarDay = {
  day: number;
  date: string;
  total: number;
  count: number;
};

export function spendingCalendar(
  rows: Transaction[],
  month: string,
): {
  days: SpendingCalendarDay[];
  leadingBlankDays: number;
  max: number;
  highest: SpendingCalendarDay | null;
  zeroSpendDays: number;
} {
  const [year, monthNumber] = month.split("-").map(Number);
  const dayCount = new Date(year, monthNumber, 0).getDate();
  const leadingBlankDays = (new Date(year, monthNumber - 1, 1).getDay() + 6) % 7;
  const days = Array.from({ length: dayCount }, (_, index) => {
    const day = index + 1;
    const date = `${month}-${String(day).padStart(2, "0")}`;
    const dayRows = rows.filter(
      (row) => row.type === "expense" && row.date === date,
    );
    return {
      day,
      date,
      total: dayRows.reduce((sum, row) => sum + cents(row.amount), 0),
      count: dayRows.length,
    };
  });
  const max = Math.max(0, ...days.map((item) => item.total));
  const highest =
    days
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total || a.day - b.day)[0] ?? null;
  return {
    days,
    leadingBlankDays,
    max,
    highest,
    zeroSpendDays: days.filter((item) => item.total === 0).length,
  };
}

export type MonthlyReport = {
  expense: number;
  income: number;
  balance: number;
  expenseChange: number;
  expensePercent: number | null;
  topCategory: { name: string; emoji: string; total: number; share: number } | null;
  topIncrease: CategoryChange | null;
  topDecrease: CategoryChange | null;
  highestDay: SpendingCalendarDay | null;
  zeroSpendDays: number;
};

export function monthlyReport(rows: Transaction[], month: string): MonthlyReport {
  const current = summarize(rows, month);
  const comparison = compareToPreviousMonth(rows, month);
  const changes = categoryChanges(rows, month);
  const calendar = spendingCalendar(rows, month);
  const top = current.groups[0];

  return {
    expense: current.expense,
    income: current.income,
    balance: current.balance,
    expenseChange: comparison.change,
    expensePercent: comparison.percent,
    topCategory: top
      ? {
          name: top.name,
          emoji: top.emoji,
          total: top.total,
          share: current.expense
            ? Math.round((top.total / current.expense) * 100)
            : 0,
        }
      : null,
    topIncrease: changes
      .filter((item) => item.change > 0)
      .sort((a, b) => b.change - a.change)[0] ?? null,
    topDecrease: changes
      .filter((item) => item.change < 0)
      .sort((a, b) => a.change - b.change)[0] ?? null,
    highestDay: calendar.highest,
    zeroSpendDays: calendar.zeroSpendDays,
  };
}


function merchantKey(title: string) {
  return title.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, "");
}

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

export type MerchantStat = {
  title: string;
  category: string;
  subcategory: string;
  emoji: string;
  total: number;
  count: number;
  average: number;
};

export function merchantStats(
  rows: Transaction[],
  month: string,
  limit = 8,
): MerchantStat[] {
  const map = new Map<string, MerchantStat>();
  rows
    .filter((row) => row.type === "expense" && row.date.startsWith(month))
    .forEach((row) => {
      const key = merchantKey(row.title);
      if (!key) return;
      const current = map.get(key);
      if (current) {
        current.total += cents(row.amount);
        current.count += 1;
        current.average = Math.round(current.total / current.count);
      } else {
        const pair = normalizeCategoryPair(row.category, row.subcategory);
        map.set(key, {
          title: row.title.trim() || "未命名",
          category: pair.category,
          subcategory: pair.subcategory,
          emoji: row.emoji,
          total: cents(row.amount),
          count: 1,
          average: cents(row.amount),
        });
      }
    });

  return [...map.values()]
    .sort((a, b) => b.total - a.total || b.count - a.count)
    .slice(0, limit);
}

export type RecurringExpense = {
  title: string;
  category: string;
  subcategory: string;
  emoji: string;
  months: number;
  occurrences: number;
  averageMonthly: number;
  latestAmount: number;
  variation: number;
  confidence: "high" | "medium";
};

export function recurringExpenses(
  rows: Transaction[],
  month: string,
  lookback = 6,
): RecurringExpense[] {
  const months = Array.from({ length: lookback }, (_, index) =>
    shiftMonth(month, index - lookback + 1),
  );
  const monthSet = new Set(months);
  const groups = new Map<
    string,
    {
      title: string;
      category: string;
      subcategory: string;
      emoji: string;
      occurrences: number;
      byMonth: Map<string, number>;
    }
  >();

  rows
    .filter(
      (row) =>
        row.type === "expense" &&
        monthSet.has(row.date.slice(0, 7)),
    )
    .forEach((row) => {
      const pair = normalizeCategoryPair(row.category, row.subcategory);
      const key = `${merchantKey(row.title)}::${pair.category}::${pair.subcategory}`;
      const current = groups.get(key) ?? {
        title: row.title.trim() || "未命名",
        category: pair.category,
        subcategory: pair.subcategory,
        emoji: row.emoji,
        occurrences: 0,
        byMonth: new Map<string, number>(),
      };
      const rowMonth = row.date.slice(0, 7);
      current.occurrences += 1;
      current.byMonth.set(
        rowMonth,
        (current.byMonth.get(rowMonth) ?? 0) + cents(row.amount),
      );
      groups.set(key, current);
    });

  const fixedHousing = new Set([
    "房租房贷",
    "通信网络",
    "物业管理",
    "保险保障",
    "水电燃气",
  ]);

  return [...groups.values()]
    .map((item) => {
      const values = [...item.byMonth.values()];
      const monthsPresent = values.length;
      const averageMonthly = Math.round(
        values.reduce((sum, value) => sum + value, 0) / Math.max(1, monthsPresent),
      );
      const spread = values.length
        ? Math.max(...values) - Math.min(...values)
        : 0;
      const variation = averageMonthly ? spread / averageMonthly : 0;
      const structural =
        item.category === "订阅服务" ||
        (item.category === "居住" && fixedHousing.has(item.subcategory));
      const stable = variation <= 0.25;
      const latestAmount = item.byMonth.get(month) ?? values[values.length - 1] ?? 0;

      if (monthsPresent < 2 || (!structural && !stable)) return null;

      return {
        title: item.title,
        category: item.category,
        subcategory: item.subcategory,
        emoji: item.emoji,
        months: monthsPresent,
        occurrences: item.occurrences,
        averageMonthly,
        latestAmount,
        variation,
        confidence:
          monthsPresent >= 3 && (structural || variation <= 0.15)
            ? ("high" as const)
            : ("medium" as const),
      };
    })
    .filter((item): item is RecurringExpense => item !== null)
    .sort(
      (a, b) =>
        (a.confidence === b.confidence ? 0 : a.confidence === "high" ? -1 : 1) ||
        b.averageMonthly - a.averageMonthly,
    );
}

export type SpendingAnomaly = {
  id: string;
  title: string;
  date: string;
  emoji: string;
  category: string;
  subcategory: string;
  amount: number;
  typical: number;
  ratio: number;
  baselineCount: number;
};

export function spendingAnomalies(
  rows: Transaction[],
  month: string,
  lookback = 6,
): SpendingAnomaly[] {
  const historyMonths = new Set(
    Array.from({ length: lookback }, (_, index) =>
      shiftMonth(month, index - lookback),
    ),
  );
  const historical = rows.filter(
    (row) =>
      row.type === "expense" &&
      historyMonths.has(row.date.slice(0, 7)),
  );
  const current = rows.filter(
    (row) => row.type === "expense" && row.date.startsWith(month),
  );

  return current
    .map((row) => {
      const pair = normalizeCategoryPair(row.category, row.subcategory);
      const sameSub = historical.filter((item) => {
        const candidate = normalizeCategoryPair(item.category, item.subcategory);
        return (
          candidate.category === pair.category &&
          candidate.subcategory === pair.subcategory
        );
      });
      const sameCategory = historical.filter((item) => {
        const candidate = normalizeCategoryPair(item.category, item.subcategory);
        return candidate.category === pair.category;
      });
      const baseline = sameSub.length >= 4 ? sameSub : sameCategory;
      if (baseline.length < 6 && sameSub.length < 4) return null;

      const values = baseline.map((item) => cents(item.amount)).filter((value) => value > 0);
      const typical = median(values);
      if (!typical) return null;
      const amount = cents(row.amount);
      const ratio = amount / typical;

      // A personalized threshold: require the transaction to be both much larger
      // than the category's own median and above the upper quartile of its history.
      const sorted = [...values].sort((a, b) => a - b);
      const q75 = sorted[Math.floor((sorted.length - 1) * 0.75)] ?? typical;
      if (ratio < 2.2 || amount <= q75) return null;

      return {
        id: row.id,
        title: row.title,
        date: row.date,
        emoji: row.emoji,
        category: pair.category,
        subcategory: pair.subcategory,
        amount,
        typical,
        ratio,
        baselineCount: values.length,
      };
    })
    .filter((item): item is SpendingAnomaly => item !== null)
    .sort((a, b) => b.ratio - a.ratio || b.amount - a.amount)
    .slice(0, 5);
}


export type CategoryTrendPoint = {
  month: string;
  total: number;
  categories: Record<string, number>;
};

export function categoryTrend(
  rows: Transaction[],
  month: string,
  count = 6,
  categoryLimit = 4,
): {
  categories: Array<{ name: string; emoji: string }>;
  points: CategoryTrendPoint[];
} {
  const months = Array.from({ length: count }, (_, index) =>
    shiftMonth(month, index - count + 1),
  );
  const summaries = months.map((target) => ({
    month: target,
    summary: summarize(rows, target),
  }));
  const totals = new Map<string, number>();

  for (const { summary } of summaries) {
    for (const group of summary.groups) {
      totals.set(group.name, (totals.get(group.name) ?? 0) + group.total);
    }
  }

  const categoryNames = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, categoryLimit)
    .map(([name]) => name);

  return {
    categories: categoryNames.map((name) => ({
      name,
      emoji: getCategory(name).emoji,
    })),
    points: summaries.map(({ month: target, summary }) => {
      const categoriesForMonth: Record<string, number> = {};
      for (const name of categoryNames) {
        categoriesForMonth[name] =
          summary.groups.find((group) => group.name === name)?.total ?? 0;
      }
      return {
        month: target,
        total: summary.expense,
        categories: categoriesForMonth,
      };
    }),
  };
}
