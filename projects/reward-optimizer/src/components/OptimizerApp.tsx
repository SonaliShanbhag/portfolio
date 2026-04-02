"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getFirestoreDb } from "@/lib/firebase/client";
import { applyCategoryRules } from "@/lib/categorize";
import { parseTransactionsCsv } from "@/lib/csv";
import {
  addCardDoc,
  addTransactionRemote,
  cardPayload,
  clearTransactionsRemote,
  deleteAllCardsRemote,
  deleteCardDoc,
  deleteTransactionRemote,
  replaceAllTransactions,
  seedDefaultCardsIfEmpty,
  seedPresetCardsIntoEmptyWallet,
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
import { GuestCardsHint } from "@/components/GuestCardsHint";
import { HowItWorks } from "@/components/HowItWorks";
import { Phase3Panel } from "@/components/Phase3Panel";
import { StatementPdfReview } from "@/components/StatementPdfReview";
import { statementRowsToTransactions } from "@/lib/pdfImport";
import type { StatementPdfRow } from "@/lib/statementParse";

const emptyForm = { date: "", merchant: "", category: "groceries", amount: "" };
const CATEGORIES = [
  "groceries",
  "travel",
  "dining",
  "gas",
  "entertainment",
  "online",
  "airline",
  "hotel",
  "other",
  "auto",
];

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
  const [pdfReview, setPdfReview] = useState<{
    rows: StatementPdfRow[];
    stats: { lineCount: number; matched: number };
  } | null>(null);
  const [statementBusy, setStatementBusy] = useState(false);
  const [pdfConfirmBusy, setPdfConfirmBusy] = useState(false);
  const [step3TableOpen, setStep3TableOpen] = useState(true);
  const statementPdfReviewRef = useRef<HTMLDivElement>(null);
  const step2RewardsRef = useRef<HTMLDivElement>(null);

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
    if (user && remoteCards.length === 0) {
      setResult(null);
      setLoading(false);
      return;
    }
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

  const processRows = useCallback((rows: TransactionInput[]) => {
    const nonZero = rows.filter((r) => Number.isFinite(r.amount) && Math.abs(r.amount) > 0);
    return applyCategoryRules(nonZero);
  }, []);

  useEffect(() => {
    if (pdfReview) {
      requestAnimationFrame(() => {
        statementPdfReviewRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      });
    }
  }, [pdfReview]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".pdf")) {
      setStatementBusy(true);
      setError(null);
      setPdfReview(null);
      try {
        const [{ extractPdfText }, { parseStatementText }] = await Promise.all([
          import("@/lib/pdfExtract"),
          import("@/lib/statementParse"),
        ]);
        const buf = await file.arrayBuffer();
        const text = await extractPdfText(buf);
        const parsed = parseStatementText(text);
        if (parsed.rows.length === 0) {
          setError(
            "No transaction-like lines found in this PDF. Issuer layouts differ — try a CSV export, fix text in a desktop PDF reader, or another statement.",
          );
          setResult(null);
          return;
        }
        setPdfReview(parsed);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not read PDF");
        setResult(null);
      } finally {
        setStatementBusy(false);
      }
      e.target.value = "";
      return;
    }

    try {
      const text = await file.text();
      let rows = parseTransactionsCsv(text);
      rows = processRows(rows);
      if (rows.length === 0) {
        setError("No transactions with a non-zero amount. Check your CSV.");
        setResult(null);
        e.target.value = "";
        return;
      }
      if (user && db) {
        await replaceAllTransactions(db, user.uid, rows);
      } else {
        setLocalTx(rows);
      }
      setError(null);
      requestAnimationFrame(() => {
        step2RewardsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not parse CSV");
      setResult(null);
    }
    e.target.value = "";
  };

  const updatePdfRow = (index: number, field: keyof StatementPdfRow, value: string) => {
    setPdfReview((prev) => {
      if (!prev) return prev;
      const rows = prev.rows.map((r, i) => (i === index ? { ...r, [field]: value } : r));
      return { ...prev, rows };
    });
  };

  const deletePdfRow = (index: number) => {
    setPdfReview((prev) => {
      if (!prev) return prev;
      return { ...prev, rows: prev.rows.filter((_, i) => i !== index) };
    });
  };

  const addPdfRow = () => {
    const empty: StatementPdfRow = {
      "Transaction Date": "",
      Description: "",
      Amount: "",
    };
    setPdfReview((prev) => {
      if (!prev) return { rows: [empty], stats: { lineCount: 0, matched: 0 } };
      return { ...prev, rows: [...prev.rows, empty] };
    });
  };

  const confirmPdfRows = async () => {
    if (!pdfReview || pdfReview.rows.length === 0) return;
    setPdfConfirmBusy(true);
    setError(null);
    try {
      let txs = statementRowsToTransactions(pdfReview.rows);
      txs = processRows(txs);
      if (txs.length === 0) {
        setError("No valid rows to import. Check dates, merchants, and amounts.");
        return;
      }
      if (user && db) {
        await replaceAllTransactions(db, user.uid, txs);
      } else {
        setLocalTx(txs);
      }
      setPdfReview(null);
      requestAnimationFrame(() => {
        step2RewardsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save transactions");
    } finally {
      setPdfConfirmBusy(false);
    }
  };

  const cancelPdfReview = () => {
    setPdfReview(null);
  };

  const loadSample = async () => {
    try {
      const res = await fetch("/sample-transactions.csv");
      const text = await res.text();
      let rows = parseTransactionsCsv(text);
      rows = processRows(rows);
      if (rows.length === 0) {
        setError("Sample had no non-zero rows.");
        return;
      }
      if (user && db) {
        await replaceAllTransactions(db, user.uid, rows);
      } else {
        setLocalTx(rows);
      }
      setError(null);
      requestAnimationFrame(() => {
        step2RewardsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
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
    if (amount <= 0) {
      setError("Enter an amount greater than zero.");
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

  const handleDeleteAllCards = async () => {
    if (!user || !db) return;
    await deleteAllCardsRemote(db, user.uid);
  };

  const handleRestoreExampleCards = async () => {
    if (!user || !db) return;
    await seedPresetCardsIntoEmptyWallet(db, user.uid);
  };

  const recRows = result?.recommendations ?? [];
  const totals = useMemo(() => result?.totalsByCard ?? {}, [result]);

  const showCardManager = Boolean(user && db && firebaseReady);
  const showGuestCardsHint = Boolean(firebaseReady && !user && !authLoading);
  /** Signed-in users need at least one wallet card before Steps 1–3 apply; guests use built-in defaults. */
  const walletReady = !user || remoteCards.length > 0;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <header className="mb-6 border-b border-[var(--border)] pb-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--accent)]">Card Fit add-on</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Credit Card Reward Optimizer
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--muted)]">
              See which card pays you the most for each purchase you enter. Works in the browser — no bank linking. Use
              sample data to explore, or add your own spending. Estimates only, not financial advice.
            </p>
          </div>
          <div className="no-print shrink-0 lg:pt-1">{authLoading ? null : <AuthBar />}</div>
        </div>
        {syncError && (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {syncError}
          </p>
        )}
      </header>

      <div className="no-print">
        <HowItWorks />
      </div>

      {showCardManager && (
        <div className="no-print mb-8">
          <CardManager
            cards={remoteCards}
            onSave={handleSaveCard}
            onAdd={handleAddCard}
            onDelete={handleDeleteCard}
            onDeleteAll={handleDeleteAllCards}
            onRestoreExamples={handleRestoreExampleCards}
            disabled={!user}
          />
        </div>
      )}

      {showGuestCardsHint && (
        <div className="no-print">
          <GuestCardsHint />
        </div>
      )}

      <div className="relative">
        {!walletReady && (
          <div
            className="pointer-events-auto absolute inset-0 z-10 flex items-start justify-center rounded-xl bg-zinc-950/55 pt-12 backdrop-blur-[2px] sm:pt-16"
            role="region"
            aria-label="Add cards to continue"
          >
            <div className="mx-4 max-w-md rounded-xl border border-amber-500/35 bg-zinc-900/95 px-5 py-4 text-center shadow-lg">
              <p className="text-sm font-semibold text-amber-100/95">Add reward cards first</p>
              <p className="mt-2 text-xs leading-relaxed text-zinc-400">
                Use <strong className="text-zinc-300">Add card</strong> in Your wallet above to pick a template or enter
                rates manually. Spending and results stay disabled until at least one card is in your wallet.
              </p>
            </div>
          </div>
        )}
        <div
          className={walletReady ? "" : "pointer-events-none select-none opacity-[0.38]"}
          aria-hidden={!walletReady}
        >
      <section className="grid gap-6 lg:grid-cols-2" aria-labelledby="spending-heading">
        <div className="no-print rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
          <p className="text-xs font-medium uppercase tracking-wider text-fuchsia-400/80">Step 1</p>
          <h2 id="spending-heading" className="mt-1 text-lg font-medium text-white">
            Add your spending
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            Each row is one purchase. Load a CSV from your bank or spreadsheet, a credit card statement PDF (parsed in your
            browser — like Card Fit — layouts vary; CSV exports are usually more reliable), try our sample list, or fill
            the form below. CSVs need <strong className="text-zinc-400">date</strong>,{" "}
            <strong className="text-zinc-400">amount</strong>, and a merchant column (
            <strong className="text-zinc-400">merchant</strong> or <strong className="text-zinc-400">merchant_name</strong>
            ). If your export includes <strong className="text-zinc-400">mcc_code</strong>,{" "}
            <strong className="text-zinc-400">category</strong>/<strong className="text-zinc-400">subcategory</strong>, or{" "}
            <strong className="text-zinc-400">raw_description</strong>, we use them for better categorization. Otherwise
            choose &quot;auto&quot; or leave category blank and we infer from text.
          </p>
          {statementBusy && (
            <p className="mt-3 text-xs text-sky-400/90" aria-live="polite">
              Reading PDF…
            </p>
          )}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label
              className={`cursor-pointer rounded-lg bg-[var(--accent-dim)] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 ${statementBusy ? "pointer-events-none opacity-60" : ""}`}
            >
              Choose CSV or statement PDF
              <input
                type="file"
                accept=".csv,.pdf,text/csv,application/pdf"
                className="sr-only"
                disabled={statementBusy}
                onChange={onFile}
                aria-label="Upload CSV file or credit card statement PDF with transactions"
              />
            </label>
            <button
              type="button"
              onClick={loadSample}
              className="rounded-lg border border-[var(--border)] px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-white/5"
            >
              Try sample data
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="rounded-lg px-4 py-2.5 text-sm text-[var(--muted)] hover:text-white"
            >
              Clear list
            </button>
          </div>

          {pdfReview && (
            <div id="statement-pdf-review" ref={statementPdfReviewRef} className="no-print mt-6 scroll-mt-28">
              <StatementPdfReview
                review={pdfReview}
                busy={statementBusy || pdfConfirmBusy}
                onUpdateRow={updatePdfRow}
                onDeleteRow={deletePdfRow}
                onAddRow={addPdfRow}
                onConfirm={confirmPdfRows}
                onCancel={cancelPdfReview}
              />
            </div>
          )}

          <form onSubmit={addManual} className="mt-8 space-y-4 border-t border-[var(--border)] pt-6">
            <h3 className="text-sm font-medium text-white">Or add a single purchase</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="tx-date" className="mb-1 block text-xs font-medium text-zinc-400">
                  Date
                </label>
                <input
                  id="tx-date"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  placeholder="e.g. 2025-03-01"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="tx-merchant" className="mb-1 block text-xs font-medium text-zinc-400">
                  Store or merchant
                </label>
                <input
                  id="tx-merchant"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  placeholder="e.g. Whole Foods"
                  value={form.merchant}
                  onChange={(e) => setForm((f) => ({ ...f, merchant: e.target.value }))}
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="tx-category" className="mb-1 block text-xs font-medium text-zinc-400">
                  Category
                </label>
                <select
                  id="tx-category"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c === "auto" ? "Guess from store name" : c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="tx-amount" className="mb-1 block text-xs font-medium text-zinc-400">
                  Amount ($)
                </label>
                <input
                  id="tx-amount"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  placeholder="0.00"
                  inputMode="decimal"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                />
              </div>
            </div>
            <button
              type="submit"
              className="rounded-lg bg-[var(--accent-dim)] px-4 py-2.5 text-sm font-medium text-white hover:opacity-90"
            >
              Add purchase &amp; update results
            </button>
          </form>
        </div>

        <div
          id="step-2-rewards"
          ref={step2RewardsRef}
          className="scroll-mt-24 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6"
        >
          <p className="text-xs font-medium uppercase tracking-wider text-fuchsia-400/80">Step 2</p>
          <h2 id="summary-heading" className="mt-1 text-lg font-medium text-white">
            Rewards by card
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">
            If you used the <strong className="text-zinc-400">suggested card</strong> for every row below, here&apos;s
            about how much cash-back you&apos;d earn per card (before fees). Updates when your list changes.
          </p>
          {loading && (
            <p className="mt-4 text-sm text-[var(--muted)]" aria-live="polite">
              Comparing your cards…
            </p>
          )}
          {error && (
            <p className="mt-4 text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
          {!loading && !error && Object.keys(totals).length === 0 && (
            <p className="mt-4 rounded-lg border border-dashed border-[var(--border)] px-4 py-6 text-center text-sm text-[var(--muted)]">
              Nothing to total yet. Add a purchase or load the sample list.
            </p>
          )}
          {Object.keys(totals).length > 0 && (
            <ul className="mt-4 space-y-2" aria-labelledby="summary-heading">
              {Object.entries(totals)
                .sort((a, b) => b[1] - a[1])
                .map(([card, dollars]) => (
                  <li
                    key={card}
                    className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2.5 text-sm"
                  >
                    <span className="text-white">{card}</span>
                    <span className="font-mono text-[var(--accent)]">${dollars.toFixed(2)}</span>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </section>

      <section
        className="mt-10 overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] p-2 sm:p-0"
        aria-labelledby="table-heading"
      >
        <div className="flex flex-col gap-2 px-4 pb-2 pt-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-wider text-fuchsia-400/80">Step 3</p>
            <h2 id="table-heading" className="mt-1 text-lg font-medium text-white">
              Row-by-row results
            </h2>
            <p className="mt-2 max-w-3xl text-sm text-[var(--muted)]">
              For each purchase: which card wins, the rate used, and estimated dollars earned on that row. Use{" "}
              <span className="text-zinc-400">Remove</span> to drop a row from your list.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setStep3TableOpen((o) => !o)}
            className="no-print shrink-0 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5"
            aria-expanded={step3TableOpen}
            aria-controls="step-3-table-panel"
          >
            {step3TableOpen ? "Hide table" : "Show table"}
          </button>
        </div>
        <div
          id="step-3-table-panel"
          className={`overflow-x-auto px-2 pb-4 sm:px-0 sm:pb-0 ${step3TableOpen ? "" : "hidden"}`}
          aria-hidden={!step3TableOpen}
        >
          <table className="min-w-[720px] w-full text-left text-sm">
            <caption className="sr-only">
              Recommended card and reward for each transaction you entered
            </caption>
            <thead>
              <tr className="border-b border-[var(--border)] text-[var(--muted)]">
                <th scope="col" className="px-4 py-3 font-medium">
                  Date
                </th>
                <th scope="col" className="px-4 py-3 font-medium">
                  Merchant
                </th>
                <th scope="col" className="px-4 py-3 font-medium" title="Spending type used for reward rates">
                  Category
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium">
                  Purchase
                </th>
                <th scope="col" className="px-4 py-3 font-medium" title="Card that earns the most on this row">
                  Suggested card
                </th>
                <th
                  scope="col"
                  className="px-4 py-3 text-right font-medium"
                  title="Reward rate applied for this category"
                >
                  Rate
                </th>
                <th scope="col" className="px-4 py-3 text-right font-medium" title="Estimated cash-back on this row">
                  Earned
                </th>
                <th scope="col" className="w-20 px-4 py-3 font-medium">
                  <span className="sr-only">Remove row</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {recRows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[var(--muted)]">
                    Your results will show up here after you add at least one purchase in Step 1.
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
                        className="text-xs text-red-400/90 underline-offset-2 hover:text-red-300 hover:underline"
                      >
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="scroll-mt-8">
        <Phase3Panel recommendations={recRows} totalsByCard={totals} />
      </div>
        </div>
      </div>

      <footer className="mt-12 border-t border-[var(--border)] pt-8 text-center text-xs leading-relaxed text-[var(--muted)]">
        <p>
          Educational estimates only. Pair with{" "}
          <span className="text-zinc-500">Card Fit</span> for fuller spending analysis. Optional Google sign-in saves your
          list in the cloud when Firebase is configured.
        </p>
      </footer>
    </div>
  );
}
