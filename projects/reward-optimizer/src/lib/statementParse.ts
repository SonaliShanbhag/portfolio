/**
 * Heuristic parser for U.S. credit-card-style statement text (from PDF text extraction).
 */

import { isExcludedMerchantLine } from "@/lib/transactionFilters";

const SKIP_LINE =
  /^(page\s+\d|statement|account\s+summary|previous\s+balance|new\s+balance|minimum\s+payment|payment\s+due|total\s+balance|rewards?\s+summary|transactions?\s+in|purchase\s+date)/i;

const PAYMENT_LINE = /^(payment\s+thank|online\s+payment|autopay|credit\s+balance|direct\s+debit)/i;

function normalizeAmountForRow(amountStr: string): string | null {
  const s = amountStr.replace(/\$/g, "").replace(/,/g, "").trim();
  const neg = /^\(.*\)$/.test(s) || s.startsWith("-");
  const n = parseFloat(s.replace(/^\((.*)\)$/, "$1"));
  if (Number.isNaN(n)) return null;
  const v = neg ? -Math.abs(n) : n;
  return String(v);
}

function tryParseLine(line: string): { date: string; description: string; amount: string } | null {
  const trimmed = line.trim();
  if (trimmed.length < 6) return null;
  if (SKIP_LINE.test(trimmed)) return null;

  const amountMatch = trimmed.match(/([\(\-]?\s*\$?\s*[\d,]+\.\d{2})\s*\)?\s*$/);
  if (!amountMatch) return null;

  const amountRaw = amountMatch[1];
  const beforeAmount = trimmed.slice(0, trimmed.length - amountMatch[0].length).trim();
  if (beforeAmount.length < 2) return null;

  if (PAYMENT_LINE.test(beforeAmount)) return null;

  const norm = normalizeAmountForRow(amountRaw);
  if (norm == null) return null;

  const dateLead = beforeAmount.match(
    /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\s+(.+)$/,
  );
  if (dateLead) {
    const description = dateLead[2].trim();
    if (isExcludedMerchantLine(description)) return null;
    return {
      date: dateLead[1],
      description,
      amount: norm,
    };
  }

  if (isExcludedMerchantLine(beforeAmount)) return null;

  return {
    date: "",
    description: beforeAmount,
    amount: norm,
  };
}

export const STATEMENT_ROW_KEYS = ["Transaction Date", "Description", "Amount"] as const;

export type StatementPdfRow = Record<(typeof STATEMENT_ROW_KEYS)[number], string>;

export function parseStatementText(fullText: string): {
  rows: StatementPdfRow[];
  stats: { lineCount: number; matched: number };
} {
  const lines = fullText.split(/\r?\n/).map((l) => l.trim());
  const rows: StatementPdfRow[] = [];

  for (const line of lines) {
    const parsed = tryParseLine(line);
    if (parsed) {
      rows.push({
        "Transaction Date": parsed.date,
        Description: parsed.description,
        Amount: parsed.amount,
      });
    }
  }

  return {
    rows,
    stats: { lineCount: lines.length, matched: rows.length },
  };
}
