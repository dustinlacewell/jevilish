/** Talking to localStorage without letting it break the game.

    Storage can be absent (SSR), blocked (private mode, cookie settings) or
    full. None of those should stop play, so every access degrades to an
    in-memory map that lasts the session. */

const fallback = new Map<string, string>();

type Backing = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function memory(): Backing {
  return {
    getItem: (key) => fallback.get(key) ?? null,
    setItem: (key, value) => void fallback.set(key, value),
    removeItem: (key) => void fallback.delete(key),
  };
}

function backing(): Backing {
  try {
    if (typeof localStorage === "undefined") return memory();
    // Touch it: Safari in private mode throws only on write.
    const probe = "jevilish:probe";
    localStorage.setItem(probe, "1");
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return memory();
  }
}

/**
 * Read a stored value and hand it to `parse`, which owns the schema doubt.
 * A missing key, unreadable storage or malformed JSON all read as null, so
 * a caller never sees a half-valid value.
 */
export function readJson<T>(key: string, parse: (value: unknown) => T | null): T | null {
  try {
    const raw = backing().getItem(key);
    return raw === null ? null : parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Write a value. A full or blocked store costs the player their history,
    not their game, so failure is silent by design. */
export function writeJson(key: string, value: unknown): void {
  try {
    backing().setItem(key, JSON.stringify(value));
  } catch {
    // Nothing useful to do: the game continues without persistence.
  }
}

export function remove(key: string): void {
  try {
    backing().removeItem(key);
  } catch { /* nothing to do */ }
}
