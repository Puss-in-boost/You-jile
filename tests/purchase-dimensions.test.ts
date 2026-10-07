import test from "node:test";
import assert from "node:assert/strict";
import { parseEntry } from "../src/lib/parser";
import { purchaseCrossStats } from "../src/lib/purchase-dimensions";
import { draftSchema } from "../src/lib/validation";
import type { Transaction } from "../src/types";

test("merchant does not force groceries over a concrete product", () => {
  const rules = [{id:"rule",keyword:"盒马",normalizedKeyword:"盒马",category:"餐饮",subcategory:"生鲜买菜"}];
  for (const [input, subcategory, detail] of [
    ["30 盒马水果", "生鲜买菜", "水果"],
    ["20 盒马调味料", "生鲜买菜", "调味料"],
    ["40 盒马肉蛋奶", "生鲜买菜", "肉蛋奶"],
    ["200 盒马威士忌", "酒水", "威士忌"],
    ["20 华润万家啤酒", "酒水", "啤酒"],
    ["40 小象超市洗衣液", "日用家居", ""],
  ]) {
    const row = parseEntry(input, rules);
    assert.equal(row.subcategory, subcategory, input);
    assert.equal(row.detail, detail, input);
    assert.ok(row.merchant);
    assert.equal(draftSchema.safeParse(row).success, true);
  }
  assert.equal(parseEntry("100 盒马", rules).subcategory, "生鲜买菜");
});
test("specific user preference still wins over a product match", () => {
  const row = parseEntry("80 盒马威士忌", [{id:"r",keyword:"盒马威士忌",normalizedKeyword:"盒马威士忌",category:"其他",subcategory:"人情礼金"}]);
  assert.equal(row.subcategory, "人情礼金");
});
test("cross totals count each expense once and exclude other months/income", () => {
  const make = (input:string, id:string):Transaction => ({...parseEntry(input, [], new Date(2026,9,7)),id,userId:"u",createdAt:"",updatedAt:""});
  const rows = [make("30 盒马水果","1"),make("200 盒马威士忌","2"),make("20 山姆水果","3")];
  rows.push({...rows[0],id:"4",type:"income"},{...rows[0],id:"5",date:"2026-09-07"});
  const groups = purchaseCrossStats(rows,"2026-10");
  assert.equal(groups.length,3);
  assert.equal(groups.reduce((s,g)=>s+g.total,0),25000);
  assert.equal(groups.filter(g=>g.merchant==="盒马").length,2);
  assert.equal(purchaseCrossStats([{...rows[0],detail:undefined,merchant:undefined}],"2026-10")[0].detail,"未细分");
});
