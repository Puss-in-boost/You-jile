import type { CategoryRule, Transaction } from "@/types";
import { normalize, normalizeCategoryPair } from "./categories";
import { classifyTitle } from "./parser";

export type Reclassification = {
  id: string;
  type: Transaction["type"];
  category: string;
  subcategory: string;
  emoji: string;
};

function samePair(
  categoryA: string,
  subcategoryA: string,
  categoryB: string,
  subcategoryB: string,
) {
  const a = normalizeCategoryPair(categoryA, subcategoryA);
  const b = normalizeCategoryPair(categoryB, subcategoryB);
  return a.category === b.category && a.subcategory === b.subcategory;
}

export function dependsOnRule(
  row: Pick<Transaction, "source" | "title" | "category" | "subcategory">,
  rule: Pick<
    CategoryRule,
    "keyword" | "normalizedKeyword" | "category" | "subcategory"
  >,
) {
  if (row.source !== "text") return false;
  const keyword = rule.normalizedKeyword || normalize(rule.keyword);
  if (!keyword || !normalize(row.title).includes(keyword)) return false;
  return samePair(
    row.category,
    row.subcategory,
    rule.category,
    rule.subcategory,
  );
}

export function classifyWithCurrentRules(
  row: Pick<Transaction, "id" | "title">,
  rules: CategoryRule[],
): Reclassification {
  const next = classifyTitle(row.title, rules);
  return {
    id: row.id,
    type: next.type,
    category: next.category,
    subcategory: next.subcategory,
    emoji: next.emoji,
  };
}

export function needsReclassification(
  row: Pick<
    Transaction,
    "source" | "id" | "title" | "type" | "category" | "subcategory"
  >,
  rules: CategoryRule[],
) {
  if (row.source !== "text") return false;
  const next = classifyWithCurrentRules(row, rules);
  return (
    next.type !== row.type ||
    !samePair(
      next.category,
      next.subcategory,
      row.category,
      row.subcategory,
    )
  );
}
