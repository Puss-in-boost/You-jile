import { randomUUID } from "node:crypto";
import { db } from "@/db";
import { users, transactions } from "@/db/schema";
import { getDisplayEmoji } from "./categories";
import { localDate, shiftDate, shiftMonth } from "./dates";

export async function createDemo() {
  const id = randomUUID();
  const now = new Date();
  const month = localDate(now).slice(0, 7);
  const day = now.getDate();
  const entries: [string, string, string, string, number][] = [
    ["瑞幸咖啡", "餐饮", "咖啡饮品", "18.00", 0],
    ["午间的一碗牛肉面", "餐饮", "正餐", "35.00", 0],
    ["地铁通勤", "交通", "", "6.00", 0],
    ["超市补给", "购物", "", "126.80", 1],
    ["和朋友吃火锅", "餐饮", "正餐", "168.00", 1],
    ["一杯生椰拿铁", "餐饮", "咖啡饮品", "19.90", 2],
    ["周末电影", "娱乐", "", "45.00", 2],
    ["打车回家", "交通", "", "26.00", 3],
    ["新买的春日衬衫", "购物", "", "299.00", 3],
    ["周末买菜", "餐饮", "生鲜买菜", "86.50", 4],
    ["本月房租", "居住", "", "1200.00", 5],
    ["日用品", "购物", "", "89.00", 5],
    ["朋友小聚", "餐饮", "正餐", "238.00", 6],
    ["好好吃早餐", "餐饮", "正餐", "16.00", 6],
    ["星巴克", "餐饮", "咖啡饮品", "32.00", 7],
    ["手机话费", "其他", "", "50.00", 7],
    ["一本好书", "学习", "", "48.00", 8],
    ["午饭", "餐饮", "正餐", "28.00", 8],
    ["加油", "交通", "", "200.00", 9],
    ["手冲咖啡", "餐饮", "咖啡饮品", "28.00", 9],
    ["晚餐", "餐饮", "正餐", "56.00", 10],
    ["一周的水果", "餐饮", "生鲜买菜", "67.80", 10],
    ["音乐会员", "娱乐", "", "15.00", 11],
  ];

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id,
      email: `demo-${id}@local.invalid`,
      passwordHash: "demo",
      isDemo: true,
    });

    await tx.insert(transactions).values([
      ...entries.map(([title, category, subcategory, amount, offset], i) => ({
        userId: id,
        title,
        category,
        subcategory,
        emoji: getDisplayEmoji(category, subcategory),
        amount,
        type: "expense",
        date: shiftDate(-Math.min(offset, day - 1), now),
        source: "manual",
        account: i % 3 === 0 ? "支付宝" : "微信",
        createdAt: new Date(Date.now() - i * 60000),
      })),
      {
        userId: id,
        title: "这个月的工资",
        category: "收入",
        subcategory: "",
        emoji: "💰",
        amount: "8500.00",
        type: "income",
        date: month + "-01",
        source: "manual",
        account: "银行卡",
      },
      ...[
        ["餐饮", "正餐", 1350],
        ["购物", "", 820],
        ["居住", "", 1200],
        ["交通", "", 380],
        ["餐饮", "咖啡饮品", 260],
      ].map(([category, subcategory, amount], i) => ({
        userId: id,
        title: "往月生活支出",
        category: String(category),
        subcategory: String(subcategory),
        emoji: getDisplayEmoji(String(category), String(subcategory)),
        amount: String(amount),
        type: "expense",
        date:
          shiftMonth(month, -1) +
          `-${String(Math.min(day, i * 3 + 1)).padStart(2, "0")}`,
        source: "manual",
        account: "微信",
      })),
      ...[2, 3, 4, 5].map((offset) => ({
        userId: id,
        title: "历史生活记录",
        category: "餐饮",
        subcategory: "正餐",
        emoji: "🍜",
        amount: String(2900 + offset * 170),
        type: "expense",
        date: shiftMonth(month, -offset) + "-01",
        source: "manual",
        account: "微信",
      })),
    ]);
  });
  return id;
}
