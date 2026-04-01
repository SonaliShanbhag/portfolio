import { normalizeMerchantKey } from "./categorize.js";

/**
 * @param {Array<{ amount: number, description: string, category: string }>} txs
 * @returns {Array<{ key: string, display: string, spend: number, category: string }>}
 */
export function computeMerchantRollup(txs) {
  /** @type {Map<string, { key: string, display: string, spend: number, category: string }>} */
  const map = new Map();

  for (const t of txs) {
    const key = normalizeMerchantKey(t.description);
    if (!key) continue;

    if (!map.has(key)) {
      map.set(key, {
        key,
        display: t.description.trim(),
        spend: 0,
        category: t.category,
      });
    }
    const e = map.get(key);
    e.spend += t.amount;
    e.category = t.category;
  }

  return Array.from(map.values()).sort((a, b) => b.spend - a.spend);
}
