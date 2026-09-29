import type { Transaction } from "@/types";
import { cents, localDate, money, shiftMonth } from "./dates";
import { monthlyReport, merchantStats, summarize } from "./stats";

function daysBetween(from: string, to: string) {
  const start = new Date(`${from}T12:00:00`).getTime();
  const end = new Date(`${to}T12:00:00`).getTime();
  return Math.max(0, Math.round((end - start) / 86400000));
}

function titleKey(title: string) {
  return title.normalize("NFKC").trim().toLowerCase().replace(/\s+/g, "");
}

export type MonthlyStory = {
  ready: boolean;
  title: string;
  lines: string[];
};

export function monthlyStory(
  rows: Transaction[],
  month = localDate().slice(0, 7),
): MonthlyStory {
  const summary = summarize(rows, month);
  const expenses = summary.selected.filter((row) => row.type === "expense");
  if (!expenses.length) {
    return {
      ready: false,
      title: "这个月的剧情还没开场",
      lines: ["再记几笔，记忆馆才有素材开始讲故事。"],
    };
  }

  const report = monthlyReport(rows, month);
  const merchants = merchantStats(rows, month, 3);
  const previous = summarize(rows, shiftMonth(month, -1));
  const lines: string[] = [];

  if (report.topCategory) {
    lines.push(
      `${report.topCategory.emoji} 「${report.topCategory.name}」是这个月的主角，占支出的 ${report.topCategory.share}%，一共 ¥${money(report.topCategory.total)}。`,
    );
  }

  const frequent = merchants.find((item) => item.count >= 2);
  if (frequent) {
    lines.push(
      `${frequent.emoji} ${frequent.title} 出现了 ${frequent.count} 次，累计 ¥${money(frequent.total)}。`,
    );
  } else if (report.highestDay) {
    lines.push(
      `📌 ${month.slice(5)} 月 ${report.highestDay.day} 日是本月最热闹的一天，支出 ¥${money(report.highestDay.total)}。`,
    );
  }

  if (previous.expense > 0 && report.expensePercent != null) {
    if (report.expensePercent === 0) {
      lines.push("🪙 和上个月相比，钱包基本保持同速巡航。");
    } else {
      lines.push(
        `🪙 本月支出比上月${report.expensePercent > 0 ? "多" : "少"} ${Math.abs(report.expensePercent)}%。`,
      );
    }
  } else if (summary.selected.length >= 3) {
    lines.push(`📚 这个月已经留下 ${summary.selected.length} 笔生活记录。`);
  }

  return {
    ready: true,
    title: `${Number(month.slice(5))} 月剧情`,
    lines: lines.slice(0, 3),
  };
}

export type MemoryMilestone = {
  emoji: string;
  label: string;
  title: string;
  detail: string;
};

export function memoryMilestones(
  rows: Transaction[],
  date = localDate(),
): MemoryMilestone[] {
  if (!rows.length) {
    return [
      {
        emoji: "🌱",
        label: "第一章",
        title: "记忆馆还是空的",
        detail: "第一笔账会成为以后所有考古工作的起点。",
      },
    ];
  }

  const sorted = [...rows].sort(
    (a, b) =>
      a.date.localeCompare(b.date) ||
      a.createdAt.localeCompare(b.createdAt),
  );
  const first = sorted[0];
  const milestones: MemoryMilestone[] = [];

  milestones.push({
    emoji: "📚",
    label: "账本厚度",
    title: `已经留下 ${rows.length} 笔记录`,
    detail:
      rows.length < 100
        ? `距离第一百笔还差 ${100 - rows.length} 笔。`
        : `从第一笔到现在，账本已经积累了 ${daysBetween(first.date, date)} 天的生活痕迹。`,
  });

  milestones.push({
    emoji: "🕰️",
    label: "第一笔",
    title: first.title,
    detail: `${first.date} · ${first.category}${first.subcategory ? ` / ${first.subcategory}` : ""} · ¥${Number(first.amount).toFixed(2)}`,
  });

  const counts = new Map<
    string,
    { title: string; count: number; total: number; emoji: string }
  >();
  rows
    .filter((row) => row.type === "expense")
    .forEach((row) => {
      const key = titleKey(row.title);
      if (!key) return;
      const current = counts.get(key);
      if (current) {
        current.count += 1;
        current.total += cents(row.amount);
      } else {
        counts.set(key, {
          title: row.title.trim() || "未命名",
          count: 1,
          total: cents(row.amount),
          emoji: row.emoji,
        });
      }
    });

  const familiar = [...counts.values()]
    .filter((item) => item.count >= 3)
    .sort((a, b) => b.count - a.count || b.total - a.total)[0];

  if (familiar) {
    milestones.push({
      emoji: familiar.emoji || "🔁",
      label: "熟面孔",
      title: `${familiar.title} 已出现 ${familiar.count} 次`,
      detail: `累计 ¥${money(familiar.total)}，它已经是这本账里的常驻角色。`,
    });
  }

  return milestones.slice(0, 3);
}
