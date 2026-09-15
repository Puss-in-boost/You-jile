import {
  pgTable,
  uuid,
  text,
  numeric,
  date,
  timestamp,
  boolean,
  uniqueIndex,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
export const users = pgTable("app_users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});
export const sessions = pgTable("app_sessions", {
  token: text("token").primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    type: text("type").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    category: text("category").notNull(),
    subcategory: text("subcategory").notNull().default(""),
    emoji: text("emoji").notNull(),
    title: text("title").notNull(),
    date: date("transaction_date").notNull(),
    source: text("source").notNull().default("manual"),
    account: text("account").notNull().default("未指定"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("transactions_user_date_idx").on(t.userId, t.date),
    check("transactions_type_check", sql`${t.type} in ('expense','income')`),
    check("transactions_amount_check", sql`${t.amount} > 0`),
    check(
      "transactions_source_check",
      sql`${t.source} in ('text','manual','voice','photo')`,
    ),
  ],
);
export const categoryRules = pgTable(
  "user_category_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull(),
    keyword: text("keyword").notNull(),
    normalizedKeyword: text("normalized_keyword").notNull(),
    category: text("category").notNull(),
    subcategory: text("subcategory").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    uniqueIndex("rules_user_keyword_idx").on(t.userId, t.normalizedKeyword),
  ],
);
export const authAttempts = pgTable("auth_attempts", {
  key: text("key").primaryKey(),
  count: numeric("count").notNull().default("1"),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
});
