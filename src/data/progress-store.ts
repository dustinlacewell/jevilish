/** Persisting a run's progress. The imperative shell around
    core/progress.ts: all the try/catch and schema-doubt lives here. */

import { FRESH, type Progress } from "../core/progress";

const PREFIX = "jevilish:progress:";

/** Storage can be absent (SSR), blocked (private mode, cookie settings) or
    full. None of those should stop the game, so every access degrades to an
    in-memory map that lasts the session. */
const fallback = new Map<string, string>();

function backing(): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  try {
    if (typeof localStorage === "undefined") return memory();
    // Touch it: Safari in private mode throws only on write.
    const probe = `${PREFIX}probe`;
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return memory();
  }
}

function memory(): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  return {
    getItem: (key) => fallback.get(key) ?? null,
    setItem: (key, value) => void fallback.set(key, value),
    removeItem: (key) => void fallback.delete(key),
  };
}

export function loadProgress(run: string): Progress {
  try {
    const raw = backing().getItem(PREFIX + run);
    return raw ? parse(raw) : FRESH;
  } catch {
    return FRESH;
  }
}

export function saveProgress(run: string, progress: Progress): void {
  try {
    backing().setItem(PREFIX + run, JSON.stringify(progress));
  } catch {
    // A full or blocked store costs the player their history, not their game.
  }
}

export function clearProgress(run: string): void {
  try {
    backing().removeItem(PREFIX + run);
  } catch { /* nothing to do */ }
}

/** Stored JSON is untrusted: it may predate a format change or have been
    edited by hand. Anything unrecognised reads as a fresh start. */
function parse(raw: string): Progress {
  const value: unknown = JSON.parse(raw);
  if (typeof value !== "object" || value === null) return FRESH;

  const { seen, cycle } = value as Partial<Progress>;
  if (!Array.isArray(seen) || !seen.every((id) => typeof id === "string")) return FRESH;
  if (typeof cycle !== "number" || !Number.isFinite(cycle) || cycle < 0) return FRESH;

  return { seen, cycle: Math.floor(cycle) };
}
