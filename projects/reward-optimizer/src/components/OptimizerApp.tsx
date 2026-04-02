"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getFirestoreDb } from "@/lib/firebase/client";
import { applyCategoryRules } from "@/lib/categorize";
import { parseTransactionsCsv } from "@/lib/csv";
import {
  addCardDoc,
  addTransactionRemote,
  cardPayload,
  clearTransactionsRemote,
  deleteCardDoc,
  deleteTransactionRemote,
  replaceAllTransactions,
  seedDefaultCardsIfEmpty,
  setCardDoc,
  subscribeCards,
  subscribeTransactions,
  type StoredCard,
  type StoredTransaction,
} from "@/lib/firestore/userData";
import type { CardRates, OptimizeResponse, TransactionInput } from "@/lib/types";
import { useAuth } from "@/contexts/AuthContext";
import { AuthBar } from "@/components/AuthBar";
import { CardManager } from "@/components/CardManager";

const emptyForm = { date: "", merchant: "", category: "groceries", amount: "" };
const CATEGORIES = ["groceries", "travel", "dining", "gas", "entertainment", "other", "auto"];

function toTransactionInput(tx: StoredTransaction): TransactionInput {
  return {
    date: tx.date,
    merchant: tx.merchant,
    category: tx.category,
    amount: tx.amount,
  };
}

function toCardRates(c: StoredCard): CardRates {
  return cardPayload(c) as CardRates;
}

