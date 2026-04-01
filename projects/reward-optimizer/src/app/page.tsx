"use client";

import { useCallback, useMemo, useState } from "react";
import { parseTransactionsCsv } from "@/lib/csv";
import type { OptimizeResponse, TransactionInput } from "@/lib/types";

const emptyForm = { date: "", merchant: "", category: "groceries", amount: "" };

const CATEGORIES = ["groceries", "travel", "dining", "gas", "entertainment", "other"];

export default function Home() {
  const [transactions, setTransactions] = useState<TransactionInput[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runOptimize = useCallback(async (rows: TransactionInput[]) => {
    if (rows.length === 0) {
      setResult(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactions: rows }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Request failed");
        setResult(null);
        return;
      }
      setResult(data as OptimizeResponse);
    } catch {
      setError("Network error");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const rows = parseTransactionsCsv(text);
      setTransactions(rows);
      await runOptimize(rows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not parse CSV");
      setResult(null);
    }
    e.target.value = "";
  };

  const loadSample = async () => {
    try {
      const res = await fetch("/sample-transactions.csv");
      const text = await res.text();
      const rows = parseTransactionsCsv(text);
      setTransactions(rows);
      await runOptimize(rows);
      setError(null);
    } catch {
      setError("Could not load sample CSV");
    }
  };

  const addManual = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const amount = Number.parseFloat(form.amount);
    if (!form.date.trim() || !form.merchant.trim() || !form.category.trim() || Number.isNaN(amount)) {
      setError("Fill date, merchant, category, and a numeric amount.");
      return;
    }
    const row: TransactionInput = {
      date: form.date.trim(),
      merchant: form.merchant.trim(),
      category: form.category.trim(),
      amount,
    };
    const next = [...transactions, row];
    setTransactions(next);
    setForm(emptyForm);
    await runOptimize(next);
    setError(null);
  };

  const clearAll = () => {
    setTransactions([]);
    setResult(null);
    setError(null);
  };

  const recRows = result?.recommendations ?? [];
  const totals = useMemo(() => result?.totalsByCard ?? {}, [result]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-10 border-b border-[var(--border)] pb-8">
        <p className="text-sm font-medium text-[var(--accent)]">Card Fit add-on</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
          Credit Card Reward Optimizer
        </h1>
        <p className="mt-3 max-w-2xl text-[var(--muted)]">
          Upload a CSV or add transactions manually. The server scores each row against hardcoded
          category rates and picks the card that maximizes reward (amount × rate). No accounts or
          persistence in this MVP.
        </p>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-lg font-medium text-white">Data</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            CSV columns: <code className="text-[var(--accent)]">date, merchant, category, amount</code>
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <label className="cursor-pointer rounded-lg bg-[var(--accent-dim)] px-4 py-2 text-sm font-medium text-white transition hover:opacity-90">
              Upload CSV
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={onFile} />
            </label>
            <button
              type="button"
              onClick={loadSample}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--foreground)] hover:bg-white/5"
            >
              Load sample CSV
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="rounded-lg px-4 py-2 text-sm text-[var(--muted)] hover:text-white"
            >
              Clear all
            </button>
          </div>

          <form onSubmit={addManual} className="mt-6 space-y-3">
            <p className="text-sm font-medium text-white">Add one transaction</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                placeholder="Date (e.g. 2025-03-01)"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              />
              <input
                className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                placeholder="Merchant"
                value={form.merchant}
                onChange={(e) => setForm((f) => ({ ...f, merchant: e.target.value }))}
              />
              <select
                className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <input
                className="rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                placeholder="Amount"
                inputMode="decimal"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              />
            </div>
            <button
              type="submit"
              className="rounded-lg bg-[var(--accent-dim)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
            >
              Add &amp; optimize
            </button>
          </form>
        </div>

        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-lg font-medium text-white">Summary</h2>
          {loading && <p className="mt-3 text-sm text-[var(--muted)]">Running optimizer…</p>}
          {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
          {!loading && !error && Object.keys(totals).length === 0 && (
            <p className="mt-3 text-sm text-[var(--muted)]">Add transactions to see total rewards per card.</p>
          )}
          {Object.keys(totals).length > 0 && (
            <ul className="mt-4 space-y-2">
              {Object.entries(totals)
                .sort((a, b) => b[1] - a[1])
                .map(([card, dollars]) => (
                  <li
                    key={card}
                    className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
                  >
                    <span className="text-white">{card}</span>
                    <span className="font-mono text-[var(--accent)]">${dollars.toFixed(2)}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </section>

      <section className="mt-10 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-[var(--muted)]">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Merchant</th>
              <th className="px-4 py-3 font-medium">Category</th>
              <th className="px-4 py-3 font-medium text-right">Amount</th>
              <th className="px-4 py-3 font-medium">Best card</th>
              <th className="px-4 py-3 font-medium text-right">Rate %</th>
              <th className="px-4 py-3 font-medium text-right">Reward</th>
            </tr>
          </thead>
          <tbody>
            {recRows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--muted)]">
                  No rows yet. Upload a CSV or add a transaction.
                </td>
              </tr>
            )}
            {recRows.map((r, i) => (
              <tr key={`${r.date}-${r.merchant}-${i}`} className="border-b border-[var(--border)]/60">
                <td className="px-4 py-3 text-[var(--foreground)]">{r.date}</td>
                <td className="px-4 py-3 text-white">{r.merchant}</td>
                <td className="px-4 py-3 capitalize text-[var(--muted)]">{r.category}</td>
                <td className="px-4 py-3 text-right font-mono">${r.amount.toFixed(2)}</td>
                <td className="px-4 py-3 text-[var(--accent)]">{r.bestCard}</td>
                <td className="px-4 py-3 text-right font-mono text-[var(--muted)]">{r.ratePercent}%</td>
                <td className="px-4 py-3 text-right font-mono text-white">${r.rewardDollars.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="mt-12 text-center text-xs text-[var(--muted)]">
        Companion to Card Fit — rates are illustrative; deploy the app to Vercel for the API route.
      </footer>
    </div>
  );
}
