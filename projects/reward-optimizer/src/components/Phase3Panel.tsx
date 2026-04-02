"use client";

import { RewardsCharts } from "@/components/RewardsCharts";
import { buildResultsCsv, downloadResultsCsv } from "@/lib/exportResults";
import type { Recommendation } from "@/lib/types";

type Props = {
  recommendations: Recommendation[];
  totalsByCard: Record<string, number>;
};

export function Phase3Panel({ recommendations, totalsByCard }: Props) {
  if (recommendations.length === 0) {
    return null;
  }

  const handleDownload = () => {
    const csv = buildResultsCsv(recommendations, totalsByCard);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadResultsCsv(`reward-optimizer-${stamp}.csv`, csv);
  };

  return (
    <section
      className="mt-10 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 sm:p-6"
      aria-labelledby="phase3-heading"
    >
      <p className="text-xs font-medium uppercase tracking-wider text-fuchsia-400/80">Step 4</p>
      <h2 id="phase3-heading" className="mt-1 text-lg font-medium text-white">
        Charts &amp; export
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-[var(--muted)]">
        Visual breakdown of estimated rewards. Download a spreadsheet to keep a copy, or use your browser&apos;s print
        dialog and choose <strong className="text-zinc-400">Save as PDF</strong> for a snapshot.
      </p>

      <div className="no-print mt-5 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleDownload}
          className="rounded-lg bg-[var(--accent-dim)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
        >
          Download results (CSV)
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm text-zinc-200 hover:bg-white/5"
        >
          Print / Save as PDF
        </button>
      </div>

      <div className="mt-8">
        <RewardsCharts recommendations={recommendations} totalsByCard={totalsByCard} />
      </div>
    </section>
  );
}
