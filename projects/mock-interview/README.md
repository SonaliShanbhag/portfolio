# Mock interview coach

Vite + React app for hiring-manager-style practice: enter a company and role, then work through **behavioral and technical** prompts.

## Free-tier behavior

- **Offline (default)** — No API keys, no server. Uses curated company themes and question pools in `src/data/companies.js`. After each answer you get **coach feedback** (heuristic). When you finish the last question, you get **Behavioral / Technical / Overall scores (1–5)** and **what to work on** (still heuristic — see note on the card).
- **AI mode (optional)** — Paste your own [Groq](https://console.groq.com/) API key (free tier). The interviewer replies in two parts (coach + next question) when the model follows the `---` format. Click **End interview & get scores** for JSON-evaluated ratings and narrative feedback.

## Local dev

From repo root (with portfolio dev server proxy):

```bash
npm install --prefix projects/mock-interview
npm run dev --prefix projects/mock-interview
```

Or use `npm run dev:all` at the portfolio root and open `/interview/`.

## Disclaimer

Illustrative practice only — not affiliated with any employer. Questions are educational; real processes vary.
