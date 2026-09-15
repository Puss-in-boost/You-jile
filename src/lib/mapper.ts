import type { transactions } from "@/db/schema";
import type { Transaction, Source, TransactionType } from "@/types";
import { normalizeCategoryPair, getDisplayEmoji } from "./categories";

export function mapTransactionRowToTransaction(
  row: typeof transactions.$inferSelect,
): Transaction {
  const pair = normalizeCategoryPair(row.category, row.subcategory ?? "");
  return {
    ...row,
    category: pair.category,
    subcategory: pair.subcategory,
    emoji: getDisplayEmoji(pair.category, pair.subcategory),
    type: row.type as TransactionType,
    source: row.source as Source,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}
