import { CATEGORY_ORDER, CATEGORY_LABELS } from "./categories.js";
import { categorizeMerchant } from "./categorize.js";
import { computeFeeBreakEven } from "./breakEven.js";
import { CARDS } from "../data/cards.js";

/**
 * @typedef {{ amount: number, description: string, date: string | null }} RawTx
 */

/**
 * @param {RawTx[]} txs
 * @param {Record<string, string>} [overrides] merchant key → category id
 */
export function buildTransactions(txs, overrides = {}) {
  return txs.map((t) => ({
    ...t,
    category: categorizeMerchant(t.description, overrides),
  }));
}

/**
 * @param {ReturnType<typeof buildTransactions>} txs
 */
export function aggregateByCategory(txs) {
  /** @type {Record<string, number>} */
  const byCategory = {};
  let total = 0;

  for (const t of txs) {
    const cat = t.category;
    const amt = t.amount;
    byCategory[cat] = (byCategory[cat] || 0) + amt;
    total += amt;
  }

  return { byCategory, totalSpend: total, count: txs.length };
}

/**
 * @param {Record<string, number>} byCategory
 * @param {import('../data/cards.js').CardDef} card
 */
export function scoreCard(byCategory, totalSpend, card) {
  let grossRewards = 0;
  /** @type {Array<{ category: string, label: string, spend: number, rate: number, estimatedValue: number }>} */
  const lines = [];

  for (const cat of CATEGORY_ORDER) {
    const spend = byCategory[cat] || 0;
    if (spend <= 0) continue;

    const rate = card.rates[cat] ?? card.defaultRate;
    const estimatedValue = spend * rate;
    grossRewards += estimatedValue;

    lines.push({
      category: cat,
      label: CATEGORY_LABELS[cat] || cat,
      spend,
      rate,
      estimatedValue,
    });
  }

  const netAnnualValue = grossRewards - card.annualFee;
  const feeBreakEven = computeFeeBreakEven(card, grossRewards, netAnnualValue);

  return {
    cardId: card.id,
    grossRewards,
    annualFee: card.annualFee,
    netAnnualValue,
    lines,
    totalSpend,
    feeBreakEven,
  };
}

/**
 * @param {Record<string, number>} byCategory
 * @param {number} totalSpend
 */
export function rankCards(byCategory, totalSpend) {
  const scored = CARDS.map((card) => ({
    card,
    result: scoreCard(byCategory, totalSpend, card),
  }));

  scored.sort((a, b) => b.result.netAnnualValue - a.result.netAnnualValue);

  return scored;
}
