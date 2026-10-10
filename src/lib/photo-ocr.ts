import { classifyTitle } from "./parser";
import { detectMerchant, detectDetail } from "./purchase-dimensions";
import { getDisplayEmoji } from "./categories";
import { cents, localDate } from "./dates";
import type { CategoryRule, Draft, Transaction } from "../types";

export interface PhotoExtraction {
  draft: Draft;
  warnings: string[];
}

function currencyValue(value: string): string {
  const amount = Number(value.replace(/,/g, ""));
  return Number.isFinite(amount) && amount > 0 && amount <= 9999999999.99
    ? amount.toFixed(2)
    : "";
}

function pickAmount(lines: string[]): string {
  const explicit: string[] = [];
  const label = /(?:实付金额|支付金额|交易金额|付款金额|扣款金额|收款金额|到账金额|退款金额|退款总额|实收金额)/;
  const amountRe = /(?:[¥￥]\s*)?(-?\d{1,10}(?:,\d{3})*(?:\.\d{1,2})?)(?:\s*元)?/;
  for (let i = 0; i < lines.length; i++) {
    if (!label.test(lines[i])) continue;
    const rest = lines[i].replace(/^.*?(?:实付金额|支付金额|交易金额|付款金额|扣款金额|收款金额|到账金额|退款金额|退款总额|实收金额)\s*[：:]?\s*/, "");
    const text = rest || lines[i + 1] || "";
    const found = text.match(amountRe);
    if (found) {
      const value = currencyValue(found[1]);
      if (value) explicit.push(value);
    }
  }
  const unique = [...new Set(explicit)];
  if (unique.length === 1) return unique[0];
  if (unique.length > 1) return "";

  // A single isolated currency amount is a conservative fallback; balance,
  // savings, discount, and refund history cannot become the current payment.
  const candidates: string[] = [];
  for (const line of lines) {
    if (/余额|优惠|抵扣|红包|原价|手续费|总资产|可用额度|银行卡|本月|累计|已省|应付|积分/.test(line)) continue;
    const matches = [...line.matchAll(/[¥￥]\s*(-?\d{1,10}(?:,\d{3})*(?:\.\d{1,2})?)/g)];
    for (const match of matches) {
      const value = currencyValue(match[1]);
      if (value) candidates.push(value);
    }
  }
  const fallback = [...new Set(candidates)];
  if (fallback.length === 1) return fallback[0];
  if (fallback.length > 1) return "";

  // OCR can omit the currency glyph in a large, isolated "25.74" amount.
  // Only accept a *unique* two-decimal figure on a payment-success screen;
  // never interpret arbitrary integers, dates, discounts, or balances.
  if (!/支付成功|付款成功|交易成功|paid by|payment successful|successfully paid/i.test(lines.join(" ")))
    return "";
  const bare: string[] = [];
  for (const line of lines) {
    if (/余额|优惠|抵扣|红包|原价|手续费|资产|额度|银行卡|积分|折扣|日期|时间|balance|discount|saved|coupon|total assets/i.test(line)) continue;
    if (/^\s*\d{4}[-/.]|^\s*\d{1,2}:\d{2}/.test(line)) continue;
    const match = line.match(/^\s*(?:[¥￥Yy]\s*)?(\d{1,9}\.\d{2})\s*(?:元)?\s*$/);
    if (match) {
      const value = currencyValue(match[1]);
      if (value) bare.push(value);
    }
  }
  const distinctBare = [...new Set(bare)];
  return distinctBare.length === 1 ? distinctBare[0] : "";
}

function validDate(y: number, m: number, d: number): string {
  const date = new Date(y, m - 1, d, 12);
  return date.getFullYear() === y && date.getMonth() + 1 === m && date.getDate() === d
    ? localDate(date)
    : "";
}

