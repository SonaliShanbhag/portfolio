"use client";

import { useAuth } from "@/contexts/AuthContext";

export function AuthBar() {
  const { user, loading, firebaseReady, signInWithGoogle, signOutUser } = useAuth();

  if (!firebaseReady) {
    return (
      <div
        className="max-w-md rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/95"
        role="status"
      >
        <p className="font-medium text-amber-50">Account features are off</p>
        <p className="mt-1 text-amber-200/85">
          This deployment doesn&apos;t have Firebase keys yet, so sign-in and saving aren&apos;t available. You can still try the optimizer with sample cards.
        </p>
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Checking sign-in…</p>;
  }

  if (user) {
    return (
      <div className="flex max-w-md flex-col gap-2 sm:items-end">
        <p className="text-xs text-[var(--muted)]">Signed in — your cards and purchases sync to your account.</p>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-[var(--muted)]">
            <span className="text-white">{user.email ?? user.uid}</span>
          </span>
          <button
            type="button"
            onClick={() => signOutUser()}
            className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-zinc-200 hover:bg-white/5"
          >
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex max-w-md flex-col gap-2 sm:items-end">
      <p className="text-xs text-[var(--muted)]">Optional — save your work across visits.</p>
      <button
        type="button"
        onClick={() => signInWithGoogle()}
        className="rounded-lg bg-white px-4 py-2.5 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-100"
      >
        Sign in with Google
      </button>
    </div>
  );
}
