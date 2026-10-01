"use client";

import { useEffect, useState } from "react";

/* ============================================================
   useCachedJson(endpoint)

   Loads JSON from your API and keeps the last good copy on the
   device (localStorage), so the content still shows with no internet.

   - Saved copy found  → shown immediately, refreshed in the background
   - Online            → always shows the newest data
   - Offline / failed  → keeps showing the saved copy (stale = true)
   - Nothing saved     → error = true
   ============================================================ */

const PREFIX = "mycalinan_cache:";

type Result<T> = {
  data: T | null;
  loading: boolean; // true only while there is nothing to show yet
  error: boolean; // failed AND no saved copy
  stale: boolean; // couldn't reach the server, showing the saved copy
};

function readSaved<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? ((JSON.parse(raw) as { data: T }).data ?? null) : null;
  } catch {
    return null;
  }
}

export function useCachedJson<T>(endpoint: string): Result<T> {
  const [state, setState] = useState<Result<T>>({
    data: null,
    loading: true,
    error: false,
    stale: false,
  });

  useEffect(() => {
    let cancelled = false;
    const key = PREFIX + endpoint;
    let saved: T | null = null;

    // Show the saved copy right away (if any) while the network answers.
    // (Done in a microtask so the state update isn't made synchronously
    // inside the effect — that is what the React lint rule complains about.)
    Promise.resolve().then(() => {
      if (cancelled) return;
      saved = readSaved<T>(key);
      setState(
        saved !== null
          ? { data: saved, loading: false, error: false, stale: false }
          : { data: null, loading: true, error: false, stale: false }
      );
    });

    fetch(endpoint, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: T) => {
        if (cancelled) return;
        try {
          localStorage.setItem(key, JSON.stringify({ data, savedAt: Date.now() }));
        } catch {
          /* storage full or blocked — fine, just skip saving */
        }
        setState({ data, loading: false, error: false, stale: false });
      })
      .catch(() => {
        if (cancelled) return;
        setState(
          saved !== null
            ? { data: saved, loading: false, error: false, stale: true }
            : { data: null, loading: false, error: true, stale: false }
        );
      });

    return () => {
      cancelled = true;
    };
  }, [endpoint]);

  return state;
}