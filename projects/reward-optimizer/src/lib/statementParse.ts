/**
 * Heuristic parser for U.S. credit-card-style statement text (from PDF text extraction).
 */

import { isExcludedMerchantLine } from "@/lib/transactionFilters";

const SKIP_LINE =
  /^(page\s+\d|statement|account\s+summary|previous\s+balance|new\s+balance|minimum\s+payment|payment\s+due|total\s+balance|rewards?\s+summary|transactions?\s+in|purchase\s+date)/i;

const PAYMENT_LINE = /^(payment\s+thank|online\s+payment|autopay|credit\s+balance|direct\s+debit)/i;

/** Date at start of line (common on Amex / Chase PDFs). */
const DATE_LEAD =
  /^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{4}[\/\-]\d{1,2}[\/\-]\d{1,2})\s+(.+)$/;

/** Line that is only a date — often split from the rest of the row by PDF text extraction. */
const DATE_ONLY = /^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/;

function normalizeAmountForRow(amountStr: string): string | null {
  const s = amountStr.replace(/\$/g, "").replace(/,/g, "").trim();
  const neg = /^\(.*\)$/.test(s) || s.startsWith("-");
  const n = parseFloat(s.replace(/^\((.*)\)$/, "$1"));
  if (Number.isNaN(n)) return null;
  const v = neg ? -Math.abs(n) : n;
  return String(v);
}

/**
 * Trailing currency amount: supports 1–2 decimal places and whole-dollar amounts
 * (PDF extract sometimes drops ".00" or uses a single decimal digit).
 */
function matchTrailingAmount(trimmed: string): { amountRaw: string; beforeAmount: string } | null {
  const patterns: RegExp[] = [
    /([\(\-]?\s*\$?\s*[\d,]+\.\d{2})\s*\)?\s*$/,
    /([\(\-]?\s*\$?\s*[\d,]+\.\d{1})\s*\)?\s*$/,
    /([\(\-]?\s*\$?\s*[\d,]+)\s*\)?\s*$/,
  ];
  for (const re of patterns) {
    const amountMatch = trimmed.match(re);
    if (!amountMatch) continue;
    const amountRaw = amountMatch[1];
    const beforeAmount = trimmed.slice(0, trimmed.length - amountMatch[0].length).trim();
    if (beforeAmount.length < 2) continue;
    if (DATE_ONLY.test(beforeAmount)) continue;
    const norm = normalizeAmountForRow(amountRaw);
    if (norm == null) continue;
    return { amountRaw, beforeAmount };
  }
  return null;
}

function tryParseLine(line: string): { date: string; description: string; amount: string } | null {
  const trimmed = line.trim();
  if (trimmed.length < 4) return null;
  if (SKIP_LINE.test(trimmed)) return null;

  const matched = matchTrailingAmount(trimmed);
  if (!matched) return null;

  const { amountRaw, beforeAmount } = matched;

  if (PAYMENT_LINE.test(beforeAmount)) return null;

  const norm = normalizeAmountForRow(amountRaw);
  if (norm == null) return null;

  const dateLead = beforeAmount.match(DATE_LEAD);
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

/** Join lines where PDF extraction put the date on its own line. */
function mergeSplitStatementLines(lines: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (!t) continue;
    if (DATE_ONLY.test(t) && i + 1 < lines.length) {
      const next = lines[i + 1].trim();
      if (next && !DATE_ONLY.test(next)) {
        out.push(`${t} ${next}`);
        i++;
        continue;
      }
    }
    out.push(t);
  }
  return out;
}

export function parseStatementText(fullText: string): {
  rows: StatementPdfRow[];
  stats: { lineCount: number; matched: number };
} {
  const rawLines = fullText.split(/\r?\n/).map((l) => l.trim());
  const lines = mergeSplitStatementLines(rawLines);
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
    stats: { lineCount: rawLines.filter((l) => l.length > 0).length, matched: rows.length },
  };
}
