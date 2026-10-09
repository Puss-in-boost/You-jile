"use client";

import { useEffect, useRef, useState } from "react";
import { X, ImagePlus } from "lucide-react";
import { accounts, categories, getDisplayEmoji, getSubcategories } from "@/lib/categories";
import { extractPhotoTransaction, photoDuplicateCandidates } from "@/lib/photo-ocr";
import type { CategoryRule, Draft, Transaction } from "@/types";

type Props = {
  rows: Transaction[];
  rules: CategoryRule[];
  busy: boolean;
  offline: boolean;
  onClose: () => void;
  onSave: (draft: Draft) => Promise<{ ok: boolean; error?: string }>;
};

export function PhotoImport({ rows, rules, busy, offline, onClose, onSave }: Props) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [rawText, setRawText] = useState("");
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [running, setRunning] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [allowDuplicate, setAllowDuplicate] = useState(false);
  const [previewUrl, setPreviewUrl] = useState("");
  const closed = useRef(false);
  const urlRef = useRef("");
  const lock = useRef(false);

  useEffect(() => () => {
    closed.current = true;
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  function update<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => current ? { ...current, [key]: value } : null);
    setConfirmed(false);
    setAllowDuplicate(false);
  }

  async function selectFile(file: File | undefined) {
    if (!file || running) return;
    setError("");
    setWarnings([]);
    setRawText("");
    setDraft(null);
    setConfirmed(false);
    setAllowDuplicate(false);
    if (!/^image\/(png|jpeg|webp)$/i.test(file.type) || file.size > 10 * 1024 * 1024) {
      setError("请选择小于 10MB 的 PNG、JPG 或 WebP 截图");
      return;
    }
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = URL.createObjectURL(file);
    setPreviewUrl(urlRef.current);
    setRunning(true);
    try {
      // Dynamic import keeps OCR out of the initial application bundle.
      const { recognizePaymentScreenshot } = await import("@/lib/browser-photo-ocr");
      const text = await recognizePaymentScreenshot(file, (message) => {
        if (!closed.current) setProgress(message);
      });
      if (closed.current) return;
      setRawText(text);
      const result = extractPhotoTransaction(text, rules);
      setDraft(result.draft);
      setWarnings(result.warnings);
      setProgress("");
    } catch (e) {
      if (!closed.current) {
        setError(e instanceof Error ? e.message : "本地识别失败，请更换清晰的交易详情图");
        setProgress("");
      }
    } finally {
      if (!closed.current) setRunning(false);
    }
  }

  const duplicates = draft ? photoDuplicateCandidates(draft, rows) : [];
  const amount = draft ? Number(draft.amount) : 0;
  const valid = draft && Number.isFinite(amount) && amount > 0 && amount <= 9999999999.99
    && /^\d{4}-\d{2}-\d{2}$/.test(draft.date)
    && !Number.isNaN(new Date(draft.date + "T12:00:00").getTime())
    && Boolean(draft.title.trim())
    && Boolean(draft.category)
    && (draft.type === "expense" || draft.category === "收入")
    && (draft.type === "income" || draft.category !== "收入");
  const disabled = running || busy || offline || lock.current;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!draft || !valid || !confirmed || disabled || (duplicates.length && !allowDuplicate)) return;
    lock.current = true;
    setError("");
    try {
      const result = await onSave({
        ...draft, amount: amount.toFixed(2),
        emoji: getDisplayEmoji(draft.category, draft.subcategory),
        source: "photo",
      });
      if (result.ok) onClose();
      else setError(result.error || "保存失败，请重试");
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存失败，请重试");
    } finally {
      lock.current = false;
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget && !running && !busy) onClose(); }}>
      <div className="modal yj-photo-import" role="dialog" aria-modal="true" aria-labelledby="photo-import-title">
        <div className="modal-header">
          <div><span className="eyebrow">LOCAL OCR</span><h2 id="photo-import-title">截图识别记账</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭截图识别" disabled={running || busy}><X size={21}/></button>
        </div>
        <p className="learning-note">仅支持微信/支付宝单笔交易详情截图。识别在浏览器本地运行，图片不上传又寄了服务器；首次需要从公共 CDN 下载识别程序及语言模型。识别结果可能出错，请确认后保存。</p>
        <label className="yj-photo-picker">
          <ImagePlus size={19}/> 选择一张账单截图
          <input type="file" accept="image/png,image/jpeg,image/webp" disabled={running || busy} onChange={(e) => {
            void selectFile(e.target.files?.[0]); e.currentTarget.value = "";
          }}/>
        </label>
        {previewUrl && <img className="yj-photo-preview-image" src={previewUrl} alt="仅在浏览器中预览的待识别账单截图"/>}
        {running && <p role="status" className="learning-note">{progress || "正在准备识别…"}</p>}
        {rawText && <details className="yj-photo-raw"><summary>查看 OCR 原始文字（仅当前页面保留）</summary><pre>{rawText}</pre></details>}
        {warnings.length > 0 && <div className="yj-photo-warning"><strong>识别不确定，请重点检查</strong>{warnings.map((w) => <p key={w}>• {w}</p>)}</div>}
        {draft && <form onSubmit={(e) => void save(e)}>
          <p className="learning-note">请核实金额、日期、收支类型和商家。图片识别不会自动保存。</p>
          <div className="type-toggle">
            {(["expense","income"] as const).map((type) => <button key={type} type="button" className={draft.type === type ? "selected" : ""} onClick={() => {
              setDraft({ ...draft, type, category: type === "income" ? "收入" : "其他", subcategory: "" }); setConfirmed(false); setAllowDuplicate(false);
            }}>{type === "expense" ? "− 支出" : "+ 收入"}</button>)}
          </div>
          <label className="field-label">金额（元）<input type="number" min="0.01" max="9999999999.99" step="0.01" required value={draft.amount} onChange={(e) => update("amount", e.target.value)} placeholder="请核对实付金额"/></label>
          <label className="field-label">日期<input type="date" required value={draft.date} max="9999-12-31" onChange={(e) => update("date", e.target.value)}/></label>
          <label className="field-label">商家 / 交易对方<input maxLength={60} value={draft.merchant ?? ""} onChange={(e) => update("merchant", e.target.value)}/></label>
          <label className="field-label">标题<input required maxLength={120} value={draft.title} onChange={(e) => update("title", e.target.value)}/></label>
          <label className="field-label">分类<select value={draft.category} onChange={(e) => {
            const category = e.target.value;
            setDraft({ ...draft, category, subcategory: "", detail: "", emoji: getDisplayEmoji(category) }); setConfirmed(false); setAllowDuplicate(false);
          }}>{categories.filter((c) => draft.type === "income" ? c.name === "收入" : c.name !== "收入").map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}</select></label>
          <label className="field-label">细分类<select value={draft.subcategory} onChange={(e) => {update("subcategory",e.target.value);}}><option value="">未细分</option>{getSubcategories(draft.category).map((s) => <option key={s.name} value={s.name}>{s.name}</option>)}</select></label>
          <label className="field-label">商品细分（可选）<input maxLength={60} value={draft.detail ?? ""} onChange={(e) => update("detail", e.target.value)}/></label>
          <label className="field-label">支付账户<select value={draft.account} onChange={(e) => update("account", e.target.value)}>{accounts.map((account) => <option key={account}>{account}</option>)}</select></label>
          {duplicates.length > 0 && <div className="yj-photo-warning" role="alert">
            <strong>发现 {duplicates.length} 笔疑似重复账单</strong>
            <p>同一天、相同收支方向和金额。不代表一定重复，请核对：</p>
            {duplicates.slice(0,5).map((row) => <p key={row.id}>{row.date} · {row.title} · ¥{row.amount} · {row.account}</p>)}
            <label className="yj-photo-check"><input type="checkbox" checked={allowDuplicate} onChange={(e)=>setAllowDuplicate(e.target.checked)}/>我已核对，确认仍需新增这笔账</label>
          </div>}
          <label className="yj-photo-check"><input type="checkbox" checked={confirmed} onChange={(e)=>setConfirmed(e.target.checked)}/>我已核实识别结果和收支方向</label>
          {error && <p role="alert" className="modal-form-error">{error}</p>}
          {offline && <p role="alert" className="modal-form-error">当前离线，请联网后再保存</p>}
          <div className="modal-actions">
            <button className="primary" type="submit" disabled={!valid || !confirmed || disabled || (duplicates.length > 0 && !allowDuplicate)}>{busy ? "保存中…" : "确认保存这笔账"}</button>
          </div>
        </form>}
        {!draft && error && <p role="alert" className="modal-form-error">{error}</p>}
        {!draft && !running && <p className="learning-note">不支持账单列表和合并订单截图；无法识别时仍可使用手动记账。</p>}
      </div>
    </div>
  );
}
