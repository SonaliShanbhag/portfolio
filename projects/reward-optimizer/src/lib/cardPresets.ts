import type { CardRates } from "@/lib/types";
import raw from "@/data/cardPresets.json";

/** Catalog row: id + Firestore-safe card fields + optional seed flag */
export type CardPresetRow = {
  id: string;
  name: string;
  /** Issuer / bank for search */
  issuer?: string;
  /** Cashback, Travel, Airline, Hotel, Business, Secured */
  cardType?: string;
  includeInSeed?: boolean;
  default: number;
} & Record<string, string | number | boolean | undefined>;

export const CARD_PRESETS: CardPresetRow[] = raw as CardPresetRow[];

const PRESET_META_KEYS = new Set(["id", "includeInSeed", "name", "default", "issuer", "cardType"]);

/** Use for "Other — enter manually" in the template dropdown */
export const PRESET_OTHER_ID = "other";

/** Quick template picks when search is empty (first-time seed set). */
export const QUICK_PICK_PRESET_IDS: string[] = [
  "chase-freedom-unlimited",
  "citi-double-cash",
  "amex-blue-cash-preferred",
  "wells-fargo-active-cash",
  "capital-one-savorone",
  "amazon-prime-visa",
  "discover-it-cash-back",
  "chase-freedom-flex",
];

export function filterCardPresets(query: string): CardPresetRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return CARD_PRESETS;
  return CARD_PRESETS.filter((p) => {
    const issuer = String(p.issuer ?? "");
    const cardType = String(p.cardType ?? "");
    const hay = `${p.name} ${issuer} ${cardType} ${p.id}`.toLowerCase();
    return hay.includes(q);
  });
}

export function presetToCardRates(p: CardPresetRow): CardRates {
  const out: CardRates = { name: p.name, default: p.default };
  for (const [k, v] of Object.entries(p)) {
    if (PRESET_META_KEYS.has(k)) continue;
    if (typeof v === "number" && Number.isFinite(v)) {
      (out as Record<string, number>)[k] = v;
    }
  }
  return out;
}

/** Cards copied on first sign-in and used as anonymous defaults. */
export function getSeedPresets(): CardRates[] {
  const seeded = CARD_PRESETS.filter((p) => p.includeInSeed).map(presetToCardRates);
  if (seeded.length > 0) return seeded;
  return CARD_PRESETS.slice(0, 4).map(presetToCardRates);
}

export function getPresetById(id: string): CardPresetRow | undefined {
  return CARD_PRESETS.find((p) => p.id === id);
}
