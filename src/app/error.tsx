"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main
      className="empty-state"
      style={{ minHeight: "90vh", justifyContent: "center" }}
    >
      <h1>账本暂时没能打开</h1>
      <p>请检查网络后重试。不要重复提交尚未确认的账单。</p>
      <button className="primary" onClick={reset}>
        重新加载
      </button>
    </main>
  );
}
