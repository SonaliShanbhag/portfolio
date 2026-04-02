"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Recommendation } from "@/lib/types";

const TOOLTIP_STYLE = {
  backgroundColor: "#161b22",
  border: "1px solid #30363d",
  borderRadius: "8px",
};
const LABEL_STYLE = { fill: "#9aa0a6", fontSize: 11 };

type Props = {
  recommendations: Recommendation[];
  totalsByCard: Record<string, number>;
};

function aggregateByCategory(recs: Recommendation[]): { name: string; value: number }[] {
  const m = new Map<string, number>();
  for (const r of recs) {
    const k = r.category.trim().toLowerCase() || "other";
    m.set(k, (m.get(k) ?? 0) + r.rewardDollars);
  }
  return Array.from(m.entries())
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
}

export function RewardsCharts({ recommendations, totalsByCard }: Props) {
  const byCard = useMemo(() => {
    return Object.entries(totalsByCard)
      .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
      .sort((a, b) => b.value - a.value);
  }, [totalsByCard]);

  const byCategory = useMemo(() => aggregateByCategory(recommendations), [recommendations]);

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="min-h-0">
        <h3 className="text-sm font-medium text-white">Estimated reward by card</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">Total cash-back if you always used the suggested card per row.</p>
        <div className="mt-3 h-[260px] w-full min-w-0 sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byCard} layout="vertical" margin={{ top: 4, right: 8, left: 4, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis
                type="number"
                tickFormatter={(v) => `$${v}`}
                tick={LABEL_STYLE}
                stroke="#30363d"
              />
              <YAxis
                type="category"
                dataKey="name"
                width={132}
                tick={{ ...LABEL_STYLE, fontSize: 10 }}
                stroke="#30363d"
              />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value: number) => [`$${Number(value).toFixed(2)}`, "Reward"]}
              />
              <Bar dataKey="value" name="Reward" fill="var(--accent)" radius={[0, 4, 4, 0]} maxBarSize={28} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="min-h-0">
        <h3 className="text-sm font-medium text-white">Estimated reward by category</h3>
        <p className="mt-1 text-xs text-[var(--muted)]">Sum of per-row rewards grouped by purchase category.</p>
        <div className="mt-3 h-[260px] w-full min-w-0 sm:h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={byCategory} margin={{ top: 4, right: 8, left: 4, bottom: 24 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
              <XAxis
                dataKey="name"
                tick={LABEL_STYLE}
                stroke="#30363d"
                interval={0}
                angle={-25}
                textAnchor="end"
                height={56}
                tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
              />
              <YAxis tick={LABEL_STYLE} stroke="#30363d" tickFormatter={(v) => `$${v}`} />
              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                formatter={(value: number) => [`$${Number(value).toFixed(2)}`, "Reward"]}
              />
              <Bar dataKey="value" name="Reward" fill="#a855f7" radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
