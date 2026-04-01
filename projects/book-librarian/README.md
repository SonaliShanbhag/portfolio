# Personal librarian (browser demo)

An **AI chat** that acts like a **personal librarian**: you describe genres, books you liked, or the kind of read you want, and it suggests **real titles** with **cover art**, a **short description** (from publisher metadata when available), and **aggregate star ratings** from **Google Books**.

**Inference** runs on your machine via **[Ollama](https://ollama.com/)** (OpenAI-compatible API) — no OpenAI API key. **Goodreads** does not provide a public API; each card links to **Goodreads search** for community ratings and reviews.

**UI:** **Chat** for recommendations, **Starred books** for a “want to read” list (saved in `localStorage` via **Save** on each card).

## Prerequisites

1. Install and start [Ollama](https://ollama.com/).
2. Pull a model, for example: `ollama pull llama3.2`
3. Ensure `ollama serve` is running (usually automatic).

## Setup

```bash
npm install --prefix projects/book-librarian
npm run dev --prefix projects/book-librarian
```

Open the app (port **5176**), or from the portfolio root use `npm run dev:all` and visit `/librarian/`.

The dev server proxies **`/api/ollama`** → `http://127.0.0.1:11434` so the browser does not need CORS changes. For a **production build** opened as static files, the app defaults to **`http://127.0.0.1:11434`** (your local Ollama), or set **`VITE_OLLAMA_BASE_URL`** at build time.

## Configuration

| Variable | Purpose |
|----------|---------|
| **Settings UI** | Ollama model name (e.g. `llama3.2`) and optional API base URL override (stored in `localStorage`) |
| `VITE_OLLAMA_MODEL` | Default model if not saved |
| `VITE_OLLAMA_BASE_URL` | Default base URL (overrides dev `/api/ollama` when set) |
| `VITE_GOOGLE_BOOKS_API_KEY` | Optional; increases Google Books API quota |

## Production build

```bash
npm run build --prefix projects/book-librarian
```

Output is static files under `dist/` (suitable for GitHub Pages when copied into the main site’s `dist/librarian/`). A static deploy cannot reach Ollama unless the viewer runs Ollama locally or you point **API base URL** at a reachable server.
