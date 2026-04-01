import Papa from "papaparse";
import { isExcludedMerchantLine } from "./transactionFilters.js";

/** Matches common date column headers (whole header), e.g. "Transaction Date", "Post Date". */
const DATE_HEADER =
  /^(transaction\s+date|trans(?:action)?\s*date|post(?:ed)?\s*date|date|posted|trans\.?|transaction)$/i;
const AMOUNT_KEYS = /^(amount|debit|credit|transaction amount|amt)$/i;
const DESC_KEYS = /^(description|merchant|payee|details|memo|name)$/i;

/**
 * @param {string} h
 */
function normHeader(h) {
  return String(h ?? "")
    .trim()
    .replace(/^\uFEFF/, "");
}

/**
 * @param {string[]} headers
 * @returns {{ date: string | null, amount: string | null, description: string | null, debit: string | null, credit: string | null }}
 */
export function detectColumns(headers) {
  const list = headers.map(normHeader);
  const find = (pred) => {
    for (const h of list) {
      if (pred(h)) return h;
    }
    return null;
  };

  const date = find((h) => DATE_HEADER.test(h));
  const description = find((h) => DESC_KEYS.test(h));

  const debit = find((h) => /^debit$/i.test(h));
  const credit = find((h) => /^credit$/i.test(h));

  /** Prefer a single Amount column when present (Chase, etc.). */
  const amountExact = find((h) => /^amount$/i.test(h));
  const amountLoose = find(
    (h) => AMOUNT_KEYS.test(h) && !/date/i.test(h) && !/^debit$/i.test(h) && !/^credit$/i.test(h),
  );

  let amount = amountExact || amountLoose;
  if (!amount && debit && credit) amount = null;
  else if (!amount && !debit && !credit) {
    amount = find((h) => /^(transaction )?amount|value$/i.test(h));
  }

  return {
    date,
    amount,
    description,
    debit,
    credit,
  };
}

/**
 * Parse a money string: $1,234.56 or (12.34) for negative
 * @param {unknown} v
 */
export function parseAmount(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const s = String(v).trim();
  if (!s) return null;
  const neg = /^\(.*\)$/.test(s) || s.startsWith("-");
  const cleaned = s.replace(/[$,\s]/g, "").replace(/^\((.*)\)$/, "$1");
  const n = parseFloat(cleaned);
  if (Number.isNaN(n)) return null;
  return neg ? -Math.abs(n) : n;
}

/**
 * Positive spend number = purchase (refunds reduce via negative amounts).
 * @param {number} raw
 * @param {string} desc
 */
function normalizeSpendAmount(raw, desc) {
  const d = (desc || "").trim();
  const isPayment =
    /payment|autopay|thank you|online payment|pay bill|credit card payment|acct payment/i.test(d);

  if (raw === 0) return null;
  if (raw < 0) return -raw;
  if (raw > 0 && isPayment) return null;
  return raw;
}

/**
 * @param {Record<string, unknown>} row
 * @param {{ date: string | null, amount: string | null, description: string | null, debit: string | null, credit: string | null }} mapping
 * @returns {{ amount: number, description: string, date: string | null } | null}
 */
export function rowToTransaction(row, mapping) {
  const desc = mapping.description ? String(row[mapping.description] ?? "").trim() : "";
  if (isExcludedMerchantLine(desc)) return null;

  let raw = null;

  if (mapping.amount) {
    raw = parseAmount(row[mapping.amount]);
  } else if (mapping.debit || mapping.credit) {
    const d = mapping.debit ? parseAmount(row[mapping.debit]) : null;
    const c = mapping.credit ? parseAmount(row[mapping.credit]) : null;
    if (d != null && d !== 0) raw = Math.abs(d);
    else if (c != null && c !== 0) raw = -Math.abs(c);
  }

  if (raw == null) return null;

  const amount = normalizeSpendAmount(raw, desc);
  if (amount == null || amount === 0) return null;

  const date =
    mapping.date && row[mapping.date] != null ? String(row[mapping.date]).trim() : null;

  return {
    amount,
    description: desc || "Unknown",
    date,
  };
}

/**
 * @param {string} text
 * @returns {{ headers: string[], rows: Record<string, string>[] }}
 */
export function parseCsvText(text) {
  const parsed = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: normHeader,
  });

  if (parsed.errors?.length) {
    const fatal = parsed.errors.find((e) => e.type === "Quotes" || e.type === "FieldMismatch");
    if (fatal) throw new Error(fatal.message || "CSV parse error");
  }

  const headers = parsed.meta.fields?.filter(Boolean) ?? [];
  const rows = /** @type {Record<string, string>[]} */ (parsed.data).filter(
    (r) => r && Object.values(r).some((v) => v != null && String(v).trim() !== ""),
  );

  return { headers, rows };
}

/**
 * @param {File} file
 * @returns {Promise<{ headers: string[], rows: Record<string, string>[] }>}
 */
export async function parseCsvFile(file) {
  const text = await file.text();
  return parseCsvText(text);
}

/**
 * @param {Record<string, string>[]} rows
 * @param {{ date: string | null, amount: string | null, description: string | null, debit: string | null, credit: string | null }} mapping
 */
export function rowsToTransactions(rows, mapping) {
  const out = [];
  for (const row of rows) {
    const t = rowToTransaction(row, mapping);
    if (t) out.push(t);
  }
  return out;
}
