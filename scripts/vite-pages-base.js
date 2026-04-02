/**
 * GitHub Pages: user/organization site uses repo `<owner>.github.io` at domain root.
 * Any other repo is a "project site" at `/<repository>/`.
 *
 * Set VITE_PAGES_BASE in CI (see deploy-pages.yml). Omit locally for root-style paths.
 */

/**
 * Demos: production `base` is `./` so JS/CSS load next to each demo’s index.html (any host).
 * Dev keeps `/${segment}/` for `npm run dev:all` + root Vite proxy.
 */
/** @param {string} segment @param {"serve" | "build"} command */
export function viteDemoBase(segment, command) {
  if (command === "build") return "./";
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
