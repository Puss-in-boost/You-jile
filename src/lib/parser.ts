import { getDisplayEmoji, normalize } from "./categories";
import { matchCategory } from "./category-matcher";
import { detectMerchant, detectDetail } from "./purchase-dimensions";
import { localDate } from "./dates";
import type { CategoryRule, ParsedDraft } from "@/types";

const accountPatterns: Array<{ account: string; pattern: RegExp }> = [
  { account: "支付宝", pattern: /支付宝|花呗/i },
  { account: "微信", pattern: /微信支付|微信|零钱/i },
  { account: "现金", pattern: /现金/i },
  { account: "银行卡", pattern: /银行卡|信用卡|储蓄卡|刷卡/i },
];

/**
 * Some product / membership names legitimately contain digits. Those digits
 * must stay in the title instead of being merged into the monetary amount.
 * Examples: 88会员 / 88VIP / Microsoft 365 / Office 365 / 12306 / 1688.
 */
function isSemanticNumber(text: string, value: string, index: number) {
  const after = normalize(text.slice(index + value.length, index + value.length + 12));
  const before = normalize(text.slice(Math.max(0, index - 18), index));

  if (/^(会员|vip|svip|plus|pro|号线|号店|号馆|号套餐|周年|代|系列)/i.test(after)) return true;
  if (value === "88" && /(会员|vip)/i.test(after)) return true;
  if (value === "365" && /(microsoft|office)$/.test(before)) return true;
  if (["12306", "1688", "711"].includes(value)) return true;
  return false;
}

type AmountPick = { amount: string; start: number; end: number };

function pickAmount(text: string): AmountPick {
  if (/[-−]\s*\d/.test(text))
    throw new Error("金额必须大于 0，请用“收入”或“支出”区分类型");
  if (/(^|[^\d])\.\d|\d\.(?!\d)/.test(text))
    throw new Error("请输入完整金额，例如“0.5 单车”，不要省略小数点前的数字");

  // Currency markers are unambiguous and take precedence.
  const explicitPatterns = [
    /¥\s*(\d+(?:\.\d+)?)/i,
    /(\d+(?:\.\d+)?)\s*(?:元|块钱|块)(?![\p{L}\p{N}])/iu,
  ];
  for (const pattern of explicitPatterns) {
    const match = pattern.exec(text);
    if (match?.[1] && match.index != null) {
      const relative = match[0].indexOf(match[1]);
      const start = match.index + relative;
      return { amount: match[1], start, end: start + match[1].length };
    }
  }

  const numeric = [...text.matchAll(/\d+(?:\.\d+)?/g)].map((m) => ({
    amount: m[0],
    start: m.index ?? 0,
    end: (m.index ?? 0) + m[0].length,
  }));
  if (!numeric.length) throw new Error("还差一个金额，比如“35 午饭”");

  const usable = numeric.filter((item) => !isSemanticNumber(text, item.amount, item.start));
  if (!usable.length)
    throw new Error("没有识别到消费金额。像“88会员”里的 88 会保留为名称，请另外写金额，例如“168 88会员”");

  if (usable.length === 1) return usable[0];

  // For historical backfill, the user's common convention is "金额 标题".
  // Prefer a leading/trailing standalone amount while leaving numbers in the
  // merchant/product name untouched.
  const leading = usable.find((item) => {
    if (text.slice(0, item.start).trim()) return false;
    const next = text.slice(item.end, item.end + 1);
    return !next || /\s|[,，。:：;；、]/.test(next);
  });
  if (leading) return leading;

  const trailing = [...usable].reverse().find((item) => {
    if (text.slice(item.end).trim()) return false;
    const prev = text.slice(Math.max(0, item.start - 1), item.start);
    return !prev || /\s|[,，。:：;；、]/.test(prev);
  });
  if (trailing) return trailing;

  throw new Error("检测到多个可能的金额。请把金额放在开头或结尾，例如“168 88会员”");
}

function removeSlice(text: string, start: number, end: number) {
  return `${text.slice(0, start)} ${text.slice(end)}`;
}

function incomeIntent(title: string) {
  const normalized = title.normalize("NFKC").toLowerCase();

  // Explicit outgoing language wins over ambiguous words such as 红包/转账.
  if (
    /发红包|红包支出|转账给|转给|给.{0,8}转账|付款|付给|支付|支出|随礼|送礼|捐款|买入/.test(
      normalized,
    )
  )
    return false;

  return /收入|进账|到账|入账|收款|收到|收了|收红包|收到红包|工资|薪水|薪资|奖金|年终奖|绩效|补贴|津贴|补助|奖学金|助学金|报销|退款|返现|退押金|押金退回|退税|利息|分红|股息|理财收益|投资收益|兼职|副业|稿费|外快|项目款|项目费|咨询费|佣金|提成|劳务收入|闲鱼卖出|二手卖出|二手回血|卖出所得|卖了|卖出|卖掉|出售|回血|转入|转我|转给我|给我转|salary|bonus|refund|dividend|interest|reimbursement|commission/i.test(
    normalized,
  );
}

