import type { TransactionInput } from "./types";
import { resolveTransactionCategory } from "./categoryResolve";

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
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

/**
 * Parse transaction CSV with flexible columns.
 * Required: date, amount, and merchant (or merchant_name / payee).
 * Optional: category, subcategory, mcc_code, raw_description — used for stronger categorization.
 */
export function parseTransactionsCsv(text: string): TransactionInput[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length < 2) {
    throw new Error("CSV needs a header row and at least one data row.");
  }

  const headers = parseCsvLine(lines[0]).map(normalizeHeader);

  const d = findColumn(headers, ["date", "transaction_date", "posted_date", "post_date"]);
  const m = findColumn(headers, ["merchant", "merchant_name", "payee", "description", "name"]);
  const a = findColumn(headers, ["amount", "amt"]);
  if (d < 0 || m < 0 || a < 0) {
    throw new Error(
      `CSV must include date, merchant (or merchant_name), and amount columns. Found: ${headers.join(", ")}`,
    );
  }

  const cIdx = findColumn(headers, ["category", "expense_category"]);
  const subIdx = findColumn(headers, ["subcategory", "sub_category", "category_detail"]);
  const mccIdx = findColumn(headers, ["mcc_code", "mcc", "merchant_category_code"]);
  const rawIdx = findColumn(headers, ["raw_description", "memo", "original_description", "details", "note"]);

  const rows: TransactionInput[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    if (cells.length < 3) continue;

    const amount = Number.parseFloat(String(cells[a] ?? "").replace(/[$,]/g, ""));
    if (Number.isNaN(amount)) {
      throw new Error(`Invalid amount on row ${i + 1}: ${cells[a]}`);
    }

    const merchant = String(cells[m] ?? "").trim();
    const rawDescription = rawIdx >= 0 ? String(cells[rawIdx] ?? "").trim() : "";
    const mccRaw = mccIdx >= 0 ? String(cells[mccIdx] ?? "").trim() : "";

    let bankCategory: string | undefined;
    let bankSubcategory: string | undefined;
    if (cIdx >= 0) {
      const raw = String(cells[cIdx] ?? "").trim();
      if (raw && raw.toLowerCase() !== "auto") bankCategory = raw;
    }
    if (subIdx >= 0) {
      const raw = String(cells[subIdx] ?? "").trim();
      if (raw && raw.toLowerCase() !== "auto") bankSubcategory = raw;
    }

    const category = resolveTransactionCategory({
      merchant,
      rawDescription: rawDescription || undefined,
      mcc: mccRaw || undefined,
      bankCategory,
      bankSubcategory,
    });

    rows.push({
      date: String(cells[d] ?? "").trim(),
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
