"use client";
import Link from "next/link";
import {
  Home,
  ReceiptText,
  ChartNoAxesCombined,
  UserRound,
  Plus,
  CloudCheck,
  ChevronDown,
  ArrowUpRight,
  Sprout,
  Tags,
  Smartphone,
} from "lucide-react";
import { Brand } from "./Brand";
import type { User } from "@/types";
export type View = "home" | "bills" | "insights" | "me";
const nav = [
  { view: "home", href: "/", label: "首页", sub: "Overview", Icon: Home },
  {
    view: "bills",
    href: "/bills",
    label: "账单",
    sub: "Transactions",
    Icon: ReceiptText,
  },
  {
    view: "insights",
    href: "/insights",
    label: "洞察",
    sub: "Insights",
    Icon: ChartNoAxesCombined,
  },
  {
    view: "me",
    href: "/me",
    label: "我的",
    sub: "My account",
    Icon: UserRound,
  },
];
export function AppShell({
  view,
  user,
  onAdd,
  onInstall,
  children,
}: {
  view: View;
  user: User | null;
  onAdd: () => void;
  onInstall: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand-link">
          <Brand />
        </Link>
        <div className="workspace-label">
          我的空间 <span>PERSONAL</span>
        </div>
        <nav className="side-nav">
          {nav.map(({ view: v, href, label, Icon }) => (
            <Link key={v} href={href} className={view === v ? "active" : ""}>
              <Icon size={19} />
              <span>{label}</span>
              {view === v && <span className="nav-dot" />}
            </Link>
          ))}
        </nav>
        <button className="primary sidebar-add" onClick={onAdd}>
          <Plus size={18} /> 记一笔 <span>⌘ K</span>
        </button>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Sprout size={26} />
            <p>记小账，过好日子。</p>
            <span>
              不必精打细算，
              <br />
              也能心里有数。
            </span>
            <div className="note-decoration">✳</div>
          </div>
          <button className="side-install" onClick={onInstall}>
            <Smartphone size={17} /> 安装到桌面 <ArrowUpRight size={15} />
          </button>
          <div className="side-version">
            <span className="tiny-dot" /> 又寄了 V1.0{" "}
            <span>慢慢来，也很好</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <span className="mobile-brand">
              <Brand small />
            </span>
            <span>我的账本</span>
            <span className="slash">/</span>
            <strong>
              {nav.find((n) => n.view === view)?.label === "首页"
                ? "概览"
                : nav.find((n) => n.view === view)?.label}
            </strong>
          </div>
          <div className="topbar-right">
            <span className="sync-status">
              <CloudCheck size={15} />
              {user?.isDemo ? "独立体验账本" : "云端账本"}
            </span>
            <span className="top-divider" />
            <Link href="/me" className="user-menu">
              <span className="avatar">
                {user?.isDemo ? "小" : user?.email?.[0]?.toUpperCase() || "我"}
              </span>
              <span>
                {user?.isDemo
                  ? "小寄同学"
                  : user?.email?.split("@")[0] || "我的账号"}
              </span>
              <ChevronDown size={14} />
            </Link>
          </div>
        </header>
        <main className="main-content">
          {children}
          <footer className="page-footer">
            <span>尽可能少地记账，尽可能多地了解自己的钱。</span>
            <span>
              MADE FOR YOUR EVERYDAY <Sprout size={13} />
            </span>
          </footer>
        </main>
      </div>
      <nav className="bottom-nav">
        <Link href="/" className={view === "home" ? "active" : ""}>
          <Home size={21} />
          首页
        </Link>
        <Link href="/bills" className={view === "bills" ? "active" : ""}>
          <ReceiptText size={21} />
          账单
        </Link>
        <button onClick={onAdd} className="bottom-add">
          <span>
            <Plus size={25} />
          </span>
          记账
        </button>
        <Link href="/insights" className={view === "insights" ? "active" : ""}>
          <ChartNoAxesCombined size={21} />
          洞察
        </Link>
        <Link href="/me" className={view === "me" ? "active" : ""}>
          <UserRound size={21} />
          我的
        </Link>
      </nav>
    </div>
  );
}
export function SectionHeading({
  icon: Icon,
  title,
  children,
}: {
  icon?: typeof Tags;
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="section-heading">
      <h2>
        {Icon && <Icon size={18} />} {title}
      </h2>
      {children}
    </div>
  );
}
