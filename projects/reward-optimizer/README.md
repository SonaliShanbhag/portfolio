# Credit Card Reward Optimizer

**Card Fit add-on:** given transactions (date, merchant, category, amount), the app recommends which card earns the most **cash-equivalent reward** per row. Totals show reward dollars per card if you always used the suggested card.

## Problem → solution

- **Problem:** With several cards, the best card depends on the purchase category; manual comparison is tedious.
- **Solution:** Encode each card’s category multipliers (percentage points), match each transaction’s category, compute `reward = amount × (rate / 100)`, and pick the maximum.

## Architecture

| Layer | Role |
|--------|------|
| `src/components/OptimizerApp.tsx` | Main UI: CSV, manual rows, table, summary, Phase 2 sync |
| `src/app/api/optimize/route.ts` | Next.js **Route Handler** — validates JSON, runs optimizer |
| `src/lib/optimize.ts` | Pure scoring: best card per transaction, totals per card |
| `src/lib/categorize.ts` | Merchant keyword → category when CSV uses `auto` or blank category |
| `src/data/cardPresets.json` | Known card templates (dropdown + seed data); illustrative rates |
| `src/lib/cardPresets.ts` | Preset helpers, anonymous defaults, first-sign-in seed |
| `src/lib/firestore/userData.ts` | Firestore reads/writes for signed-in users |
| `src/components/Phase3Panel.tsx` | Step 4: charts + CSV export + print |
| `src/components/RewardsCharts.tsx` | Recharts bar charts (by card, by category) |
| `src/lib/exportResults.ts` | Build and download results CSV |
| `firestore.rules` | Users may only read/write their own `users/{uid}/…` data |

The backend uses **Next.js Route Handlers** (Vercel serverless), not a separate Express server.

## Tech stack

- Next.js 15 (App Router), React 19, TypeScript  
- Tailwind CSS v4  
- **Phase 2:** Firebase Auth (Google) + Firestore (client SDK + security rules)  
- **Phase 3:** Recharts dashboards, CSV export, print-friendly layout  
- Deploy: **Vercel** — add env vars in the project settings

## Local development

```bash
cd projects/reward-optimizer
npm install
npm run dev
```

Open [http://localhost:5179](http://localhost:5179).

Copy `.env.example` to `.env.local` and fill Firebase keys (see Phase 2). Without them, the app still runs anonymously with bundled cards; sign-in is disabled until configured.

## CSV format

Required columns: **`date`**, **`merchant`**, **`amount`**.  
**`category`** is optional — omit the column, leave cells blank, or use **`auto`** to infer category from merchant text (simple keyword rules).

Example: `public/sample-transactions.csv`.

## API

`POST /api/optimize`

```json
{
  "transactions": [
    { "date": "2025-03-01", "merchant": "Store", "category": "groceries", "amount": 50 }
  ]
}
```

Optional: `"cards": [ { "name": "…", "default": 1, "groceries": 2 } ]` — if omitted, seeded defaults from `cardPresets.json` are used (anonymous mode). Signed-in users send their Firestore card set automatically.

## Phase 2 — Firebase (Auth + Firestore)

1. Create a [Firebase](https://console.firebase.google.com/) project (free Spark tier is enough for development).
2. Enable **Authentication → Sign-in method → Google** and add support email / authorized domains (`localhost`, your Vercel domain).
3. Enable **Firestore** in native mode.
4. Deploy rules from this repo (install [Firebase CLI](https://firebase.google.com/docs/cli), then from `projects/reward-optimizer/`):
   ```bash
   firebase deploy --only firestore:rules --project YOUR_PROJECT_ID
   ```
   Or paste the contents of `firestore.rules` into **Firestore → Rules** in the console.
5. Register a web app in Project settings and copy the config into **`.env.local`** / Vercel:

   - `NEXT_PUBLIC_FIREBASE_API_KEY`
   - `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
   - `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
   - `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
   - `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
   - `NEXT_PUBLIC_FIREBASE_APP_ID`

**Behavior when configured:** users can **Sign in with Google**. On first sign-in, sample cards (entries in `cardPresets.json` marked `includeInSeed`) are copied into `users/{uid}/cards` if empty. **Add card** offers a **template dropdown** with common products and auto-filled rates, or **Other** for fully manual entry. Transactions live under `users/{uid}/transactions`.

**Not in Phase 2:** Plaid, server-side Admin SDK, or PDF export (see Phase 3).

### FAQ: sample cards vs Google Pay

- **Are the listed cards my real cards?** No. The starter list is **illustrative data** from the preset catalog. Template rates are approximations for education, not live issuer data.
- **If I add a card in Google Pay / Wallet, will it show up here?** **No.** Firebase Google sign-in only proves who you are; it does **not** grant access to Google Pay, Wallet, or bank accounts. There is no supported “test” path to sync Wallet into this app without building a separate Google Pay integration (heavy restrictions).
- **How do I model my real cards?** Sign in, then use **Edit** / **Add card** and enter names and reward **rates yourself** (from issuer docs or your statement). That data is saved in **Firestore** under your user id — verify in Firebase Console → Firestore → `users/{uid}/cards`.

## Phase 3 (shipped)

- **Charts** — Bar charts for estimated reward by **card** and by **spending category** (Recharts), after you have at least one result row.
- **Export** — **Download results (CSV)** with per-row detail plus totals by card; **Print / Save as PDF** uses the browser print dialog.
- **Print layout** — `no-print` hides sign-in, “how it works,” guest hints, card wallet, and the “add spending” column so print/PDF focuses on summary, table, and charts.
- **Not in Phase 3:** Plaid, server-side PDF generation, light theme toggle (UI remains dark-first).

**Still optional later:** Plaid Sandbox, richer merchant categorization, dedicated PDF library.
