import { resolveTransactionCategory } from "@/lib/categoryResolve";

/**
 * Apply category rules when the user chose "auto", left the category blank, or the row
 * has no bank-export labels. Uses merchant text plus optional MCC / description when present.
 */
export function applyCategoryRules<
  T extends { merchant: string; category: string; rawDescription?: string; mcc?: string },
>(rows: T[]): T[] {
  return rows.map((row) => {
    const c = row.category.trim().toLowerCase();
    if (!c || c === "auto") {
      return {
        ...row,
        category: resolveTransactionCategory({
          merchant: row.merchant,
          rawDescription: row.rawDescription,
          mcc: row.mcc,
        }),
      };
    }
    return row;
  });
}
