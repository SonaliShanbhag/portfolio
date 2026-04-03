import { useEffect, useState } from "react";
import "./PortfolioBackBar.css";

/**
 * When the demo is opened from the main portfolio, the URL includes ?deck=<id>.
 * Link back to the site root with open_projects + deck so the projects drawer opens on that card.
 *
 * Styles live in CSS (not Tailwind) because subproject builds don’t scan ../../shared for classes.
 */
export default function PortfolioBackBar() {
  const [deck, setDeck] = useState(/** @type {string | null} */ (null));

  useEffect(() => {
    setDeck(new URLSearchParams(window.location.search).get("deck"));
  }, []);

  if (!deck) return null;

  const href = `../?open_projects=1&deck=${encodeURIComponent(deck)}`;

  return (
    <>
      {/* In-flow gap so titles (e.g. Card Fit eyebrow) don’t sit under the fixed control */}
      <div className="portfolio-back-spacer" aria-hidden />
      <a href={href} className="portfolio-back-link">
        ← Back to portfolio
      </a>
    </>
  );
}
