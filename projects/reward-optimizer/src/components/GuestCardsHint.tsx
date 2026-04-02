"use client";

/**
 * Shown when Firebase works but user is not signed in — explains why card list is hidden.
 */
export function GuestCardsHint() {
  return (
    <section
      className="mb-8 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]/50 p-5"
      aria-labelledby="guest-cards-heading"
    >
      <h2 id="guest-cards-heading" className="text-base font-medium text-zinc-200">
        Custom cards &amp; saved history
      </h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--muted)]">
        You&apos;re using the app <strong className="text-zinc-300">without an account</strong>. Add reward cards in{" "}
        <strong className="text-zinc-400">Your wallet</strong> below (templates or manual rates — not from your bank). Cards
        stay in this browser until you leave or refresh.{" "}
        <strong className="text-zinc-300">Sign in with Google</strong> above to sync your wallet and spending to the cloud;
        nothing is pulled from Google Pay or banks.
      </p>
    </section>
  );
}
