"use client";

export function HowItWorks() {
  return (
    <details className="group mb-8 rounded-xl border border-[var(--border)] bg-[var(--surface)]/80 px-4 py-3 sm:px-5">
      <summary className="cursor-pointer list-none text-sm font-medium text-zinc-200 marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="inline-flex items-center gap-2">
          <span className="text-[var(--accent)]" aria-hidden>
            ●
          </span>
          How this tool works{" "}
          <span className="font-normal text-[var(--muted)]">(click to expand)</span>
        </span>
      </summary>
      <ol className="mt-4 space-y-3 border-t border-[var(--border)] pt-4 text-sm leading-relaxed text-[var(--muted)]">
        <li className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/15 text-xs font-semibold text-fuchsia-300">
            1
          </span>
          <span>
            <strong className="text-zinc-200">Add purchases</strong> — upload a spreadsheet, load the sample, or type one row at a time. Each row is a store name, amount, and a spending category (or we guess the category from the store name).
          </span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/15 text-xs font-semibold text-fuchsia-300">
            2
          </span>
          <span>
            <strong className="text-zinc-200">We compare cards</strong> — for each purchase, the app checks how much cash-back each of your cards would earn on that category (for example, 3% on travel). It picks the winning card for that row.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-fuchsia-500/15 text-xs font-semibold text-fuchsia-300">
            3
          </span>
          <span>
            <strong className="text-zinc-200">You see results</strong> — a per-row recommendation and totals at the bottom. Numbers are educational estimates, not bank advice. Sign in if you want your list and custom cards saved online.
          </span>
        </li>
      </ol>
    </details>
  );
}
