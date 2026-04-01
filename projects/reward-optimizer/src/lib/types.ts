/** Percentage points, e.g. 2 means 2% cash back on that category. */
export interface CardRates {
  name: string;
  /** Rate for categories not listed (percentage points). */
  default: number;
  [category: string]: string | number;
}

export type TransactionInput = {
  date: string;
  merchant: string;
  category: string;
  amount: number;
};

export type Recommendation = {
  date: string;
  merchant: string;
  category: string;
  amount: number;
  bestCard: string;
  /** Earned reward in dollars for this transaction on the best card. */
  rewardDollars: number;
  /** Effective rate used (percentage points). */
  ratePercent: number;
};

export type OptimizeResponse = {
  recommendations: Recommendation[];
  /** Total reward dollars per card name (only cards that earned). */
  totalsByCard: Record<string, number>;
};
