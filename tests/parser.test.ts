import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEntry } from "../src/lib/parser";
import { matchCategory } from "../src/lib/category-matcher";
import { compareToPreviousMonth, dailyExpenseSeries, summarize } from "../src/lib/stats";
import type { Transaction } from "../src/types";

const now = new Date(2026, 4, 18, 12);
const samples = [
  ["35 午饭", "35.00", "餐饮", "正餐", "2026-05-18"],
  ["午饭35", "35.00", "餐饮", "正餐", "2026-05-18"],
  ["18 瑞幸", "18.00", "餐饮", "咖啡饮品", "2026-05-18"],
  ["昨天打车26", "26.00", "交通", "打车", "2026-05-17"],
  ["26昨天打车", "26.00", "交通", "打车", "2026-05-17"],
  ["上个月房租1200", "1200.00", "居住", "房租房贷", "2026-04-18"],
  ["工资3600", "3600.00", "收入", "工资薪酬", "2026-05-18"],
  ["买了杯拿铁22", "22.00", "餐饮", "咖啡饮品", "2026-05-18"],
  ["共享单车1.5", "1.50", "交通", "骑行", "2026-05-18"],
  ["昨晚火锅168", "168.00", "餐饮", "正餐", "2026-05-17"],
  ["今天奶茶20", "20.00", "餐饮", "奶茶茶饮", "2026-05-18"],
  ["前天电影45", "45.00", "娱乐", "电影演出", "2026-05-16"],
  ["１８　瑞幸", "18.00", "餐饮", "咖啡饮品", "2026-05-18"],
] as const;

for (const [input, amount, category, subcategory, date] of samples)
  test(input, () => {
    const r = parseEntry(input, [], now);
    assert.equal(r.amount, amount);
    assert.equal(r.category, category);
    assert.equal(r.subcategory, subcategory);
    assert.equal(r.date, date);
  });

test("clean title and month end / leap year", () => {
  assert.equal(parseEntry("1800 租房 上个月", [], now).title, "租房");
  assert.equal(
    parseEntry("上个月房租1200", [], new Date(2024, 2, 31)).date,
    "2024-02-29",
  );
  assert.equal(
    parseEntry("昨天午饭35", [], new Date(2026, 0, 1)).date,
    "2025-12-31",
  );
});

test("income always uses the top-level income category", () => {
  const r = parseEntry(
    "工资3600",
    [
      {
        id: "1",
        keyword: "工资",
        normalizedKeyword: "工资",
        category: "其他",
        subcategory: "",
      },
    ],
    now,
  );
  assert.equal(r.type, "income");
  assert.equal(r.category, "收入");
});

test("personal rules override dictionary and sync subcategory emoji", () => {
  const r = parseEntry(
    "20 瑞幸",
    [
      {
        id: "1",
        keyword: "瑞幸",
        normalizedKeyword: "瑞幸",
        category: "购物",
        subcategory: "",
      },
    ],
    now,
  );
  assert.equal(r.category, "购物");
  assert.equal(r.subcategory, "");
  assert.equal(r.emoji, "🛍️");
  assert.equal(r.matchSource, "user_rule");
});

test("fuzzy matching stays conservative", () => {
  for (const text of ["luckn", "星巴"]) {
    const r = matchCategory(text);
    assert.equal(r.category, "餐饮");
    assert.equal(r.subcategory, "咖啡饮品");
    assert.equal(r.matchSource, "fuzzy");
    assert.ok(r.confidence > 0.65);
    assert.ok(r.matchedKeyword);
  }
  assert.equal(matchCategory("拿鉄").subcategory, "咖啡饮品");
  assert.equal(matchCategory("滴滴出行").category, "交通");
  assert.equal(matchCategory("盒马").subcategory, "生鲜买菜");
  assert.equal(matchCategory("霸王茶姬").subcategory, "奶茶茶饮");
  assert.equal(matchCategory("完全不认识的东西").category, "其他");
  assert.equal(matchCategory("巴").category, "其他");
});

test("payment account is opt-in instead of defaulting to WeChat", () => {
  assert.equal(parseEntry("35 午饭", [], now).account, "未指定");
  assert.equal(parseEntry("35 午饭 微信", [], now).account, "微信");
  assert.equal(parseEntry("瑞幸20支付宝", [], now).account, "支付宝");
  assert.equal(parseEntry("现金晚饭20", [], now).account, "现金");
});

test("reject invalid or ambiguous money", () => {
  for (const t of [
    "0午饭",
    "-35午饭",
    "−35午饭",
    "午饭",
    "10.999午饭",
    "午饭35奶茶20",
    ".5单车",
    "午饭18.",
  ])
    assert.throws(() => parseEntry(t, [], now));
});

test("integer cents, month isolation and top-level grouping", () => {
  const make = (
    amount: string,
    date: string,
    type: "expense" | "income" = "expense",
  ) =>
    ({
      ...parseEntry("1午饭", [], now),
      id: Math.random().toString(),
      userId: "1",
      createdAt: "2026-05-18T00:00:00.000Z",
      updatedAt: "2026-05-18T00:00:00.000Z",
      amount,
      date,
      type,
    }) as Transaction;
  const coffee = {
    ...make("18.00", "2026-05-03"),
    title: "瑞幸",
    category: "餐饮",
    subcategory: "咖啡饮品",
    emoji: "☕",
  } as Transaction;
  const rows = [
    make("0.10", "2026-05-01"),
    make("0.20", "2026-05-02"),
    coffee,
    make("500", "2026-04-01"),
    make("100", "2026-05-02", "income"),
  ];
  const s = summarize(rows, "2026-05");
  assert.equal(s.expense, 1830);
  assert.equal(s.income, 10000);
  assert.equal(s.balance, 8170);
  assert.equal(s.groups[0].name, "餐饮");
  assert.equal(s.groups[0].total, 1830);
  assert.equal(s.subgroups.find((x) => x.subcategory === "咖啡饮品")?.total, 1800);
});


