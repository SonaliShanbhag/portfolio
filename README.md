# Portfolio

Personal site with interactive demos under `projects/`:

- **`projects/distributed-simulator`** - request chain, retries, timeouts, failure injection  
- **`projects/async-job-queue`** - queue, workers, backoff, dead-letter handling  
- **`projects/book-librarian`** - Ollama + Google Books: librarian-style recommendations with covers, blurbs, and ratings  
- **`projects/mock-interview`** - mock hiring-manager interviews (offline or Groq BYOK) for company + role  
- **`projects/card-fit`** - CSV/PDF spending analysis, merchant overrides, fee break-even, card ranking (local-first)  
- **`projects/reward-optimizer`** - Next.js + Vercel: best card per transaction from category rewards (Card Fit add-on; separate dev server)

## Local development

Install dependencies once at the repo root and in each project (or rely on the per-project `npm install` you already ran):

```bash
npm install
npm install --prefix projects/distributed-simulator
npm install --prefix projects/async-job-queue
npm install --prefix projects/book-librarian
npm install --prefix projects/mock-interview
npm install --prefix projects/card-fit
npm install --prefix projects/reward-optimizer
```

**Reward Optimizer** is a Next.js app (not served by the main Vite portfolio). Run it on its own:

```bash
npm run dev --prefix projects/reward-optimizer
```

Then open `http://localhost:5179`.

**Portfolio only** - main site on port 5173; routes **`/simulator/`**, **`/queue/`**, **`/librarian/`**, **`/interview/`**, and **`/card-fit/`** will not work (Vite may log `http proxy error … ECONNREFUSED` because nothing is listening on ports 5174–5178).

```bash
npm run dev
```

**Portfolio + all demos** (recommended): starts the main site and the three demo Vite servers so the proxy works.

```bash
npm run dev:all
```

Optional: create `.env` from `.env.example` and set `VITE_GITHUB_REPO` if the repo name is not `portfolio`. The site defaults to `https://github.com/SonaliShanbhag/portfolio`.

## Production build

Builds the main site and copies the demos into `dist/simulator`, `dist/queue`, `dist/librarian`, `dist/interview`, and `dist/card-fit`:

```bash
npm run build:all
```

Preview the combined output:

```bash
npm run preview
```

Then open `/simulator/`, `/queue/`, `/librarian/`, `/interview/`, and `/card-fit/` from the portfolio home page.

Asset URLs are driven by **`VITE_PAGES_BASE`** (see `scripts/vite-pages-base.js`). For a **root** deploy (e.g. `https://yoursite.com/` or `https://<user>.github.io/`), leave it unset or set it to `/` — demos use `/simulator/`, `/queue/`, etc. For **`https://<user>.github.io/<repo>/`**, set **`VITE_PAGES_BASE=/<repo>/`** (trailing slash) before `npm run build:all` so assets resolve under `/repo/simulator/`, etc.

## GitHub Pages

1. Create a repository on GitHub and push this folder (initialize git first if needed).
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main` (or `master`). The workflow in `.github/workflows/deploy-pages.yml` runs `npm run build:all` and deploys `dist/`.

The workflow sets `VITE_GITHUB_REPO` to `https://github.com/<owner>/<repo>` automatically so demo cards link to the correct source tree.

**`VITE_PAGES_BASE` (Actions variable):** The deploy workflow sets this automatically: **`/`** for a `<owner>.github.io` user site repo, otherwise **`/<repository.name>/`** for project Pages. If you use a **custom domain at the site root** while the repo is **not** `<owner>.github.io`, GitHub still publishes under `/<repo>/` in the URL sense for asset resolution — but your domain often maps to the **root** of `dist/`. In that common case, add a repository **Actions variable** **`VITE_PAGES_BASE`** with value **`/`** so builds match `https://yourdomain.com/simulator/` instead of requesting `/portfolio/simulator/` (which 404s and shows a blank demo).

Optional: add **`REWARD_OPTIMIZER_DEMO`** if you need a different URL than the default. The build passes it as `VITE_REWARD_OPTIMIZER_DEMO`. For local dev, set it in `.env` (see `.env.example`).

**Personal librarian demo:** GitHub Pages only hosts static files. The app talks to **Ollama on your machine** (`127.0.0.1:11434` by default). Visitors who only open the public URL will not have your Ollama running; for a live chat demo, run Ollama locally and open the site (or record a short video for reviewers). Do not expose Ollama to the public internet without authentication.

## Repository layout

| Path | Role |
|------|------|
| `src/` | Main portfolio React app |
| `projects/distributed-simulator/` | Vite app → deployed to `dist/simulator/` |
| `projects/async-job-queue/` | Vite app → deployed to `dist/queue/` |
| `projects/book-librarian/` | Vite app → deployed to `dist/librarian/` |
| `projects/mock-interview/` | Vite app → deployed to `dist/interview/` |
| `projects/card-fit/` | Vite app → deployed to `dist/card-fit/` |
| `scripts/copy-projects.mjs` | Copies project builds into `dist/` after `vite build` |
