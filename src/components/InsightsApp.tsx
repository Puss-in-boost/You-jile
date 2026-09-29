"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BarChart3,
  CircleUserRound,
  Home,
  Plus,
  ReceiptText,
} from "lucide-react";
import { EntryModal } from "./EntryModal";
import { usePWA } from "./InstallPrompt";
import { useLedger } from "@/hooks/use-ledger";
import {
  categoryChanges,
  compareToPreviousMonth,
  merchantStats,
  monthlyReport,
  monthlyTrend,
  recurringExpenses,
  spendingAnomalies,
  spendingCalendar,
  summarize,
} from "@/lib/stats";
import { localDate } from "@/lib/dates";
import type { Transaction } from "@/types";
import {
  CategoryDrilldown,
  type InsightDrill,
} from "./insights/CategoryDrilldown";
import {
  HabitsTab,
  InsightsTabs,
  OverviewTab,
  TrendsTab,
  type InsightsTab,
} from "./insights/InsightTabs";

const validTabs = new Set<InsightsTab>(["overview", "trends", "habits"]);

function tabDescription(tab: InsightsTab) {
  if (tab === "trends") return "看变化，不只看结果。钱往哪走，谁在推它，都放在这里。";
  if (tab === "habits") return "看看什么时候花、常去哪花，以及哪些支出已经变成老熟人。";
  return "先看这个月发生了什么，再决定要不要往下挖。";
}

export function InsightsApp() {
  const ledger = useLedger();
  const pwa = usePWA();
  const currentMonth = localDate().slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [tab, setTab] = useState<InsightsTab>("overview");
  const [queryReady, setQueryReady] = useState(false);
  const [drill, setDrill] = useState<InsightDrill | null>(null);
  const [editing, setEditing] = useState<Transaction | undefined>();
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const queryTab = params.get("tab") as InsightsTab | null;
    const queryMonth = params.get("month");
    if (queryTab && validTabs.has(queryTab)) setTab(queryTab);
    if (queryMonth && /^\d{4}-\d{2}$/.test(queryMonth)) setMonth(queryMonth);
    setQueryReady(true);
  }, []);

  useEffect(() => {
    if (!queryReady) return;
    const url = new URL(window.location.href);
    if (tab === "overview") url.searchParams.delete("tab");
    else url.searchParams.set("tab", tab);
    if (month === currentMonth) url.searchParams.delete("month");
    else url.searchParams.set("month", month);
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  }, [tab, month, queryReady, currentMonth]);

  const stats = summarize(ledger.rows, month);
  const comparison = compareToPreviousMonth(ledger.rows, month);
  const trend = monthlyTrend(ledger.rows, month, 6);
  const changes = categoryChanges(ledger.rows, month);
  const calendar = spendingCalendar(ledger.rows, month);
  const report = monthlyReport(ledger.rows, month);
  const recurring = recurringExpenses(ledger.rows, month, 6);
  const merchants = merchantStats(ledger.rows, month, 8);
  const anomalies = spendingAnomalies(ledger.rows, month, 6);
  const recurringTotal = recurring.reduce(
    (sum, item) => sum + item.averageMonthly,
    0,
  );

  const openEdit = (row: Transaction) => {
    setDrill(null);
    setEditing(row);
    setEditorOpen(true);
  };

  const changeTab = (next: InsightsTab) => {
    setTab(next);
    setDrill(null);
  };

  return (
    <main className="yj-app">
      <div className="yj-shell">
        {ledger.error && (
          <div className="yj-banner yj-banner-error">
            <span>{ledger.error}</span>
            <button onClick={() => ledger.refresh().catch(() => {})}>
              重试
            </button>
          </div>
        )}

        <header className="yj-page-header yj-page-header-stack yj-insights-header">
          <div>
            <span>洞察</span>
            <h1>钱都去哪了</h1>
            <p>{tabDescription(tab)}</p>
          </div>
          <input
            className="yj-month-input"
            type="month"
            value={month}
            onChange={(event) => {
              if (!event.target.value) return;
              setMonth(event.target.value);
              setDrill(null);
            }}
          />
        </header>

        <InsightsTabs active={tab} onChange={changeTab} />

        {tab === "overview" && (
          <OverviewTab
            stats={stats}
            report={report}
            monthPercent={comparison.percent}
            recurring={recurring}
            merchants={merchants}
            anomalies={anomalies}
            onOpenCategory={(category) => setDrill({ category })}
            onChangeTab={changeTab}
          />
        )}

        {tab === "trends" && (
          <TrendsTab
            rows={ledger.rows}
            month={month}
            trend={trend}
            changes={changes}
            current={comparison.current}
            previous={comparison.previous}
            percent={comparison.percent}
          />
        )}

        {tab === "habits" && (
          <HabitsTab
            month={month}
            calendar={calendar}
            recurring={recurring}
            recurringTotal={recurringTotal}
            merchants={merchants}
            anomalies={anomalies}
            rows={ledger.rows}
            onEdit={openEdit}
          />
        )}

        {ledger.toast && <div className="yj-toast">{ledger.toast}</div>}
      </div>

      <nav className="yj-bottom-nav">
        <Link href="/">
          <Home size={19} />
          <span>首页</span>
        </Link>
        <Link href="/bills">
          <ReceiptText size={19} />
          <span>账单</span>
        </Link>
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
        <Link href="/insights" className="active">
          <BarChart3 size={19} />
          <span>洞察</span>
        </Link>
        <Link href="/me">
          <CircleUserRound size={19} />
          <span>我的</span>
        </Link>
      </nav>

      {drill && (
        <CategoryDrilldown
          rows={ledger.rows}
          month={month}
          drill={drill}
          onBack={() => setDrill({ category: drill.category })}
          onClose={() => setDrill(null)}
          onOpenSubcategory={(subcategory) =>
            setDrill({ category: drill.category, subcategory })
          }
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
