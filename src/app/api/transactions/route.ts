import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { transactions, categoryRules } from "@/db/schema";
import {
  apiError,
  ApiError,
  checkOrigin,
  requireUser,
  withUser,
} from "@/lib/auth-server";
import { draftSchema } from "@/lib/validation";
import {
  getDisplayEmoji,
  normalize,
  normalizeCategoryPair,
} from "@/lib/categories";
import { mapTransactionRowToTransaction } from "@/lib/mapper";

export async function GET(req: Request) {
  try {
    const user = await requireUser(req);
    const data = await withUser(user.id, async (tx) => ({
      transactions: (
        await tx
          .select()
          .from(transactions)
          .where(eq(transactions.userId, user.id))
          .orderBy(desc(transactions.date), desc(transactions.createdAt))
      ).map(mapTransactionRowToTransaction),
      rules: await tx
        .select()
        .from(categoryRules)
        .where(eq(categoryRules.userId, user.id)),
    }));
    return Response.json(data, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return apiError(e);
  }
}

export async function POST(req: Request) {
  try {
    checkOrigin(req);
    const user = await requireUser(req);
    const parsed = draftSchema.safeParse(await req.json());
    if (!parsed.success) throw new ApiError("请检查金额、分类、标题和日期");
    const { id, createdAt, ...draft } = parsed.data;
    const pair = normalizeCategoryPair(draft.category, draft.subcategory);
    const row = await withUser(user.id, async (tx) => {
      if (id) {
        const [exists] = await tx
          .select({ id: transactions.id })
          .from(transactions)
          .where(eq(transactions.id, id));
        if (exists) throw new ApiError("该账单已存在，请勿重复恢复", 409);
      }
      const [row] = await tx
        .insert(transactions)
        .values({
          ...draft,
          category: pair.category,
          subcategory: pair.subcategory,
          id,
          userId: user.id,
          emoji: getDisplayEmoji(pair.category, pair.subcategory),
          ...(createdAt ? { createdAt: new Date(createdAt) } : {}),
        })
        .returning();
      return row;
    });
    return Response.json(mapTransactionRowToTransaction(row), { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}

export async function PUT(req: Request) {
  try {
    checkOrigin(req);
    const user = await requireUser(req);
    const body = await req.json();
    const parsed = draftSchema.safeParse(body);
    const idParsed = z.uuid().safeParse(
      body && typeof body === "object" && "id" in body
        ? (body as { id?: unknown }).id
        : undefined,
    );
    if (!parsed.success || !idParsed.success)
      throw new ApiError("账单内容无效，请检查后重试");
    const { createdAt: _createdAt, ...draftWithOptionalId } = parsed.data;
    void _createdAt;
    const id = idParsed.data;
    const { id: _ignoredId, ...draft } = draftWithOptionalId;
    void _ignoredId;
    const pair = normalizeCategoryPair(draft.category, draft.subcategory);
    const row = await withUser(user.id, async (tx) => {
      const where = and(
        eq(transactions.id, id),
        eq(transactions.userId, user.id),
      );
      const [old] = await tx.select().from(transactions).where(where);
      if (!old) throw new ApiError("账单不存在或已被删除", 404);
      const oldPair = normalizeCategoryPair(old.category, old.subcategory);
      const [updated] = await tx
        .update(transactions)
        .set({
          ...draft,
          category: pair.category,
          subcategory: pair.subcategory,
          emoji: getDisplayEmoji(pair.category, pair.subcategory),
          updatedAt: new Date(),
        })
        .where(where)
        .returning();
      if (
        oldPair.category !== pair.category ||
        oldPair.subcategory !== pair.subcategory
      ) {
        const normalizedKeyword = normalize(old.title);
        await tx
          .insert(categoryRules)
          .values({
            userId: user.id,
            keyword: old.title,
            normalizedKeyword,
            category: pair.category,
            subcategory: pair.subcategory,
          })
          .onConflictDoUpdate({
            target: [categoryRules.userId, categoryRules.normalizedKeyword],
            set: {
              category: pair.category,
              subcategory: pair.subcategory,
              updatedAt: new Date(),
            },
          });
      }
      return updated;
    });
    return Response.json(mapTransactionRowToTransaction(row));
  } catch (e) {
    return apiError(e);
  }
}

export async function DELETE(req: Request) {
  try {
    checkOrigin(req);
    const user = await requireUser(req);
    const id = new URL(req.url).searchParams.get("id");
    if (!z.uuid().safeParse(id).success) throw new ApiError("账单 ID 无效");
    const row = await withUser(user.id, async (tx) => {
      const [deleted] = await tx
        .delete(transactions)
        .where(and(eq(transactions.id, id!), eq(transactions.userId, user.id)))
        .returning();
      if (!deleted) throw new ApiError("账单已被删除", 404);
      return deleted;
    });
    return Response.json(mapTransactionRowToTransaction(row));
  } catch (e) {
    return apiError(e);
  }
}
