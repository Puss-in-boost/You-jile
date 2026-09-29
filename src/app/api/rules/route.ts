import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { categoryRules, transactions } from "@/db/schema";
import {
  apiError,
  ApiError,
  checkOrigin,
  requireUser,
  withUser,
} from "@/lib/auth-server";
import {
  categories,
  getDisplayEmoji,
  getSubcategories,
  normalize,
  normalizeCategoryPair,
} from "@/lib/categories";
import { mapTransactionRowToTransaction } from "@/lib/mapper";
import {
  classifyWithCurrentRules,
  dependsOnRule,
  needsReclassification,
} from "@/lib/rule-reclassification";
import type { CategoryRule } from "@/types";

export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const user = await requireUser(req);
    const parsed = z
      .object({
        keyword: z.string().trim().min(1).max(120),
        category: z
          .string()
          .refine((v) => categories.some((c) => c.name === v)),
        subcategory: z.string().max(60).default(""),
      })
      .superRefine((value, ctx) => {
        if (!value.subcategory) return;
        if (!getSubcategories(value.category).some((s) => s.name === value.subcategory)) {
          ctx.addIssue({ code: "custom", path: ["subcategory"], message: "细分类无效" });
        }
      })
      .safeParse(await req.json());
    if (!parsed.success) throw new ApiError("请输入关键词并选择分类");
    const { keyword } = parsed.data;
    const pair = normalizeCategoryPair(parsed.data.category, parsed.data.subcategory);
    const result = await withUser(user.id, (tx) =>
      tx
        .insert(categoryRules)
        .values({
          userId: user.id,
          keyword,
          category: pair.category,
          subcategory: pair.subcategory,
          normalizedKeyword: normalize(keyword),
        })
        .onConflictDoUpdate({
          target: [categoryRules.userId, categoryRules.normalizedKeyword],
          set: {
            category: pair.category,
            subcategory: pair.subcategory,
            updatedAt: new Date(),
          },
        })
        .returning(),
    );
    return Response.json(result[0]);
  } catch (e) {
    return apiError(e);
  }
}

function mapCategoryRule(row: typeof categoryRules.$inferSelect): CategoryRule {
  const pair = normalizeCategoryPair(row.category, row.subcategory);
  return {
    id: row.id,
    keyword: row.keyword,
    normalizedKeyword: row.normalizedKeyword,
    category: pair.category,
    subcategory: pair.subcategory,
  };
}

export async function DELETE(req: Request) {
  try {
    checkOrigin(req);
    const user = await requireUser(req);
    const id = new URL(req.url).searchParams.get("id");
    if (!z.uuid().safeParse(id).success) throw new ApiError("规则 ID 无效");

    const result = await withUser(user.id, async (tx) => {
      const where = and(
        eq(categoryRules.id, id!),
        eq(categoryRules.userId, user.id),
      );
      const [rule] = await tx.select().from(categoryRules).where(where);
      if (!rule) return { ok: true, reclassified: 0 };

      const [ruleRows, transactionRows] = await Promise.all([
        tx
          .select()
          .from(categoryRules)
          .where(eq(categoryRules.userId, user.id)),
        tx
          .select()
          .from(transactions)
          .where(eq(transactions.userId, user.id)),
      ]);

      const removedRule = mapCategoryRule(rule);
      const remainingRules = ruleRows
        .filter((item) => item.id !== rule.id)
        .map(mapCategoryRule);
      const affected = transactionRows
        .map(mapTransactionRowToTransaction)
        .filter((row) => dependsOnRule(row, removedRule))
        .map((row) => classifyWithCurrentRules(row, remainingRules));

      await tx.delete(categoryRules).where(where);

      for (const next of affected) {
        await tx
          .update(transactions)
          .set({
            type: next.type,
            category: next.category,
            subcategory: next.subcategory,
            emoji: next.emoji,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(transactions.id, next.id),
              eq(transactions.userId, user.id),
            ),
          );
      }

      return { ok: true, reclassified: affected.length };
    });

    return Response.json(result);
  } catch (e) {
    return apiError(e);
  }
}

export async function PATCH(req: Request) {
  try {
    checkOrigin(req);
    const user = await requireUser(req);

    const result = await withUser(user.id, async (tx) => {
      const [ruleRows, transactionRows] = await Promise.all([
        tx
          .select()
          .from(categoryRules)
          .where(eq(categoryRules.userId, user.id)),
        tx
          .select()
          .from(transactions)
          .where(eq(transactions.userId, user.id)),
      ]);

      const currentRules = ruleRows.map(mapCategoryRule);
      const affected = transactionRows
        .map(mapTransactionRowToTransaction)
        .filter((row) => needsReclassification(row, currentRules))
        .map((row) => classifyWithCurrentRules(row, currentRules));

      for (const next of affected) {
        await tx
          .update(transactions)
          .set({
            type: next.type,
            category: next.category,
            subcategory: next.subcategory,
            emoji: getDisplayEmoji(next.category, next.subcategory),
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(transactions.id, next.id),
              eq(transactions.userId, user.id),
            ),
          );
      }

      return { ok: true, reclassified: affected.length };
    });

    return Response.json(result);
  } catch (e) {
    return apiError(e);
  }
}
