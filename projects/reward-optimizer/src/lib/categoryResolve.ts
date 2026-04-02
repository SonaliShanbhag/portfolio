import { normalizeCategoryKey } from "@/lib/optimize";

/** Canonical reward categories used by the optimizer and card presets. */
const CANONICAL = new Set([
  "groceries",
  "travel",
  "dining",
  "gas",
  "entertainment",
  "online",
  "airline",
  "hotel",
  "other",
]);

/**
 * Map bank-export labels (e.g. Plaid-style category + subcategory) to our taxonomy.
 */
export function mapBankCategoryToAppCategory(category: string, subcategory: string): string | null {
  const c = category.trim().toLowerCase();
  const s = subcategory.trim().toLowerCase();

  if (!c && !s) return null;

  if (!c && s) {
    if (/\b(coffee|fast\s*food|delivery|food)\b/i.test(s)) return "dining";
    if (/\b(streaming|subscription)\b/i.test(s)) return "entertainment";
    if (/\b(gas\s*station|fuel)\b/i.test(s)) return "gas";
    if (/\b(airfare|flight)\b/i.test(s)) return "airline";
    if (/\b(hotel|lodging)\b/i.test(s)) return "hotel";
    if (/\b(grocery|supermarket|wholesale|convenience)\b/i.test(s)) return "groceries";
    if (/\b(online\s*retail|electronics|general\s*retail)\b/i.test(s)) return "online";
    if (/\b(rideshare)\b/i.test(s)) return "travel";
    return null;
  }

  if (c === "travel") {
    if (s.includes("air") || s.includes("airfare")) return "airline";
    if (s.includes("hotel") || s.includes("lodging")) return "hotel";
    return "travel";
  }

  if (c === "dining" || c === "food" || c === "restaurants" || c === "food_and_drink") return "dining";
  if (c === "gas" || c === "gasoline" || c === "fuel") return "gas";
  if (c === "groceries" || c === "grocery") return "groceries";
  if (c === "entertainment") return "entertainment";

  if (c === "shopping") {
    if (s.includes("grocery") || s.includes("supermarket")) return "groceries";
    return "online";
  }

  if (c === "transport" || c === "transportation") {
    if (s.includes("rideshare") || s.includes("taxi") || s.includes("ride")) return "travel";
    if (s.includes("gas") || s.includes("fuel")) return "gas";
    return "travel";
  }

  if (c === "housing" || c === "home" || c === "rent") return "other";
  if (c === "insurance") return "other";
  if (c === "health" || c === "medical") return "other";
  if (c === "bills" || c === "utilities") return "other";

  return null;
}

function tryPassThroughCanonicalLabel(raw: string): string | null {
  const k = normalizeCategoryKey(raw);
  if (k === "auto") return null;
  if (CANONICAL.has(k)) return k;
  return null;
}

/**
 * Map ISO/Visa-style 4-digit MCC to a reward category.
 * @see https://www.visa.com/content/dam/VCOM/download/merchants/visa-merchant-data-standards-manual.pdf (summary tables)
 */
export function categoryFromMcc(raw: string): string | null {
  const d = raw.replace(/\D/g, "").padStart(4, "0").slice(-4);
  if (d.length !== 4) return null;
  const n = parseInt(d, 10);
  if (Number.isNaN(n)) return null;

  if (n === 4511) return "airline";
  if (n === 7011 || n === 7012) return "hotel";
  if (n === 4121) return "travel";
  if (n >= 5541 && n <= 5542) return "gas";
  if (n >= 5811 && n <= 5814) return "dining";
  if (n === 5300 || n === 5411 || n === 5412 || n === 5422 || n === 5499) return "groceries";
  if (n === 5310 || n === 5311 || n === 5331 || n === 5399) return "online";
  if (n === 5732 || n === 5734 || n === 5735 || n === 5942 || n === 5999) return "online";
  if (n === 4899) return "entertainment";
  if (n === 6513) return "other";
  if (n === 6300) return "other";
  if (n === 7997) return "other";
  if (n >= 5200 && n <= 5261) return "online";
  if (n === 4722) return "travel";

  return null;
}

