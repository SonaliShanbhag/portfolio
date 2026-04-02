"use client";

import { STATEMENT_ROW_KEYS, type StatementPdfRow } from "@/lib/statementParse";

type Review = {
  rows: StatementPdfRow[];
  stats: { lineCount: number; matched: number };
};

type Props = {
  review: Review;
  busy: boolean;
  onUpdateRow: (index: number, field: keyof StatementPdfRow, value: string) => void;
  onDeleteRow: (index: number) => void;
  onAddRow: () => void;
  onConfirm: () => void;
  onCancel: () => void;
};

export function StatementPdfReview({
  review,
  busy,
  onUpdateRow,
  onDeleteRow,
  onAddRow,
  onConfirm,
  onCancel,
}: Props) {
  const headers = [...STATEMENT_ROW_KEYS];

  return (
    <div className="rounded-xl border border-sky-500/30 bg-sky-950/30 p-4 sm:p-5">
      <h3 className="text-base font-semibold text-white">Review statement PDF</h3>
      <p className="mt-2 text-xs leading-relaxed text-[var(--muted)]">
        Parsed {review.stats.matched} lines that look like transactions from {review.stats.lineCount} text lines. Issuer
        layouts differ — edit or delete rows before continuing. Amounts often appear negative for purchases; we use the
        dollar amount for rewards. Same idea as{" "}
        <span className="text-zinc-400">Card Fit</span>: PDF text is extracted only in your browser.
      </p>
      <div className="mt-4 max-h-80 overflow-auto rounded-lg border border-[var(--border)]">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="sticky top-0 bg-[var(--surface)]">
            <tr className="text-[var(--muted)]">
              {headers.map((h) => (
                <th key={h} className="px-2 py-2 font-medium">
                  {h}
                </th>
              ))}
              <th className="w-10 px-1 py-2" />
            </tr>
          </thead>
          <tbody>
            {review.rows.map((row, i) => (
              <tr key={i} className="border-t border-[var(--border)]/60">
                {headers.map((h) => (
                  <td key={h} className="px-1 py-1">
                    <input
                      type="text"
                      value={row[h] ?? ""}
                      disabled={busy}
                      onChange={(e) => onUpdateRow(i, h, e.target.value)}
                      className="w-full min-w-0 rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-zinc-200"
                    />
                  </td>
                ))}
                <td className="px-1 py-1">
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onDeleteRow(i)}
                    className="text-rose-400/80 hover:text-rose-300 disabled:opacity-40"
                    title="Remove row"
                  >
                    ×
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="no-print mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={onAddRow}
          className="rounded-lg border border-[var(--border)] bg-white/5 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/10 disabled:opacity-50"
        >
          Add row
        </button>
        <button
          type="button"
          disabled={busy || review.rows.length === 0}
          onClick={onConfirm}
          className="rounded-lg bg-[var(--accent-dim)] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          Use these transactions
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
