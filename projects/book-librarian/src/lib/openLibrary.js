/** Fallback cover image from Open Library when Google Books has no cover. */
export async function fetchOpenLibraryCover(title, author) {
  const q = encodeURIComponent(`${title} ${author}`.trim());
  const res = await fetch(
    `https://openlibrary.org/search.json?q=${q}&limit=1&fields=cover_i,title,author_name`,
  );
  if (!res.ok) return null;
  const data = await res.json();
  const doc = data.docs?.[0];
  if (!doc?.cover_i) return null;
  return `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`;
}
