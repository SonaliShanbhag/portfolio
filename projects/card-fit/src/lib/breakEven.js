import { CATEGORY_ORDER, CATEGORY_LABELS } from "./categories.js";

/**
 * Fee vs rewards narrative for transparent UX (educational, not advice).
 * @param {import('../data/cards.js').CardDef} card
 * @param {number} grossRewards
 * @param {number} netAnnualValue
 */
export function computeFeeBreakEven(card, grossRewards, netAnnualValue) {
  const fee = card.annualFee;
  if (fee <= 0) {
    return { kind: "no_fee" };
  }

  if (netAnnualValue >= 0) {
    return {
      kind: "above",
      fee,
      grossRewards,
      surplus: netAnnualValue,
    };
  }

  const shortfall = fee - grossRewards;

  let bestCat = /** @type {string | null} */ (null);
  let bestRate = 0;
  for (const cat of CATEGORY_ORDER) {
    const r = card.rates[cat] ?? card.defaultRate;
    if (r > bestRate) {
      bestRate = r;
      bestCat = cat;
    }
  }

  if (bestRate <= 0 || !bestCat) {
    return {
      kind: "no_path",
      fee,
      grossRewards,
      shortfall,
    };
  }

  const additionalAnnualAtCategoryRate = shortfall / bestRate;
  const margin = bestRate - card.defaultRate;
  const additionalAnnualMarginal =
    margin > 0 ? shortfall / margin : null;

  return {
    kind: "below",
    fee,
    grossRewards,
    shortfall,
    bestCategory: bestCat,
    bestCategoryLabel: CATEGORY_LABELS[bestCat] || bestCat,
    bestRate,
    defaultRate: card.defaultRate,
    margin,
    additionalAnnualAtCategoryRate,
    additionalMonthlyAtCategoryRate: additionalAnnualAtCategoryRate / 12,
    additionalAnnualMarginal,
    additionalMonthlyMarginal:
      additionalAnnualMarginal != null ? additionalAnnualMarginal / 12 : null,
  };
}
