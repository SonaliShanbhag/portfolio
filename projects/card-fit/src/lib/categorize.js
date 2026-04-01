import { matchMerchantSnippet } from "./merchantSnippets.js";

/**
 * Stable key for override map (lowercase, collapsed whitespace).
 * @param {string} raw
 */
export function normalizeMerchantKey(raw) {
  return (raw || "").trim().toLowerCase().replace(/\s+/g, " ");
}

/** @type {Array<{ category: string, patterns: RegExp[] }>} */
const RULES = [
  {
    category: "travel",
    patterns: [
      /united airlines|delta air|american airlines|southwest|jetblue|alaska air|spirit air|frontier/i,
      /\bairbnb\b|\bhotels?\.com\b|booking\.com|expedia|kayak|priceline|marriott|hilton|hyatt|ihg|wyndham/i,
      /\buber\s*\+?\s*travel\b|\blyft\s*\+?\s*travel\b/i,
      /hotel|motel|\binn\b|resort|airline|airport parking|tsa\b|luggage|car rental|rent-a-car/i,
    ],
  },
  {
    category: "wholesale",
    patterns: [/costco|sam'?s\s*club|bj'?s\s*wholesale|wholesale club/i],
  },
  {
    category: "grocery",
    patterns: [
      /whole foods|trader joe|safeway|kroger|publix|wegmans|aldi|lidl|stop\s*&\s*shop|food lion|heb\b|albertsons/i,
      /instacart|shipt|fresh direct|peapod/i,
      /sprouts|giant eagle|meijer|fred meyer|ralphs|vons|pavilions/i,
      /\bgrocery|supermarket|market\s*\d|food\s*co\b/i,
    ],
  },
  {
    category: "dining",
    patterns: [
      /starbucks|dunkin|peets|coffee\s*house|espresso/i,
      /grubhub|doordash|uber\s*eats|postmates|seamless|caviar/i,
      /mcdonald|burger king|wendy|taco bell|chipotle|subway|panera|shake shack|five guys|kfc|popeyes/i,
      /sweetgreen|cff\s|chick-fil|in-n-out|whataburger|olive garden|outback|ihop|denny/i,
      /restaurant|cafe|diner|pizza|sushi|steakhouse|bakery|bbq|taqueria|bistro|kitchen|eatery|grill|deli|cantina/i,
      /\bsq\s*\*|\btst\*\s*|\btoast\s*tab\b/i,
    ],
  },
  {
    category: "gas",
    patterns: [
      /shell oil|exxon|chevron|bp\s|mobil\b|speedway|circle k|7-eleven gas|gas station|fuel|pump\s*\d/i,
    ],
  },
  {
    category: "transit",
    patterns: [
      /uber(?! eats)|lyft(?! travel)|metro|transit|parking|toll|ez pass|clipper|mta\b|cta\b|bart\b/i,
    ],
  },
  {
    category: "streaming",
    patterns: [
      /netflix|hulu|disney\+|spotify|apple music|youtube premium|hbo max|max\.com|paramount\+|peacock|twitch subs/i,
    ],
  },
  {
    category: "drugstore",
    patterns: [/cvs\b|walgreens|rite aid|duane reade|pharmacy/i],
  },
  {
    category: "entertainment",
    patterns: [
      /amc\b|regal cinema|movie|theater|concert|ticketmaster|stubhub|bowling|arcade|museum|zoo|aquarium/i,
      /steam\s*games|playstation|xbox|nintendo|epic games/i,
    ],
  },
  {
    category: "online_shopping",
    patterns: [
      /amazon|amzn|ebay|etsy|shopify|wayfair|target\.com|walmart\.com|best\s*buy|newegg/i,
      /\btarget\b|\bkohls\b|\bkohl'?s\b|\bmacys\b|\bmacy'?s\b|\bnordstrom\b|\bbestbuy\b/i,
      /paypal\s*\*|shopify|stripe\s*\*/i,
    ],
  },
  {
    category: "utilities",
    patterns: [
      /electric|water\s*works|gas\s*company|internet|comcast|xfinity|verizon fios|att\b.*bill|utility/i,
      /\bgeico\b|\bstate farm\b|\bprogressive\b|\ballstate\b|\busaa\b|insurance|premium due/i,
      /\bt-mobile\b|\btmobile\b|wireless bill|mobile bill/i,
    ],
  },
];

/**
 * @param {string} raw
 * @param {Record<string, string>} [overrides] keyed by `normalizeMerchantKey(raw)`
 * @returns {import('./categories.js').CategoryId}
 */
export function categorizeMerchant(raw, overrides = {}) {
  const s = (raw || "").trim();
  if (!s) return "other";

  const key = normalizeMerchantKey(s);
  const o = overrides[key];
  if (o && typeof o === "string") return /** @type {import("./categories.js").CategoryId} */ (o);

  const lower = s.toLowerCase();

  for (const { category, patterns } of RULES) {
    for (const re of patterns) {
      if (re.test(lower)) return /** @type {import("./categories.js").CategoryId} */ (category);
    }
  }

  const snippet = matchMerchantSnippet(lower);
  if (snippet) return /** @type {import("./categories.js").CategoryId} */ (snippet);

  if (/\bamazon\b|\bamzn\b/i.test(lower)) return "online_shopping";
  if (/\bwalmart\b/i.test(lower) && !/\.com/i.test(lower)) return "grocery";

  return "other";
}

