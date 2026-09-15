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
