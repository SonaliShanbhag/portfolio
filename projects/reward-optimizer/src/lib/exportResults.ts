import type { Recommendation } from "@/lib/types";

function escCell(s: string): string {
  const t = String(s);
  if (/[",\n\r]/.test(t)) {
    return `"${t.replace(/"/g, '""')}"`;
  }
  return t;
}

/** Build CSV: detail rows + blank line + totals by card. */
export function buildResultsCsv(
  recommendations: Recommendation[],
  totalsByCard: Record<string, number>,
): string {
  const lines: string[] = [];
  lines.push("date,merchant,category,amount_usd,suggested_card,rate_percent,reward_usd");
  for (const r of recommendations) {
    lines.push(
      [
        escCell(r.date),
        escCell(r.merchant),
        escCell(r.category),
        r.amount.toFixed(2),
        escCell(r.bestCard),
        String(r.ratePercent),
        r.rewardDollars.toFixed(2),
      ].join(","),
    );
  }
  lines.push("");
  lines.push("card,total_reward_usd");
  for (const [k, v] of Object.entries(totalsByCard).sort((a, b) => b[1] - a[1])) {
    lines.push(`${escCell(k)},${v.toFixed(2)}`);
  }
  return lines.join("\n");
}

export function downloadResultsCsv(filename: string, csv: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  a.click();
  URL.revokeObjectURL(url);
}
