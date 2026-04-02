"use client";

import { useState } from "react";
import type { CardRates } from "@/lib/types";
import type { StoredCard } from "@/lib/firestore/userData";

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

type Props = {
  cards: StoredCard[];
  onSave: (card: StoredCard) => Promise<void>;
  onAdd: (card: CardRates) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  disabled?: boolean;
};

export function CardManager({ cards, onSave, onAdd, onDelete, disabled }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [def, setDef] = useState("1");
  const [ratesText, setRatesText] = useState("");
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);

  const openEdit = (c: StoredCard) => {
    setEditingId(c.id);
    setName(c.name);
    setDef(String(c.default));
    setRatesText(serializeRates(c));
    setAdding(false);
  };

  const openAdd = () => {
    setEditingId(null);
    setName("");
    setDef("1");
    setRatesText("groceries: 2\ntravel: 2");
    setAdding(true);
  };

  const close = () => {
    setEditingId(null);
    setAdding(false);
  };

  const submit = async () => {
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

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-medium text-white">Your cards</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Rates are percentage points (e.g. 3 = 3%). Saved to your account in Firestore.
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={openAdd}
          className="rounded-lg bg-[var(--accent-dim)] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
        >
          Add card
        </button>
      </div>

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
                disabled={disabled || cards.length <= 1}
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
        <div className="mt-4 space-y-3 rounded-lg border border-fuchsia-500/20 bg-black/20 p-4">
          <p className="text-sm font-medium text-white">{adding ? "New card" : "Edit card"}</p>
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            placeholder="Card name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm"
            placeholder="Default rate %"
            value={def}
            onChange={(e) => setDef(e.target.value)}
          />
          <label className="block text-xs text-[var(--muted)]">
            Category rates (one per line: <code>groceries: 6</code>)
          </label>
          <textarea
            className="min-h-[100px] w-full rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2 font-mono text-sm"
            value={ratesText}
            onChange={(e) => setRatesText(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || disabled}
              onClick={submit}
              className="rounded-lg bg-[var(--accent-dim)] px-4 py-2 text-sm text-white hover:opacity-90 disabled:opacity-40"
            >
              Save
            </button>
            <button
              type="button"
              onClick={close}
              className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-zinc-300 hover:bg-white/5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
