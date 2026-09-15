import { z } from "zod";
import { accounts, categories, getSubcategories } from "./categories";

export const draftSchema = z
  .object({
    type: z.enum(["expense", "income"]),
    amount: z
      .string()
      .regex(/^\d{1,10}(\.\d{1,2})?$/)
      .refine((v) => Number(v) > 0 && Number(v) <= 9999999999.99),
    category: z.string().refine((v) => categories.some((c) => c.name === v)),
    subcategory: z.string().max(60).default(""),
    title: z.string().trim().min(1).max(120),
    date: z.iso.date(),
    source: z.enum(["manual", "text", "voice", "photo"]),
    account: z.string().refine((v) => accounts.includes(v)),
    id: z.uuid().optional(),
    createdAt: z.iso.datetime().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.subcategory) return;
    const allowed = getSubcategories(value.category);
    if (!allowed.some((item) => item.name === value.subcategory)) {
      ctx.addIssue({
        code: "custom",
        path: ["subcategory"],
        message: "细分类与一级分类不匹配",
      });
    }
  });
