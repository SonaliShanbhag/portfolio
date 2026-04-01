/**
 * Fetches volume metadata from Google Books (covers, description, aggregate star rating).
 * Optional VITE_GOOGLE_BOOKS_API_KEY improves quota; works without a key for light use.
 */
export async function fetchVolumeForBook({ title, author }) {
  const key = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY;
  const q = encodeURIComponent(`${title} ${author}`);
  let url = `https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=3`;
  if (key) url += `&key=${key}`;

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const items = data.items;
  if (!items?.length) return null;

  const normalize = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const wantTitle = normalize(title);
  const wantAuthor = normalize(author);

  let best = items[0];
  let bestScore = 0;
  for (const item of items) {
    const vi = item.volumeInfo || {};
    const t = normalize(vi.title);
    const a = (vi.authors || []).map(normalize).join("");
    let score = 0;
    if (wantTitle && t.includes(wantTitle.slice(0, Math.min(12, wantTitle.length)))) score += 2;
    if (wantAuthor && a.includes(wantAuthor.slice(0, Math.min(10, wantAuthor.length)))) score += 2;
    if (score >= bestScore) {
      bestScore = score;
      best = item;
    }
  }

  const vi = best.volumeInfo || {};
  const thumbs = vi.imageLinks || {};
  const coverUrl =
    thumbs.extraLarge ||
    thumbs.large ||
    thumbs.medium ||
    thumbs.small ||
    thumbs.thumbnail ||
    thumbs.smallThumbnail ||
    null;

  const isbn =
    (vi.industryIdentifiers || []).find((id) => id.type === "ISBN_13")?.identifier ||
    (vi.industryIdentifiers || []).find((id) => id.type === "ISBN_10")?.identifier ||
    null;

  return {
    googleBooksId: best.id,
    title: vi.title,
    authors: vi.authors || [],
    description: vi.description || vi.subtitle || "",
    coverUrl: coverUrl ? coverUrl.replace(/^http:/, "https:") : null,
    averageRating: typeof vi.averageRating === "number" ? vi.averageRating : null,
    ratingsCount: typeof vi.ratingsCount === "number" ? vi.ratingsCount : null,
    pageCount: vi.pageCount,
    categories: vi.categories || [],
    isbn,
    infoLink: vi.infoLink || null,
    previewLink: vi.previewLink || null,
  };
}
