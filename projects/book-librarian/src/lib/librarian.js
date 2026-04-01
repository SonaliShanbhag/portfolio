const SYSTEM = `You are a personal librarian: thoughtful, concise, and enthusiastic about matching readers with books. Use only real, published books.

When the user wants book ideas, recommendations, or "books like X", respond with ONE JSON object only (no markdown, no text before or after the JSON) using exactly this structure:
{"reply":"short warm message to the reader","books":[{"title":"string","author":"string","librarianNote":"1-3 sentences why this fits","genres":["tag1","tag2"]}]}

Rules:
- Include 4 to 6 books unless they asked for fewer.
- "author" is the primary author name as typically printed on the cover.
- For general chat with no book request: {"reply":"your message","books":[]}`;

/** Base URL for Ollama (no trailing slash). */
export function getOllamaBaseUrl() {
  const env = import.meta.env.VITE_OLLAMA_BASE_URL?.trim();
  if (env) return env.replace(/\/$/, "");
  if (import.meta.env.DEV) return "/api/ollama";
  return "http://127.0.0.1:11434";
}

export function getDefaultOllamaModel() {
  return import.meta.env.VITE_OLLAMA_MODEL?.trim() || "llama3.2";
}

function tryParseJsonObject(text) {
  const trimmed = text.trim();
  const tryParse = (s) => {
    try {
      return JSON.parse(s);
    } catch {
      return null;
    }
  };

  let r = tryParse(trimmed);
  if (r && typeof r === "object") return r;

  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) {
    r = tryParse(fence[1].trim());
    if (r && typeof r === "object") return r;
  }

  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last > first) {
    r = tryParse(trimmed.slice(first, last + 1));
    if (r && typeof r === "object") return r;
  }

  return null;
}

function normalizeParsed(parsed) {
  const reply = typeof parsed.reply === "string" ? parsed.reply : "";
  const booksRaw = Array.isArray(parsed.books) ? parsed.books : [];
  const books = booksRaw.map((b) => ({
    title: String(b.title || "").trim(),
    author: String(b.author || "").trim(),
    librarianNote: String(b.librarianNote || "").trim(),
    genres: Array.isArray(b.genres) ? b.genres.map(String) : [],
  }));
  return { reply, books };
}

/**
 * Native Ollama chat with JSON mode (most reliable for small models).
 */
async function chatNativeJson({ base, model, messages }) {
  const res = await fetch(`${base}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: SYSTEM }, ...messages],
      format: "json",
      stream: false,
      options: { temperature: 0.65 },
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    let detail = raw;
    try {
      const j = JSON.parse(raw);
      detail = j.error || j.message || raw;
    } catch {
      /* keep raw */
    }
    throw new Error(typeof detail === "string" ? detail : JSON.stringify(detail));
  }

  const data = JSON.parse(raw);
  const content = data.message?.content;
  if (content == null || content === "") {
    throw new Error("Empty response from model");
  }

  if (typeof content === "object" && content !== null && !Array.isArray(content)) {
    return normalizeParsed(content);
  }

  const text = String(content);
  const parsed = tryParseJsonObject(text);
  if (!parsed) {
    throw new Error(
      "Model returned text that was not valid JSON. Try again or use a larger model (e.g. llama3.1:8b).",
    );
  }
  return normalizeParsed(parsed);
}

/**
 * OpenAI-compatible endpoint fallback.
 */
async function chatOpenAICompat({ base, model, messages }) {
  const res = await fetch(`${base}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      temperature: 0.65,
      messages: [{ role: "system", content: SYSTEM }, ...messages],
      stream: false,
    }),
  });

  const raw = await res.text();
  if (!res.ok) {
    let detail = raw;
    try {
      const j = JSON.parse(raw);
      detail = j.error?.message || j.message || raw;
    } catch {
      /* keep raw */
    }
    throw new Error(detail || `Ollama error ${res.status}`);
  }

  const data = JSON.parse(raw);
  const text = data.choices?.[0]?.message?.content;
  if (!text) throw new Error("Empty response from model");

  const parsed = tryParseJsonObject(text);
  if (!parsed) {
    throw new Error(
      "Model did not return valid JSON. Try a stronger model or repeat the request.",
    );
  }
  return normalizeParsed(parsed);
}

/**
 * @param {object} opts
 * @param {string} opts.model - Ollama model name (e.g. llama3.2)
 * @param {string} [opts.baseUrl] - override base URL
 * @param {{ role: string, content: string }[]} opts.messages
 */
export async function askLibrarian({ model, baseUrl, messages }) {
  const base = (baseUrl || getOllamaBaseUrl()).replace(/\/$/, "");

  try {
    return await chatNativeJson({ base, model, messages });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const is404 =
      msg.includes("404") ||
      msg.includes("Not Found") ||
      msg.toLowerCase().includes("cannot post");
    if (is404) {
      return chatOpenAICompat({ base, model, messages });
    }
    throw e;
  }
}