test("month comparison and daily series use integer cents", () => {
  const base = parseEntry("1 午饭", [], now) as Transaction;
  const row = (id: string, amount: string, date: string): Transaction => ({
    ...base,
    id,
    userId: "u1",
    amount,
    date,
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T08:00:00.000Z`,
  });
  const rows = [
    row("1", "20.00", "2026-05-01"),
    row("2", "35.00", "2026-05-08"),
    row("3", "50.00", "2026-04-03"),
  ];
  const comparison = compareToPreviousMonth(rows, "2026-05");
  assert.equal(comparison.current, 5500);
  assert.equal(comparison.previous, 5000);
  assert.equal(comparison.percent, 10);
  const daily = dailyExpenseSeries(rows, "2026-05");
  assert.equal(daily.length, 31);
  assert.equal(daily[0].value, 2000);
  assert.equal(daily[7].value, 3500);
});

test("rich built-in dictionary covers common daily wording", () => {
  const cases: Array<[string, string, string]> = [
    ["点外卖", "餐饮", "正餐"],
    ["美团外卖", "餐饮", "正餐"],
    ["盒马", "餐饮", "生鲜买菜"],
    ["多多买菜", "餐饮", "生鲜买菜"],
    ["拼多多", "购物", "电商购物"],
    ["皮肤", "娱乐", "游戏"],
    ["王者荣耀皮肤", "娱乐", "游戏"],
    ["Steam", "娱乐", "游戏"],
    ["水电费", "生活缴费", "水电燃气"],
    ["中国移动话费", "生活缴费", "话费流量"],
    ["宽带费", "生活缴费", "宽带网络"],
    ["ChatGPT Plus", "订阅服务", "AI工具"],
    ["GPT充值", "订阅服务", "AI工具"],
    ["Claude Pro", "订阅服务", "AI工具"],
    ["腾讯视频VIP", "订阅服务", "视频会员"],
    ["网易云会员", "订阅服务", "音乐会员"],
    ["iCloud", "订阅服务", "云存储"],
    ["WPS超级会员", "订阅服务", "软件会员"],
    ["会员", "订阅服务", "其他订阅"],
    ["VIP", "订阅服务", "其他订阅"],
    ["皮肤科", "医疗", "门诊检查"],
    ["鱼油", "医疗", "保健补剂"],
  ];
  for (const [input, category, subcategory] of cases) {
    const result = matchCategory(input);
    assert.equal(result.category, category, `${input} 一级分类`);
    assert.equal(result.subcategory, subcategory, `${input} 细分类`);
  }
});

test("generic recharge stays unresolved but object-specific recharge is classified", () => {
  assert.equal(matchCategory("充值").category, "其他");
  assert.deepEqual(
    [matchCategory("话费充值").category, matchCategory("话费充值").subcategory],
    ["生活缴费", "话费流量"],
  );
  assert.deepEqual(
    [matchCategory("游戏充值").category, matchCategory("游戏充值").subcategory],
    ["娱乐", "游戏"],
  );
  assert.deepEqual(
    [matchCategory("GPT充值").category, matchCategory("GPT充值").subcategory],
    ["订阅服务", "AI工具"],
  );
});

test("personal rules still override the expanded dictionary", () => {
  const r = parseEntry(
    "盒马 49.9",
    [
      {
        id: "rule-hema",
        keyword: "盒马",
        normalizedKeyword: "盒马",
        category: "购物",
        subcategory: "日用百货",
      },
    ],
    now,
  );
  assert.equal(r.category, "购物");
  assert.equal(r.subcategory, "日用百货");
  assert.equal(r.matchSource, "user_rule");
});

test("income subcategories are preserved for richer income matching", () => {
  const salary = parseEntry("实习工资900", [], now);
  assert.equal(salary.type, "income");
  assert.equal(salary.category, "收入");
  assert.equal(salary.subcategory, "工资薪酬");

  const refund = parseEntry("退款35", [], now);
  assert.equal(refund.type, "income");
  assert.equal(refund.category, "收入");
  assert.equal(refund.subcategory, "报销退款");
});

test("numbers inside product or membership names are not merged into the amount", () => {
  const a = parseEntry("168 88会员", [], now);
  assert.equal(a.amount, "168.00");
  assert.equal(a.title, "88会员");
  assert.equal(a.category, "订阅服务");
  assert.equal(a.subcategory, "平台会员");

  const b = parseEntry("淘宝88VIP 168", [], now);
  assert.equal(b.amount, "168.00");
  assert.equal(b.title, "淘宝88vip");
  assert.equal(b.category, "订阅服务");
  assert.equal(b.subcategory, "平台会员");

  const c = parseEntry("168 淘宝会员", [], now);
  assert.equal(c.amount, "168.00");
  assert.equal(c.category, "订阅服务");
  assert.equal(c.subcategory, "平台会员");
});

test("platform memberships outrank generic shopping merchant matches", () => {
  for (const text of ["淘宝会员", "88会员", "淘宝88VIP", "京东PLUS会员"]) {
    const result = matchCategory(text);
    assert.equal(result.category, "订阅服务", `${text} 一级分类`);
    assert.equal(result.subcategory, "平台会员", `${text} 细分类`);
  }
  assert.equal(matchCategory("淘宝买衣服").category, "购物");
});
