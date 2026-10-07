import test from "node:test";
import assert from "node:assert/strict";
import { classifyWithCurrentRules, needsReclassification } from "../src/lib/rule-reclassification";
import { summarize } from "../src/lib/stats";
import { readAllPages } from "../src/lib/pagination";
import type { Transaction } from "../src/types";

const base: Transaction = { id:"1",userId:"u",type:"income",amount:"100.00",category:"收入",subcategory:"报销退款",emoji:"↩️",title:"盒马",date:"2026-09-12",source:"text",account:"微信",createdAt:"",updatedAt:"" };
test("category repair preserves recorded direction and September totals", () => {
  const rows = [base, {...base,id:"2",type:"expense" as const,category:"购物",subcategory:"日用家居",title:"退款商品",amount:"35.00"}, {...base,id:"3",type:"expense" as const,category:"购物",subcategory:"其他购物",title:"盒马威士忌",amount:"200.00"}];
  const next = rows.map(row => ({...row,...classifyWithCurrentRules(row,[])}));
  for(let i=0;i<rows.length;i++) {
    assert.equal(next[i].type,rows[i].type);
    assert.equal(next[i].amount,rows[i].amount);
    assert.equal(next[i].date,rows[i].date);
  }
  assert.equal(needsReclassification(base,[]),false);
  assert.equal(next[0].category,"收入");
  assert.equal(next[2].subcategory,"酒水");
  assert.equal(summarize(rows,"2026-09").income,summarize(next,"2026-09").income);
  assert.equal(summarize(rows,"2026-09").expense,summarize(next,"2026-09").expense);
});
test("pagination includes older records beyond 1000 and server-short pages",async()=>{
  const data=Array.from({length:1357},(_,id)=>({...base,id:String(id)}));
  const rows=await readAllPages(async(from,to)=>data.slice(from,Math.min(to+1,from+123)));
  assert.equal(rows.length,1357);
  assert.equal(new Set(rows.map(row=>row.id)).size,1357);
  assert.equal(summarize(rows,"2026-09").income,13570000);
});
test("pagination errors never return a partial ledger",async()=>{
  await assert.rejects(readAllPages(async(from)=>{if(from)throw new Error("network");return [1];}),/network/);
});
