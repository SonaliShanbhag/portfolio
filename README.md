# Portfolio

Personal site with two interactive demos under `projects/`:

- **`projects/distributed-simulator`** — request chain, retries, timeouts, failure injection  
- **`projects/async-job-queue`** — queue, workers, backoff, dead-letter handling  

## Local development

Install dependencies once at the repo root and in each project (or rely on the per-project `npm install` you already ran):

```bash
npm install
npm install --prefix projects/distributed-simulator
npm install --prefix projects/async-job-queue
```

**Portfolio only** (demos will 404 unless you also run the two apps):

```bash
npm run dev
```

**Portfolio + both demos** (recommended): runs the main site on port 5173 and proxies `/simulator/` and `/queue/` to the demo dev servers.

```bash
npm run dev:all
```

Optional: create `.env` from `.env.example` and set `VITE_GITHUB_REPO` if the repo name is not `portfolio`. The site defaults to `https://github.com/SonaliShanbhag/portfolio`.

## Production build

Builds the main site and copies the two demos into `dist/simulator` and `dist/queue`:

```bash
npm run build:all
```

Preview the combined output:

```bash
npm run preview
```

Then open `/simulator/` and `/queue/` from the portfolio home page.

## GitHub Pages

1. Create a repository on GitHub and push this folder (initialize git first if needed).
2. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Push to `main` (or `master`). The workflow in `.github/workflows/deploy-pages.yml` runs `npm run build:all` and deploys `dist/`.

The workflow sets `VITE_GITHUB_REPO` to `https://github.com/<owner>/<repo>` automatically so demo cards link to the correct source tree.

If your site URL is `https://<user>.github.io/<repo>/`, relative links (`./simulator/`, `./queue/`) match that layout.

## Repository layout

| Path | Role |
|------|------|
| `src/` | Main portfolio React app |
| `projects/distributed-simulator/` | Vite app → deployed to `dist/simulator/` |
| `projects/async-job-queue/` | Vite app → deployed to `dist/queue/` |
| `scripts/copy-projects.mjs` | Copies project builds into `dist/` after `vite build` |
