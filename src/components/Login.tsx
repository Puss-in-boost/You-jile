"use client";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Mail,
  LockKeyhole,
  ShieldCheck,
  Sprout,
  LoaderCircle,
  ArrowLeft,
} from "lucide-react";
import { Brand } from "./Brand";
import { friendlySupabaseError, getSupabase, hasSupabase } from "@/lib/supabase";
import { request } from "@/lib/transactions";

type AuthMode = "login" | "register" | "forgot" | "reset";

export function Login() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const client = getSupabase();
    if (!client) return;

    let cancelled = false;

    async function establishRecoverySession() {
      const url = new URL(window.location.href);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const recoveryHint =
        url.searchParams.get("recovery") === "1" ||
        url.searchParams.get("type") === "recovery" ||
        hash.get("type") === "recovery";

      if (!recoveryHint) return;

      setMode("reset");
      setError("");
      setMessage("正在验证密码重置链接…");

      try {
        // PKCE links return a ?code=... value. Older / implicit links return
        // access_token + refresh_token in the URL fragment. Support both so
        // recovery works for emails created before and after this UI update.
        const code = url.searchParams.get("code");
        const accessToken = hash.get("access_token");
        const refreshToken = hash.get("refresh_token");

        if (code) {
          const { error } = await client.auth.exchangeCodeForSession(code);
          if (error) throw new Error(friendlySupabaseError(error));
        } else if (accessToken && refreshToken) {
          const { error } = await client.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (error) throw new Error(friendlySupabaseError(error));
        } else {
          const { data } = await client.auth.getSession();
          if (!data.session) {
            throw new Error("重置链接中缺少有效的恢复凭据，请重新发送重置邮件");
          }
        }

        if (cancelled) return;
        setMessage("身份验证成功，请设置一个新密码。");
        // Remove one-time tokens from the address bar without reloading.
        window.history.replaceState({}, "", "/login?recovery=1");
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "密码重置链接验证失败");
        setMessage("");
      }
    }

    void establishRecoverySession();

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("reset");
        setError("");
        setMessage("身份验证成功，请设置一个新密码。");
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  function switchMode(next: AuthMode) {
    setMode(next);
    setPassword("");
    setConfirmPassword("");
    setError("");
    setMessage("");
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const client = getSupabase();

      if (mode === "forgot") {
        if (!client) throw new Error("当前未启用 Supabase，无法发送重置邮件");
        const cleanEmail = email.trim().toLowerCase();
        if (!cleanEmail) throw new Error("请输入账号邮箱");
        const { error } = await client.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: `${window.location.origin}/login?recovery=1`,
        });
        if (error) throw new Error(friendlySupabaseError(error));
        setMessage("重置邮件已发送。请打开邮件里的链接，再回到这里设置新密码。");
        return;
      }

      if (mode === "reset") {
        if (!client) throw new Error("当前未启用 Supabase，无法重置密码");
        if (password.length < 8) throw new Error("新密码至少需要 8 位字符");
        if (password !== confirmPassword) throw new Error("两次输入的密码不一致");

        const { data: sessionData } = await client.auth.getSession();
        if (!sessionData.session) {
          throw new Error("重置链接已失效或未建立恢复会话，请重新发送重置邮件");
        }

        const { error } = await client.auth.updateUser({ password });
        if (error) throw new Error(friendlySupabaseError(error));
        setMessage("密码已经更新，正在打开你的账本…");
        window.setTimeout(() => window.location.assign("/"), 700);
        return;
      }

      if (client) {
        const { data, error } =
          mode === "login"
            ? await client.auth.signInWithPassword({ email, password })
            : await client.auth.signUp({
                email,
                password,
                options: { emailRedirectTo: window.location.origin + "/login" },
              });
        if (error) throw new Error(friendlySupabaseError(error));
        if (!data.session) {
          setMessage("注册申请已提交。请检查邮箱并点击确认链接，然后登录。");
          return;
        }
      } else {
        await request("/api/auth", {
          method: "POST",
          body: JSON.stringify({ action: mode, email, password }),
        });
      }
      window.location.assign("/");
    } catch (e) {
      const raw = e instanceof Error ? e.message : "操作失败，请重试";
      setError(
        raw.toLowerCase().includes("email rate limit exceeded")
          ? "重置邮件发送过于频繁，请稍后再试。"
          : raw,
      );
    } finally {
      setBusy(false);
    }
  }

  const isResetFlow = mode === "forgot" || mode === "reset";

  return (
    <main className="login-page">
      <aside className="login-story">
        <Brand />
        <div className="login-story-content">
          <span className="eyebrow">LITTLE NOTES. BETTER DAYS.</span>
          <h1>
            钱有去处，
            <br />
            生活有数<span>。</span>
          </h1>
          <p>
            不用精打细算，也能心里有底。
            <br />
            从今天的一杯咖啡开始，
            <br />
            慢慢了解自己的钱。
          </p>
          <div className="login-illustration">
            <div className="floating-receipt">
              <span>今天的小确幸</span>
              <strong>☕ &nbsp; 又寄了 ¥18</strong>
              <div />
              <small>好好生活，认真记录。</small>
              <Sprout size={24} />
            </div>
            <span className="login-star">✳</span>
            <span className="login-dot" />
          </div>
        </div>
        <span className="login-story-bottom">
          尽可能少地记账，尽可能多地了解自己的钱。
        </span>
      </aside>

      <section className="login-form-section">
        <div className="mobile-login-brand">
          <Brand />
        </div>
        <div className="login-form">
          <span className="eyebrow">YOUR MONEY, YOUR LITTLE WORLD</span>
          <h2>
            {mode === "login" && "欢迎回来，小小记账家。"}
            {mode === "register" && "你好，未来的小小记账家。"}
            {mode === "forgot" && "找回你的账本。"}
            {mode === "reset" && "给账本换一把新钥匙。"}
          </h2>
          <p className="muted">
            {mode === "login" && "登录你的账本，接着记下生活。"}
            {mode === "register" && "创建一个账号，把每一笔生活好好收起来。"}
            {mode === "forgot" && "输入注册邮箱，我们会给你发送密码重置链接。"}
            {mode === "reset" && "设置新密码后，你会直接回到原来的账本。"}
          </p>

          {!isResetFlow && (
            <div className="type-toggle">
              <button
                type="button"
                className={mode === "login" ? "selected" : ""}
                onClick={() => switchMode("login")}
              >
                登录
              </button>
              <button
                type="button"
                className={mode === "register" ? "selected" : ""}
                onClick={() => switchMode("register")}
              >
                注册
              </button>
            </div>
          )}

          {isResetFlow && (
            <button
              type="button"
              className="login-back"
              onClick={() => switchMode("login")}
            >
              <ArrowLeft size={14} /> 返回登录
            </button>
          )}

          <form onSubmit={submit}>
            {mode !== "reset" && (
              <label className="field-label">
                邮箱地址
                <div className="login-input">
                  <Mail size={18} />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
              </label>
            )}

            {(mode === "login" || mode === "register" || mode === "reset") && (
              <label className="field-label">
                {mode === "reset" ? "新密码" : "密码"}
                <div className="login-input">
                  <LockKeyhole size={18} />
                  <input
                    type="password"
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    placeholder="至少 8 位字符"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
              </label>
            )}

            {mode === "reset" && (
              <label className="field-label">
                再输入一次新密码
                <div className="login-input">
                  <LockKeyhole size={18} />
                  <input
                    type="password"
                    required
                    minLength={8}
                    maxLength={128}
                    autoComplete="new-password"
                    placeholder="再次输入新密码"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </label>
            )}

            {mode === "login" && hasSupabase && (
              <button
                type="button"
                className="forgot-password-link"
                onClick={() => switchMode("forgot")}
              >
                忘记密码？
              </button>
            )}

            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
            {message && (
              <p className="success-message" role="status">
                {message}
              </p>
            )}

            <button
              type="submit"
              className="primary login-submit"
              disabled={busy}
            >
              {busy ? (
                <LoaderCircle className="spin" size={19} />
              ) : (
                <>
                  {mode === "login" && "登录，打开我的账本"}
                  {mode === "register" && "创建我的账本"}
                  {mode === "forgot" && "发送重置邮件"}
                  {mode === "reset" && "保存新密码"} <ArrowUpRight size={18} />
                </>
              )}
            </button>
          </form>

          <p className="login-security">
            <ShieldCheck size={15} /> 你的数据按账号安全隔离，仅自己可见。
          </p>
          {!hasSupabase && mode === "login" && (
            <button
              className="demo-link"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await request("/api/auth", {
                    method: "POST",
                    body: JSON.stringify({ action: "demo" }),
                  });
                  window.location.assign("/");
                } catch (e) {
                  setError(e instanceof Error ? e.message : "体验模式不可用");
                  setBusy(false);
                }
              }}
            >
              <ArrowLeft size={15} /> 先逛逛独立体验账本
            </button>
          )}
        </div>
        <span className="login-bottom">又寄了 2.0 · 记小账，过好日子。</span>
      </section>
    </main>
  );
}
