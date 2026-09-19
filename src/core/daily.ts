/** The one-a-day puzzle: which day it is, and whether today is spent.
    Pure — the date is injected, never read from the clock here. */

/** The day the daily rotation counts from. */
const EPOCH = Date.UTC(2026, 0, 1);

const MS_PER_DAY = 86_400_000;

/** How the day ended, once it has been played. */
export type DailyOutcome = "solved" | "failed";

/** The last daily the player finished. Absent until they finish one. */
export interface DailyState {
  /** Day number of the puzzle they finished. */
  readonly day: number;
  readonly outcome: DailyOutcome;
}

/**
 * Days since the epoch, in UTC.
 *
 * UTC rather than local time, so every player gets the same puzzle at the
 * same moment and a share is comparable. The cost is that the day turns
 * over at an odd hour for most of the world, which is the usual trade.
 */
export function dayNumber(today: Date = new Date()): number {
  const midnight = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate());
  return Math.floor((midnight - EPOCH) / MS_PER_DAY);
}

/** Has this day already been finished? */
export function isSpent(state: DailyState | null, day: number): boolean {
  return state !== null && state.day === day;
}

/** Record a finished daily, replacing any older one. */
export function spend(day: number, outcome: DailyOutcome): DailyState {
  return { day, outcome };
}

/** The daily puzzle for a day, chosen so the whole bank cycles before any
    phrase comes round again. */
export function dailyIndex(day: number, total: number): number {
  if (total <= 0) return 0;
  return ((day % total) + total) % total;
}
