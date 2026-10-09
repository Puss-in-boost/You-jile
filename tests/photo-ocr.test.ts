import { test } from "node:test";
import assert from "node:assert/strict";
import { extractPhotoTransaction, photoDuplicateCandidates } from "../src/lib/photo-ocr";
import type { Transaction } from "../src/types";

const now = new Date(2026, 9, 9, 12);
test("WeChat single payment details are extracted without server calls", () => {
  const r = extractPhotoTransaction("微信支付\n支付成功\n支付金额\n¥20.00\n商户名称：盒马\n交易时间：2026-10-05 18:32:11", [], now);
  assert.equal(r.draft.amount, "20.00");
  assert.equal(r.draft.date, "2026-10-05");
  assert.equal(r.draft.type, "expense");
  assert.equal(r.draft.merchant, "盒马");
  assert.equal(r.draft.account, "微信");
  assert.equal(r.draft.source, "photo");
});

test("Alipay income and refund direction are not silently classified as expenses", () => {
  const received = extractPhotoTransaction("支付宝\n收款成功\n收款金额 ¥35.50\n交易对方 张三\n交易时间 2026年10月6日", [], now);
  assert.equal(received.draft.type, "income");
  assert.equal(received.draft.category, "收入");
  assert.equal(received.draft.amount, "35.50");
  assert.equal(received.draft.account, "支付宝");
  const refunded = extractPhotoTransaction("支付宝\n退款成功\n退款金额 19.80\n商户名称：盒马\n退款时间 2026-10-02", [], now);
  assert.equal(refunded.draft.type, "income");
  assert.equal(refunded.draft.subcategory, "报销退款");
});

test("multiple amounts and unclear dates require manual correction", () => {
  const r = extractPhotoTransaction("微信支付\n支付成功\n支付金额 ¥20.00\n实付金额 ¥19.00\n原价 ¥25.00", [], now);
  assert.equal(r.draft.amount, "");
  assert.equal(r.draft.date, "");
  assert.ok(r.warnings.some((w) => w.includes("多个金额")));
  assert.ok(r.warnings.some((w) => w.includes("日期")));
});

test("failed or cancelled transactions are not imported as completed payments", () => {
  assert.throws(() => extractPhotoTransaction("微信支付\n交易失败\n¥10", [], now), /失败/);
  assert.throws(() => extractPhotoTransaction("", [], now), /未识别到文字/);
});

test("same day amount and direction are suspected, not auto-saved or auto-dropped", () => {
  const draft = extractPhotoTransaction("支付宝\n支付成功\n交易金额 ¥20.00\n商户名称：盒马\n交易时间 2026-10-05", [], now).draft;
  const rows = [
    { ...draft, id: "1", userId:"u", createdAt:"",updatedAt:"" },
    { ...draft, id: "2", userId:"u", amount:"21.00",createdAt:"",updatedAt:"" },
    { ...draft, id: "3", userId:"u", type:"income" as const,createdAt:"",updatedAt:"" },
    { ...draft, id: "4", userId:"u", date:"2026-10-06",createdAt:"",updatedAt:"" },
  ] as Transaction[];
  assert.deepEqual(photoDuplicateCandidates(draft, rows).map((row) => row.id), ["1"]);
  assert.deepEqual(photoDuplicateCandidates({...draft, amount:""},rows), []);
});
