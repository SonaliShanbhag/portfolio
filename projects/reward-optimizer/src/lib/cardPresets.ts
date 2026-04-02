import type { CardRates } from "@/lib/types";
import raw from "@/data/cardPresets.json";

/** Catalog row: id + Firestore-safe card fields + optional seed flag */
export type CardPresetRow = {
  id: string;
  name: string;
  includeInSeed?: boolean;
  default: number;
} & Record<string, string | number | boolean | undefined>;

export const CARD_PRESETS: CardPresetRow[] = raw as CardPresetRow[];

/** Use for "Other — enter manually" in the template dropdown */
export const PRESET_OTHER_ID = "other";

export function presetToCardRates(p: CardPresetRow): CardRates {
  const out: CardRates = { name: p.name, default: p.default };
  for (const [k, v] of Object.entries(p)) {
    if (k === "id" || k === "includeInSeed" || k === "name" || k === "default") continue;
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
