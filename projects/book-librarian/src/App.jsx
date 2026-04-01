import React, { useCallback, useEffect, useRef, useState } from "react";
import { askLibrarian, getDefaultOllamaModel, getOllamaBaseUrl } from "./lib/librarian.js";
import { enrichBooks } from "./lib/enrichBooks.js";

const STORAGE_MODEL = "book-librarian-ollama-model";
const STORAGE_BASE = "book-librarian-ollama-base";
const STORAGE_STARRED = "book-librarian-starred";

function starKey(book) {
  const t = (book.title || book.displayTitle || "").trim().toLowerCase();
  const a = (book.author || book.displayAuthors || "").trim().toLowerCase();
  return `${t}|${a}`;
}

function RatingStars({ value }) {
  const n = Math.round(Math.min(5, Math.max(0, value)));
  return (
    <span className="text-amber-400" aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {"★".repeat(n)}
      {"☆".repeat(5 - n)}
    </span>
  );
}

function BookCard({ book, showStar, isStarred, onToggleStar }) {
  return (
    <article className="relative flex gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      {showStar && (
        <button
          type="button"
          onClick={() => onToggleStar?.(book)}
          className="absolute right-3 top-3 rounded-lg border border-white/15 bg-black/40 px-2 py-1 text-sm text-amber-300 transition hover:border-amber-400/50 hover:bg-black/60"
          title={isStarred ? "Remove from my list" : "Add to my list"}
          aria-pressed={isStarred}
          aria-label={isStarred ? "Remove from my list" : "Add to my list"}
        >
          {isStarred ? "★ Saved" : "☆ Save"}
        </button>
      )}
      <div className="shrink-0">
        {book.coverUrl ? (
          <img
            src={book.coverUrl}
            alt=""
            className="h-40 w-[104px] rounded-md object-cover shadow-lg ring-1 ring-white/10"
            loading="lazy"
          />
        ) : (
          <div className="flex h-40 w-[104px] items-center justify-center rounded-md bg-zinc-800/80 text-xs text-zinc-500">
            No cover
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1 pr-14 sm:pr-16">
        <h3 className="font-display text-lg font-bold leading-snug text-white">
          {book.displayTitle || book.title}
        </h3>
        <p className="mt-0.5 text-sm text-zinc-400">
          {book.displayAuthors || book.author}
        </p>
        {book.genres?.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {book.genres.slice(0, 4).map((g) => (
              <span
                key={g}
                className="rounded-full border border-fuchsia-500/25 bg-fuchsia-500/10 px-2 py-0.5 text-xs text-fuchsia-200/90"
              >
                {g}
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 space-y-1 text-sm text-zinc-300">
          {book.averageRating != null ? (
            <p className="flex flex-wrap items-center gap-2">
              <RatingStars value={book.averageRating} />
              <span className="font-medium text-zinc-200">{book.averageRating.toFixed(1)}</span>
              {book.ratingsCount != null && (
                <span className="text-zinc-500">({book.ratingsCount.toLocaleString()} ratings)</span>
              )}
              <span className="text-xs text-zinc-500">
                {book.ratingSource ? `via ${book.ratingSource}` : ""}
              </span>
            </p>
          ) : (
            <p className="text-zinc-500">
              No public aggregate rating found - open Goodreads below for community scores.
            </p>
          )}
        </div>
        <p className="mt-3 text-sm leading-relaxed text-zinc-400">{book.summary}</p>
        {book.librarianNote && (
          <p className="mt-2 border-l-2 border-fuchsia-500/40 pl-3 text-sm italic text-fuchsia-200/80">
            Librarian: {book.librarianNote}
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-3">
          <a
            href={book.goodreadsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-fuchsia-400 underline-offset-2 hover:text-fuchsia-300 hover:underline"
          >
            Open on Goodreads
          </a>
          {book.previewLink && (
            <a
              href={book.previewLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-zinc-500 underline-offset-2 hover:text-zinc-300 hover:underline"
            >
              Preview
            </a>
          )}
        </div>
        {book.enrichError && (
          <p className="mt-2 text-xs text-amber-500/90">{book.enrichError}</p>
        )}
      </div>
    </article>
  );
}

const SUGGESTIONS = [
  "Literary fiction like A Little Life but a bit shorter",
  "Cozy mysteries with strong sense of place",
  "Nonfiction about how habits and decision-making work",
];

export default function App() {
  const [model, setModel] = useState(getDefaultOllamaModel);
  const [baseUrlOverride, setBaseUrlOverride] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");
  const [starredBooks, setStarredBooks] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [messages, setMessages] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    const m = localStorage.getItem(STORAGE_MODEL);
    const b = localStorage.getItem(STORAGE_BASE);
    if (m) setModel(m);
    if (b) setBaseUrlOverride(b);
    try {
      const raw = localStorage.getItem(STORAGE_STARRED);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setStarredBooks(parsed);
      }
    } catch {
      /* ignore corrupt storage */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_STARRED, JSON.stringify(starredBooks));
    } catch {
      /* quota */
    }
  }, [starredBooks]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const resolvedBaseUrl = useCallback(() => {
    const t = baseUrlOverride.trim();
    if (t) return t.replace(/\/$/, "");
    return getOllamaBaseUrl();
  }, [baseUrlOverride]);

  const saveSettings = useCallback(() => {
    const m = model.trim() || getDefaultOllamaModel();
    setModel(m);
    localStorage.setItem(STORAGE_MODEL, m);
    const b = baseUrlOverride.trim();
    if (b) localStorage.setItem(STORAGE_BASE, b);
    else localStorage.removeItem(STORAGE_BASE);
    setShowSettings(false);
  }, [model, baseUrlOverride]);

  const isBookStarred = useCallback(
    (book) => starredBooks.some((s) => starKey(s) === starKey(book)),
    [starredBooks],
  );

  const toggleStarred = useCallback((book) => {
    const key = starKey(book);
    setStarredBooks((prev) => {
      const exists = prev.some((s) => starKey(s) === key);
      if (exists) return prev.filter((s) => starKey(s) !== key);
      return [...prev, { ...book }];
    });
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;

    setError(null);
    setInput("");
    const userMsg = { role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);

    const history = [...messages, userMsg].map(({ role, content }) => ({
      role,
      content: typeof content === "string" ? content : "",
    }));

    const m = model.trim() || getDefaultOllamaModel();
    const baseUrl = resolvedBaseUrl();

    try {
      const { reply, books } = await askLibrarian({
        model: m,
        baseUrl,
        messages: history,
      });
      const enriched = books.length ? await enrichBooks(books) : [];
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply, books: enriched },
      ]);
    } catch (e) {
      setError(e.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [model, input, loading, messages, resolvedBaseUrl]);

  const starredCount = starredBooks.length;

  return (
    <div className="min-h-screen bg-[#070708] text-zinc-100 pb-32">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-10%,rgba(217,70,239,0.1),transparent)]" />

      <header className="relative border-b border-white/5 bg-[#070708]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-display text-xl font-bold text-white">Personal librarian</h1>
            <p className="mt-1 text-sm text-zinc-400">
              Local <strong className="font-medium text-zinc-300">Ollama</strong> +{" "}
              <strong className="font-medium text-zinc-300">Google Books</strong> - describe genres,
              comp titles, or the vibe you want.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowSettings((s) => !s)}
            className="shrink-0 rounded-lg border border-white/15 px-4 py-2 text-sm text-zinc-200 hover:border-fuchsia-500/40"
          >
            Settings
          </button>
        </div>

        <nav
          className="mx-auto flex max-w-3xl gap-1 border-t border-white/5 px-4 pb-4 pt-3"
          aria-label="Main"
        >
          <button
            type="button"
            onClick={() => setActiveTab("chat")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "chat"
                ? "bg-fuchsia-600/25 text-white ring-1 ring-fuchsia-500/40"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            }`}
          >
            Chat
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("starred")}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              activeTab === "starred"
                ? "bg-fuchsia-600/25 text-white ring-1 ring-fuchsia-500/40"
                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
            }`}
          >
            Starred books
            {starredCount > 0 ? (
              <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs text-zinc-300">
                {starredCount}
              </span>
            ) : null}
          </button>
        </nav>
      </header>

      {showSettings && (
        <div className="relative border-b border-white/5 bg-black/30 px-4 py-4">
          <div className="mx-auto max-w-3xl space-y-3">
            <p className="text-sm text-zinc-400">
              Run <code className="text-zinc-300">ollama serve</code> and pull a model (e.g.{" "}
              <code className="text-zinc-300">ollama pull llama3.2</code>). Book covers and ratings
              load from Google Books (optional <code className="text-zinc-300">VITE_GOOGLE_BOOKS_API_KEY</code>{" "}
              for quota).
            </p>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                Ollama model
              </label>
              <input
                type="text"
                autoComplete="off"
                placeholder={getDefaultOllamaModel()}
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-fuchsia-500/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                API base URL (optional)
              </label>
              <input
                type="text"
                autoComplete="off"
                placeholder={`Default: ${getOllamaBaseUrl()}`}
                value={baseUrlOverride}
                onChange={(e) => setBaseUrlOverride(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:border-fuchsia-500/50 focus:outline-none"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Leave empty to use the dev proxy (<code className="text-zinc-300">/api/ollama</code>) or{" "}
                <code className="text-zinc-300">http://127.0.0.1:11434</code> after production build.
              </p>
            </div>
            <button
              type="button"
              onClick={saveSettings}
              className="rounded-lg bg-fuchsia-600 px-5 py-2 text-sm font-semibold text-white hover:bg-fuchsia-500"
            >
              Save
            </button>
            <p className="text-xs text-zinc-500">
              Aggregate star ratings come from Google Books when available. Goodreads has no public API;
              use &quot;Open on Goodreads&quot; for community scores.
            </p>
          </div>
        </div>
      )}

      <main className="relative mx-auto max-w-3xl px-4 py-6">
        {activeTab === "chat" && (
          <>
            {messages.length === 0 && !loading && (
              <div className="mb-8 rounded-xl border border-white/10 bg-white/[0.02] p-6">
                <p className="text-sm font-medium text-zinc-300">Try asking</p>
                <ul className="mt-3 space-y-2">
                  {SUGGESTIONS.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onClick={() => setInput(s)}
                        className="text-left text-sm text-fuchsia-300/90 hover:text-fuchsia-200 hover:underline"
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="space-y-8">
              {messages.map((msg, i) => (
                <div key={i} className={msg.role === "user" ? "flex justify-end" : ""}>
                  {msg.role === "user" ? (
                    <div className="max-w-[85%] rounded-2xl rounded-br-md bg-fuchsia-600/25 px-4 py-3 text-sm text-zinc-100 ring-1 ring-fuchsia-500/20">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <p className="text-sm leading-relaxed text-zinc-300 whitespace-pre-wrap">
                        {msg.content}
                      </p>
                      {msg.books?.length > 0 && (
                        <div className="space-y-4">
                          {msg.books.map((b, j) => (
                            <BookCard
                              key={`${b.title}-${b.author}-${j}`}
                              book={b}
                              showStar
                              isStarred={isBookStarred(b)}
                              onToggleStar={toggleStarred}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {loading && (
              <p className="mt-6 text-sm text-zinc-500 animate-pulse">Consulting the stacks…</p>
            )}
            {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
            <div ref={bottomRef} />
          </>
        )}

        {activeTab === "starred" && (
          <div>
            <h2 className="font-display text-lg font-semibold text-white">My list</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Books you saved to read later. Stored in this browser only.
            </p>
            {starredBooks.length === 0 ? (
              <p className="mt-8 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-10 text-center text-sm text-zinc-500">
                No books yet. Open <strong className="text-zinc-400">Chat</strong> and tap{" "}
                <strong className="text-zinc-400">Save</strong> on a book to add it to your list.
              </p>
            ) : (
              <div className="mt-6 space-y-4">
                {starredBooks.map((b) => (
                  <BookCard
                    key={starKey(b)}
                    book={b}
                    showStar
                    isStarred
                    onToggleStar={toggleStarred}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {activeTab === "chat" && (
        <footer className="fixed bottom-0 left-0 right-0 border-t border-white/5 bg-[#070708]/95 backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl gap-2 px-4 py-4">
            <textarea
              rows={2}
              placeholder="e.g. I loved The Night Circus - something similarly lyrical but grounded in the real world…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              className="min-h-[52px] flex-1 resize-y rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-fuchsia-500/50 focus:outline-none"
            />
            <button
              type="button"
              disabled={loading}
              onClick={send}
              className="shrink-0 self-end rounded-xl bg-fuchsia-600 px-5 py-3 text-sm font-semibold text-white hover:bg-fuchsia-500 disabled:opacity-50"
            >
              Send
            </button>
          </div>
        </footer>
      )}
    </div>
  );
}
