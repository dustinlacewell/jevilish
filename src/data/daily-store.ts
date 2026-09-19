/** Persisting the last daily the player finished. The shell around
    core/daily.ts: storage failure and untrusted JSON are handled here. */

import type { DailyState } from "../core/daily";
import { readJson, writeJson } from "./storage";

const KEY = "jevilish:daily";

export function loadDaily(): DailyState | null {
  return readJson(KEY, parse);
}

export function saveDaily(state: DailyState): void {
  writeJson(KEY, state);
}

/** Stored JSON is untrusted: it may predate a format change or have been
    edited by hand. Anything unrecognised reads as "never played". */
function parse(value: unknown): DailyState | null {
  if (typeof value !== "object" || value === null) return null;
  const { day, outcome } = value as Partial<DailyState>;
  if (typeof day !== "number" || !Number.isFinite(day)) return null;
  if (outcome !== "solved" && outcome !== "failed") return null;
  return { day: Math.floor(day), outcome };
}