/**
 * Heuristic rules on combined merchant + description text (order = first match wins).
 */
const TEXT_RULES: { pattern: RegExp; category: string }[] = [
  { pattern: /\bTARGET(\s+T-|\s+#|\s+STORE)?\b/i, category: "online" },
  { pattern: /\b(uber|lyft|rideshare|ride\s*share)\b/i, category: "travel" },
  { pattern: /\b(doordash|grubhub|uber\s*eats|postmates|seamless)\b/i, category: "dining" },
  { pattern: /\b(instacart|shipt)\b/i, category: "groceries" },
  { pattern: /\b(whole\s*foods|trader\s*joe|safeway|kroger|aldi|costco|walmart|target\s+store|publix|wegmans|heb\b|food\s*lion)\b/i, category: "groceries" },
  { pattern: /\b(7-eleven|7\s*eleven|circle\s*k|convenience)\b/i, category: "groceries" },
  { pattern: /\b(shell|chevron|exxon|bp\b|mobil|texaco|sunoco|gas\s|fuel|pump)\b/i, category: "gas" },
  { pattern: /\b(starbucks|mcdonald|chipotle|subway|taco\s*bell|wendy|burger\s*king|olive\s*garden|restaurant|cafe|coffee|dining|kitchen|grill)\b/i, category: "dining" },
  { pattern: /\b(netflix|spotify|hulu|disney\+|hbo|youtube\s*premium|streaming)\b/i, category: "entertainment" },
  { pattern: /\b(planet\s*fitness|la\s*fitness|equinox|gym)\b/i, category: "other" },
  { pattern: /\b(geico|state\s*farm|progressive|allstate|insurance|usaa\s*ins)\b/i, category: "other" },
  { pattern: /\b(rent|apartment|housing|landlord|lease)\b/i, category: "other" },
  { pattern: /\b(amazon|amzn\b|paypal|ebay|etsy|shopify|\.com\/bill|online\s*retail)\b/i, category: "online" },
  { pattern: /\b(apple\.com|apple\s*store|apple\s*icloud|google\s*play|microsoft\s*365)\b/i, category: "online" },
  { pattern: /\b(target\.com|walmart\.com|best\s*buy|costco\.com)\b/i, category: "online" },
  {
    pattern:
      /\b(united\s+airlines|united\s+air\b|delta\s+air|american\s+airlines|southwest\s+air|jetblue|alaska\s+air|frontier\s+air|spirit\s+air|hawaiian\s+air)\b/i,
    category: "airline",
  },
  {
    pattern: /\b(marriott|hilton|hyatt|ihg|holiday\s+inn|hampton\s+inn|doubletree|sheraton|westin|wyndham)\b/i,
    category: "hotel",
  },
  { pattern: /\b(airbnb|booking\.com|expedia|hotels\.com|priceline|kayak|orbitz|hotels?)\b/i, category: "travel" },
];

export function inferCategoryFromText(text: string): string {
  const m = text.trim();
  if (!m) return "other";
  for (const { pattern, category } of TEXT_RULES) {
    if (pattern.test(m)) return category;
  }
  return "other";
}

export type CategoryResolveInput = {
  merchant: string;
  rawDescription?: string;
  mcc?: string;
  bankCategory?: string;
  bankSubcategory?: string;
};

/**
 * Full resolution: bank labels → pass-through canonical → MCC → text heuristics.
 */
export function resolveTransactionCategory(opts: CategoryResolveInput): string {
  const cat = (opts.bankCategory ?? "").trim();
  const sub = (opts.bankSubcategory ?? "").trim();

  if (cat || sub) {
    const mapped = mapBankCategoryToAppCategory(cat, sub);
    if (mapped) return mapped;
  }

  if (cat) {
    const pass = tryPassThroughCanonicalLabel(cat);
    if (pass && pass !== "auto") return pass;
  }

  if (opts.mcc) {
    const fromMcc = categoryFromMcc(opts.mcc);
    if (fromMcc) return fromMcc;
  }

  const merged = `${opts.merchant} ${opts.rawDescription ?? ""}`.trim();
  return inferCategoryFromText(merged);
}
