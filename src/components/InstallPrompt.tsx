"use client";
import { useEffect, useState } from "react";
import { X, Smartphone, Share, PlusSquare, Download } from "lucide-react";
import { Brand } from "./Brand";
interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
export function usePWA() {
  const [prompt, setPrompt] = useState<InstallEvent | null>(null);
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if ("serviceWorker" in navigator)
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    const install = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallEvent);
    };
    const online = () => setOffline(!navigator.onLine);
    online();
    window.addEventListener("beforeinstallprompt", install);
    window.addEventListener("online", online);
    window.addEventListener("offline", online);
    return () => {
      window.removeEventListener("beforeinstallprompt", install);
      window.removeEventListener("online", online);
      window.removeEventListener("offline", online);
    };
  }, []);
  async function install() {
    if (prompt) {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      setPrompt(null);
      return choice.outcome === "accepted";
    }
    return false;
  }
  return { canInstall: !!prompt, install, offline };
}
export function InstallPrompt({
  onClose,
  onInstall,
  canInstall,
}: {
  onClose: () => void;
  onInstall: () => Promise<boolean>;
  canInstall: boolean;
}) {
  return (
    <div
      className="modal-backdrop"
      onClick={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
    >
      <section
        className="modal install-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-title"
      >
        <button
          className="icon-button install-close"
          aria-label="关闭安装提示"
          onClick={onClose}
        >
          <X size={21} />
        </button>
        <Brand small />
        <h2 id="install-title">让记账，离生活更近一点。</h2>
        <p className="muted">
          把「又寄了」装进主屏幕。
          <br />
          不用下载商店 App，点开就能记。
        </p>
        {canInstall && (
          <button
            className="primary"
            onClick={async () => {
              if (await onInstall()) onClose();
            }}
          >
            <Download size={17} /> 安装应用
          </button>
        )}
        <div className="install-steps">
          <div>
            <Smartphone size={20} />
            <strong>iPhone · Safari</strong>
            <p>
              点击底部 <Share size={14} /> 分享按钮，选择
              <br />
              <PlusSquare size={14} /> “添加到主屏幕”。
            </p>
          </div>
          <div>
            <Smartphone size={20} />
            <strong>Android / 桌面 · Chrome</strong>
            <p>
              打开浏览器菜单，选择
              <br />
              “安装应用”或“添加到主屏幕”。
            </p>
          </div>
        </div>
        <small className="muted">
          当前版本需要网络保存账单，离线时不会误报保存成功。
        </small>
      </section>
    </div>
  );
}
