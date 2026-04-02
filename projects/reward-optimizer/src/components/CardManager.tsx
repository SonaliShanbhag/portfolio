"use client";

import { useState } from "react";
import type { CardRates } from "@/lib/types";
import type { StoredCard } from "@/lib/firestore/userData";
import { CardPresetPicker } from "@/components/CardPresetPicker";
import { PRESET_OTHER_ID, getPresetById, presetToCardRates } from "@/lib/cardPresets";

type AddCardPhase = "pick" | "edit";

function parseRatesBlock(text: string): Record<string, number> {
  const o: Record<string, number> = {};
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t) continue;
    const idx = t.indexOf(":");
    if (idx < 0) continue;
    const k = t.slice(0, idx).trim().toLowerCase().replace(/\s+/g, "_");
    const v = Number.parseFloat(t.slice(idx + 1).trim());
    if (k && !Number.isNaN(v)) o[k] = v;
  }
  return o;
}

function serializeRates(card: CardRates): string {
  const lines: string[] = [];
  for (const [k, v] of Object.entries(card)) {
    if (k === "name" || k === "default") continue;
    if (typeof v === "number") lines.push(`${k}: ${v}`);
  }
  return lines.join("\n");
}

function cardFromForm(name: string, def: string, ratesText: string): CardRates {
  const defaultRate = Number.parseFloat(def);
  const rates = parseRatesBlock(ratesText);
  return {
    name: name.trim() || "Unnamed card",
    default: Number.isFinite(defaultRate) ? defaultRate : 1,
    ...rates,
  };
}

function applyPresetToForm(
  preset: ReturnType<typeof getPresetById>,
  setName: (s: string) => void,
  setDef: (s: string) => void,
  setRatesText: (s: string) => void,
) {
  if (!preset) return;
  const cr = presetToCardRates(preset);
  setName(cr.name);
  setDef(String(cr.default));
  setRatesText(serializeRates(cr));
}

type Props = {
  cards: StoredCard[];
  onSave: (card: StoredCard) => Promise<void>;
  onAdd: (card: CardRates) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  /** Remove every card (signed-in). */
  onDeleteAll?: () => Promise<void>;
  /** Re-add starter cards when the wallet is empty. */
  onRestoreExamples?: () => Promise<void>;
  disabled?: boolean;
};