function incomeSubcategory(title: string) {
  const normalized = title.normalize("NFKC").toLowerCase();

  if (/工资|薪水|薪资|发工资|实习工资|实习费|劳务费|补发工资|salary|payroll/i.test(normalized))
    return "工资薪酬";
  if (/奖金|年终奖|绩效|补贴|津贴|补助|奖学金|助学金|bonus|scholarship/i.test(normalized))
    return "奖金补贴";
  if (/报销|退款|返现|退押金|押金退回|退税|refund|reimbursement/i.test(normalized))
    return "报销退款";
  if (/兼职|副业|稿费|外快|项目款|项目费|咨询费|佣金|提成|劳务收入|freelance|commission/i.test(normalized))
    return "兼职副业";
  if (/利息|分红|股息|理财收益|投资收益|基金分红|存款利息|dividend|interest/i.test(normalized))
    return "理财收益";
  if (/收红包|收到红包|转入|收款|收到|到账|入账|闲鱼卖出|二手卖出|二手回血|卖出所得|卖了|卖出|卖掉|出售|回血|转我|转给我|给我转|transfer in|sale income/i.test(normalized))
    return "转入所得";
  return "";
}

export function classifyTitle(
  title: string,
  rules: CategoryRule[] = [],
): Pick<
  ParsedDraft,
  | "type"
  | "category"
  | "subcategory"
  | "emoji"
  | "confidence"
  | "matchSource"
  | "matchedKeyword"
> {
  const match = matchCategory(title, rules);
  const isIncome = incomeIntent(title) || match.category === "收入";
  const type = isIncome ? "income" : "expense";
  const category = isIncome ? "收入" : match.category;
  const subcategory = isIncome
    ? (match.category === "收入" ? match.subcategory : "") ||
      incomeSubcategory(title)
    : match.subcategory;

  return {
    type,
    category,
    subcategory,
    emoji: getDisplayEmoji(category, subcategory),
    confidence: match.confidence,
    matchSource: match.matchSource,
    matchedKeyword: match.matchedKeyword,
  };
}

export function parseEntry(
  input: string,
  rules: CategoryRule[] = [],
  now = new Date(),
): ParsedDraft {
  // Preserve whitespace while extracting the amount. The previous parser
  // normalized spaces away, turning "168 88会员" into "16888会员".
  let text = input
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/￥/g, "¥")
    .replace(/\s+/g, " ");

  const date = new Date(now);
  if (/上个月/.test(text)) {
    const day = date.getDate();
    date.setDate(1);
    date.setMonth(date.getMonth() - 1);
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    date.setDate(Math.min(day, last));
  } else if (/前天/.test(text)) date.setDate(date.getDate() - 2);
  else if (/昨天|昨晚/.test(text)) date.setDate(date.getDate() - 1);
  else if (/上周/.test(text)) date.setDate(date.getDate() - 7);
  text = text.replace(
    /上个月|本月|前天|昨天|昨晚|今天早上|今天中午|今天|今晚|上周/g,
    " ",
  );

  let account = "未指定";
  for (const candidate of accountPatterns) {
    if (candidate.pattern.test(text)) {
      account = candidate.account;
      text = text.replace(candidate.pattern, " ");
      break;
    }
  }
  text = text.replace(/\s+/g, " ").trim();

  const picked = pickAmount(text);
  if (
    !/^\d+(\.\d{1,2})?$/.test(picked.amount) ||
    Number(picked.amount) <= 0 ||
    Number(picked.amount) > 9999999999.99
  )
    throw new Error("请输入大于 0、最多两位小数的有效金额");

  const title =
    removeSlice(text, picked.start, picked.end)
      .replace(/[¥元块钱，。！!：:、;；]/g, " ")
      .replace(/^(买了杯|买了个|花了|花费|买了)/, "")
      .replace(/\s+/g, " ")
      .trim() || "日常记账";

  const classification = classifyTitle(title, rules);

  return {
    ...classification,
    merchant: detectMerchant(title),
    detail: detectDetail(title, classification.subcategory),
    amount: Number(picked.amount).toFixed(2),
    title,
    date: localDate(date),
    source: "text",
    account,
  };
}
