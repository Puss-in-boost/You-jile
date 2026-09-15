"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Camera,
  Check,
  History,
  CircleUserRound,
  Home,
  Mic,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  Sparkles,
  WalletCards,
  WifiOff,
} from "lucide-react";
import { EntryModal } from "./EntryModal";
import { BackfillMode } from "./BackfillMode";
import { InstallPrompt, usePWA } from "./InstallPrompt";
import { Profile } from "./Profile";
import { useLedger } from "@/hooks/use-ledger";
import { parseEntry } from "@/lib/parser";
import { dateLabel, localDate, money } from "@/lib/dates";
import { accounts, categories } from "@/lib/categories";
import { compareToPreviousMonth, dailyExpenseSeries, discover, summarize } from "@/lib/stats";
import type { ParsedDraft, Transaction } from "@/types";

export type View = "home" | "bills" | "insights" | "me";

const nav = [
  { view: "home" as const, href: "/", label: "首页", Icon: Home },
  { view: "bills" as const, href: "/bills", label: "账单", Icon: ReceiptText },
  { view: "quick" as const, href: "/", label: "记账", Icon: Plus },
  { view: "insights" as const, href: "/insights", label: "洞察", Icon: BarChart3 },
  { view: "me" as const, href: "/me", label: "我的", Icon: CircleUserRound },
];

function monthLabel(month: string) {
  return `${Number(month.slice(5))}月`;
}

function currentDateLabel() {
  return new Date().toLocaleDateString("zh-CN", {
    month: "long",
    day: "numeric",
    weekday: "long",
  });
}

function LedgerRow({
  row,
  onEdit,
  onDelete,
}: {
  row: Transaction;
  onEdit: (row: Transaction) => void;
  onDelete: (row: Transaction) => void;
}) {
  return (
    <div className="yj-row">
      <button className="yj-row-main" onClick={() => onEdit(row)}>
        <span className="yj-row-emoji">{row.emoji}</span>
        <span className="yj-row-copy">
          <strong>{row.title}</strong>
          <small>
            {row.category}{row.subcategory ? ` / ${row.subcategory}` : ""} · {dateLabel(row.date)}
            {row.account && !["未指定", "其他"].includes(row.account) ? ` · ${row.account}` : ""}
          </small>
        </span>
      </button>
      <div className="yj-row-tail">
        <strong className={row.type === "income" ? "yj-income" : ""}>
          {row.type === "expense" ? "−" : "+"}¥{Number(row.amount).toFixed(2)}
        </strong>
        <button
          aria-label={`删除${row.title}`}
          className="yj-delete"
          onClick={() => onDelete(row)}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="yj-empty">
      <span>🌱</span>
      <p>{text}</p>
    </div>
  );
}

