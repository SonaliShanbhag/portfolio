"use client";

import { useMemo, useState } from "react";
import {
  CARD_PRESETS,
  PRESET_OTHER_ID,
  QUICK_PICK_PRESET_IDS,
  filterCardPresets,
  getPresetById,
} from "@/lib/cardPresets";

type Props = {
  id: string;
  /** Selected preset id, empty, or PRESET_OTHER_ID */
  value: string;
  onChange: (presetId: string) => void;
  /** When true, first option is "keep current" with empty value */
  allowEmpty?: boolean;
  emptyLabel?: string;
};

export function CardPresetPicker({ id, value, onChange, allowEmpty, emptyLabel }: Props) {
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const q = query.trim();
    if (!q) {
      const set = new Set(QUICK_PICK_PRESET_IDS);
      return CARD_PRESETS.filter((p) => set.has(p.id));
    }
    return filterCardPresets(q);
  }, [query]);

  const selected = value && value !== PRESET_OTHER_ID ? getPresetById(value) : null;

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="mb-1 block text-xs font-medium text-zinc-400">
        Search templates
      </label>
      <input
        id={id}
        type="search"
        autoComplete="off"
        placeholder="Type card name, bank (Chase, Amex…), or type (Cashback, Travel…)"
        className="w-full max-w-xl rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <p className="text-xs text-[var(--muted)]">
        {!query.trim()
          ? "Popular picks below — type to search all cards."
          : rows.length === 0
            ? "No matches. Try another spelling or bank name."
            : `${rows.length} match${rows.length === 1 ? "" : "es"}`}
      </p>

      <ul
        className="max-h-56 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--background)] p-1 text-sm"
        role="listbox"
        aria-label="Card templates"
      >
        {allowEmpty && (
          <li>
            <button
              type="button"
              role="option"
              aria-selected={value === ""}
              onClick={() => onChange("")}
              className={`flex w-full rounded-md px-2 py-2 text-left hover:bg-white/5 ${value === "" ? "bg-fuchsia-500/15 text-fuchsia-100" : "text-zinc-300"}`}
            >
              {emptyLabel ?? "— Keep current values —"}
            </button>
          </li>
        )}
        {rows.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              role="option"
              aria-selected={value === p.id}
              onClick={() => {
                onChange(p.id);
                setQuery("");
              }}
              className={`flex w-full flex-col rounded-md px-2 py-2 text-left hover:bg-white/5 ${value === p.id ? "bg-fuchsia-500/15" : ""}`}
            >
              <span className={`font-medium ${value === p.id ? "text-fuchsia-100" : "text-white"}`}>{p.name}</span>
              <span className="text-xs text-[var(--muted)]">
                {p.issuer}
                {p.cardType ? ` · ${p.cardType}` : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="button"
          onClick={() => onChange(PRESET_OTHER_ID)}
          className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${value === PRESET_OTHER_ID ? "border-fuchsia-400/50 bg-fuchsia-500/15 text-fuchsia-100" : "border-[var(--border)] text-zinc-400 hover:bg-white/5"}`}
        >
          Other — enter rates manually
        </button>
      </div>

      {selected && (
        <p className="text-xs text-zinc-400">
          Selected: <span className="text-zinc-200">{selected.name}</span>
        </p>
      )}
      {value === PRESET_OTHER_ID && (
        <p className="text-xs text-zinc-400">Manual entry — fill fields below.</p>
      )}
    </div>
  );
}
