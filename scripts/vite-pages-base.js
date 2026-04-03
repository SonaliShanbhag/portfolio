/**
 * GitHub Pages: user/organization site uses repo `<owner>.github.io` at domain root.
 * Any other repo is a "project site" at `/<repository>/`.
 *
 * Set VITE_PAGES_BASE in CI (see deploy-pages.yml). Omit locally for root-style paths.
 */

/**
 * Demo apps: absolute `base` from `VITE_PAGES_BASE` so asset URLs never depend on the browser
 * resolving `./` (query strings, proxies, or CDNs can break that). CI sets `VITE_PAGES_BASE` (default `/`).
 */
/** @param {string} segment e.g. "simulator" */
export function viteDemoBase(segment) {
  const raw = process.env.VITE_PAGES_BASE;
  if (!raw || raw === "/") return `/${segment}/`;
  const trimmed = raw.replace(/\/$/, "");
  const withLead = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${withLead}/${segment}/`;
}

/** @param {"serve" | "build"} command */
export function viteMainBase(command) {
  if (command === "serve") return "/";
  const raw = process.env.VITE_PAGES_BASE;
  if (raw && raw !== "/") {
    return raw.endsWith("/") ? raw : `${raw}/`;
  }
  // Default `/` so assets resolve on the site root (custom domain or user.github.io).
  return "/";
}
