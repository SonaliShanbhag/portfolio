import React, { useCallback, useMemo, useState } from "react";
import Papa from "papaparse";
import AnalysisWorker from "./analysis.worker.js?worker";
import {
  detectColumns,
  parseCsvText,
  rowsToTransactions,
} from "./lib/csvParse.js";
import { buildTransactions, aggregateByCategory, rankCards } from "./lib/score.js";
import { computeMerchantRollup } from "./lib/merchantRollup.js";
import { CATEGORY_ORDER, CATEGORY_LABELS, CATEGORY_COLORS } from "./lib/categories.js";

function formatMoney(n) {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

function formatPct(rate) {
  return `${(rate * 100).toFixed(2)}%`;
}

/** @param {string[]} headers */
function initialMappingFromHeaders(headers) {
  const d = detectColumns(headers);
  if (d.amount && d.description) {
    return {
      mode: "amount",
      date: d.date,
      description: d.description,
      amountCol: d.amount,
      debitCol: d.debit,
      creditCol: d.credit,
    };
  }
  if (d.debit && d.credit && d.description) {
    return {
      mode: "split",
      date: d.date,
      description: d.description,
      amountCol: null,
      debitCol: d.debit,
      creditCol: d.credit,
    };
  }
  return {
    mode: d.amount ? "amount" : "split",
    date: d.date ?? headers[0] ?? null,
    description: d.description ?? headers[1] ?? headers[0] ?? null,
    amountCol: d.amount ?? headers.find((h) => /amount/i.test(h)) ?? null,
    debitCol: d.debit,
    creditCol: d.credit,
  };
}

/** @param {typeof initialMappingFromHeaders extends () => infer R ? R : never} m */
function toRowMapping(m) {
  if (m.mode === "amount") {
    return {
      date: m.date,
      description: m.description,
      amount: m.amountCol,
      debit: null,
      credit: null,
    };
  }
  return {
    date: m.date,
    description: m.description,
    amount: null,
    debit: m.debitCol,
    credit: m.creditCol,
  };
}

function SpendingProfile({ byCategory, totalSpend, overrideCount }) {
  const rows = useMemo(() => {
    return CATEGORY_ORDER.map((id) => ({
      id,
      label: CATEGORY_LABELS[id],
      spend: byCategory[id] || 0,
      color: CATEGORY_COLORS[id],
    })).filter((r) => r.spend > 0);
  }, [byCategory]);

  const max = Math.max(...rows.map((r) => r.spend), 1);

  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="font-display text-lg font-semibold text-white">Spending profile</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Inferred categories from merchant text (rule-based); use the merchant table below to fix miscategorized rows.
        Totals exclude card payments.
        {overrideCount > 0 && (
          <span className="text-emerald-400/90"> {overrideCount} merchant override{overrideCount !== 1 ? "s" : ""}.</span>
        )}
      </p>
      <p className="mt-3 text-sm text-zinc-400">
        Total analyzed: <span className="font-medium text-zinc-200">{formatMoney(totalSpend)}</span>
      </p>
      <div className="mt-6 space-y-3">
        {rows.map((r) => (
          <div key={r.id}>
            <div className="mb-1 flex justify-between text-xs text-zinc-400">
              <span>{r.label}</span>
              <span>
                {formatMoney(r.spend)} ({totalSpend > 0 ? ((r.spend / totalSpend) * 100).toFixed(1) : 0}%)
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${(r.spend / max) * 100}%`,
                  backgroundColor: r.color,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ColumnMappingForm({ headers, mapping, setMapping, disabled }) {
  const set = (patch) => setMapping((m) => ({ ...m, ...patch }));

  return (
    <div className="space-y-4 rounded-xl border border-white/10 bg-zinc-900/50 p-5">
      <h3 className="text-sm font-semibold text-zinc-200">Column mapping</h3>
      <p className="text-xs text-zinc-500">
        We guessed columns from headers; adjust if your export uses different names.
      </p>

      <label className="block text-xs text-zinc-500">
        Description / merchant
        <select
          className="mt-1 w-full rounded-lg border border-white/10 bg-[#070708] px-3 py-2 text-sm text-zinc-200"
          value={mapping.description ?? ""}
          onChange={(e) => set({ description: e.target.value || null })}
          disabled={disabled}
        >
          <option value="">-</option>
          {headers.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </label>

      <label className="block text-xs text-zinc-500">
        Date (optional)
        <select
          className="mt-1 w-full rounded-lg border border-white/10 bg-[#070708] px-3 py-2 text-sm text-zinc-200"
          value={mapping.date ?? ""}
          onChange={(e) => set({ date: e.target.value || null })}
          disabled={disabled}
        >
          <option value="">-</option>
          {headers.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
      </label>

      <div className="flex flex-wrap gap-3">
        <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
          <input
            type="radio"
            name="amount-mode"
            checked={mapping.mode === "amount"}
            onChange={() => set({ mode: "amount" })}
            disabled={disabled}
          />
          Single amount column
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-400">
          <input
            type="radio"
            name="amount-mode"
            checked={mapping.mode === "split"}
            onChange={() => set({ mode: "split" })}
            disabled={disabled}
          />
          Debit / Credit columns
        </label>
      </div>

      {mapping.mode === "amount" ? (
        <label className="block text-xs text-zinc-500">
          Amount (charges may be negative; we normalize)
          <select
            className="mt-1 w-full rounded-lg border border-white/10 bg-[#070708] px-3 py-2 text-sm text-zinc-200"
            value={mapping.amountCol ?? ""}
            onChange={(e) => set({ amountCol: e.target.value || null })}
            disabled={disabled}
          >
            <option value="">-</option>
            {headers.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </label>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block text-xs text-zinc-500">
            Debit (spend)
            <select
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#070708] px-3 py-2 text-sm text-zinc-200"
              value={mapping.debitCol ?? ""}
              onChange={(e) => set({ debitCol: e.target.value || null })}
              disabled={disabled}
            >
              <option value="">-</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs text-zinc-500">
            Credit (payments / refunds)
            <select
              className="mt-1 w-full rounded-lg border border-white/10 bg-[#070708] px-3 py-2 text-sm text-zinc-200"
              value={mapping.creditCol ?? ""}
              onChange={(e) => set({ creditCol: e.target.value || null })}
              disabled={disabled}
            >
              <option value="">-</option>
              {headers.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    </div>
  );
}

/** Tailwind gradient classes for issuer-themed “plastic” */
function issuerGradientClass(issuer) {
  const s = issuer || "";
  if (/chase/i.test(s)) return "bg-gradient-to-br from-blue-600/30 via-blue-950/70 to-zinc-950";
  if (/american express|amex/i.test(s)) return "bg-gradient-to-br from-sky-400/25 via-indigo-950/60 to-zinc-950";
  if (/citi/i.test(s)) return "bg-gradient-to-br from-blue-500/25 via-slate-900/80 to-zinc-950";
  if (/capital one/i.test(s)) return "bg-gradient-to-br from-red-500/20 via-zinc-900 to-zinc-950";
  if (/discover/i.test(s)) return "bg-gradient-to-br from-orange-500/25 via-zinc-900 to-zinc-950";
  if (/wells fargo/i.test(s)) return "bg-gradient-to-br from-yellow-500/15 via-zinc-900 to-zinc-950";
  if (/u\.s\. bank|us bank/i.test(s)) return "bg-gradient-to-br from-red-600/25 via-zinc-900 to-zinc-950";
  if (/bank of america/i.test(s)) return "bg-gradient-to-br from-red-700/20 via-zinc-900 to-zinc-950";
  if (/goldman|apple/i.test(s)) return "bg-gradient-to-br from-zinc-400/15 via-zinc-900 to-zinc-950";
  if (/bilt/i.test(s)) return "bg-gradient-to-br from-violet-500/25 via-zinc-900 to-zinc-950";
  return "bg-gradient-to-br from-zinc-600/25 via-zinc-900/90 to-zinc-950";
}

function CardDetailBody({ card, result }) {
  return (
    <>
      <p className="leading-relaxed text-zinc-300">{card.blurb}</p>
      <p className="mt-2 text-xs text-zinc-500">{card.valuationNote}</p>
      <div className="mt-4 grid gap-2 text-xs sm:grid-cols-2">
        <div>
          <span className="text-zinc-500">Annual fee</span>{" "}
          <span className="text-zinc-200">{formatMoney(card.annualFee)}</span>
        </div>
        <div>
          <span className="text-zinc-500">Gross rewards (est.)</span>{" "}
          <span className="text-zinc-200">{formatMoney(result.grossRewards)}</span>
        </div>
      </div>
      {card.annualFee > 0 && (
        <>
          <FeeVsGrossBar fee={card.annualFee} gross={result.grossRewards} />
          <FeeBreakEvenBlock feeBreakEven={result.feeBreakEven} />
        </>
      )}
      <div className="mt-4">
        <div className="text-xs font-medium uppercase tracking-wider text-zinc-500">Breakdown by category</div>
        <table className="mt-2 w-full text-xs">
          <thead>
            <tr className="text-left text-zinc-500">
              <th className="py-1 pr-2 font-normal">Category</th>
              <th className="py-1 pr-2 font-normal">Spend</th>
              <th className="py-1 pr-2 font-normal">Rate</th>
              <th className="py-1 font-normal">Value</th>
            </tr>
          </thead>
          <tbody>
            {result.lines.map((line) => (
              <tr key={line.category} className="border-t border-white/5 text-zinc-300">
                <td className="py-1.5 pr-2">{line.label}</td>
                <td className="py-1.5 pr-2">{formatMoney(line.spend)}</td>
                <td className="py-1.5 pr-2">{formatPct(line.rate)}</td>
                <td className="py-1.5">{formatMoney(line.estimatedValue)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {result.lines.length === 0 && (
          <p className="text-zinc-500">No categorized spend. Check CSV or mapping.</p>
        )}
      </div>
    </>
  );
}

function FeeVsGrossBar({ fee, gross }) {
  const max = Math.max(fee, gross, 1);
  return (
    <div className="mt-4 space-y-2">
      <div className="text-[10px] font-medium uppercase tracking-wider text-zinc-500">Annual fee vs gross rewards (est.)</div>
      <div className="space-y-2">
        <div>
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Annual fee</span>
            <span>{formatMoney(fee)}</span>
          </div>
          <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-rose-500/60"
              style={{ width: `${Math.min(100, (fee / max) * 100)}%` }}
            />
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs text-zinc-400">
            <span>Gross rewards</span>
            <span>{formatMoney(gross)}</span>
          </div>
          <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-emerald-500/60"
              style={{ width: `${Math.min(100, (gross / max) * 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function FeeBreakEvenBlock({ feeBreakEven: be }) {
  if (!be || be.kind === "no_fee") return null;
  if (be.kind === "above") {
    return (
      <div className="mt-3 rounded-lg border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs leading-relaxed text-emerald-100/90">
        Estimated rewards exceed the annual fee by <span className="font-medium text-white">{formatMoney(be.surplus)}</span>.
      </div>
    );
  }
  if (be.kind === "no_path") {
    return <p className="mt-3 text-xs text-zinc-500">Break-even could not be modeled for this card.</p>;
  }
  if (be.kind === "below") {
    return (
      <div className="mt-3 space-y-2 text-xs leading-relaxed text-zinc-400">
        <p>
          Rewards short of the fee by <span className="text-zinc-200">{formatMoney(be.shortfall)}</span> (est.).
        </p>
        <p>
          At this card’s {be.bestCategoryLabel} rate ({(be.bestRate * 100).toFixed(1)}% of spend), you’d need about{" "}
          <span className="text-zinc-200">{formatMoney(be.additionalAnnualAtCategoryRate)}</span> more annual spend in
          that category for rewards to equal the fee (simplified single-category view).
        </p>
        <p className="text-zinc-500">
          ≈ {formatMoney(be.additionalMonthlyAtCategoryRate)} / month in that category (same rate)
        </p>
        {be.additionalAnnualMarginal != null && be.margin > 0 && (
          <p>
            Versus the {(be.defaultRate * 100).toFixed(1)}% default rate, the uplift in {be.bestCategoryLabel} is{" "}
            {(be.margin * 100).toFixed(2)} percentage points, shifting roughly{" "}
            <span className="text-zinc-200">{formatMoney(be.additionalAnnualMarginal)}</span> of annual spend into that
            category could close the gap (illustrative).
          </p>
        )}
      </div>
    );
  }
  return null;
}

function MerchantOverrides({ rollup, busy, overrides, onChangeCategory, onClearOverride, overrideCount }) {
  if (!rollup?.length) return null;
  return (
    <section className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
      <h2 className="font-display text-lg font-semibold text-white">Merchant categories</h2>
      <p className="mt-1 text-sm text-zinc-500">
        Override miscategorized merchants (matched by normalized name). Changes re-run scoring.{" "}
        {overrideCount > 0 && (
          <span className="text-emerald-400/90">
            {overrideCount} active override{overrideCount !== 1 ? "s" : ""}.
          </span>
        )}
      </p>
      <div className="mt-4 max-h-80 overflow-y-auto rounded-lg border border-white/10">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 z-10 bg-zinc-900/95 backdrop-blur-sm">
            <tr className="text-zinc-500">
              <th className="px-3 py-2">Merchant</th>
              <th className="px-3 py-2">Spend</th>
              <th className="px-3 py-2">Category</th>
              <th className="w-14 px-2 py-2" />
            </tr>
          </thead>
          <tbody>
            {rollup.map((row) => (
              <tr key={row.key} className="border-t border-white/5">
                <td className="max-w-[200px] truncate px-3 py-2 text-zinc-300" title={row.display}>
                  {row.display}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-zinc-400">{formatMoney(row.spend)}</td>
                <td className="px-3 py-2">
                  <select
                    className="w-full min-w-[148px] rounded border border-white/10 bg-[#070708] px-2 py-1.5 text-zinc-200"
                    value={row.category}
                    disabled={busy}
                    onChange={(e) => onChangeCategory(row.key, e.target.value)}
                  >
                    {CATEGORY_ORDER.map((id) => (
                      <option key={id} value={id}>
                        {CATEGORY_LABELS[id]}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-2 py-2 text-right">
                  {overrides[row.key] != null && (
                    <button
                      type="button"
                      title="Remove override; use auto rules"
                      disabled={busy}
                      onClick={() => onClearOverride(row.key)}
                      className="text-[10px] text-zinc-500 underline decoration-zinc-600 hover:text-zinc-300 disabled:opacity-40"
                    >
                      Auto
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

const PDF_HEADERS = ["Transaction Date", "Description", "Amount"];

function PdfReviewPanel({ review, onUpdateRow, onDeleteRow, onAddRow, onConfirm, onCancel, busy }) {
  return (
    <div className="rounded-xl border border-sky-500/25 bg-sky-500/[0.06] p-5">
      <h3 className="font-display text-base font-semibold text-white">Review PDF extraction</h3>
      <p className="mt-2 text-xs leading-relaxed text-zinc-400">
        Parsed {review.stats.matched} lines that look like transactions from {review.stats.lineCount} text lines. PDF
        layouts vary; fix or delete rows before continuing. Amounts should follow your bank&apos;s sign (often negative
        for purchases).
      </p>
      <div className="mt-4 max-h-80 overflow-auto rounded-lg border border-white/10">
        <table className="w-full min-w-[520px] text-left text-xs">
          <thead className="sticky top-0 bg-zinc-900/95">
            <tr className="text-zinc-500">
              {PDF_HEADERS.map((h) => (
                <th key={h} className="px-2 py-2 font-medium">
                  {h}
                </th>
              ))}
              <th className="w-10 px-1 py-2" />
            </tr>
          </thead>
          <tbody>
            {review.rows.map((row, i) => (
              <tr key={i} className="border-t border-white/5">
                {PDF_HEADERS.map((h) => (
                  <td key={h} className="px-1 py-1">
                    <input
                      type="text"
                      value={row[h] ?? ""}
                      disabled={busy}
                      onChange={(e) => onUpdateRow(i, h, e.target.value)}
                      className="w-full min-w-0 rounded border border-white/10 bg-[#070708] px-2 py-1.5 text-zinc-200"
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
      <div className="mt-4 flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={onAddRow}
          className="rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/10 disabled:opacity-50"
        >
          Add row
        </button>
        <button
          type="button"
          disabled={busy || review.rows.length === 0}
          onClick={onConfirm}
          className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
        >
          Use these transactions
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="rounded-lg border border-white/15 px-4 py-2 text-sm text-zinc-400 hover:bg-white/5 disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function CardRankings({ ranked }) {
  const totalSpend = ranked[0]?.result.totalSpend ?? 0;
  const topFive = ranked.slice(0, 5);
  const moreCards = ranked.slice(5);
  const [openId, setOpenId] = useState(/** @type {string | null} */ (topFive[0]?.card.id ?? null));
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <section className="relative mt-10 overflow-hidden rounded-3xl border border-white/[0.08] bg-[#060607] shadow-[0_0_0_1px_rgba(255,255,255,0.03)]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_60%_at_50%_-20%,rgba(56,189,248,0.14),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_50%,rgba(168,85,247,0.06),transparent_45%)]" />

      <div className="relative px-5 pb-10 pt-8 sm:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-sky-400/25 bg-sky-500/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.22em] text-sky-300/95">
            Match engine
          </span>
          {topFive[0] && (
            <span className="text-[10px] text-zinc-500">Best fit · {topFive[0].card.issuer}</span>
          )}
        </div>
        <h2 className="font-display mt-3 text-2xl font-bold tracking-tight text-white md:text-3xl">
          Your top 5 card matches
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-zinc-500">
          Ranked by estimated net value for your spend mix. Plastic-style cards are illustrative, not an offer or
          approval. Not financial advice.
        </p>

        <ol className="mt-8 space-y-5">
          {topFive.map(({ card, result }, i) => {
            const isOpen = openId === card.id;
            const isTopPick = i === 0;
            return (
              <li key={card.id} className="list-none">
                <article
                  className={`group relative overflow-hidden rounded-2xl p-[1px] transition ${
                    isTopPick
                      ? "bg-gradient-to-br from-amber-400/40 via-sky-400/25 to-fuchsia-500/20 shadow-[0_20px_60px_-15px_rgba(56,189,248,0.25)]"
                      : "bg-gradient-to-br from-white/15 to-white/[0.02]"
                  }`}
                >
                  <div
                    className={`relative overflow-hidden rounded-[15px] ${issuerGradientClass(card.issuer)} p-5 sm:p-6`}
                  >
                    <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
                    <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-full bg-gradient-to-t from-black/20 to-transparent" />

                    <div className="absolute right-4 top-4 sm:right-5 sm:top-5">
                      <div className="flex h-10 w-12 items-center justify-center rounded-md bg-gradient-to-br from-amber-50/30 via-amber-200/15 to-amber-600/20 shadow-inner ring-1 ring-amber-100/20">
                        <div className="h-5 w-8 rounded-sm bg-gradient-to-br from-amber-100/40 to-amber-800/30" />
                      </div>
                    </div>

                    <div className="relative flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:pr-16">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex h-8 min-w-[2rem] items-center justify-center rounded-lg px-2 font-mono text-sm font-bold ${
                              i === 0
                                ? "bg-amber-400/20 text-amber-200 ring-1 ring-amber-400/40"
                                : i === 1
                                  ? "bg-zinc-400/15 text-zinc-200 ring-1 ring-zinc-400/30"
                                  : i === 2
                                    ? "bg-orange-400/15 text-orange-200 ring-1 ring-orange-400/25"
                                    : "bg-black/35 text-zinc-300 ring-1 ring-white/10"
                            }`}
                          >
                            {i + 1}
                          </span>
                          {isTopPick && (
                            <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300/95">
                              Top match
                            </span>
                          )}
                        </div>
                        <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-400">{card.issuer}</p>
                        <h3 className="font-display mt-1 text-xl font-bold leading-tight text-white sm:text-2xl">
                          {card.name}
                        </h3>
                      </div>
                      <div className="shrink-0 text-left sm:text-right">
                        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-zinc-500">Est. net / year</p>
                        <p
                          className={`mt-0.5 font-display text-3xl font-bold tabular-nums tracking-tight sm:text-4xl ${
                            result.netAnnualValue >= 0 ? "text-emerald-300" : "text-rose-400"
                          }`}
                        >
                          {formatMoney(result.netAnnualValue)}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setOpenId(isOpen ? null : card.id)}
                      className="relative mt-5 flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-black/25 py-2.5 text-sm font-medium text-zinc-200 backdrop-blur-sm transition hover:border-white/20 hover:bg-black/35"
                    >
                      {isOpen ? "Hide details" : "View earn breakdown"}
                      <span className="text-zinc-500 transition group-hover:translate-y-0.5" aria-hidden>
                        {isOpen ? "↑" : "↓"}
                      </span>
                    </button>

                    {isOpen && (
                      <div className="relative mt-5 border-t border-white/10 pt-5 text-sm">
                        <CardDetailBody card={card} result={result} />
                      </div>
                    )}
                  </div>
                </article>
              </li>
            );
          })}
        </ol>

        {moreCards.length > 0 && (
          <div className="mt-10 rounded-2xl border border-dashed border-white/12 bg-zinc-900/50 backdrop-blur-sm">
            <button
              type="button"
              onClick={() => setMoreOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-white/[0.04] sm:px-6"
            >
              <div>
                <p className="font-display text-base font-semibold text-zinc-200">More options</p>
                <p className="mt-0.5 text-xs text-zinc-500">
                  {moreCards.length} other card{moreCards.length !== 1 ? "s" : ""} ranked below your top 5
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-zinc-400">
                  {moreOpen ? "Hide" : "Show"}
                </span>
                <span
                  className={`text-zinc-500 transition ${moreOpen ? "rotate-180" : ""}`}
                  aria-hidden
                >
                  ▼
                </span>
              </div>
            </button>
            {moreOpen && (
              <ol className="space-y-2 border-t border-white/5 px-3 pb-4 pt-2 sm:px-5">
                {moreCards.map(({ card, result }, idx) => {
                  const globalIndex = 5 + idx;
                  const isOpen = openId === card.id;
                  return (
                    <li
                      key={card.id}
                      className="overflow-hidden rounded-xl border border-white/5 bg-black/25"
                    >
                      <button
                        type="button"
                        onClick={() => setOpenId(isOpen ? null : card.id)}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/[0.04]"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="font-mono text-xs text-zinc-500">#{globalIndex + 1}</span>
                          <div className="min-w-0">
                            <div className="truncate font-medium text-zinc-200">{card.name}</div>
                            <div className="truncate text-xs text-zinc-500">{card.issuer}</div>
                          </div>
                        </div>
                        <div
                          className={`shrink-0 text-right text-sm font-semibold tabular-nums ${
                            result.netAnnualValue >= 0 ? "text-emerald-400/90" : "text-rose-400/90"
                          }`}
                        >
                          {formatMoney(result.netAnnualValue)}
                        </div>
                      </button>
                      {isOpen && (
                        <div className="border-t border-white/5 px-4 py-4 text-sm text-zinc-400">
                          <CardDetailBody card={card} result={result} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}

        {totalSpend <= 0 && (
          <p className="mt-6 text-sm text-amber-200/80">No spend found. Verify amount column and sign convention.</p>
        )}
      </div>
    </section>
  );
}

export default function App() {
  const [headers, setHeaders] = useState(/** @type {string[] | null} */ (null));
  const [rows, setRows] = useState(/** @type {Record<string, string>[] | null} */ (null));
  /** Raw CSV text for Web Worker analysis (keeps main thread responsive on large files). */
  const [csvText, setCsvText] = useState(/** @type {string | null} */ (null));
  const [mapping, setMapping] = useState(() => initialMappingFromHeaders([]));
  const [error, setError] = useState(/** @type {string | null} */ (null));
  const [busy, setBusy] = useState(false);

  const [profile, setProfile] = useState(/** @type {ReturnType<typeof aggregateByCategory> | null} */ (null));
  const [ranked, setRanked] = useState(/** @type {ReturnType<typeof rankCards> | null} */ (null));
  /** Merchant key → category id; applied after rule-based categorization. */
  const [categoryOverrides, setCategoryOverrides] = useState(/** @type {Record<string, string>} */ ({}));
  const [merchantRollup, setMerchantRollup] = useState(
    /** @type {null | ReturnType<typeof computeMerchantRollup>} */ (null),
  );
  /** PDF → heuristic parse; user confirms rows before they become CSV-shaped data. */
  const [pdfReview, setPdfReview] = useState(
    /** @type {null | { rows: Record<string, string>[], stats: { lineCount: number, matched: number } }} */ (null),
  );

  const overrideCount = useMemo(() => Object.keys(categoryOverrides).length, [categoryOverrides]);

  const loadCsv = useCallback((text) => {
    setError(null);
    setProfile(null);
    setRanked(null);
    setMerchantRollup(null);
    setCategoryOverrides({});
    setPdfReview(null);
    try {
      const { headers: h, rows: r } = parseCsvText(text);
      if (!h.length) throw new Error("No header row found.");
      setCsvText(text);
      setHeaders(h);
      setRows(r);
      setMapping(initialMappingFromHeaders(h));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not parse CSV.");
      setCsvText(null);
      setHeaders(null);
      setRows(null);
    }
  }, []);

  const handleCsvFile = useCallback(
    async (/** @type {File} */ file) => {
      setBusy(true);
      try {
        const text = await file.text();
        loadCsv(text);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not read file.");
        setCsvText(null);
        setHeaders(null);
        setRows(null);
      } finally {
        setBusy(false);
      }
    },
    [loadCsv],
  );

  const handlePdfFile = useCallback(async (/** @type {File} */ file) => {
    setBusy(true);
    setError(null);
    try {
      const [{ extractPdfText }, { parseStatementText }] = await Promise.all([
        import("./lib/pdfExtract.js"),
        import("./lib/statementParse.js"),
      ]);
      const buf = await file.arrayBuffer();
      const text = await extractPdfText(buf);
      const { rows, stats } = parseStatementText(text);
      if (rows.length === 0) {
        setError(
          "No transaction-like lines found in this PDF. Issuer layouts differ; try a CSV export, or another statement.",
        );
        return;
      }
      setPdfReview({ rows, stats });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read PDF.");
    } finally {
      setBusy(false);
    }
  }, []);

  const handleFile = useCallback(
    async (/** @type {File | undefined} */ file) => {
      if (!file) return;
      if (file.name.toLowerCase().endsWith(".pdf")) await handlePdfFile(file);
      else await handleCsvFile(file);
    },
    [handleCsvFile, handlePdfFile],
  );

  const updatePdfRow = useCallback((index, field, value) => {
    setPdfReview((prev) => {
      if (!prev) return prev;
      const rows = prev.rows.map((r, i) => (i === index ? { ...r, [field]: value } : r));
      return { ...prev, rows };
    });
  }, []);

  const deletePdfRow = useCallback((index) => {
    setPdfReview((prev) => {
      if (!prev) return prev;
      const rows = prev.rows.filter((_, i) => i !== index);
      return { ...prev, rows };
    });
  }, []);

  const addPdfRow = useCallback(() => {
    setPdfReview((prev) => {
      const empty = { "Transaction Date": "", Description: "", Amount: "" };
      if (!prev) return { rows: [empty], stats: { lineCount: 0, matched: 0 } };
      return { ...prev, rows: [...prev.rows, empty] };
    });
  }, []);

  const confirmPdfRows = useCallback(() => {
    if (!pdfReview || pdfReview.rows.length === 0) return;
    const csv = Papa.unparse(pdfReview.rows, { columns: PDF_HEADERS });
    loadCsv(csv);
  }, [pdfReview, loadCsv]);

  const cancelPdfReview = useCallback(() => {
    setPdfReview(null);
  }, []);

  const loadSample = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const base = import.meta.env.BASE_URL || "/";
      const res = await fetch(`${base}sample-transactions.csv`);
      if (!res.ok) throw new Error("Sample file not found.");
      const text = await res.text();
      loadCsv(text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load sample.");
    } finally {
      setBusy(false);
    }
  }, [loadCsv]);

  const runAnalysis = useCallback(
    async (/** @type {Record<string, string> | undefined} */ overridesArg) => {
      if (!rows || !mapping.description) {
        setError("Select a description column.");
        return;
      }
      if (mapping.mode === "amount" && !mapping.amountCol) {
        setError("Select an amount column.");
        return;
      }
      if (mapping.mode === "split" && (!mapping.debitCol || !mapping.creditCol)) {
        setError("Select both Debit and Credit columns.");
        return;
      }

      const overrides = overridesArg !== undefined ? overridesArg : categoryOverrides;

      setError(null);
      setBusy(true);
      const rm = toRowMapping(mapping);

      try {
        if (csvText) {
          const worker = new AnalysisWorker();
          await new Promise((resolve, reject) => {
            const t = window.setTimeout(() => {
              worker.terminate();
              reject(new Error("Analysis timed out."));
            }, 120000);
            worker.onmessage = (ev) => {
              window.clearTimeout(t);
              worker.terminate();
              const d = ev.data;
              if (d.ok) {
                setProfile(d.profile);
                setRanked(d.ranked);
                setMerchantRollup(d.merchantRollup ?? []);
                resolve(undefined);
              } else {
                reject(new Error(d.error || "Worker failed."));
              }
            };
            worker.onerror = (ev) => {
              window.clearTimeout(t);
              worker.terminate();
              reject(ev.error ?? new Error("Worker error."));
            };
            worker.postMessage({ csvText, rowMapping: rm, overrides });
          });
        } else {
          const raw = rowsToTransactions(rows, rm);
          const txs = buildTransactions(raw, overrides);
          const agg = aggregateByCategory(txs);
          const list = rankCards(agg.byCategory, agg.totalSpend);
          const rollup = computeMerchantRollup(txs);
          setProfile(agg);
          setRanked(list);
          setMerchantRollup(rollup);
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Analysis failed.");
      } finally {
        setBusy(false);
      }
    },
    [rows, mapping, csvText, categoryOverrides],
  );

  const onMerchantCategory = useCallback(
    async (key, cat) => {
      const next = { ...categoryOverrides, [key]: cat };
      setCategoryOverrides(next);
      await runAnalysis(next);
    },
    [categoryOverrides, runAnalysis],
  );

  const onClearMerchantOverride = useCallback(
    async (key) => {
      const next = { ...categoryOverrides };
      delete next[key];
      setCategoryOverrides(next);
      await runAnalysis(next);
    },
    [categoryOverrides, runAnalysis],
  );

  const reset = useCallback(() => {
    setHeaders(null);
    setRows(null);
    setCsvText(null);
    setProfile(null);
    setRanked(null);
    setMerchantRollup(null);
    setCategoryOverrides({});
    setPdfReview(null);
    setError(null);
    setMapping(initialMappingFromHeaders([]));
  }, []);

  const exportSummaryJson = useCallback(() => {
    if (!profile || !ranked) return;
    const top = ranked.slice(0, 5).map(({ card, result }) => ({
      card: `${card.issuer} ${card.name}`,
      netAnnualValue: result.netAnnualValue,
      feeBreakEven: result.feeBreakEven,
    }));
    const payload = {
      schemaVersion: 2,
      exportedAt: new Date().toISOString(),
      transactionCount: profile.count,
      totalSpend: profile.totalSpend,
      spendByCategory: profile.byCategory,
      merchantOverrideCount: overrideCount,
      topCardsEstimated: top,
      disclaimer: "Educational estimate only; not financial advice.",
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "card-fit-profile-summary.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }, [profile, ranked, overrideCount]);

  const showResults = profile && ranked;

  return (
    <div className="min-h-screen bg-[#050506]">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(52,211,153,0.08),transparent)]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_40%_at_80%_20%,rgba(59,130,246,0.06),transparent)]" />

      <header className="relative border-b border-white/5 px-6 py-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-emerald-400/90">Payments · Phase 4</p>
        <h1 className="font-display mt-2 text-3xl font-bold tracking-tight text-white md:text-4xl">Card Fit</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400 md:text-base">
          Upload a CSV or a statement PDF (text extracted in your browser). Fix extracted rows, map columns, then get
          categories, fee break-even hints, and ranked cards, all locally.
        </p>
      </header>

      <main className="relative mx-auto max-w-3xl px-6 pb-24 pt-8">
        {!showResults && (
          <section className="space-y-6">
            {!pdfReview && (
              <div
                className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/20 bg-zinc-900/30 px-6 py-14 text-center"
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) void handleFile(f);
                }}
              >
                <p className="text-sm text-zinc-400">Drop a CSV or PDF statement, or choose a file</p>
                <label className="mt-4 cursor-pointer rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500">
                  Choose CSV or PDF
                  <input
                    type="file"
                    accept=".csv,.pdf,text/csv,application/pdf"
                    className="sr-only"
                    disabled={busy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleFile(f);
                      e.target.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={loadSample}
                  disabled={busy}
                  className="mt-3 text-sm text-zinc-500 underline decoration-zinc-600 underline-offset-2 hover:text-zinc-300"
                >
                  Load sample data
                </button>
              </div>
            )}

            {busy && !pdfReview && <p className="text-center text-sm text-zinc-500">Working…</p>}
            {error && (
              <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </p>
            )}

            {pdfReview && (
              <PdfReviewPanel
                review={pdfReview}
                busy={busy}
                onUpdateRow={updatePdfRow}
                onDeleteRow={deletePdfRow}
                onAddRow={addPdfRow}
                onConfirm={() => confirmPdfRows()}
                onCancel={cancelPdfReview}
              />
            )}

            {headers && rows && (
              <>
                <ColumnMappingForm
                  headers={headers}
                  mapping={mapping}
                  setMapping={setMapping}
                  disabled={busy}
                />
                <div className="overflow-x-auto rounded-lg border border-white/10">
                  <table className="w-full min-w-[480px] text-left text-xs text-zinc-400">
                    <thead>
                      <tr className="border-b border-white/10">
                        {headers.map((h) => (
                          <th key={h} className="px-3 py-2 font-medium text-zinc-300">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.slice(0, 6).map((row, i) => (
                        <tr key={i} className="border-b border-white/5">
                          {headers.map((h) => (
                            <td key={h} className="max-w-[200px] truncate px-3 py-2">
                              {row[h] ?? ""}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="border-t border-white/5 px-3 py-2 text-[10px] text-zinc-500">
                    Preview: first 6 rows · {rows.length} total
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void runAnalysis()}
                  disabled={busy}
                  className="w-full rounded-xl bg-emerald-600 py-3 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:opacity-50"
                >
                  {busy ? "Analyzing…" : "Analyze spending & rank cards"}
                </button>
              </>
            )}
          </section>
        )}

        {showResults && profile && ranked && (
          <div className="space-y-10">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={reset}
                className="text-sm text-zinc-400 underline decoration-zinc-600 underline-offset-2 hover:text-white"
              >
                ← Upload a different file
              </button>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={exportSummaryJson}
                  className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/10"
                >
                  Export summary JSON
                </button>
                <span className="text-xs text-zinc-500">{profile.count} transactions</span>
              </div>
            </div>
            <SpendingProfile
              byCategory={profile.byCategory}
              totalSpend={profile.totalSpend}
              overrideCount={overrideCount}
            />
            <MerchantOverrides
              rollup={merchantRollup ?? []}
              busy={busy}
              overrides={categoryOverrides}
              onChangeCategory={onMerchantCategory}
              onClearOverride={onClearMerchantOverride}
              overrideCount={overrideCount}
            />
            <CardRankings ranked={ranked} />
          </div>
        )}

        <section className="mt-16 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-5">
          <h2 className="font-display text-sm font-semibold text-amber-200/90">Disclaimer</h2>
          <p className="mt-2 text-sm leading-relaxed text-zinc-400">
            Card terms change; modeled rates are approximate.             Fee break-even numbers are single-category illustrations,
            not a guarantee of approval or optimal strategy. PDF parsing is heuristic and varies by issuer; prefer CSV when
            possible. Sign-up bonuses, credits, and eligibility are not modeled. Not financial advice.
          </p>
        </section>
      </main>
    </div>
  );
}
