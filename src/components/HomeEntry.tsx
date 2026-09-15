"use client";

import { Login } from "./Login";
import { LedgerApp } from "./LedgerApp";

function isRecoveryLocation() {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  return (
    url.searchParams.get("recovery") === "1" ||
    url.searchParams.get("type") === "recovery" ||
    hash.get("type") === "recovery"
  );
}

export function HomeEntry() {
  // Recovery links from older Supabase emails may return to `/` with tokens in
  // the URL fragment.  Render the auth screen immediately so useLedger never
  // redirects to /login and accidentally drops those tokens.
  if (isRecoveryLocation()) return <Login />;
  return <LedgerApp />;
}
