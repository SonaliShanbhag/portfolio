/**
 * Simple rules engine: map merchant text to a reward category.
 * First matching rule wins (order matters).
 */
const RULES: { pattern: RegExp; category: string }[] = [
  { pattern: /\b(whole\s*foods|trader\s*joe|safeway|kroger|aldi|costco|grocery|supermarket)\b/i, category: "groceries" },
  { pattern: /\b(shell|chevron|exxon|bp\s|mobil|gas\s|fuel)\b/i, category: "gas" },
  { pattern: /\b(united|delta|american\s+air|southwest|jetblue|hotel|airbnb|booking\.com|expedia)\b/i, category: "travel" },
  { pattern: /\b(restaurant|cafe|coffee|starbucks|dining|grill|kitchen|olive\s+garden)\b/i, category: "dining" },
  { pattern: /\b(netflix|spotify|hulu|disney|theater|cinema|entertainment)\b/i, category: "entertainment" },
];

export function inferCategoryFromMerchant(merchant: string): string {
  const m = merchant.trim();
  if (!m) return "other";
  for (const { pattern, category } of RULES) {
    if (pattern.test(m)) return category;
  }
  return "other";
}

/** Apply inferred category when category is empty, whitespace, or "auto". */
export function applyCategoryRules<T extends { merchant: string; category: string }>(rows: T[]): T[] {
  return rows.map((row) => {
    const c = row.category.trim().toLowerCase();
    if (!c || c === "auto") {
      return { ...row, category: inferCategoryFromMerchant(row.merchant) };
    }
    return row;
  });
}