export function LedgerApp({ view = "home" }: { view?: View }) {
  const ledger = useLedger();
  const pwa = usePWA();
  const [month, setMonth] = useState(localDate().slice(0, 7));
  const [editing, setEditing] = useState<Transaction | undefined>();
  const [editorOpen, setEditorOpen] = useState(false);
  const [backfillOpen, setBackfillOpen] = useState(false);
  const [installOpen, setInstallOpen] = useState(false);
  const [quickText, setQuickText] = useState("");
  const [quickError, setQuickError] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [accountFilter, setAccountFilter] = useState("all");
  const quickRef = useRef<HTMLInputElement>(null);

  const stats = summarize(ledger.rows, month);
  const discoveries = discover(ledger.rows, month);
  const currentMonthRows = stats.selected;
  const recent = ledger.rows.slice(0, 4);
  const top = stats.groups[0];
  const topSubgroups = top ? stats.subgroups.filter((group) => group.category === top.name) : [];
  const monthCompare = compareToPreviousMonth(ledger.rows, month);
  const dailySeries = dailyExpenseSeries(ledger.rows, month);
  const dailyMax = Math.max(1, ...dailySeries.map((item) => item.value));

  const quickDraft = useMemo<ParsedDraft | null>(() => {
    if (!quickText.trim()) return null;
    try {
      const parsed = parseEntry(quickText, ledger.rules);
      if (parsed.account === "未指定" && ledger.user?.defaultAccount && ledger.user.defaultAccount !== "未指定") {
        return { ...parsed, account: ledger.user.defaultAccount };
      }
      return parsed;
    } catch {
      return null;
    }
  }, [quickText, ledger.rules, ledger.user?.defaultAccount]);

  const filteredRows = useMemo(
    () =>
      currentMonthRows.filter(
        (row) =>
          (type === "all" || row.type === type) &&
          (categoryFilter === "all" || row.category === categoryFilter) &&
          (accountFilter === "all" || row.account === accountFilter) &&
          `${row.title} ${row.category} ${row.subcategory} ${row.account} ${row.amount}`
            .toLowerCase()
            .includes(search.toLowerCase()),
      ),
    [currentMonthRows, search, type, categoryFilter, accountFilter],
  );

  const openAdd = () => {
    setEditing(undefined);
    setEditorOpen(true);
  };
  const openEdit = (row: Transaction) => {
    setEditing(row);
    setEditorOpen(true);
  };
  const focusQuick = () => {
    if (view === "home") {
      quickRef.current?.focus();
      quickRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  async function saveQuick(e: React.FormEvent) {
    e.preventDefault();
    setQuickError("");
    try {
      if (pwa.offline) throw new Error("当前离线，联网后再保存这笔账");
      const parsed = parseEntry(quickText, ledger.rules);
      const draft = parsed.account === "未指定" && ledger.user?.defaultAccount && ledger.user.defaultAccount !== "未指定"
        ? { ...parsed, account: ledger.user.defaultAccount }
        : parsed;
      const result = await ledger.save(draft);
      if (result.ok) setQuickText("");
      else setQuickError(result.error || "保存失败，请稍后重试");
    } catch (error) {
      setQuickError(error instanceof Error ? error.message : "无法识别这句话");
    }
  }

  return (
    <main className="yj-app">
      <div className="yj-shell">
        {pwa.offline && (
          <div className="yj-banner yj-banner-warn">
            <WifiOff size={15} /> 当前离线，暂时不能保存新账单。
          </div>
        )}
        {ledger.error && (
          <div className="yj-banner yj-banner-error">
            <span>{ledger.error}</span>
            <button onClick={() => ledger.refresh().catch(() => {})}>重试</button>
          </div>
        )}

        {view === "home" && (
          <>
            <header className="yj-topbar">
              <div>
                <h1>又寄了</h1>
                <p>{currentDateLabel()}</p>
              </div>
              <Link href="/me" className="yj-pill-button">
                设置
              </Link>
            </header>

            <section className="yj-month-total">
              <div className="yj-section-label">{monthLabel(month)}支出</div>
              <div className="yj-total-line">
                <strong>¥ {money(stats.expense)}</strong>
                <span>实时计算</span>
              </div>
              <div className="yj-month-inline">
                <span>收入 ¥{money(stats.income)}</span>
                <span>结余 ¥{money(stats.balance)}</span>
              </div>
            </section>

            <section className="yj-card yj-quick-card">
              <div className="yj-card-title">
                <div>
                  <strong>今天又寄了多少？</strong>
                  <small>像聊天一样，记下一笔生活。</small>
                </div>
                <Sparkles size={18} />
              </div>
              <form onSubmit={saveQuick}>
                <div className="yj-quick-line">
                  <input
                    ref={quickRef}
                    value={quickText}
                    maxLength={150}
                    onChange={(e) => {
                      setQuickText(e.target.value);
                      setQuickError("");
                    }}
                    placeholder="例如：35 午饭 / 昨天打车26 / 工资8500"
                  />
                  <button className="yj-primary" disabled={!quickDraft || ledger.busy || pwa.offline}>
                    记下
                  </button>
                </div>
                {quickDraft && (
                  <div className="yj-preview">
                    <Check size={13} />
                    <span>
                      {quickDraft.emoji} {quickDraft.type === "expense" ? "−" : "+"}¥
                      {quickDraft.amount} · {quickDraft.category}{quickDraft.subcategory ? ` / ${quickDraft.subcategory}` : ""} · {dateLabel(quickDraft.date)}
                      {quickDraft.account !== "未指定" ? ` · ${quickDraft.account}` : ""}
                    </span>
                    <em>{quickDraft.matchSource === "user_rule" ? "按你的习惯" : "预览"}</em>
                  </div>
                )}
                {quickError && <p className="yj-form-error">{quickError}</p>}
                <div className="yj-quick-tools">
                  <button type="button" disabled title="语音记账尚未上线">
                    <Mic size={15} /> 说一笔 <em>即将上线</em>
                  </button>
                  <button type="button" disabled title="拍照识别尚未上线">
                    <Camera size={15} /> 拍一笔 <em>即将上线</em>
                  </button>
                  <button type="button" onClick={openAdd}>
                    <WalletCards size={15} /> 手动记账
                  </button>
                </div>
              </form>
            </section>

            <section className="yj-discovery">
              <span>✨ 今天发现</span>
              <strong>{discoveries[0]?.title ?? "从第一笔开始了解自己的钱"}</strong>
              <p>{discoveries[0]?.text ?? "记下一笔，慢慢看见自己的消费习惯。"}</p>
            </section>

            <section className="yj-section">
              <div className="yj-section-head">
                <h2>最近</h2>
                <Link href="/bills">全部账单</Link>
              </div>
              <div className="yj-list">
                {ledger.loading && !ledger.rows.length ? (
                  <div className="yj-loading">正在打开你的小账本…</div>
                ) : recent.length ? (
                  recent.map((row) => (
                    <LedgerRow
                      key={row.id}
                      row={row}
                      onEdit={openEdit}
                      onDelete={(item) => void ledger.remove(item)}
                    />
                  ))
                ) : (
                  <EmptyState text="还没有账单，先记下一笔吧。" />
                )}
              </div>
            </section>
          </>
        )}

        {view === "bills" && (
          <>
            <header className="yj-page-header">
              <div>
                <span>账单</span>
                <h1>全部记录</h1>
                <p>
                  {currentMonthRows.length} 笔 · 支出 ¥{money(stats.expense)} · 收入 ¥{money(stats.income)}
                </p>
              </div>
              <div className="yj-page-actions">
                <button className="yj-secondary-action" onClick={() => setBackfillOpen(true)}>
                  <History size={16} /> 补旧账
                </button>
                <button className="yj-primary" onClick={openAdd}>
                  <Plus size={16} /> 记一笔
                </button>
              </div>
            </header>
            <div className="yj-filterbar">
              <input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
              <label className="yj-search">
                <Search size={15} />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜索标题、分类、账户" />
              </label>
              <select aria-label="账单类型" value={type} onChange={(e) => setType(e.target.value)}>
                <option value="all">全部类型</option>
                <option value="expense">支出</option>
                <option value="income">收入</option>
              </select>
              <select aria-label="账单分类" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
                <option value="all">全部分类</option>
                {categories.map((item) => <option key={item.name} value={item.name}>{item.emoji} {item.name}</option>)}
              </select>
              <select aria-label="支付账户" value={accountFilter} onChange={(e) => setAccountFilter(e.target.value)}>
                <option value="all">全部账户</option>
                {accounts.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <div className="yj-list yj-list-page">
              {filteredRows.length ? (
                filteredRows.map((row) => (
                  <LedgerRow
                    key={row.id}
                    row={row}
                    onEdit={openEdit}
                    onDelete={(item) => void ledger.remove(item)}
                  />
                ))
              ) : (
                <EmptyState text="没有找到符合条件的账单。" />
              )}
            </div>
          </>
        )}

        {view === "insights" && (
          <>
            <header className="yj-page-header yj-page-header-stack">
              <div>
                <span>洞察</span>
                <h1>钱都去哪了</h1>
                <p>不是企业报表，只是更清楚地看看自己的生活。</p>
              </div>
              <input className="yj-month-input" type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} />
            </header>
            <div className="yj-stat-grid">
              <div className="yj-card yj-stat"><span>支出</span><strong>¥{money(stats.expense)}</strong></div>
              <div className="yj-card yj-stat"><span>收入</span><strong>¥{money(stats.income)}</strong></div>
              <div className="yj-card yj-stat yj-stat-wide"><span>结余</span><strong>¥{money(stats.balance)}</strong></div>
            </div>
            <section className="yj-card yj-insight-card">
              <div className="yj-card-title"><div><strong>分类占比</strong><small>{top ? `${top.name} 是本月最大支出项` : "有账单后这里会自动生成"}</small></div></div>
              <div className="yj-category-bars">
                {stats.groups.length ? stats.groups.map((group) => {
                  const pct = stats.expense ? Math.round((group.total / stats.expense) * 100) : 0;
                  return (
                    <div className="yj-bar-row" key={group.name}>
                      <div><span>{group.emoji} {group.name}</span><span>¥{money(group.total)} · {pct}%</span></div>
                      <div className="yj-bar-track"><span style={{ width: `${Math.max(4, pct)}%` }} /></div>
                    </div>
                  );
                }) : <EmptyState text="先记几笔，分类趋势就会出现在这里。" />}
              </div>
            </section>
            {topSubgroups.length > 0 && (
              <section className="yj-card yj-insight-card">
                <div className="yj-card-title">
                  <div>
                    <strong>{top?.name}细分</strong>
                    <small>一级分类看大方向，细分类看具体花在了哪里</small>
                  </div>
                </div>
                <div className="yj-category-bars">
                  {topSubgroups.map((group) => {
                    const parentTotal = top?.total ?? 0;
                    const pct = parentTotal ? Math.round((group.total / parentTotal) * 100) : 0;
                    return (
                      <div className="yj-bar-row" key={`${group.category}-${group.subcategory}`}>
                        <div>
                          <span>{group.emoji} {group.subcategory}</span>
                          <span>¥{money(group.total)} · {pct}%</span>
                        </div>
                        <div className="yj-bar-track"><span style={{ width: `${Math.max(4, pct)}%` }} /></div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
            <section className="yj-card yj-insight-card">
              <div className="yj-card-title">
                <div>
                  <strong>月度变化</strong>
                  <small>和上个月比一比，只看支出</small>
                </div>
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
                <div>
                  <strong>每日支出</strong>
                  <small>看看这个月的钱集中花在哪几天</small>
                </div>
              </div>
              <div className="yj-daily-chart" aria-label="每日支出趋势">
                {dailySeries.map((item) => (
                  <div className="yj-daily-column" key={item.date} title={`${item.date} · ¥${money(item.value)}`}>
                    <span style={{ height: `${item.value ? Math.max(8, Math.round((item.value / dailyMax) * 100)) : 2}%` }} />
                    {(item.day === 1 || item.day % 5 === 0 || item.day === dailySeries.length) && <small>{item.day}</small>}
                  </div>
                ))}
              </div>
            </section>
            <section className="yj-discovery yj-discovery-light">
              <span>✨ 这个月</span>
              <strong>{discoveries[0]?.title ?? "还没有足够的数据"}</strong>
              <p>{discoveries[0]?.text ?? "保持记录，洞察会越来越像你。"}</p>
            </section>
          </>
        )}

        {view === "me" && (
          <>
            <header className="yj-page-header yj-page-header-stack">
              <div>
                <span>我的</span>
                <h1>设置与数据</h1>
                <p>账号、分类偏好、备份和安装都放在这里。</p>
              </div>
            </header>
            {ledger.user ? (
              <div className="yj-profile-wrap">
                <Profile
                  user={ledger.user}
                  rules={ledger.rules}
                  rows={ledger.rows}
                  refresh={ledger.refresh}
                  refreshUser={ledger.refreshUser}
                  notify={ledger.setToast}
                  onInstall={() => setInstallOpen(true)}
                  onLogout={() => void ledger.logout()}
                />
              </div>
            ) : (
              <EmptyState text="正在读取账户信息…" />
            )}
          </>
        )}

        {ledger.lastDeleted && (
          <div className="yj-undo">
            <span>已删除「{ledger.lastDeleted.title}」</span>
            <button onClick={() => void ledger.undo()}><RotateCcw size={14} /> 撤销</button>
          </div>
        )}
        {ledger.toast && <div className="yj-toast">{ledger.toast}</div>}
      </div>

      <nav className="yj-bottom-nav">
        {nav.map(({ view: itemView, href, label, Icon }) => {
          const isQuick = itemView === "quick";
          const active = itemView === view;
          return isQuick ? (
            <button key={label} className="yj-bottom-add" onClick={view === "home" ? focusQuick : openAdd} aria-label="快速记账">
              <Icon size={24} />
            </button>
          ) : (
            <Link key={label} href={href} className={active ? "active" : ""}>
              <Icon size={19} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {backfillOpen && (
        <BackfillMode
          rows={ledger.rows}
          rules={ledger.rules}
          defaultAccount={ledger.user?.defaultAccount ?? "未指定"}
          busy={ledger.busy}
          offline={pwa.offline}
          onSave={ledger.save}
          onSaveMany={ledger.saveMany}
          onEdit={(row) => {
            setBackfillOpen(false);
            openEdit(row);
          }}
          onDelete={(row) => void ledger.remove(row)}
          onClose={() => setBackfillOpen(false)}
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
      {installOpen && (
        <InstallPrompt
          onClose={() => setInstallOpen(false)}
          onInstall={pwa.install}
          canInstall={pwa.canInstall}
        />
      )}
    </main>
  );
}
