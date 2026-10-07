"use client";
import { useState } from "react";
import { purchaseCrossStats } from "@/lib/purchase-dimensions";
import { money } from "@/lib/dates";
import type { Transaction } from "@/types";

export function PurchaseCross({ rows, month, onEdit }: { rows: Transaction[]; month: string; onEdit: (row: Transaction) => void }) {
  const [merchant, setMerchant] = useState("");
  const [category, setCategory] = useState("");
  const [selected, setSelected] = useState<ReturnType<typeof purchaseCrossStats>[number] | null>(null);
  const groups = purchaseCrossStats(rows, month);
  const visible = groups.filter((g) => (!merchant || g.merchant === merchant) && (!category || g.category === category));
  return <section className="purchase-cross">
    <h2>商家 × 消费分类</h2>
    <p>同一家商店，不同的消费。按商家和分类交叉查看本月支出。</p>
    <div className="form-two-col">
      <label className="field-label">商家<select value={merchant} onChange={(e) => { setMerchant(e.target.value); setSelected(null); }}>
        <option value="">全部商家</option>{[...new Set(groups.map((g) => g.merchant))].map((v) => <option key={v}>{v}</option>)}
      </select></label>
      <label className="field-label">分类<select value={category} onChange={(e) => { setCategory(e.target.value); setSelected(null); }}>
        <option value="">全部分类</option>{[...new Set(groups.map((g) => g.category))].map((v) => <option key={v}>{v}</option>)}
      </select></label>
    </div>
    <p>合计 ¥{money(visible.reduce((sum, g) => sum + g.total, 0))}</p>
    <div className="purchase-cross-table"><table>
      <thead><tr><th>商家</th><th>分类 / 商品</th><th>金额</th><th>笔数</th></tr></thead>
      <tbody>{visible.map((g) => <tr key={JSON.stringify([g.merchant,g.category,g.subcategory,g.detail])}>
        <td>{g.merchant}</td><td><button type="button" onClick={() => setSelected(g)}>{[g.category,g.subcategory,g.detail].filter(Boolean).join(" / ")}</button></td>
        <td>¥{money(g.total)}</td><td>{g.count}</td>
      </tr>)}</tbody>
    </table></div>
    {!visible.length && <p>本月还没有符合条件的支出。</p>}
    {selected && <div><h3>{selected.merchant} · {selected.subcategory || selected.category} · {selected.detail}</h3>
      <button type="button" onClick={() => setSelected(null)}>收起明细</button>
      {rows.filter((row) => purchaseCrossStats([row], month).some((g) => g.merchant === selected.merchant && g.category === selected.category && g.subcategory === selected.subcategory && g.detail === selected.detail)).map((row) =>
        <button className="purchase-cross-row" key={row.id} onClick={() => onEdit(row)}>{row.date} · {row.title} · ¥{row.amount}</button>)}
    </div>}
    <p>一笔混合订单只计入一个分类；需要精确统计时，请按商品实际金额分别记账，避免重复计算。</p>
  </section>;
}
