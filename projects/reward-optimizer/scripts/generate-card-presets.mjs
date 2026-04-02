/**
 * Generates src/data/cardPresets.json — run: node scripts/generate-card-presets.mjs
 * Rates are percentage points (or points-per-dollar as % for travel cards) for comparison.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outPath = path.join(__dirname, "../src/data/cardPresets.json");

const SEED_IDS = new Set([
  "chase-freedom-unlimited",
  "citi-double-cash",
  "amex-blue-cash-preferred",
  "wells-fargo-active-cash",
  "capital-one-savorone",
  "amazon-prime-visa",
  "discover-it-cash-back",
  "chase-freedom-flex",
]);

/** @typedef {{ id: string, name: string, issuer: string, cardType: string, default: number, includeInSeed?: boolean } & Record<string, number|string|boolean|undefined>} Row */

/** @type {Omit<Row, 'includeInSeed'>[]} */
const raw = [
  // Cashback — consumer
  { id: "chase-freedom-unlimited", name: "Chase Freedom Unlimited", issuer: "Chase", cardType: "Cashback", default: 1.5, dining: 3, travel: 5 },
  { id: "chase-freedom-flex", name: "Chase Freedom Flex (5% rotating not modeled)", issuer: "Chase", cardType: "Cashback", default: 1, dining: 3, travel: 5 },
  { id: "citi-double-cash", name: "Citi Double Cash", issuer: "Citi", cardType: "Cashback", default: 2 },
  { id: "citi-custom-cash", name: "Citi Custom Cash (5% top category — modeled as groceries)", issuer: "Citi", cardType: "Cashback", default: 1, groceries: 5 },
  { id: "capital-one-quicksilver", name: "Capital One Quicksilver", issuer: "Capital One", cardType: "Cashback", default: 1.5, travel: 5 },
  { id: "capital-one-savorone", name: "Capital One SavorOne", issuer: "Capital One", cardType: "Cashback", default: 1, groceries: 3, dining: 3, travel: 5, entertainment: 3 },
  { id: "capital-one-savor", name: "Capital One Savor", issuer: "Capital One", cardType: "Cashback", default: 1, groceries: 3, dining: 4, travel: 5, entertainment: 3 },
  { id: "amex-blue-cash-preferred", name: "Amex Blue Cash Preferred", issuer: "Amex", cardType: "Cashback", default: 1, groceries: 6, gas: 3, entertainment: 6 },
  { id: "amex-blue-cash-everyday", name: "Amex Blue Cash Everyday", issuer: "Amex", cardType: "Cashback", default: 1, groceries: 3, gas: 3, online: 3 },
  { id: "wells-fargo-active-cash", name: "Wells Fargo Active Cash", issuer: "Wells Fargo", cardType: "Cashback", default: 2 },
  { id: "wells-fargo-autograph", name: "Wells Fargo Autograph", issuer: "Wells Fargo", cardType: "Travel", default: 1, dining: 3, gas: 3, travel: 3 },
  { id: "bofa-customized-cash-rewards", name: "Bank of America Customized Cash Rewards", issuer: "BofA", cardType: "Cashback", default: 1, groceries: 2, gas: 2, other: 3 },
  { id: "bofa-unlimited-cash-rewards", name: "Bank of America Unlimited Cash Rewards", issuer: "BofA", cardType: "Cashback", default: 1.5 },
  { id: "discover-it-cash-back", name: "Discover it Cash Back (5% rotating not modeled)", issuer: "Discover", cardType: "Cashback", default: 1 },
  { id: "discover-it-chrome", name: "Discover it Chrome", issuer: "Discover", cardType: "Cashback", default: 1, gas: 2 },
  { id: "usbank-cash-plus", name: "U.S. Bank Cash+ (5% chosen categories not modeled)", issuer: "US Bank", cardType: "Cashback", default: 1 },
  { id: "usbank-altitude-go", name: "U.S. Bank Altitude Go", issuer: "US Bank", cardType: "Cashback", default: 1, groceries: 2, dining: 4, entertainment: 2 },
  { id: "usbank-altitude-connect", name: "U.S. Bank Altitude Connect", issuer: "US Bank", cardType: "Travel", default: 1, gas: 2, travel: 4 },
  { id: "citi-costco-anywhere", name: "Citi Costco Anywhere Visa", issuer: "Citi", cardType: "Cashback", default: 1, dining: 3, gas: 4, travel: 3 },
  { id: "amazon-prime-visa", name: "Amazon Prime Visa", issuer: "Chase", cardType: "Cashback", default: 1, groceries: 5, dining: 2, gas: 2 },
  { id: "apple-card", name: "Apple Card", issuer: "Goldman Sachs", cardType: "Cashback", default: 1, online: 2 },
  { id: "paypal-cashback-mastercard", name: "PayPal Cashback Mastercard", issuer: "Synchrony", cardType: "Cashback", default: 2, online: 3 },
  { id: "fidelity-rewards-visa", name: "Fidelity Rewards Visa", issuer: "Fidelity", cardType: "Cashback", default: 2 },
  { id: "sofi-credit-card", name: "SoFi Credit Card", issuer: "SoFi", cardType: "Cashback", default: 2 },
  { id: "venmo-credit-card", name: "Venmo Credit Card (dynamic top — modeled as 3% on several)", issuer: "Synchrony", cardType: "Cashback", default: 1, groceries: 3, dining: 3, gas: 3, travel: 3 },
  { id: "aaa-daily-advantage", name: "AAA Daily Advantage Visa", issuer: "Comenity", cardType: "Cashback", default: 1, groceries: 5, gas: 3 },
  { id: "aaa-travel-advantage", name: "AAA Travel Advantage Visa", issuer: "Comenity", cardType: "Cashback", default: 1, dining: 3, gas: 5, travel: 3 },
  { id: "robinhood-gold-card", name: "Robinhood Gold Card", issuer: "Robinhood", cardType: "Cashback", default: 3 },

  // Travel — general (points shown as comparable %)
  { id: "chase-sapphire-preferred", name: "Chase Sapphire Preferred", issuer: "Chase", cardType: "Travel", default: 1, groceries: 3, dining: 3, travel: 5 },
  { id: "chase-sapphire-reserve", name: "Chase Sapphire Reserve", issuer: "Chase", cardType: "Travel", default: 1, dining: 3, travel: 8 },
  { id: "capital-one-venture", name: "Capital One Venture", issuer: "Capital One", cardType: "Travel", default: 2, travel: 5 },
  { id: "capital-one-venture-x", name: "Capital One Venture X", issuer: "Capital One", cardType: "Travel", default: 2, travel: 10 },
  { id: "capital-one-ventureone", name: "Capital One VentureOne Rewards", issuer: "Capital One", cardType: "Travel", default: 1.25 },
  { id: "amex-gold", name: "American Express Gold", issuer: "Amex", cardType: "Travel", default: 1, groceries: 4, dining: 4, travel: 3 },
  { id: "amex-platinum", name: "American Express Platinum", issuer: "Amex", cardType: "Travel", default: 1, travel: 5 },
  { id: "bilt-mastercard", name: "Bilt Mastercard", issuer: "Wells Fargo", cardType: "Travel", default: 1, dining: 3, travel: 2 },
  { id: "citi-premier-strata", name: "Citi Premier (Strata Premier)", issuer: "Citi", cardType: "Travel", default: 1, groceries: 3, dining: 3, gas: 3, travel: 3 },
  { id: "citi-prestige-legacy", name: "Citi Prestige (legacy)", issuer: "Citi", cardType: "Travel", default: 1, dining: 5, travel: 5 },
  { id: "usbank-altitude-reserve", name: "U.S. Bank Altitude Reserve", issuer: "US Bank", cardType: "Travel", default: 1, travel: 3 },
  { id: "wells-fargo-journey", name: "Wells Fargo Journey", issuer: "Wells Fargo", cardType: "Travel", default: 1, travel: 5 },
  { id: "hsbc-premier-world-elite", name: "HSBC Premier World Elite", issuer: "HSBC", cardType: "Travel", default: 1, travel: 3 },
  { id: "barclays-arrival-plus", name: "Barclays Arrival Plus", issuer: "Barclays", cardType: "Travel", default: 2 },
  { id: "td-first-class-travel", name: "TD First Class Travel", issuer: "TD", cardType: "Travel", default: 1, travel: 3 },

  // Airline co-brands
  { id: "united-explorer", name: "United Explorer Card", issuer: "Chase", cardType: "Airline", default: 1, dining: 2, travel: 2, airline: 2 },
  { id: "united-quest", name: "United Quest Card", issuer: "Chase", cardType: "Airline", default: 1, dining: 2, travel: 3, airline: 3 },
  { id: "united-club-infinite", name: "United Club Infinite", issuer: "Chase", cardType: "Airline", default: 1, dining: 2, travel: 4, airline: 4 },
  { id: "united-gateway", name: "United Gateway Card", issuer: "Chase", cardType: "Airline", default: 1, dining: 2, travel: 2, airline: 2 },
  { id: "delta-skymiles-gold", name: "Delta SkyMiles Gold Amex", issuer: "Amex", cardType: "Airline", default: 1, dining: 2, travel: 2, airline: 2 },
  { id: "delta-skymiles-platinum", name: "Delta SkyMiles Platinum Amex", issuer: "Amex", cardType: "Airline", default: 1, dining: 2, travel: 3, airline: 3 },
  { id: "delta-skymiles-reserve", name: "Delta SkyMiles Reserve Amex", issuer: "Amex", cardType: "Airline", default: 1, dining: 2, travel: 3, airline: 3 },
  { id: "delta-skymiles-blue", name: "Delta SkyMiles Blue", issuer: "Amex", cardType: "Airline", default: 1, dining: 2, travel: 2, airline: 2 },
  { id: "aadvantage-mileup", name: "American Airlines AAdvantage MileUp", issuer: "Citi", cardType: "Airline", default: 1, groceries: 2, travel: 2, airline: 2 },
  { id: "aadvantage-platinum-select", name: "AAdvantage Platinum Select", issuer: "Citi", cardType: "Airline", default: 1, dining: 2, travel: 2, airline: 2 },
  { id: "aadvantage-executive", name: "AAdvantage Executive Card", issuer: "Citi", cardType: "Airline", default: 1, dining: 2, travel: 2, airline: 2 },
  { id: "aadvantage-aviator-red", name: "AAdvantage Aviator Red", issuer: "Barclays", cardType: "Airline", default: 1, dining: 2, travel: 2, airline: 2 },
  { id: "aadvantage-aviator-silver", name: "AAdvantage Aviator Silver", issuer: "Barclays", cardType: "Airline", default: 1, dining: 2, travel: 3, airline: 3 },
  { id: "southwest-plus", name: "Southwest Plus Card", issuer: "Chase", cardType: "Airline", default: 1, dining: 2, travel: 2, airline: 2 },
  { id: "southwest-premier", name: "Southwest Premier Card", issuer: "Chase", cardType: "Airline", default: 1, dining: 2, travel: 2, airline: 2 },
  { id: "southwest-priority", name: "Southwest Priority Card", issuer: "Chase", cardType: "Airline", default: 1, dining: 2, travel: 3, airline: 3 },
  { id: "jetblue-card", name: "JetBlue Card", issuer: "Barclays", cardType: "Airline", default: 1, dining: 2, travel: 3, airline: 3 },
  { id: "jetblue-plus", name: "JetBlue Plus Card", issuer: "Barclays", cardType: "Airline", default: 1, dining: 2, travel: 6, airline: 6 },
  { id: "alaska-airlines-visa", name: "Alaska Airlines Visa", issuer: "BofA", cardType: "Airline", default: 1, dining: 2, travel: 3, airline: 3 },
  { id: "hawaiian-airlines-mastercard", name: "Hawaiian Airlines Mastercard", issuer: "Barclays", cardType: "Airline", default: 1, dining: 2, travel: 3, airline: 3 },

  // Hotel co-brands
  { id: "marriott-bonvoy-boundless", name: "Marriott Bonvoy Boundless", issuer: "Chase", cardType: "Hotel", default: 2, hotel: 17 },
  { id: "marriott-bonvoy-brilliant", name: "Marriott Bonvoy Brilliant", issuer: "Amex", cardType: "Hotel", default: 2, hotel: 6 },
  { id: "hilton-honors-surpass", name: "Hilton Honors Surpass", issuer: "Amex", cardType: "Hotel", default: 3, hotel: 12 },
  { id: "hilton-honors-aspire", name: "Hilton Honors Aspire", issuer: "Amex", cardType: "Hotel", default: 3, hotel: 14 },
  { id: "hilton-honors-card", name: "Hilton Honors Card", issuer: "Amex", cardType: "Hotel", default: 3, hotel: 7 },
  { id: "world-of-hyatt", name: "World of Hyatt Card", issuer: "Chase", cardType: "Hotel", default: 1, hotel: 4 },
  { id: "ihg-premier", name: "IHG Premier Card", issuer: "Chase", cardType: "Hotel", default: 1, hotel: 5 },
  { id: "ihg-traveler", name: "IHG Traveler Card", issuer: "Chase", cardType: "Hotel", default: 1, hotel: 3 },
  { id: "choice-privileges-visa", name: "Choice Privileges Visa", issuer: "Barclays", cardType: "Hotel", default: 1, hotel: 5 },
  { id: "wyndham-earner", name: "Wyndham Rewards Earner", issuer: "Barclays", cardType: "Hotel", default: 1, hotel: 5 },

  // Business
  { id: "amex-blue-business-cash", name: "Amex Blue Business Cash", issuer: "Amex", cardType: "Business", default: 2 },
  { id: "ink-business-cash", name: "Ink Business Cash", issuer: "Chase", cardType: "Business", default: 1, other: 5 },
  { id: "ink-business-unlimited", name: "Ink Business Unlimited", issuer: "Chase", cardType: "Business", default: 1.5 },
  { id: "ink-business-preferred", name: "Ink Business Preferred", issuer: "Chase", cardType: "Business", default: 1, travel: 3 },
  { id: "spark-cash", name: "Capital One Spark Cash", issuer: "Capital One", cardType: "Business", default: 2 },
  { id: "spark-miles", name: "Capital One Spark Miles", issuer: "Capital One", cardType: "Business", default: 2 },
  { id: "brex-card", name: "Brex Card", issuer: "Brex", cardType: "Business", default: 1 },
  { id: "ramp-card", name: "Ramp Card", issuer: "Ramp", cardType: "Business", default: 1 },
  { id: "stripe-corporate-card", name: "Stripe Corporate Card", issuer: "Stripe", cardType: "Business", default: 1.5 },
  { id: "usbank-triple-cash", name: "U.S. Bank Triple Cash", issuer: "US Bank", cardType: "Business", default: 1, gas: 3 },

  // Regional / extra cashback
  { id: "pnc-cash-rewards", name: "PNC Cash Rewards", issuer: "PNC", cardType: "Cashback", default: 1, dining: 3, gas: 4, travel: 2 },
  { id: "td-cash-credit-card", name: "TD Cash Credit Card", issuer: "TD", cardType: "Cashback", default: 1, groceries: 3, dining: 3, gas: 3 },
  { id: "huntington-voice-rewards", name: "Huntington Voice Rewards", issuer: "Huntington", cardType: "Cashback", default: 1, groceries: 3, dining: 3, gas: 3 },
  { id: "fnbo-evergreen", name: "FNBO Evergreen", issuer: "FNBO", cardType: "Cashback", default: 2 },
  { id: "keybank-cashback", name: "KeyBank Cashback", issuer: "KeyBank", cardType: "Cashback", default: 2 },
  { id: "ollo-optimum", name: "Ollo Optimum", issuer: "Ollo", cardType: "Cashback", default: 2.5 },
  { id: "upgrade-cash-rewards", name: "Upgrade Cash Rewards", issuer: "Upgrade", cardType: "Cashback", default: 1.5 },
  { id: "petal-2-visa", name: "Petal 2 Visa", issuer: "Petal", cardType: "Cashback", default: 1.25 },
  { id: "mission-lane-cashback", name: "Mission Lane Cashback", issuer: "Mission Lane", cardType: "Cashback", default: 1.25 },
  { id: "deserve-pro-mastercard", name: "Deserve Pro Mastercard", issuer: "Deserve", cardType: "Cashback", default: 1 },

  // Secured
  { id: "opensky-secured-visa", name: "OpenSky Secured Visa", issuer: "OpenSky", cardType: "Secured", default: 0 },
  { id: "discover-it-secured", name: "Discover it Secured", issuer: "Discover", cardType: "Secured", default: 1 },
  { id: "capital-one-platinum-secured", name: "Capital One Platinum Secured", issuer: "Capital One", cardType: "Secured", default: 0 },
  { id: "bofa-secured-card", name: "Bank of America Secured Card", issuer: "BofA", cardType: "Secured", default: 1, groceries: 2, gas: 2 },
  { id: "citi-secured-mastercard", name: "Citi Secured Mastercard", issuer: "Citi", cardType: "Secured", default: 0 },

  // Legacy from prior catalog
  { id: "synchrony-premier-world", name: "Synchrony Premier World Mastercard", issuer: "Synchrony", cardType: "Cashback", default: 2 },
];

const cards = raw.map((row) => ({
  ...row,
  includeInSeed: SEED_IDS.has(row.id),
}));

fs.writeFileSync(outPath, JSON.stringify(cards, null, 2));
console.log(`Wrote ${cards.length} presets to ${outPath}`);
