/** Persisting a run's progress. The imperative shell around
    core/progress.ts: all the schema doubt lives here. */

import { FRESH, type Progress } from "../core/progress";
import { readJson, remove, writeJson } from "./storage";

const PREFIX = "jevilish:progress:";

export function loadProgress(run: string): Progress {
  return readJson(PREFIX + run, parse) ?? FRESH;
}

export function saveProgress(run: string, progress: Progress): void {
  writeJson(PREFIX + run, progress);
}

export function clearProgress(run: string): void {
  remove(PREFIX + run);
}

/** Stored JSON is untrusted: it may predate a format change or have been
    edited by hand. Anything unrecognised reads as a fresh start. */
function parse(value: unknown): Progress | null {
  if (typeof value !== "object" || value === null) return null;

  const { seen, cycle } = value as Partial<Progress>;
  if (!Array.isArray(seen) || !seen.every((id) => typeof id === "string")) return null;
  if (typeof cycle !== "number" || !Number.isFinite(cycle) || cycle < 0) return null;

  return { seen, cycle: Math.floor(cycle) };
}
