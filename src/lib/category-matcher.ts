import {
  categories,
  normalize,
  normalizeCategoryPair,
} from "./categories";
import type { CategoryRule, ParsedDraft } from "@/types";

type Match = Pick<
  ParsedDraft,
  "category" | "subcategory" | "confidence" | "matchSource" | "matchedKeyword"
>;

type Candidate = {
  word: string;
  category: string;
  subcategory: string;
  source: "exact" | "alias";
};

export function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const old = row[j];
      row[j] = Math.min(
        row[j] + 1,
        row[j - 1] + 1,
        prev + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      prev = old;
    }
  }
  return row[b.length];
}

function builtInCandidates(): Candidate[] {
  const list: Candidate[] = [];
  for (const category of categories) {
    for (const word of category.words) {
      list.push({
        word: normalize(word),
        category: category.name,
        subcategory: "",
        source: "exact",
      });
    }
    for (const word of category.aliases) {
      list.push({
        word: normalize(word),
        category: category.name,
        subcategory: "",
        source: "alias",
      });
    }
    for (const subcategory of category.subcategories ?? []) {
      for (const word of subcategory.words) {
        list.push({
          word: normalize(word),
          category: category.name,
          subcategory: subcategory.name,
          source: "exact",
        });
      }
      for (const word of subcategory.aliases) {
        list.push({
          word: normalize(word),
          category: category.name,
          subcategory: subcategory.name,
          source: "alias",
        });
      }
    }
  }
  return list.sort((a, b) => b.word.length - a.word.length);
}

const candidates = builtInCandidates();

export function matchCategory(
  input: string,
  rules: CategoryRule[] = [],
): Match {
  const text = normalize(input);
  const rule = [...rules]
    .sort((a, b) => b.normalizedKeyword.length - a.normalizedKeyword.length)
    .find((r) => text.includes(r.normalizedKeyword));
  if (rule) {
    const pair = normalizeCategoryPair(rule.category, rule.subcategory);
    return {
      ...pair,
      confidence: 1,
      matchSource: "user_rule",
      matchedKeyword: rule.keyword,
    };
  }

  const found = candidates.find((c) => text.includes(c.word));
  if (found)
    return {
      category: found.category,
      subcategory: found.subcategory,
      confidence: 0.98,
      matchSource: found.source,
      matchedKeyword: found.word,
    };

  let best: Match = {
    category: "其他",
    subcategory: "",
    confidence: 0,
    matchSource: "fallback",
    matchedKeyword: "",
  };
  for (const candidate of candidates) {
    const key = candidate.word;
    if (key.length < 3 || text.length < 2) continue;
    const score = 1 - distance(text, key) / Math.max(text.length, key.length);
    const threshold = /^[a-z]+$/.test(key) ? 0.78 : 0.66;
    if (score >= threshold && score > best.confidence)
      best = {
        category: candidate.category,
        subcategory: candidate.subcategory,
        confidence: score,
        matchSource: "fuzzy",
        matchedKeyword: key,
      };
  }
  return best;
}
