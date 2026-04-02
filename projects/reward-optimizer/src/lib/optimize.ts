import type { CardRates, OptimizeResponse, TransactionInput } from "./types";
import { getSeedPresets } from "./cardPresets";

export const DEFAULT_CARDS: CardRates[] = getSeedPresets();

/** Normalize user/category strings to match JSON keys (lowercase, trim, spaces → single). */
export function normalizeCategoryKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[^a-z0-9 _-]/g, "")
    .replace(/[\s_-]+/g, "_");
}

function rateForCard(card: CardRates, categoryKey: string): number {
  const key = normalizeCategoryKey(categoryKey);
  const direct = (card as Record<string, number>)[key];
  if (typeof direct === "number" && key !== "name") {
    return direct;
  }
  return card.default;
}

export function rewardDollars(amount: number, ratePercent: number): number {
  return (amount * ratePercent) / 100;
}

export function bestCardForTransaction(
  tx: TransactionInput,
  cards: CardRates[],
): { card: CardRates; ratePercent: number; reward: number } {
  const categoryKey = normalizeCategoryKey(tx.category);
  let best: CardRates | null = null;
  let bestRate = -Infinity;
  let bestReward = 0;

  for (const card of cards) {
    const rate = rateForCard(card, categoryKey);
    const reward = rewardDollars(tx.amount, rate);
    if (reward > bestReward || (reward === bestReward && rate > bestRate)) {
      best = card;
      bestRate = rate;
      bestReward = reward;
    }
  }

  if (!best) {
    throw new Error("No cards configured");
  }

  return { card: best, ratePercent: rateForCard(best, categoryKey), reward: bestReward };
}

export function optimizeTransactions(
  transactions: TransactionInput[],
  cards?: CardRates[],
): OptimizeResponse {
  const cardSet = cards?.length ? cards : DEFAULT_CARDS;
  const recommendations = transactions.map((tx) => {
    const { card, ratePercent, reward } = bestCardForTransaction(tx, cardSet);
    return {
      date: tx.date,
      merchant: tx.merchant,
      category: tx.category,
      amount: tx.amount,
      bestCard: card.name,
      rewardDollars: Math.round(reward * 100) / 100,
      ratePercent,
    };
  });

  const totalsByCard: Record<string, number> = {};
  for (const r of recommendations) {
    totalsByCard[r.bestCard] = (totalsByCard[r.bestCard] ?? 0) + r.rewardDollars;
  }
  for (const k of Object.keys(totalsByCard)) {
    totalsByCard[k] = Math.round(totalsByCard[k] * 100) / 100;
  }

  return { recommendations, totalsByCard };
}