function scanDate(input: string, now: Date): string {
  const matches: string[] = [];
  const patterns = [
    /(?<!\d)(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*(?:日|号)?/g,
    /(?<!\d)(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?!\d)/g,
  ];
  for (const pattern of patterns) {
    for (const match of input.matchAll(pattern)) {
      const value = validDate(+match[1], +match[2], +match[3]);
      if (value) matches.push(value);
    }
  }
  // Prefer time marked explicitly as payment/transaction time over other
  // visible dates, e.g. a previous refund or an unrelated notification.
  const tagged = /(?:交易时间|付款时间|支付时间|收款时间|创建时间|退款时间)[：:\s]*([^\n]{0,35})/.exec(input);
  if (tagged) {
    for (const pattern of patterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(tagged[1]);
      if (match) return validDate(+match[1], +match[2], +match[3]);
    }
  }
  const distinct = [...new Set(matches)];
  if (distinct.length === 1) return distinct[0];
  if (distinct.length > 1) return "";

  // Month/day without a year is only inferred when written as a calendar date.
  const short = /(?<!\d)(\d{1,2})\s*月\s*(\d{1,2})\s*(?:日|号)?/.exec(input);
  return short ? validDate(now.getFullYear(), +short[1], +short[2]) : "";
}

function labeledText(lines: string[], labels: RegExp): string {
  for (let i = 0; i < lines.length; i++) {
    const source = lines[i];
    if (/^(?:商家)?区域识别\d*[：:]?$/.test(source)) continue;
    const matched = labels.exec(source);
    if (!matched) continue;
    // Regexes for field labels also accept spaces in OCR output, but they must
    // not consume prefixes such as "商家区域识别1" as a real merchant field.
    const rest = source.slice(matched[0].length).replace(/^[：:\s]+/, "").trim();
    const result = rest || lines[i + 1] || "";
    if (
      result &&
      !/^(?:商家)?区域识别\d*[：:]?$/.test(result) &&
      !/^\d{4}[-/年]|\d{2}:\d{2}|[¥￥]/.test(result)
    ) return result.slice(0, 60);
  }
  return "";
}

/** First version: only single *successful* payment/receipt detail screenshots. */
export function extractPhotoTransaction(
  rawText: string,
  rules: CategoryRule[] = [],
  now = new Date(),
): PhotoExtraction {
  const lines = rawText.normalize("NFKC").split(/\r?\n/).map((line) => line.trim()).filter((line) => Boolean(line) && !/^(?:商家)?区域识别\d*[：:]?$/.test(line));
  const text = lines.join("\n");
  if (!text.trim()) throw new Error("未识别到文字，请换一张清晰的交易详情截图");
  if (/交易关闭|交易失败|支付失败|订单取消|订单已取消|退款中|退款处理中/.test(text))
    throw new Error("截图可能是失败、取消或处理中的交易，请核实后手动记账");

  const isRefund = /退款成功|已退款|退款金额|退款到账|refund successful|refunded/i.test(text);
  const incoming = isRefund || /收款成功|收款到账|已收款|收入\s*[¥￥]|收到转账|转入成功|payment received|received payment/i.test(text);
  const type = incoming ? "income" : "expense";
  const platform = /支付宝|余额宝/.test(text) ? "支付宝" : /微信支付|微信|零钱通|微信零钱/.test(text) ? "微信" : "未指定";
  const merchant = labeledText(
    lines,
    type === "income"
      ? /^(?:付款方|交易对方|对方账户|商户全称|商户名称|商家)(?=\s|[:：])\s*[：:]?/
      : /^(?:商户全称|商户名称|收款方|交易对方|商家)(?=\s|[:：])\s*[：:]?/,
  ) || detectMerchant(text);
  const goods = labeledText(lines, /^(?:商品说明|商品名称|商品详情|商品描述|交易商品)\s*[：:]?/);
  const title = goods || merchant || "截图账单（请填写商家或备注）";
  const categoryInfo = classifyTitle(title, rules);
  const category = type === "income" ? "收入" : categoryInfo.category;
  const subcategory = type === "income" ? (isRefund ? "报销退款" : "转入所得") : categoryInfo.subcategory;
  const amount = pickAmount(lines);
  const date = scanDate(text, now);
  const warnings: string[] = [];
  if (!amount) warnings.push("截图中有多个金额或金额不清晰，请人工填写实付/到账金额");
  else if (!/[¥￥]\s*\d/.test(text)) warnings.push("金额来自无货币符号的 OCR 数字，请重点核实");
  if (!date) warnings.push("未能确定唯一交易日期，请人工填写日期");
  if (!merchant) warnings.push("未确定收付款商家，请核对标题和商家");
  if (platform === "未指定") warnings.push("未检测到微信或支付宝标识，请确认支付账户");
  if (!incoming && !/支出|付款成功|支付成功|交易成功|扣款成功|付款金额|支付金额|实付金额|paid by|payment successful|successfully paid/i.test(text))
    warnings.push("收支方向无法明确判断，暂按支出预填，请确认");
  if (!goods) warnings.push("截图没有商品明细，分类只是根据商家推测，可自行修改");

  return {
    draft: {
      type,
      amount,
      category,
      subcategory,
      emoji: getDisplayEmoji(category, subcategory),
      title,
      merchant: merchant || detectMerchant(title),
      detail: detectDetail(goods || "", subcategory),
      date,
      account: platform,
      source: "photo",
    },
    warnings,
  };
}

/**
 * A same-day, same-direction, same-amount transaction is *suspected*, not
 * definitively duplicated: two genuine small purchases can share all three.
 */
export function photoDuplicateCandidates(draft: Draft, rows: Transaction[]): Transaction[] {
  if (!draft.date || !draft.amount || Number(draft.amount) <= 0) return [];
  return rows.filter((row) =>
    row.date === draft.date &&
    row.type === draft.type &&
    cents(row.amount) === cents(draft.amount),
  );
}
