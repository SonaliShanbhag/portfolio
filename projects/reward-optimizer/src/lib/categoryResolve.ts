import { categoryFromMccString } from "@/lib/mccCategories";
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

/** Plaid / Finicity / YNAB / major-bank style primary categories → app category. */
const BANK_PRIMARY: Record<string, string> = {
  food_and_drink: "dining",
  food_and_beverages: "dining",
  restaurants: "dining",
  fast_food: "dining",
  coffee_shop: "dining",
  alcohol: "dining",
  bar: "dining",
  groceries: "groceries",
  supermarket: "groceries",
  gas: "gas",
  gas_station: "gas",
  fuel: "gas",
  entertainment: "entertainment",
  recreation: "entertainment",
  general_merchandise: "online",
  shopping_net: "online",
  shopping_pos: "online",
  digital_purchase: "online",
  electronics: "online",
  clothing: "online",
  home_improvement: "online",
  sporting_goods: "online",
  airlines: "airline",
  airfare: "airline",
  lodging: "hotel",
  hotels: "hotel",
  car_rental: "travel",
  taxi: "travel",
  public_transportation: "travel",
  parking: "travel",
  tolls: "travel",
  subscription: "entertainment",
  subscriptions: "entertainment",
  personal_care: "online",
  pharmacy: "groceries",
  medical: "other",
  healthcare: "other",
  insurance: "other",
  utilities: "other",
  rent: "other",
  housing: "other",
  home: "other",
  bills: "other",
  government: "other",
  education: "other",
  pets: "other",
  charity: "other",
  donation: "other",
  income: "other",
  transfer: "other",
  transfer_in: "other",
  transfer_out: "other",
  loan_payments: "other",
  bank_fees: "other",
  services: "other",
  professional_services: "other",
  auto: "other",
  auto_repair: "other",
  auto_parts: "other",
};

/**
 * Map bank-export labels (e.g. Plaid-style category + subcategory) to our taxonomy.
 */
export function mapBankCategoryToAppCategory(category: string, subcategory: string): string | null {
  const c = category.trim().toLowerCase().replace(/\s+/g, "_");
  const s = subcategory.trim().toLowerCase().replace(/\s+/g, "_");

  if (!c && !s) return null;

  if (!c && s) {
    if (/\b(coffee|fast\s*food|delivery|food|meal|restaurant)\b/i.test(s)) return "dining";
    if (/\b(streaming|subscription|movie|music)\b/i.test(s)) return "entertainment";
    if (/\b(gas\s*station|fuel)\b/i.test(s)) return "gas";
    if (/\b(airfare|flight|airline)\b/i.test(s)) return "airline";
    if (/\b(hotel|lodging)\b/i.test(s)) return "hotel";
    if (/\b(grocery|supermarket|wholesale|convenience)\b/i.test(s)) return "groceries";
    if (/\b(online\s*retail|electronics|general\s*retail|clothing)\b/i.test(s)) return "online";
    if (/\b(rideshare|taxi|transit|parking)\b/i.test(s)) return "travel";
    if (/\b(pharmacy|drug)\b/i.test(s)) return "groceries";
    return null;
  }

  if (c === "travel") {
    if (s.includes("air") || s.includes("airfare") || s.includes("airline")) return "airline";
    if (s.includes("hotel") || s.includes("lodging")) return "hotel";
    if (s.includes("car") || s.includes("rental")) return "travel";
    return "travel";
  }

  if (c === "shopping") {
    if (s.includes("grocery") || s.includes("supermarket")) return "groceries";
    if (s.includes("pharmacy") || s.includes("drug")) return "groceries";
    return "online";
  }

  if (c === "transport" || c === "transportation") {
    if (s.includes("rideshare") || s.includes("taxi") || s.includes("ride") || s.includes("uber") || s.includes("lyft"))
      return "travel";
    if (s.includes("gas") || s.includes("fuel")) return "gas";
    if (s.includes("parking") || s.includes("toll")) return "travel";
    if (s.includes("transit") || s.includes("public")) return "travel";
    return "travel";
  }

  const primary = BANK_PRIMARY[c];
  if (primary) return primary;

  if (c === "dining" || c === "food" || c === "restaurants" || c === "food_and_drink") return "dining";
  if (c === "gas" || c === "gasoline" || c === "fuel") return "gas";
  if (c === "groceries" || c === "grocery") return "groceries";
  if (c === "entertainment") return "entertainment";

  if (c === "housing" || c === "home" || c === "rent") return "other";
  if (c === "insurance") return "other";
  if (c === "health" || c === "medical") return "other";
  if (c === "bills" || c === "utilities") return "other";

  const fuzzy = mapBankCategoryFuzzy(category, subcategory);
  if (fuzzy) return fuzzy;

  return null;
}

/** Last-resort substring match on combined bank labels (handles unknown bank taxonomies). */
function mapBankCategoryFuzzy(category: string, subcategory: string): string | null {
  const hay = `${category} ${subcategory}`.toLowerCase();
  if (/\b(food|restaurant|dining|coffee|fast\s*food|bar|alcohol|meal|takeout)\b/i.test(hay)) return "dining";
  if (/\b(airline|flight|air\s*travel|airfare)\b/i.test(hay)) return "airline";
  if (/\b(hotel|lodg|lodging|motel)\b/i.test(hay)) return "hotel";
  if (/\b(grocery|supermarket|wholesale\s*club)\b/i.test(hay)) return "groceries";
  if (/\b(\bgas\b|fuel|gasoline)\b/i.test(hay)) return "gas";
  if (/\b(stream|subscription|entertainment|movie|music|video\s*game)\b/i.test(hay)) return "entertainment";
  if (/\b(rideshare|uber|lyft|taxi|transit|commuter|ferry|train\s*ticket)\b/i.test(hay)) return "travel";
  if (/\b(shop|retail|merchandise|online|e-?commerce|digital|department\s*store)\b/i.test(hay)) return "online";
  if (/\b(parking|toll|road\s*fee)\b/i.test(hay)) return "travel";
  if (/\b(pharmacy|drugstore|drug\s*store)\b/i.test(hay)) return "groceries";
  if (/\b(utilities|electric|water\s*bill|internet|phone\s*bill)\b/i.test(hay)) return "other";
  if (/\b(insurance|medical|health|doctor|dent|hospital|clinic)\b/i.test(hay)) return "other";
  if (/\b(rent|mortgage|housing|landlord)\b/i.test(hay)) return "other";
  if (/\b(pet|veterinary|vet\b)\b/i.test(hay)) return "other";
  if (/\b(education|tuition|school|university|college)\b/i.test(hay)) return "other";
  if (/\b(government|tax|irs)\b/i.test(hay)) return "other";
  if (/\b(charity|donation|nonprofit)\b/i.test(hay)) return "other";
  if (/\b(gym|fitness|yoga|pilates)\b/i.test(hay)) return "other";
  return null;
}

function tryPassThroughCanonicalLabel(raw: string): string | null {
  const k = normalizeCategoryKey(raw);
  if (k === "auto") return null;
  if (CANONICAL.has(k)) return k;
  return null;
}

/** Map ISO/Visa-style 4-digit MCC to a reward category (see `mccCategories.ts`). */
export function categoryFromMcc(raw: string): string | null {
  return categoryFromMccString(raw);
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
