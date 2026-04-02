"use client";

import { useAuth } from "@/contexts/AuthContext";

export function AuthBar() {
  const { user, loading, firebaseReady, signInWithGoogle, signOutUser } = useAuth();

  if (!firebaseReady) {
    return (
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90">
        Firebase is not configured. Add <code className="text-amber-100">NEXT_PUBLIC_FIREBASE_*</code> env
        vars to enable sign-in and cloud sync.
      </div>
    );
  }

  if (loading) {
    return <p className="text-sm text-[var(--muted)]">Checking session…</p>;
  }

  if (user) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-[var(--muted)]">
          Signed in as <span className="text-white">{user.email ?? user.uid}</span>
        </span>
        <button
          type="button"
          onClick={() => signOutUser()}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-sm text-zinc-200 hover:bg-white/5"
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => signInWithGoogle()}
      className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-zinc-100"
    >
      Sign in with Google
    </button>
  );
}