export function OptimizerApp() {
  const { user, loading: authLoading, firebaseReady } = useAuth();
  const db = typeof window !== "undefined" ? getFirestoreDb() : null;

  const [localTx, setLocalTx] = useState<TransactionInput[]>([]);
  const [remoteTx, setRemoteTx] = useState<StoredTransaction[]>([]);
  const [remoteCards, setRemoteCards] = useState<StoredCard[]>([]);
  const [result, setResult] = useState<OptimizeResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const transactionsForOptimize: TransactionInput[] = useMemo(() => {
    if (user) {
      return remoteTx.map(toTransactionInput);
    }
    return localTx;
  }, [user, remoteTx, localTx]);

  useEffect(() => {
    if (!user || !db) {
      setRemoteTx([]);
      setRemoteCards([]);
      return;
    }

    let cancelled = false;
    let unsubCards: (() => void) | undefined;
    let unsubTx: (() => void) | undefined;

    (async () => {
      try {
        await seedDefaultCardsIfEmpty(db, user.uid);
        if (cancelled) return;
        unsubCards = subscribeCards(
          db,
          user.uid,
          (cards) => {
            if (!cancelled) setRemoteCards(cards);
          },
          (e) => setSyncError(e.message),
        );
        unsubTx = subscribeTransactions(
          db,
          user.uid,
          (rows) => {
            if (!cancelled) setRemoteTx(rows);
          },
          (e) => setSyncError(e.message),
        );
      } catch (e) {
        if (!cancelled) {
          setSyncError(e instanceof Error ? e.message : "Sync setup failed");
        }
      }
    })();

    return () => {
      cancelled = true;
      unsubCards?.();
      unsubTx?.();
    };
  }, [user, db]);

  useEffect(() => {
    const rows = transactionsForOptimize;
    if (rows.length === 0) {
      setResult(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const body: { transactions: TransactionInput[]; cards?: CardRates[] } = { transactions: rows };
        if (user && remoteCards.length > 0) {
          body.cards = remoteCards.map(toCardRates);
        }
        const res = await fetch("/api/optimize", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok) {
          if (!cancelled) {
            setError(data.error ?? "Request failed");
            setResult(null);
          }
          return;
        }
        if (!cancelled) setResult(data as OptimizeResponse);
      } catch {
        if (!cancelled) {
          setError("Network error");
          setResult(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, transactionsForOptimize, remoteCards]);

  const [form, setForm] = useState(emptyForm);

  const processRows = useCallback((rows: TransactionInput[]) => applyCategoryRules(rows), []);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      let rows = parseTransactionsCsv(text);
      rows = processRows(rows);
      if (user && db) {
        await replaceAllTransactions(db, user.uid, rows);
      } else {
        setLocalTx(rows);
      }
      setError(null);
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
      let rows = parseTransactionsCsv(text);
      rows = processRows(rows);
      if (user && db) {
        await replaceAllTransactions(db, user.uid, rows);
      } else {
        setLocalTx(rows);
      }
      setError(null);
    } catch {
      setError("Could not load sample CSV");
    }
  };

  const addManual = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const amount = Number.parseFloat(form.amount);
    if (!form.date.trim() || !form.merchant.trim() || Number.isNaN(amount)) {
      setError("Fill date, merchant, and a numeric amount.");
      return;
    }
    const row = applyCategoryRules([
      {
        date: form.date.trim(),
        merchant: form.merchant.trim(),
        category: form.category === "auto" ? "auto" : form.category.trim(),
        amount,
      },
    ])[0];
    if (user && db) {
      await addTransactionRemote(db, user.uid, row);
    } else {
      setLocalTx((prev) => [...prev, row]);
    }
    setForm(emptyForm);
    setError(null);
  };

  const clearAll = async () => {
    if (user && db) {
      await clearTransactionsRemote(db, user.uid);
    } else {
      setLocalTx([]);
    }
    setResult(null);
    setError(null);
  };

  const deleteRow = async (index: number) => {
    if (user && db && remoteTx[index]) {
      await deleteTransactionRemote(db, user.uid, remoteTx[index].id);
    } else {
      setLocalTx((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleSaveCard = async (card: StoredCard) => {
    if (!user || !db) return;
    await setCardDoc(db, user.uid, card);
  };

  const handleAddCard = async (card: CardRates) => {
    if (!user || !db) return;
    await addCardDoc(db, user.uid, card);
  };

  const handleDeleteCard = async (id: string) => {
    if (!user || !db) return;
    await deleteCardDoc(db, user.uid, id);
  };

  const recRows = result?.recommendations ?? [];
  const totals = useMemo(() => result?.totalsByCard ?? {}, [result]);

  const showCardManager = Boolean(user && db && firebaseReady);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-8 border-b border-[var(--border)] pb-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--accent)]">Card Fit add-on</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Credit Card Reward Optimizer
            </h1>
            <p className="mt-3 max-w-2xl text-[var(--muted)]">
              Upload a CSV or add transactions. The server picks the highest reward per row (amount × rate).
              Sign in with Google to save transactions and custom cards in Firestore.
            </p>
          </div>
          <div className="shrink-0">{authLoading ? null : <AuthBar />}</div>
        </div>
        {syncError && (
          <p className="mt-4 text-sm text-red-400" role="alert">
            Sync: {syncError}
          </p>
        )}
      </header>

      {showCardManager && (
        <div className="mb-8">
          <CardManager
            cards={remoteCards}
            onSave={handleSaveCard}
            onAdd={handleAddCard}
            onDelete={handleDeleteCard}
            disabled={!user}
          />
        </div>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <h2 className="text-lg font-medium text-white">Data</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            CSV: <code className="text-[var(--accent)]">date, merchant, amount</code> — category optional; use{" "}
            <code className="text-[var(--accent)]">auto</code> or leave blank to infer from merchant.
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
                    {c === "auto" ? "auto (infer)" : c}
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
              <th className="px-4 py-3 font-medium w-24"> </th>
            </tr>
          </thead>
          <tbody>
            {recRows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[var(--muted)]">
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
                <td className="px-4 py-3">
                  {(user ? remoteTx.length : localTx.length) > 0 && (
                    <button
                      type="button"
                      onClick={() => deleteRow(i)}
                      className="text-xs text-red-400/90 hover:text-red-300"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <footer className="mt-12 text-center text-xs text-[var(--muted)]">
        Phase 2: Firebase Auth + Firestore. Rates are illustrative. Plaid integration is not included yet.
      </footer>
    </div>
  );
}
