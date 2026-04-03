/**
 * GitHub Pages: user/organization site uses repo `<owner>.github.io` at domain root.
 * Any other repo is a "project site" at `/<repository>/`.
 *
 * Set VITE_PAGES_BASE in CI (see deploy-pages.yml). Omit locally for root-style paths.
 */

/**
 * Demos:
 * - **build** → `base: './'` so `./assets/…` resolves from this app’s folder. Works with `npx serve dist`
 *   (URL `/simulator/`) *and* when a tool uses **`dist/simulator` as the web root** (Live Server, etc.).
 *   Absolute `/simulator/assets/…` breaks that second case (browser asks the wrong host path → blank screen).
 * - **serve** → `/${segment}/` so `npm run dev:all` + root proxy still work.
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
