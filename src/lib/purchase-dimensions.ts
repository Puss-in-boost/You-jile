import { normalize } from "./categories";
import { cents } from "./dates";
import type { Transaction } from "@/types";

// Channels are independent of purchase categories. A merchant alone is only a fallback.
export const merchantAliases: Record<string, string[]> = {
  盒马: ["盒马", "hema"], 叮咚买菜: ["叮咚买菜", "dingdong"],
  山姆: ["山姆", "samsclub", "sam'sclub"], 永辉: ["永辉"],
  沃尔玛: ["沃尔玛"], 大润发: ["大润发"], 华润万家: ["华润万家"],
  朴朴: ["朴朴"], 小象超市: ["小象超市"], 钱大妈: ["钱大妈"],
  多多买菜: ["多多买菜"], 美团买菜: ["美团买菜"],
  淘宝: ["淘宝", "taobao"], 天猫: ["天猫", "tmall"], 京东: ["京东", "jd"],
  拼多多: ["拼多多", "pdd"], 亚马逊: ["亚马逊", "amazon"],
};
export function detectMerchant(title: string) {
  const text = normalize(title);
  return Object.entries(merchantAliases).find(([, aliases]) => aliases.some((a) => text.includes(normalize(a))))?.[0] ?? "";
}
export function isMerchantKeyword(keyword: string) {
  return Object.values(merchantAliases).some((aliases) => aliases.some((a) => normalize(a) === normalize(keyword)));
}
export const detailOptions: Record<string, string[]> = {
  生鲜买菜: ["水果", "蔬菜", "调味料", "肉蛋奶", "粮油主食", "水产"],
  酒水: ["啤酒", "葡萄酒", "白酒", "威士忌", "伏特加", "金酒", "朗姆酒", "龙舌兰", "清酒", "鸡尾酒", "调酒辅料"],
};
const detailWords: Record<string, string[]> = {
  水果: ["水果", "苹果", "香蕉", "榴莲", "葡萄", "柠檬", "橙子", "草莓", "西瓜"],
  蔬菜: ["蔬菜", "青菜", "白菜", "西红柿", "土豆"],
  调味料: ["调味料", "调料", "酱油", "醋", "食盐", "胡椒", "蚝油"],
  肉蛋奶: ["肉蛋奶", "牛肉", "猪肉", "鸡肉", "羊肉", "鸡蛋", "牛奶", "酸奶"],
  粮油主食: ["大米", "食用油", "粮油", "面粉"], 水产: ["水产", "虾", "螃蟹", "鱼肉"],
  啤酒: ["啤酒", "精酿", "beer"], 葡萄酒: ["葡萄酒", "红酒", "香槟", "wine"],
  白酒: ["白酒"], 威士忌: ["威士忌", "whisky", "whiskey", "bourbon"],
  伏特加: ["伏特加", "vodka"], 金酒: ["金酒", "琴酒", "gin"],
  朗姆酒: ["朗姆酒", "rum"], 龙舌兰: ["龙舌兰", "tequila"],
  清酒: ["清酒"], 鸡尾酒: ["鸡尾酒", "highball"],
  调酒辅料: ["汤力水", "苏打水", "姜汁汽水", "tonic"],
};
export function detectDetail(title: string, subcategory: string) {
  const text = normalize(title);
  return (detailOptions[subcategory] ?? []).find((detail) =>
    (detailWords[detail] ?? []).some((word) => text.includes(normalize(word)))) ?? "";
}
export function purchaseCrossStats(rows: Transaction[], month: string) {
  const groups = new Map<string, { merchant: string; category: string; subcategory: string; detail: string; total: number; count: number }>();
  for (const row of rows) {
    if (row.type !== "expense" || !row.date.startsWith(month)) continue;
    const merchant = row.merchant?.trim() || detectMerchant(row.title) || "未指定商家";
    // Legacy details are deliberately not guessed: mixed orders cannot be allocated from a title.
    const detail = row.detail?.trim() || "未细分";
    const key = JSON.stringify([normalize(merchant), row.category, row.subcategory, detail]);
    const group = groups.get(key) ?? { merchant, category: row.category, subcategory: row.subcategory, detail, total: 0, count: 0 };
    group.total += cents(row.amount); group.count += 1; groups.set(key, group);
  }
  return [...groups.values()].sort((a, b) => b.total - a.total);
}
