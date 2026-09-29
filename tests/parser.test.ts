import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEntry } from "../src/lib/parser";
import { matchCategory } from "../src/lib/category-matcher";
import {
  jileIndex,
  spendingArchaeology,
  walletWeather,
} from "../src/lib/personality";
import {
  categoryChanges,
  categoryTrend,
  compareToPreviousMonth,
  dailyExpenseSeries,
  merchantStats,
  monthlyReport,
  monthlyTrend,
  recurringExpenses,
  spendingAnomalies,
  spendingCalendar,
  summarize,
} from "../src/lib/stats";
import type { Transaction } from "../src/types";

const now = new Date(2026, 4, 18, 12);
const samples = [
  ["35 午饭", "35.00", "餐饮", "正餐", "2026-05-18"],
  ["午饭35", "35.00", "餐饮", "正餐", "2026-05-18"],
  ["18 瑞幸", "18.00", "餐饮", "饮料", "2026-05-18"],
  ["昨天打车26", "26.00", "交通", "打车", "2026-05-17"],
  ["26昨天打车", "26.00", "交通", "打车", "2026-05-17"],
  ["上个月房租1200", "1200.00", "居住", "房租房贷", "2026-04-18"],
  ["工资3600", "3600.00", "收入", "工资薪酬", "2026-05-18"],
  ["买了杯拿铁22", "22.00", "餐饮", "饮料", "2026-05-18"],
  ["共享单车1.5", "1.50", "交通", "骑行", "2026-05-18"],
  ["昨晚火锅168", "168.00", "餐饮", "正餐", "2026-05-17"],
  ["今天奶茶20", "20.00", "餐饮", "饮料", "2026-05-18"],
  ["前天电影45", "45.00", "娱乐", "影视演出", "2026-05-16"],
  ["１８　瑞幸", "18.00", "餐饮", "饮料", "2026-05-18"],
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
    assert.equal(r.subcategory, "饮料");
    assert.equal(r.matchSource, "fuzzy");
    assert.ok(r.confidence > 0.65);
    assert.ok(r.matchedKeyword);
  }
  assert.equal(matchCategory("拿鉄").subcategory, "饮料");
  assert.equal(matchCategory("滴滴出行").category, "交通");
  assert.equal(matchCategory("盒马").subcategory, "生鲜买菜");
  assert.equal(matchCategory("霸王茶姬").subcategory, "饮料");
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
    subcategory: "饮料",
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
  assert.equal(s.subgroups.find((x) => x.subcategory === "饮料")?.total, 1800);
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
    ["拼多多", "购物", "其他购物"],
    ["皮肤", "娱乐", "游戏"],
    ["王者荣耀皮肤", "娱乐", "游戏"],
    ["Steam", "娱乐", "游戏"],
    ["水电费", "居住", "水电燃气"],
    ["中国移动话费", "居住", "通信网络"],
    ["宽带费", "居住", "通信网络"],
    ["ChatGPT Plus", "订阅服务", "数字工具"],
    ["GPT充值", "订阅服务", "数字工具"],
    ["Claude Pro", "订阅服务", "数字工具"],
    ["腾讯视频VIP", "订阅服务", "影音会员"],
    ["网易云会员", "订阅服务", "影音会员"],
    ["iCloud", "订阅服务", "云存储"],
    ["WPS超级会员", "订阅服务", "数字工具"],
    ["会员", "订阅服务", "其他订阅"],
    ["VIP", "订阅服务", "其他订阅"],
    ["皮肤科", "医疗", "就医检查"],
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
    ["居住", "通信网络"],
  );
  assert.deepEqual(
    [matchCategory("游戏充值").category, matchCategory("游戏充值").subcategory],
    ["娱乐", "游戏"],
  );
  assert.deepEqual(
    [matchCategory("GPT充值").category, matchCategory("GPT充值").subcategory],
    ["订阅服务", "数字工具"],
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
        subcategory: "日用家居",
      },
    ],
    now,
  );
  assert.equal(r.category, "购物");
  assert.equal(r.subcategory, "日用家居");
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


