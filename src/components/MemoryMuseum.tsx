"use client";

import { ChevronRight } from "lucide-react";
import { localDate } from "@/lib/dates";
import { monthlyStory, memoryMilestones } from "@/lib/memory";
import { spendingArchaeology } from "@/lib/personality";
import type { Transaction } from "@/types";

export function MemoryMuseum({
  rows,
  onOpenTransaction,
}: {
  rows: Transaction[];
  onOpenTransaction: (row: Transaction) => void;
}) {
  const today = localDate();
  const month = today.slice(0, 7);
  const story = monthlyStory(rows, month);
  const milestones = memoryMilestones(rows, today);
  const archaeology = spendingArchaeology(rows, today);
  const archaeologyRow = archaeology.transactionId
    ? rows.find((row) => row.id === archaeology.transactionId) ?? null
    : null;

  return (
    <section className="yj-memory">
      <div className="yj-memory-head">
        <div>
          <span>🏛️ 账本记忆馆</span>
          <strong>钱花掉了，故事还在。</strong>
        </div>
      </div>

      <article className="yj-memory-story">
        <div className="yj-memory-story-title">
          <span>📖</span>
          <div>
            <small>本月剧情</small>
            <strong>{story.title}</strong>
          </div>
        </div>
        <div className="yj-memory-story-lines">
          {story.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
      </article>

      <div className="yj-memory-milestones">
        {milestones.map((item) => (
          <article key={`${item.label}-${item.title}`}>
            <span>{item.emoji}</span>
            <div>
              <small>{item.label}</small>
              <strong>{item.title}</strong>
              <p>{item.detail}</p>
            </div>
          </article>
        ))}
      </div>

      <article className="yj-archaeology-card yj-memory-archaeology">
        <div className="yj-archaeology-icon">{archaeology.emoji}</div>
        <div className="yj-archaeology-copy">
          <span>{archaeology.label}</span>
          <strong>{archaeology.title}</strong>
          <p>{archaeology.detail}</p>
        </div>
        {archaeologyRow && (
          <button
            type="button"
            onClick={() => onOpenTransaction(archaeologyRow)}
            aria-label="打开这笔旧账"
          >
            看旧账 <ChevronRight size={14} />
          </button>
        )}
      </article>
    </section>
  );
}
