/**
 * Detects statement PDF/CSV lines that are **not** individual purchase merchants:
 * section totals, "Purchases +", "New Charges", payments, etc.
 */

/**
 * @param {string} raw Description / merchant text (possibly with date prefix already stripped).
 * @returns {boolean} true if this line should not be treated as a purchase transaction.
 */
export function isExcludedMerchantLine(raw) {
  const s = (raw || "").trim();
  if (!s) return true;

  const lower = s.toLowerCase();

  // Payments / credits to the account (not merchant spend)
  if (
    /payment\s+thank|thank\s+you/i.test(lower) ||
    /\bonline\s+payment\b/i.test(lower) ||
    /\bautopay\b/i.test(lower) ||
    /\belectronic\s+payment\b/i.test(lower) ||
    /\bach\s+(payment|credit|debit)\b/i.test(lower) ||
    /\bdirect\s+debit\b/i.test(lower) ||
    /^credit\s+card\s+payment/i.test(lower) ||
    /^\d{1,2}[\/\-]\d{1,2}([\/\-]\d{2,4})?\s+payment/i.test(s)
  ) {
    return true;
  }

  // Whole-line summary labels (totals / subtotals repeated on statements)
  if (
    /^purchases?\s*\+$/i.test(s) ||
    /^new\s+charges?$/i.test(s) ||
    /^payments?$/i.test(s) ||
    /^credits?$/i.test(s) ||
    /^subtotal$/i.test(s) ||
    /^amount\s+of\s+new\s+charges?/i.test(s) ||
    /^total\s+(amount|due|balance|charges|purchases|credits|payments|fees?)(\s|$)/i.test(s) ||
    /^cash\s+advances?$/i.test(s) ||
    /^balance\s+transfers?$/i.test(s) ||
    /^interest(\s+charged)?$/i.test(s) ||
    /^fees?\s+charged$/i.test(s) ||
    /^previous\s+balance$/i.test(s)
  ) {
    return true;
  }

  return false;
}