test("1.3 simplified taxonomy keeps overlapping concepts deterministic", () => {
  const cases: Array<[string, string, string]> = [
    ["瑞幸", "餐饮", "饮料"],
    ["霸王茶姬", "餐饮", "饮料"],
    ["可乐", "餐饮", "饮料"],
    ["伏特加", "餐饮", "酒水"],
    ["金酒", "餐饮", "酒水"],
    ["朗姆酒", "餐饮", "酒水"],
    ["龙舌兰", "餐饮", "酒水"],
    ["汤力水", "餐饮", "酒水"],
    ["苏打水", "餐饮", "酒水"],
    ["地铁", "交通", "公共交通"],
    ["12306", "交通", "长途交通"],
    ["机票", "交通", "长途交通"],
    ["水电费", "居住", "水电燃气"],
    ["中国移动话费", "居住", "通信网络"],
    ["宽带费", "居住", "通信网络"],
    ["ChatGPT Plus", "订阅服务", "数字工具"],
    ["VPN订阅", "订阅服务", "数字工具"],
    ["Clash订阅", "订阅服务", "数字工具"],
    ["腾讯视频VIP", "订阅服务", "影音会员"],
    ["Spotify", "订阅服务", "影音会员"],
    ["洗牙", "医疗", "就医检查"],
    ["验光", "医疗", "就医检查"],
  ];
  for (const [input, category, subcategory] of cases) {
    const result = matchCategory(input);
    assert.equal(result.category, category, `${input} 一级分类`);
    assert.equal(result.subcategory, subcategory, `${input} 细分类`);
  }
});

test("shopping classifies by item before marketplace channel when possible", () => {
  assert.deepEqual(
    [matchCategory("淘宝买衣服").category, matchCategory("淘宝买衣服").subcategory],
    ["购物", "服饰鞋包"],
  );
  assert.deepEqual(
    [matchCategory("京东耳机").category, matchCategory("京东耳机").subcategory],
    ["购物", "数码家电"],
  );
  assert.deepEqual(
    [matchCategory("拼多多纸巾").category, matchCategory("拼多多纸巾").subcategory],
    ["购物", "日用家居"],
  );
  assert.equal(matchCategory("淘宝").subcategory, "其他购物");
});

test("expanded income intent recognizes common incoming money", () => {
  const cases: Array<[string, string]> = [
    ["奖学金3000", "奖金补贴"],
    ["退押金1200", "报销退款"],
    ["项目款2000", "兼职副业"],
    ["佣金600", "兼职副业"],
    ["闲鱼卖出相机2500", "转入所得"],
    ["二手回血300", "转入所得"],
    ["朋友转我500", "转入所得"],
    ["微信到账200", "转入所得"],
    ["存款利息20", "理财收益"],
  ];
  for (const [input, subcategory] of cases) {
    const result = parseEntry(input, [], now);
    assert.equal(result.type, "income", input);
    assert.equal(result.category, "收入", input);
    assert.equal(result.subcategory, subcategory, input);
  }
});

test("outgoing transfer and gift language must not become income", () => {
  for (const input of ["发红包100", "转账给朋友200", "给同事转账50", "随礼500"]) {
    const result = parseEntry(input, [], now);
    assert.equal(result.type, "expense", input);
  }
});


test("six-month analytics trend keeps month order and integer cents", () => {
  const base = parseEntry("1 午饭", [], now) as Transaction;
  const row = (
    id: string,
    amount: string,
    date: string,
    type: "expense" | "income" = "expense",
    category = "餐饮",
  ): Transaction => ({
    ...base,
    id,
    userId: "u1",
    amount,
    date,
    type,
    category,
    subcategory: category === "餐饮" ? "正餐" : "",
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T08:00:00.000Z`,
  });

  const rows = [
    row("1", "100.00", "2026-03-02"),
    row("2", "200.00", "2026-04-02"),
    row("3", "300.00", "2026-05-02"),
    row("4", "400.00", "2026-06-02"),
    row("5", "500.00", "2026-07-02"),
    row("6", "600.00", "2026-08-02"),
    row("7", "1000.00", "2026-08-05", "income", "收入"),
  ];
  const trend = monthlyTrend(rows, "2026-08", 6);
  assert.deepEqual(trend.map((item) => item.month), [
    "2026-03",
    "2026-04",
    "2026-05",
    "2026-06",
    "2026-07",
    "2026-08",
  ]);
  assert.deepEqual(trend.map((item) => item.expense), [
    10000,
    20000,
    30000,
    40000,
    50000,
    60000,
  ]);
  assert.equal(trend[5].income, 100000);
  assert.equal(trend[5].balance, 40000);
});

test("category change contribution explains month-over-month movement", () => {
  const base = parseEntry("1 午饭", [], now) as Transaction;
  const row = (
    id: string,
    amount: string,
    date: string,
    category: string,
    subcategory: string,
  ): Transaction => ({
    ...base,
    id,
    userId: "u1",
    amount,
    date,
    category,
    subcategory,
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T08:00:00.000Z`,
  });
  const rows = [
    row("1", "300.00", "2026-04-03", "餐饮", "正餐"),
    row("2", "100.00", "2026-04-04", "交通", "打车"),
    row("3", "500.00", "2026-05-03", "餐饮", "正餐"),
    row("4", "40.00", "2026-05-04", "交通", "打车"),
    row("5", "399.00", "2026-05-06", "购物", "数码家电"),
  ];
  const changes = categoryChanges(rows, "2026-05");
  const food = changes.find((item) => item.category === "餐饮");
  const transport = changes.find((item) => item.category === "交通");
  const shopping = changes.find((item) => item.category === "购物");
  assert.equal(food?.change, 20000);
  assert.equal(transport?.change, -6000);
  assert.equal(shopping?.change, 39900);
  assert.equal(changes[0].category, "购物");
});

