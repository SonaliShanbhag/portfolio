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
| `src/data/cards.json` | Default cards when not signed in or before user cards load |
| `src/lib/firestore/userData.ts` | Firestore reads/writes for signed-in users |
| `firestore.rules` | Users may only read/write their own `users/{uid}/…` data |

The backend uses **Next.js Route Handlers** (Vercel serverless), not a separate Express server.

## Tech stack

- Next.js 15 (App Router), React 19, TypeScript  
- Tailwind CSS v4  
- **Phase 2:** Firebase Auth (Google) + Firestore (client SDK + security rules)  
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

Optional: `"cards": [ { "name": "…", "default": 1, "groceries": 2 } ]` — if omitted, `src/data/cards.json` is used (anonymous mode). Signed-in users send their Firestore card set automatically.

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

**Behavior when configured:** users can **Sign in with Google**. On first sign-in, sample cards from `cards.json` are copied into `users/{uid}/cards` if empty. Transactions live under `users/{uid}/transactions`. The UI supports editing cards, adding/removing cards, and removing individual transactions.

**Not in Phase 2:** Plaid, server-side Admin SDK, or PDF export (see Phase 3).

## Phase 3 (ideas)

Charts, CSV/PDF export, optional Plaid Sandbox, richer categorization.
