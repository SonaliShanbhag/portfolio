# Credit Card Reward Optimizer (MVP)

**Card Fit add-on:** given a list of transactions (date, merchant, category, amount), this app recommends which card earns the most **cash-equivalent reward** per row using fixed category rates in JSON. Totals show how much each card would earn if you always used the suggested card.

## Problem → solution

- **Problem:** With several cards, the best card depends on the purchase category; manual comparison is tedious.
- **Solution:** Encode each card’s category multipliers (as percentage points), match each transaction’s category, compute `reward = amount × (rate / 100)`, and pick the maximum.
- **MVP limits:** No bank feeds, no Plaid, no auth, no database — processing is in-memory on the server per request.

## Architecture

| Layer | Role |
|--------|------|
| `src/app/page.tsx` | React client UI: CSV upload, manual rows, table, summary |
| `src/app/api/optimize/route.ts` | Vercel serverless **Route Handler** (Node runtime) — validates JSON, runs optimizer |
| `src/lib/optimize.ts` | Pure scoring: best card per transaction, totals per card |
| `src/data/cards.json` | Sample issuers / category rates (illustrative, not live issuer terms) |

The backend uses **Next.js Route Handlers** instead of a separate Express process; on Vercel they deploy as serverless functions and satisfy the same “API on the free tier” goal with less wiring than `express` + `serverless-http`.

## Tech stack

- Next.js 15 (App Router), React 19, TypeScript  
- Tailwind CSS v4  
- Deploy: **Vercel** (push this folder as its own repo or monorepo app; zero-config for Next)

## Local development

```bash
cd projects/reward-optimizer
npm install
npm run dev
```

Open [http://localhost:5179](http://localhost:5179) (port 5179 avoids clashing with other portfolio demos).

## CSV format

Header row (order can vary; names are case-insensitive):

```text
date,merchant,category,amount
```

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

Optional: `"cards": [ { "name": "…", "default": 1, "groceries": 2 } ]` — if omitted, `src/data/cards.json` is used.

## Phase 2 (not built here)

Firebase Auth / Firestore, user-managed card lists, Plaid sandbox, auto-categorization.

## Phase 3 (not built here)

Charts, export CSV/PDF, dark mode polish (the MVP UI is already dark-themed).
