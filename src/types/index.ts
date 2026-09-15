export type TransactionType = "expense" | "income";
export type Source = "text" | "manual" | "voice" | "photo";
export interface Draft {
  type: TransactionType;
  amount: string;
  category: string;
  subcategory: string;
  emoji: string;
  title: string;
  date: string;
  source: Source;
  account: string;
}
export interface Transaction extends Draft {
  id: string;
  userId: string;
  createdAt: string;
  updatedAt: string;
}
export interface CategoryRule {
  id: string;
  keyword: string;
  normalizedKeyword: string;
  category: string;
  subcategory: string;
}
export interface ParsedDraft extends Draft {
  confidence: number;
  matchSource: "user_rule" | "exact" | "alias" | "fuzzy" | "fallback";
  matchedKeyword: string;
}
export interface User {
  id: string;
  email: string;
  isDemo: boolean;
  displayName?: string;
  avatarUrl?: string;
  avatarPath?: string;
  defaultAccount?: string;
  currency?: string;
}
