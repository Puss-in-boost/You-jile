"use client";
import { useState } from "react";
import {
  Tags,
  Plus,
  Trash2,
  Download,
  ShieldCheck,
  LogOut,
  Smartphone,
  ChevronRight,
  Sparkles,
  CloudCheck,
  LockKeyhole,
  Pencil,
  ImagePlus,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { accounts, categories, getDisplayEmoji, getSubcategories } from "@/lib/categories";
import {
  upsertUserCategoryRule,
  deleteUserCategoryRule,
  updateUserProfile,
  uploadUserAvatar,
  removeUserAvatar,
} from "@/lib/transactions";
import { friendlySupabaseError, getSupabase } from "@/lib/supabase";
import type { User, CategoryRule, Transaction } from "@/types";
export function Profile({
  user,
  rules,
  rows,
  refresh,
  refreshUser,
  notify,
  onInstall,
  onLogout,
}: {
  user: User;
  rules: CategoryRule[];
  rows: Transaction[];
  refresh: () => Promise<void>;
  refreshUser: () => Promise<User | null>;
  notify: (s: string) => void;
  onInstall: () => void;
  onLogout: () => void;
}) {
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("餐饮");
  const [subcategory, setSubcategory] = useState("正餐");
  const [busy, setBusy] = useState(false);
  const [logoutConfirm, setLogoutConfirm] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [displayName, setDisplayName] = useState(user.displayName || user.email.split("@")[0]);
  const [defaultAccount, setDefaultAccount] = useState(user.defaultAccount || "未指定");
  const [profileBusy, setProfileBusy] = useState(false);
  const [profileError, setProfileError] = useState("");
  async function addRule(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await upsertUserCategoryRule(keyword, category, subcategory);
      await refresh();
      setKeyword("");
      notify("分类偏好已保存，下次记账会优先使用");
    } catch (e) {
      notify(e instanceof Error ? e.message : "保存失败");
    } finally {
      setBusy(false);
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (profileBusy) return;
    setProfileError("");
    setProfileBusy(true);
    try {
      await updateUserProfile({ displayName, defaultAccount, currency: "CNY" });
      await refreshUser();
      setProfileOpen(false);
      notify("个人资料已更新");
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : "个人资料保存失败");
    } finally {
      setProfileBusy(false);
    }
  }

  async function changeAvatar(file?: File) {
    if (!file || profileBusy) return;
    setProfileError("");
    setProfileBusy(true);
    try {
      await uploadUserAvatar(file);
      await refreshUser();
      notify("头像已更新");
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : "头像上传失败");
    } finally {
      setProfileBusy(false);
    }
  }

  async function clearAvatar() {
    if (profileBusy) return;
    setProfileError("");
    setProfileBusy(true);
    try {
      await removeUserAvatar();
      await refreshUser();
      notify("头像已移除");
    } catch (e) {
      setProfileError(e instanceof Error ? e.message : "头像移除失败");
    } finally {
      setProfileBusy(false);
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (passwordBusy) return;

    setPasswordError("");

    if (newPassword.length < 8) {
      setPasswordError("新密码至少需要 8 位字符");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("两次输入的密码不一致");
      return;
    }

    const client = getSupabase();
    if (!client) {
      setPasswordError("当前未启用 Supabase，无法修改密码");
      return;
    }

    setPasswordBusy(true);
    try {
      const { data: sessionData } = await client.auth.getSession();
      if (!sessionData.session) {
        throw new Error("当前登录状态已失效，请重新登录后再修改密码");
      }

      const { error } = await client.auth.updateUser({ password: newPassword });
      if (error) throw new Error(friendlySupabaseError(error, "密码修改失败"));

      setNewPassword("");
      setConfirmPassword("");
      setPasswordOpen(false);
      notify("密码已更新。下次登录请使用新密码");
    } catch (e) {
      const raw = e instanceof Error ? e.message : "密码修改失败";
      setPasswordError(
        raw.toLowerCase().includes("same password")
          ? "新密码不能与当前密码相同"
          : raw,
      );
    } finally {
      setPasswordBusy(false);
    }
  }

  function exportCSV() {
    const header = ["日期", "类型", "金额", "一级分类", "细分类", "标题", "账户"];
    const escape = (s: string) =>
      `"${(/^[=+\-@\t\r]/.test(s) ? "'" : "") + s.replace(/"/g, '""')}"`;
    const csv =
      "\uFEFF" +
      [
        header,
        ...rows.map((t) => [
          t.date,
          t.type === "expense" ? "支出" : "收入",
          t.amount,
          t.category,
          t.subcategory || "",
          t.title,
          t.account,
        ]),
      ]
        .map((row) => row.map(escape).join(","))
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "又寄了-账单备份.csv";
    a.click();
    URL.revokeObjectURL(url);
    notify(`已导出 ${rows.length} 笔账单`);
  }
  return (
    <div className="profile-grid">
      <div>
        <section className="card account-card account-card-profile">
          <div className="profile-avatar">
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="个人头像" />
            ) : (
              user.isDemo ? "小" : (user.displayName || user.email)[0]?.toUpperCase()
            )}
          </div>
          <div className="account-card-copy">
            <h2>{user.isDemo ? "小寄同学" : user.displayName || user.email.split("@")[0]}</h2>
            <p className="muted">
              {user.isDemo ? "这是你的独立体验账本，包含可编辑的示例数据。" : user.email}
            </p>
            <span className="account-badge">
              <CloudCheck size={13} />
              {user.isDemo ? "体验数据独立保存" : "个人云端账本"}
            </span>
          </div>
          {user.isDemo ? (
            <Link href="/login" className="primary">
              创建我的账号 <ChevronRight size={16} />
            </Link>
          ) : (
            <button
              type="button"
              className="secondary profile-edit-button"
              onClick={() => {
                setDisplayName(user.displayName || user.email.split("@")[0]);
                setDefaultAccount(user.defaultAccount || "未指定");
                setProfileError("");
                setProfileOpen((open) => !open);
              }}
            >
              <Pencil size={15} /> 编辑资料
            </button>
          )}
          {!user.isDemo && profileOpen && (
            <form className="profile-edit-form" onSubmit={saveProfile}>
              <div className="profile-edit-avatar-row">
                <div>
                  <strong>头像</strong>
                  <span>JPG / PNG / WebP，最大 3MB</span>
                </div>
                <div className="profile-avatar-actions">
                  <label className="secondary profile-upload-button">
                    <ImagePlus size={15} /> {user.avatarUrl ? "更换" : "上传"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={(e) => {
                        void changeAvatar(e.target.files?.[0]);
                        e.currentTarget.value = "";
                      }}
                      disabled={profileBusy}
                    />
                  </label>
                  {user.avatarUrl && (
                    <button type="button" className="secondary" onClick={() => void clearAvatar()} disabled={profileBusy}>
                      移除
                    </button>
                  )}
                </div>
              </div>
              <label>
                昵称
                <div className="profile-input-with-icon">
                  <UserRound size={16} />
                  <input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    maxLength={40}
                    placeholder="怎么称呼你？"
                    disabled={profileBusy}
                    required
                  />
                </div>
              </label>
              <label>
                默认支付方式
                <select value={defaultAccount} onChange={(e) => setDefaultAccount(e.target.value)} disabled={profileBusy}>
                  {accounts.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <small>快速记账没写支付方式时使用。选「未指定」则不会自动猜。</small>
              </label>
              <label>
                默认货币
                <input value="人民币 CNY" disabled />
              </label>
              {profileError && <p className="profile-edit-error" role="alert">{profileError}</p>}
              <div className="profile-edit-actions">
                <button type="button" className="secondary" onClick={() => setProfileOpen(false)} disabled={profileBusy}>取消</button>
                <button type="submit" className="primary" disabled={profileBusy}>
                  {profileBusy ? "保存中…" : "保存资料"}
                </button>
              </div>
            </form>
          )}
        </section>
        <section className="card rules-card">
          <div className="section-heading">
            <h2>
              <Tags size={18} /> 分类与个人偏好
            </h2>
            <span className="small-badge">{rules.length} 条已学习</span>
          </div>
          <p className="muted">
            你说了算。修改账单分类时，我们会记住你的习惯。
          </p>
          <div className="all-categories">
            {categories.map((c) => (
              <span key={c.name}>
                {c.emoji} {c.name}
              </span>
            ))}
          </div>
          <form className="rule-form" onSubmit={addRule}>
            <input
              aria-label="分类关键词"
              placeholder="关键词，例如：瑞幸"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              required
              maxLength={120}
            />
            <select
              aria-label="规则一级分类"
              value={category}
              onChange={(e) => {
                const next = e.target.value;
                setCategory(next);
                setSubcategory(getSubcategories(next)[0]?.name ?? "");
              }}
            >
              {categories.map((c) => (
                <option key={c.name}>{c.name}</option>
              ))}
            </select>
            {getSubcategories(category).length > 0 && (
              <select
                aria-label="规则细分类"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
              >
                {getSubcategories(category).map((s) => (
                  <option key={s.name} value={s.name}>
                    {s.emoji} {s.name}
                  </option>
                ))}
              </select>
            )}
            <button className="primary" disabled={busy}>
              <Plus size={16} /> 添加
            </button>
          </form>
          <div className="rules-list">
            {rules.length ? (
              rules.map((r) => (
                <div key={r.id}>
                  <span>{r.keyword}</span>
                  <span className="muted">→</span>
                  <span>
                    {getDisplayEmoji(r.category, r.subcategory)} {r.category}
                    {r.subcategory ? ` / ${r.subcategory}` : ""}
                  </span>
                  <button
                    className="icon-button"
                    aria-label={`删除 ${r.keyword} 分类规则`}
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      try {
                        await deleteUserCategoryRule(r.id);
                        await refresh();
                        notify("分类偏好已移除");
                      } catch (e) {
                        notify(e instanceof Error ? e.message : "删除失败");
                      } finally {
                        setBusy(false);
                      }
                    }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))
            ) : (
              <div className="rules-empty">
                <Sparkles size={20} />
                <p>还没有个人规则。试试把一笔账单改成你习惯的分类。</p>
              </div>
            )}
          </div>
        </section>
      </div>
      <div>
        <section className="card settings-card">
          <h2>账本与应用</h2>
          <button onClick={exportCSV}>
            <Download size={19} />
            <span>
              导出全部账单<small>CSV 格式，随时备份</small>
            </span>
            <ChevronRight size={16} />
          </button>
          <button onClick={onInstall}>
            <Smartphone size={19} />
            <span>
              安装又寄了<small>添加到主屏幕，随手记一笔</small>
            </span>
            <ChevronRight size={16} />
          </button>
          {!user.isDemo && (
            <>
              <button
                onClick={() => {
                  setPasswordOpen((open) => !open);
                  setPasswordError("");
                }}
              >
                <LockKeyhole size={19} />
                <span>
                  修改密码<small>已登录状态下可直接设置一个新密码</small>
                </span>
                <ChevronRight
                  size={16}
                  className={passwordOpen ? "settings-chevron-open" : ""}
                />
              </button>
              {passwordOpen && (
                <form className="password-change-form" onSubmit={changePassword}>
                  <div className="password-change-heading">
                    <strong>设置新密码</strong>
                    <span>不需要填写旧密码；保存后下次登录使用新密码。</span>
                  </div>
                  <label>
                    新密码
                    <input
                      type="password"
                      minLength={8}
                      maxLength={128}
                      autoComplete="new-password"
                      placeholder="至少 8 位字符"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      disabled={passwordBusy}
                      required
                    />
                  </label>
                  <label>
                    确认新密码
                    <input
                      type="password"
                      minLength={8}
                      maxLength={128}
                      autoComplete="new-password"
                      placeholder="再次输入新密码"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      disabled={passwordBusy}
                      required
                    />
                  </label>
                  {passwordError && (
                    <p className="password-change-error" role="alert">
                      {passwordError}
                    </p>
                  )}
                  <div className="password-change-actions">
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        setPasswordOpen(false);
                        setNewPassword("");
                        setConfirmPassword("");
                        setPasswordError("");
                      }}
                      disabled={passwordBusy}
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      className="primary"
                      disabled={passwordBusy}
                    >
                      {passwordBusy ? "保存中…" : "保存新密码"}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
          <button onClick={() => setLogoutConfirm(true)}>
            <LogOut size={19} />
            <span>
              退出登录<small>账单仍安全保存在云端</small>
            </span>
            <ChevronRight size={16} />
          </button>
          {logoutConfirm && (
            <div className="logout-confirm">
              <p>确定退出当前账号？</p>
              <button
                className="secondary"
                onClick={() => setLogoutConfirm(false)}
              >
                取消
              </button>
              <button className="danger-button" onClick={onLogout}>
                确认退出
              </button>
            </div>
          )}
        </section>
        <section className="privacy-note">
          <ShieldCheck size={27} />
          <h3>你的账本，只属于你</h3>
          <p>
            账单按账号隔离保存。我们不在离线缓存中存储私人账单，也不会把数据库凭据发送到浏览器。
          </p>
        </section>
        <p className="profile-version">又寄了 2.0 · 认真记账，轻松生活</p>
      </div>
    </div>
  );
}
