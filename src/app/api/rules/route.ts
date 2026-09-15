import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { categoryRules } from "@/db/schema";
import {
  apiError,
  ApiError,
  checkOrigin,
  requireUser,
  withUser,
} from "@/lib/auth-server";
import {
  categories,
  getSubcategories,
  normalize,
  normalizeCategoryPair,
} from "@/lib/categories";

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

export async function DELETE(req: Request) {
  try {
    checkOrigin(req);
    const user = await requireUser(req);
    const id = new URL(req.url).searchParams.get("id");
    if (!z.uuid().safeParse(id).success) throw new ApiError("规则 ID 无效");
    await withUser(user.id, (tx) =>
      tx
        .delete(categoryRules)
        .where(
          and(eq(categoryRules.id, id!), eq(categoryRules.userId, user.id)),
        ),
    );
    return Response.json({ ok: true });
  } catch (e) {
    return apiError(e);
  }
}
