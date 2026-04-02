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
        Right now you&apos;re using the app <strong className="text-zinc-300">without an account</strong>. We still compare purchases using built-in <strong className="text-zinc-400">sample cards</strong> (not from your bank).{" "}
        <strong className="text-zinc-300">Sign in with Google</strong> above to save your work: you&apos;ll get the same kind of starter list, which you then <strong className="text-zinc-400">edit or replace by hand</strong> — nothing is pulled from Google Pay or Wallet.
      </p>
    </section>
  );
}