test("spending calendar identifies highest day and zero-spend days", () => {
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
    row("2", "30.00", "2026-05-01"),
    row("3", "168.00", "2026-05-12"),
  ];
  const calendar = spendingCalendar(rows, "2026-05");
  assert.equal(calendar.days.length, 31);
  assert.equal(calendar.days[0].total, 5000);
  assert.equal(calendar.days[0].count, 2);
  assert.equal(calendar.highest?.day, 12);
  assert.equal(calendar.highest?.total, 16800);
  assert.equal(calendar.zeroSpendDays, 29);
});

test("monthly report summarizes the biggest category and movement", () => {
  const base = parseEntry("1 午饭", [], now) as Transaction;
  const row = (
    id: string,
    amount: string,
    date: string,
    category: string,
    subcategory: string,
    type: "expense" | "income" = "expense",
  ): Transaction => ({
    ...base,
    id,
    userId: "u1",
    amount,
    date,
    category,
    subcategory,
    type,
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T08:00:00.000Z`,
  });
  const rows = [
    row("1", "200.00", "2026-04-03", "餐饮", "正餐"),
    row("2", "100.00", "2026-04-04", "交通", "打车"),
    row("3", "500.00", "2026-05-03", "餐饮", "正餐"),
    row("4", "50.00", "2026-05-04", "交通", "打车"),
    row("5", "1200.00", "2026-05-05", "居住", "房租房贷"),
    row("6", "3000.00", "2026-05-10", "收入", "工资薪酬", "income"),
  ];
  const report = monthlyReport(rows, "2026-05");
  assert.equal(report.expense, 175000);
  assert.equal(report.income, 300000);
  assert.equal(report.balance, 125000);
  assert.equal(report.topCategory?.name, "居住");
  assert.equal(report.topIncrease?.category, "居住");
  assert.equal(report.topDecrease?.category, "交通");
  assert.equal(report.highestDay?.day, 5);
});


test("merchant stats rank by total and preserve frequency", () => {
  const base = parseEntry("1 午饭", [], now) as Transaction;
  const row = (id: string, title: string, amount: string, date: string): Transaction => ({
    ...base,
    id,
    userId: "u1",
    title,
    amount,
    date,
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T08:00:00.000Z`,
  });
  const rows = [
    row("1", "瑞幸", "18.00", "2026-05-01"),
    row("2", "瑞幸", "22.00", "2026-05-03"),
    row("3", "盒马", "80.00", "2026-05-04"),
  ];
  const stats = merchantStats(rows, "2026-05");
  assert.equal(stats[0].title, "盒马");
  const luckin = stats.find((item) => item.title === "瑞幸");
  assert.equal(luckin?.count, 2);
  assert.equal(luckin?.total, 4000);
  assert.equal(luckin?.average, 2000);
});

