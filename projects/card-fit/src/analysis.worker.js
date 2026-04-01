import { parseCsvText, rowsToTransactions } from "./lib/csvParse.js";
import { buildTransactions, aggregateByCategory, rankCards } from "./lib/score.js";
import { computeMerchantRollup } from "./lib/merchantRollup.js";

self.onmessage = (e) => {
  const { csvText, rowMapping, overrides = {} } = e.data;
  try {
    const { rows } = parseCsvText(csvText);
    const raw = rowsToTransactions(rows, rowMapping);
    const txs = buildTransactions(raw, overrides);
    const agg = aggregateByCategory(txs);
    const ranked = rankCards(agg.byCategory, agg.totalSpend);
    const merchantRollup = computeMerchantRollup(txs);
    self.postMessage({ ok: true, profile: agg, ranked, merchantRollup });
  } catch (err) {
    self.postMessage({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
