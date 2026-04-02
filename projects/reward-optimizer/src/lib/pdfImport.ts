import type { TransactionInput } from "@/lib/types";
import type { StatementPdfRow } from "@/lib/statementParse";

/** Turn reviewed PDF rows into optimizer transactions; category is auto-inferred from merchant. */
export function statementRowsToTransactions(rows: StatementPdfRow[]): TransactionInput[] {
  const out: TransactionInput[] = [];
  for (const row of rows) {
    const date = String(row["Transaction Date"] ?? "").trim();
    const merchant = String(row.Description ?? "").trim();
    const rawAmt = String(row.Amount ?? "0").replace(/[^0-9.\-()]/g, "");
    const n = parseFloat(rawAmt.replace(/[()]/g, ""));
    if (Number.isNaN(n)) continue;
    const amount = Math.abs(n);
    if (amount === 0) continue;
    out.push({
      date: date || new Date().toISOString().slice(0, 10),
      merchant: merchant || "Unknown",
      category: "auto",
      amount,
    });
  }
  return out;
}