export function CardManager({ cards, onSave, onAdd, onDelete, onDeleteAll, onRestoreExamples, disabled }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [def, setDef] = useState("1");
  const [ratesText, setRatesText] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  /** Add flow: which catalog template is selected, or "other", or none yet */
  const [presetSelection, setPresetSelection] = useState<string>("");
  /** Edit flow: optional template to refill from */
  const [editTemplate, setEditTemplate] = useState<string>("");
  const [addPickerKey, setAddPickerKey] = useState(0);
  /** After a template is chosen, hide the big picker so the form is the focus. */
  const [addCardPhase, setAddCardPhase] = useState<AddCardPhase>("pick");
  const [deleteAllBusy, setDeleteAllBusy] = useState(false);
  const [restoreBusy, setRestoreBusy] = useState(false);

  const openEdit = (c: StoredCard) => {
    setEditingId(c.id);
    setName(c.name);
    setDef(String(c.default));
    setRatesText(serializeRates(c));
    setAdding(false);
    setPresetSelection("");
    setEditTemplate("");
    setAddCardPhase("pick");
  };

  const openAdd = () => {
    setEditingId(null);
    setName("");
    setDef("1");
    setRatesText("");
    setAdding(true);
    setPresetSelection("");
    setEditTemplate("");
    setAddCardPhase("pick");
    setAddPickerKey((k) => k + 1);
  };

  const close = () => {
    setEditingId(null);
    setAdding(false);
    setPresetSelection("");
    setEditTemplate("");
    setAddCardPhase("pick");
  };

  const onAddPresetPick = (value: string) => {
    setPresetSelection(value);
    setAddCardPhase("edit");
    if (value === PRESET_OTHER_ID) {
      setName("");
      setDef("1");
      setRatesText("");
      return;
    }
    const preset = getPresetById(value);
    applyPresetToForm(preset, setName, setDef, setRatesText);
  };

  const onEditTemplatePick = (value: string) => {
    setEditTemplate(value);
    if (value === "") return;
    if (value === PRESET_OTHER_ID) {
      setName("");
      setDef("1");
      setRatesText("");
      return;
    }
    const preset = getPresetById(value);
    applyPresetToForm(preset, setName, setDef, setRatesText);
  };

  const submit = async () => {
    if (adding && (presetSelection === "" || addCardPhase === "pick")) {
      return;
    }
    setBusy(true);
    try {
      const built = cardFromForm(name, def, ratesText);
      if (adding) {
        await onAdd(built);
      } else if (editingId) {
        await onSave({ ...built, id: editingId });
      }
      close();
    } finally {
      setBusy(false);
    }
  };

  const showFormFields = (adding && addCardPhase === "edit") || Boolean(editingId);

  const handleDeleteAll = async () => {
    if (!onDeleteAll || cards.length === 0) return;
    if (
      !window.confirm(
        `Remove all ${cards.length} card${cards.length === 1 ? "" : "s"} from your wallet? You can add cards again anytime.`,
      )
    ) {
      return;
    }
    setDeleteAllBusy(true);
    try {
      await onDeleteAll();
    } finally {
      setDeleteAllBusy(false);
    }
  };

  const handleRestoreExamples = async () => {
    if (!onRestoreExamples) return;
    setRestoreBusy(true);
    try {
      await onRestoreExamples();
    } finally {
      setRestoreBusy(false);
    }
  };

  return (
    <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6" aria-labelledby="cards-heading">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-fuchsia-400/80">Your wallet</p>
          <h2 id="cards-heading" className="mt-1 text-lg font-medium text-white">
            Your reward cards
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
            Pick a <strong className="font-medium text-zinc-300">known card</strong> from the list to auto-fill typical cash-back rates (illustrative — check your issuer for real terms).{" "}
            Choose <strong className="font-medium text-zinc-300">Other</strong> to type everything yourself. Your list is stored in the cloud when you&apos;re signed in.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {onDeleteAll && cards.length > 0 && (
            <button
              type="button"
              disabled={disabled || deleteAllBusy}
              onClick={handleDeleteAll}
              className="rounded-lg border border-red-500/40 px-3 py-1.5 text-sm font-medium text-red-300/90 hover:bg-red-950/40 disabled:opacity-40"
            >
              {deleteAllBusy ? "Removing…" : "Delete all cards"}
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={openAdd}
            className="rounded-lg bg-[var(--accent-dim)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            Add card
          </button>
        </div>
      </div>

      <div
        className="mt-5 rounded-lg border border-sky-500/35 bg-sky-950/40 px-4 py-3 text-sm leading-relaxed text-sky-100/90"
        role="region"
        aria-label="About sample card data"
      >
        <p className="font-semibold text-sky-50">These are not your real cards from Google</p>
        <p className="mt-2 text-sky-100/85">
          The first time you sign in, this app copies <strong className="text-sky-50">example cards</strong> into your account so you can try things out.{" "}
          <strong className="text-sky-50">Google sign-in does not import</strong> cards from Google Pay, Google Wallet, or your bank.{" "}
          Use the template dropdown to load <strong className="text-sky-50">illustrative rates</strong> for common products, then adjust as needed.
        </p>
      </div>

      {cards.length === 0 && (
        <div className="mt-4 rounded-lg border border-dashed border-[var(--border)] px-4 py-8 text-center">
          <p className="text-sm text-[var(--muted)]">No cards yet. Add one to compare rewards on your spending below.</p>
          {onRestoreExamples && (
            <button
              type="button"
              disabled={disabled || restoreBusy}
              onClick={handleRestoreExamples}
              className="mt-4 rounded-lg border border-[var(--border)] px-3 py-2 text-xs font-medium text-zinc-300 hover:bg-white/5 disabled:opacity-40"
            >
              {restoreBusy ? "Loading…" : "Restore example cards"}
            </button>
          )}
        </div>
      )}

      <ul className="mt-4 space-y-2">
        {cards.map((c) => (
          <li
            key={c.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm"
          >
            <span className="text-white">
              {c.name} <span className="text-[var(--muted)]">(default {c.default}%)</span>
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={disabled}
                onClick={() => openEdit(c)}
                className="text-fuchsia-300 hover:text-fuchsia-200 disabled:opacity-40"
              >
                Edit
              </button>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onDelete(c.id)}
                className="text-red-400/90 hover:text-red-300 disabled:opacity-40"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      {(adding || editingId) && (
        <div className="mt-4 space-y-4 rounded-lg border border-fuchsia-500/20 bg-black/20 p-4">
          <p className="text-sm font-medium text-white">{adding ? "Add a card" : "Edit this card"}</p>

          {adding && addCardPhase === "pick" && (
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-400">Card template</p>
              <CardPresetPicker
                key={addPickerKey}
                id="card-preset-search"
                value={presetSelection}
                onChange={onAddPresetPick}
              />
              <p className="mt-3 text-xs text-[var(--muted)]">
                Templates use approximate category rates for education, not live issuer APIs. Travel and airline cards
                use point multipliers as comparable percentages. You can edit every field before saving.
              </p>
            </div>
          )}

          {adding && addCardPhase === "edit" && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[var(--border)] bg-[var(--background)]/80 px-3 py-2.5">
              <p className="text-sm text-zinc-200">
                {presetSelection === PRESET_OTHER_ID ? (
                  <>
                    <span className="text-[var(--muted)]">Entry mode:</span> manual rates
                  </>
                ) : (
                  <>
                    <span className="text-[var(--muted)]">Template:</span> {getPresetById(presetSelection)?.name ?? "—"}
                  </>
                )}
              </p>
              <button
                type="button"
                className="shrink-0 text-xs font-medium text-fuchsia-300 hover:text-fuchsia-200"
                onClick={() => {
                  setPresetSelection("");
                  setAddCardPhase("pick");
                  setAddPickerKey((k) => k + 1);
                }}
              >
                Change template
              </button>
            </div>
          )}

          {editingId && (
            <div>
              <p className="mb-2 text-xs font-medium text-zinc-400">Replace fields from template (optional)</p>
              <CardPresetPicker
                id="card-edit-template-search"
                value={editTemplate}
                onChange={onEditTemplatePick}
                allowEmpty
                emptyLabel="— Keep current values —"
              />
              <p className="mt-2 text-xs text-[var(--muted)]">
                Choosing <span className="text-zinc-400">Other</span> clears the form to a blank manual entry.
              </p>
            </div>
          )}

          {showFormFields && (
            <>
              <div>
                <label htmlFor="card-name" className="mb-1 block text-xs font-medium text-zinc-400">
                  Name on the card
                </label>
                <input
                  id="card-name"
                  className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  placeholder="e.g. Sapphire, Double Cash"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div>
                <label htmlFor="card-default" className="mb-1 block text-xs font-medium text-zinc-400">
                  Default cash-back (%) for any category not listed below
                </label>
                <input
                  id="card-default"
                  className="w-full max-w-[12rem] rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
                  placeholder="e.g. 1.5"
                  value={def}
                  onChange={(e) => setDef(e.target.value)}
                  inputMode="decimal"
                />
              </div>
              <div>
                <label htmlFor="card-rates" className="mb-1 block text-xs font-medium text-zinc-400">
                  Extra rates by category (optional)
                </label>
                <p className="mb-2 text-xs text-[var(--muted)]">One line per category. Example: groceries gets 6%, travel gets 3%.</p>
                <textarea
                  id="card-rates"
                  className="min-h-[100px] w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono text-sm"
                  placeholder={"groceries: 6\ntravel: 3"}
                  value={ratesText}
                  onChange={(e) => setRatesText(e.target.value)}
                />
              </div>
            </>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || disabled || (adding && (presetSelection === "" || addCardPhase === "pick"))}
              onClick={submit}
              className="rounded-lg bg-[var(--accent-dim)] px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-40"
            >
              Save
            </button>
            <button type="button" onClick={close} className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-zinc-300 hover:bg-white/5">
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
