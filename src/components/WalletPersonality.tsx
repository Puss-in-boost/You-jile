"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import {
  jileIndex,
  walletWeather,
} from "@/lib/personality";
import { localDate, money } from "@/lib/dates";
import type { Transaction } from "@/types";

export function WalletPersonality({
  rows,
}: {
  rows: Transaction[];
}) {
  const today = localDate();
  const weather = walletWeather(rows, today);
  const index = jileIndex(rows, today);

  return (
    <section className="yj-personality">
      <div className="yj-personality-head">
        <div>
          <span>又寄了实验室</span>
          <strong>今天的钱包人格</strong>
        </div>
        <Link href="/insights?tab=habits">
          看消费习惯 <ChevronRight size={14} />
        </Link>
      </div>

      <div className="yj-personality-grid">
        <article className="yj-personality-weather">
          <div className="yj-personality-card-label">
            <span>{weather.emoji}</span>
            <div>
              <small>钱包天气</small>
              <strong>{weather.label}</strong>
            </div>
          </div>
          <p>{weather.headline}</p>
          <small>{weather.detail}</small>
          <div className="yj-personality-weather-meta">
            <span>今日 ¥{money(weather.todayTotal)}</span>
            {weather.ready && (
              <span>近期日均 ¥{money(weather.baselineDaily)}</span>
            )}
          </div>
        </article>

        <article className="yj-personality-index">
          <div className="yj-personality-card-label">
            <span>🧪</span>
            <div>
              <small>今日又寄了指数</small>
              <strong>{index.label}</strong>
            </div>
          </div>
          <div className="yj-index-score">
            <strong>{index.score ?? "?"}</strong>
            <span>/ 100</span>
          </div>
          <div className="yj-index-track" aria-hidden="true">
            <span style={{ width: `${index.score ?? 0}%` }} />
          </div>
          <small>{index.detail}</small>
        </article>
      </div>


    </section>
  );
}
