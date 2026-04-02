import type { TransactionInput } from "./types";
import { resolveTransactionCategory } from "./categoryResolve";

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((c === "," && !inQuotes) || c === "\r") {
      out.push(cur.trim());
      cur = "";
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function findColumn(headers: string[], aliases: string[]): number {
  for (const a of aliases) {
    const i = headers.indexOf(a);
    if (i >= 0) return i;
  }
  return -1;
}

/** When Amex / Chase use labels like "Extended description" instead of "description". */
function findMerchantColumn(headers: string[]): number {
  const exact = findColumn(headers, [
    "merchant",
    "merchant_name",
    "payee",
    "description",
    "extended_description",
    "transaction_description",
    "transaction_description_line",
    "name",
    "memo",
    "payee_name",
  ]);
  if (exact >= 0) return exact;
  const skip = new Set(["date", "transaction_date", "posted_date", "post_date", "amount", "amt", "debit", "credit"]);
  const idx = headers.findIndex((h) => {
    if (skip.has(h)) return false;
    return (
      h.includes("description") ||
      h.includes("merchant") ||
      h.includes("payee") ||
      (h.includes("memo") && !h.includes("amount"))
    );
  });
  return idx;
}

function findAmountColumn(headers: string[]): number {
  const exact = findColumn(headers, [
    "amount",
    "amt",
    "transaction_amount",
    "amount_usd",
    "debit",
    "charge",
    "charge_amount",
  ]);
  if (exact >= 0) return exact;
  const idx = headers.findIndex((h) => h.includes("amount") && !h.includes("date"));
  return idx;
}

function looksLikeAmountCell(s: string): boolean {
  const t = String(s ?? "").trim().replace(/[$,]/g, "");
  if (t === "") return false;
  const n = Number.parseFloat(t);
  return Number.isFinite(n);
}

type RowSlice = {
  date: string;
  merchant: string;
  amount: string;
  /** Only when cell count matches header count */
  extras: { c?: string; sub?: string; mcc?: string; raw?: string } | null;
};

/**
 * Bank CSVs often include commas inside the merchant field without quoting; that yields
 * more cells than headers. Assume date is first column and amount is last numeric column.
 */
function sliceRowToFields(
  cells: string[],
  headers: string[],
  d: number,
  m: number,
  a: number,
  cIdx: number,
  subIdx: number,
  mccIdx: number,
  rawIdx: number,
): RowSlice | null {
  if (cells.length < 2) return null;

  if (cells.length === headers.length) {
    const extras: NonNullable<RowSlice["extras"]> = {};
    if (cIdx >= 0) extras.c = String(cells[cIdx] ?? "").trim();
    if (subIdx >= 0) extras.sub = String(cells[subIdx] ?? "").trim();
    if (mccIdx >= 0) extras.mcc = String(cells[mccIdx] ?? "").trim();
    if (rawIdx >= 0) extras.raw = String(cells[rawIdx] ?? "").trim();
    return {
      date: String(cells[d] ?? "").trim(),
      merchant: String(cells[m] ?? "").trim(),
      amount: String(cells[a] ?? "").trim(),
      extras,
    };
  }

  if (cells.length > headers.length) {
    const last = cells[cells.length - 1];
    if (looksLikeAmountCell(last)) {
      const dateStr = String(cells[d] ?? "").trim();
      const merchantStr = cells.slice(m, cells.length - 1).join(", ").trim();
      return {
        date: dateStr,
        merchant: merchantStr,
        amount: last.trim(),
        extras: null,
      };
    }
  }

  if (cells.length >= 3) {
    const last = cells[cells.length - 1];
    if (looksLikeAmountCell(last)) {
      return {
        date: String(cells[d] ?? "").trim(),
        merchant: cells.slice(1, cells.length - 1).join(", ").trim(),
        amount: last.trim(),
        extras: null,
      };
    }
  }

  return null;
}

/**
 * Parse transaction CSV with flexible columns.
 * Required: date, amount, and merchant (or merchant_name / payee).
 * Optional: category, subcategory, mcc_code, raw_description — used for stronger categorization.
 */
export function parseTransactionsCsv(text: string): TransactionInput[] {
  const bomStripped = text.replace(/^\uFEFF/, "");
  const lines = bomStripped
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) {
    throw new Error("CSV needs a header row and at least one data row.");
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);

  const d = findColumn(headers, ["date", "transaction_date", "posted_date", "post_date", "trans_date"]);
  const m = findMerchantColumn(headers);
  const a = findAmountColumn(headers);
  if (d < 0 || m < 0 || a < 0) {
    throw new Error(
      `CSV must include date, merchant (or description), and amount columns. Found: ${headers.join(", ")}`,
    );
  }

  const cIdx = findColumn(headers, ["category", "expense_category"]);
  const subIdx = findColumn(headers, ["subcategory", "sub_category", "category_detail"]);
  const mccIdx = findColumn(headers, ["mcc_code", "mcc", "merchant_category_code"]);
  const rawIdx = findColumn(headers, ["raw_description", "memo", "original_description", "details", "note"]);

  const rows: TransactionInput[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.length < 2) continue;

    const sliced = sliceRowToFields(cells, headers, d, m, a, cIdx, subIdx, mccIdx, rawIdx);
    if (!sliced) continue;

    const amount = Number.parseFloat(String(sliced.amount).replace(/[$,]/g, ""));
    if (Number.isNaN(amount)) {
      throw new Error(`Invalid amount on row ${i + 1}: ${sliced.amount}`);
    }

    const merchant = sliced.merchant;
    let rawDescription = "";
    let mccRaw = "";
    let bankCategory: string | undefined;
    let bankSubcategory: string | undefined;

    if (sliced.extras != null) {
      if (rawIdx >= 0 && sliced.extras.raw) rawDescription = sliced.extras.raw;
      if (mccIdx >= 0 && sliced.extras.mcc) mccRaw = sliced.extras.mcc;
      if (cIdx >= 0) {
        const raw = sliced.extras.c ?? "";
        if (raw && raw.toLowerCase() !== "auto") bankCategory = raw;
      }
      if (subIdx >= 0) {
        const raw = sliced.extras.sub ?? "";
        if (raw && raw.toLowerCase() !== "auto") bankSubcategory = raw;
      }
    }

    const category = resolveTransactionCategory({
      merchant,
      rawDescription: rawDescription || undefined,
      mcc: mccRaw || undefined,
      bankCategory,
      bankSubcategory,
    });

    rows.push({
      date: sliced.date,
      merchant: merchant || "Unknown",
      category,
      amount,
    });
  }

  if (rows.length === 0) {
    throw new Error("No valid data rows in CSV.");
  }

  return rows;
}