test("recurring expenses favor structural or stable cross-month spending", () => {
  const base = parseEntry("1 午饭", [], now) as Transaction;
  const row = (
    id: string,
    title: string,
    amount: string,
    date: string,
    category: string,
    subcategory: string,
  ): Transaction => ({
    ...base,
    id,
    userId: "u1",
    title,
    amount,
    date,
    category,
    subcategory,
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T08:00:00.000Z`,
  });
  const rows = [
    row("1", "ChatGPT", "140.00", "2026-03-08", "订阅服务", "数字工具"),
    row("2", "ChatGPT", "140.00", "2026-04-08", "订阅服务", "数字工具"),
    row("3", "ChatGPT", "140.00", "2026-05-08", "订阅服务", "数字工具"),
    row("4", "房租", "1200.00", "2026-04-01", "居住", "房租房贷"),
    row("5", "房租", "1200.00", "2026-05-01", "居住", "房租房贷"),
    row("6", "瑞幸", "18.00", "2026-04-02", "餐饮", "饮料"),
    row("7", "瑞幸", "39.00", "2026-05-02", "餐饮", "饮料"),
  ];
  const recurring = recurringExpenses(rows, "2026-05", 3);
  assert.ok(recurring.some((item) => item.title === "ChatGPT"));
  assert.ok(recurring.some((item) => item.title === "房租"));
  assert.equal(recurring.some((item) => item.title === "瑞幸"), false);
  assert.equal(recurring.find((item) => item.title === "ChatGPT")?.confidence, "high");
});

test("anomaly detection compares against the user's own category history", () => {
  const base = parseEntry("1 午饭", [], now) as Transaction;
  const row = (id: string, amount: string, date: string): Transaction => ({
    ...base,
    id,
    userId: "u1",
    title: id === "big" ? "聚餐" : "午饭",
    amount,
    date,
    category: "餐饮",
    subcategory: "正餐",
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T08:00:00.000Z`,
  });
  const rows = [
    row("1", "20.00", "2026-01-03"),
    row("2", "22.00", "2026-01-12"),
    row("3", "25.00", "2026-02-03"),
    row("4", "18.00", "2026-02-12"),
    row("5", "24.00", "2026-03-03"),
    row("6", "21.00", "2026-04-03"),
    row("big", "168.00", "2026-05-06"),
  ];
  const anomalies = spendingAnomalies(rows, "2026-05", 4);
  assert.equal(anomalies.length, 1);
  assert.equal(anomalies[0].id, "big");
  assert.equal(anomalies[0].amount, 16800);
  assert.ok(anomalies[0].ratio > 6);
});

test("anomaly detection stays quiet without enough history", () => {
  const base = parseEntry("1 午饭", [], now) as Transaction;
  const rows = [
    {
      ...base,
      id: "1",
      userId: "u1",
      amount: "20.00",
      date: "2026-04-01",
      createdAt: "2026-04-01T08:00:00.000Z",
      updatedAt: "2026-04-01T08:00:00.000Z",
    },
    {
      ...base,
      id: "2",
      userId: "u1",
      amount: "200.00",
      date: "2026-05-01",
      createdAt: "2026-05-01T08:00:00.000Z",
      updatedAt: "2026-05-01T08:00:00.000Z",
    },
  ] as Transaction[];
  assert.equal(spendingAnomalies(rows, "2026-05").length, 0);
});


