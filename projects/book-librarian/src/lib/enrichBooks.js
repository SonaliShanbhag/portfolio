import { fetchVolumeForBook } from "./googleBooks.js";
import { fetchOpenLibraryCover } from "./openLibrary.js";

function goodreadsSearchUrl(title, author) {
  const q = encodeURIComponent(`${title} ${author}`.trim());
  return `https://www.goodreads.com/search?q=${q}`;
}

export async function enrichBooks(books) {
  const out = await Promise.all(
    books.map(async (b) => {
      if (!b.title || !b.author) {
        return {
          ...b,
          summary: "",
          coverUrl: null,
          averageRating: null,
          ratingsCount: null,
          ratingSource: null,
          goodreadsUrl: goodreadsSearchUrl(b.title || "", b.author || ""),
          enrichError: "Missing title or author",
        };
      }

      try {
        const vol = await fetchVolumeForBook(b);
        let coverUrl = vol?.coverUrl;
        if (!coverUrl) {
          coverUrl = await fetchOpenLibraryCover(b.title, b.author);
        }

        const summary =
          vol?.description && vol.description.length > 0
            ? vol.description.replace(/<[^>]+>/g, " ").slice(0, 1200).trim()
            : "No publisher description available in Google Books.";

        return {
          ...b,
          displayTitle: vol?.title || b.title,
          displayAuthors: vol?.authors?.length ? vol.authors.join(", ") : b.author,
          summary,
          coverUrl,
          averageRating: vol?.averageRating ?? null,
          ratingsCount: vol?.ratingsCount ?? null,
          ratingSource: vol?.averageRating != null ? "Google Books" : null,
          categories: vol?.categories || [],
          goodreadsUrl: goodreadsSearchUrl(vol?.title || b.title, b.author),
          pageCount: vol?.pageCount,
          previewLink: vol?.previewLink || null,
        };
      } catch {
        return {
          ...b,
          summary: b.librarianNote,
          coverUrl: null,
          averageRating: null,
          ratingsCount: null,
          ratingSource: null,
          goodreadsUrl: goodreadsSearchUrl(b.title, b.author),
          enrichError: "Could not load book details",
        };
      }
    }),
  );

  return out;
}