test("category composition trend keeps monthly totals and dominant categories", () => {
  const base = parseEntry("1 午饭", [], now) as Transaction;
  const row = (
    id: string,
    amount: string,
    date: string,
    category: string,
    subcategory: string,
  ): Transaction => ({
    ...base,
    id,
    userId: "u1",
    amount,
    date,
    category,
    subcategory,
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T08:00:00.000Z`,
  });
  const rows = [
    row("1", "300.00", "2026-04-03", "餐饮", "正餐"),
    row("2", "100.00", "2026-04-04", "交通", "打车"),
    row("3", "500.00", "2026-05-03", "餐饮", "正餐"),
    row("4", "1200.00", "2026-05-05", "居住", "房租房贷"),
  ];
  const result = categoryTrend(rows, "2026-05", 2, 2);
  assert.deepEqual(result.points.map((item) => item.month), ["2026-04", "2026-05"]);
  assert.deepEqual(result.points.map((item) => item.total), [40000, 170000]);
  assert.deepEqual(result.categories.map((item) => item.name), ["居住", "餐饮"]);
  assert.equal(result.points[1].categories["居住"], 120000);
  assert.equal(result.points[0].categories["餐饮"], 30000);
});


test("wallet weather compares today with the user's own recent daily baseline", () => {
  const base = parseEntry("1 午饭", [], now) as Transaction;
  const row = (id: string, amount: string, date: string): Transaction => ({
    ...base,
    id,
    userId: "u1",
    amount,
    date,
    category: "餐饮",
    subcategory: "正餐",
    createdAt: `${date}T08:00:00.000Z`,
    updatedAt: `${date}T08:00:00.000Z`,
  });
  const rows: Transaction[] = [];
  for (let day = 8; day <= 17; day += 1) {
    rows.push(row(String(day), "20.00", `2026-05-${String(day).padStart(2, "0")}`));
  }
  rows.push(row("today", "60.00", "2026-05-18"));

  const weather = walletWeather(rows, "2026-05-18");
  assert.equal(weather.ready, true);
  assert.equal(weather.baselineDaily, 2000);
  assert.equal(weather.todayTotal, 6000);
  assert.equal(weather.label, "钱包台风");
  assert.equal(Math.round((weather.ratio ?? 0) * 10) / 10, 3);
});

test("Jile index stays entertainment-only and waits for enough history", () => {
  const base = parseEntry("1 午饭", [], now) as Transaction;
  const sparse = [
    {
      ...base,
      id: "old",
      userId: "u1",
      amount: "20.00",
      date: "2026-05-17",
      createdAt: "2026-05-17T08:00:00.000Z",
      updatedAt: "2026-05-17T08:00:00.000Z",
    },
  ] as Transaction[];
  assert.equal(jileIndex(sparse, "2026-05-18").score, null);

  const rows: Transaction[] = [];
  for (let day = 8; day <= 17; day += 1) {
    rows.push({
      ...base,
      id: String(day),
      userId: "u1",
      amount: "20.00",
      date: `2026-05-${String(day).padStart(2, "0")}`,
      createdAt: `2026-05-${String(day).padStart(2, "0")}T08:00:00.000Z`,
      updatedAt: `2026-05-${String(day).padStart(2, "0")}T08:00:00.000Z`,
    });
  }
  rows.push({
    ...base,
    id: "today",
    userId: "u1",
    amount: "60.00",
    date: "2026-05-18",
    createdAt: "2026-05-18T08:00:00.000Z",
    updatedAt: "2026-05-18T08:00:00.000Z",
  });

  const index = jileIndex(rows, "2026-05-18");
  assert.equal(index.ready, true);
  assert.ok((index.score ?? 0) >= 60);
  assert.match(index.detail, /娱乐指数/);
});

test("spending archaeology prefers same day-of-month historical bills", () => {
  const base = parseEntry("1 午饭", [], now) as Transaction;
  const rows = [
    {
      ...base,
      id: "march",
      userId: "u1",
      title: "瑞幸",
      amount: "19.00",
      date: "2026-03-18",
      category: "餐饮",
      subcategory: "饮料",
      emoji: "☕",
      createdAt: "2026-03-18T08:00:00.000Z",
      updatedAt: "2026-03-18T08:00:00.000Z",
    },
    {
      ...base,
      id: "april",
      userId: "u1",
      title: "午饭",
      amount: "25.00",
      date: "2026-04-10",
      createdAt: "2026-04-10T08:00:00.000Z",
      updatedAt: "2026-04-10T08:00:00.000Z",
    },
  ] as Transaction[];

  const archaeology = spendingArchaeology(rows, "2026-05-18");
  assert.equal(archaeology.found, true);
  assert.equal(archaeology.transactionId, "march");
  assert.equal(archaeology.label, "2 个月前的今天");
  assert.match(archaeology.title, /瑞幸/);
});

test("spending archaeology does not fake nostalgia before history is old enough", () => {
  const base = parseEntry("1 午饭", [], now) as Transaction;
  const rows = [
    {
      ...base,
      id: "recent",
      userId: "u1",
      amount: "20.00",
      date: "2026-05-10",
      createdAt: "2026-05-10T08:00:00.000Z",
      updatedAt: "2026-05-10T08:00:00.000Z",
    },
  ] as Transaction[];
  const archaeology = spendingArchaeology(rows, "2026-05-18");
  assert.equal(archaeology.found, false);
  assert.match(archaeology.title, /还不够厚/);
});
