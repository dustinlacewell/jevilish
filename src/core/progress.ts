/** Serving each puzzle once before any repeats. Pure functions on plain data;
    persistence lives in data/progress-store.ts. */

import { shuffled } from "./shuffle";

/** How far a player has got through the bank. */
export interface Progress {
  /** Ids already served this cycle, in no particular order. */
  readonly seen: readonly string[];
  /** Which pass through the bank this is. Bumps the shuffle seed, so a second
      cycle serves a different order than the first. */
  readonly cycle: number;
}

export const FRESH: Progress = { seen: [], cycle: 0 };

/** A stable seed per run name, so a run always walks the bank in its own
    order and a reload resumes rather than reshuffles. */
export function seedFor(run: string, cycle: number): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < run.length; i++) {
    hash ^= run.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // The cycle rotates the order so a second pass differs from the first.
  return (hash ^ Math.imul(cycle + 1, 0x9e3779b9)) >>> 0;
}

/** The order this run plays the bank in, for a given cycle. */
export function orderFor<T>(items: readonly T[], run: string, cycle: number): T[] {
  return shuffled(items, seedFor(run, cycle));
}

/**
 * The next puzzle for a run, and the progress that follows from serving it.
 *
 * Everything unseen comes before anything seen. When the cycle is exhausted
 * the set clears, the cycle advances, and the bank reshuffles into a new
 * order — so a player never meets a repeat while a fresh puzzle remains.
 */
export function nextIn<T extends { readonly id: string }>(
  items: readonly T[],
  run: string,
  progress: Progress,
): { readonly puzzle: T; readonly progress: Progress } | null {
  if (items.length === 0) return null;

  const seen = new Set(progress.seen);
  const order = orderFor(items, run, progress.cycle);
  const fresh = order.find((item) => !seen.has(item.id));

  if (fresh) {
    return {
      puzzle: fresh,
      progress: { seen: [...progress.seen, fresh.id], cycle: progress.cycle },
    };
  }

  // Bank exhausted: start the next pass, which reshuffles into a new order.
  const cycle = progress.cycle + 1;
  const restarted = orderFor(items, run, cycle)[0];
  return { puzzle: restarted, progress: { seen: [restarted.id], cycle } };
}

/** Drop ids the bank no longer contains, so a regenerated bank cannot strand
    a player on a seen-set full of dead entries. */
export function prune(progress: Progress, items: readonly { readonly id: string }[]): Progress {
  const live = new Set(items.map((item) => item.id));
  const seen = progress.seen.filter((id) => live.has(id));
  return seen.length === progress.seen.length ? progress : { ...progress, seen };
}

/** How many of the bank this cycle has served. */
export function completion(progress: Progress, total: number): number {
  if (total === 0) return 0;
  return Math.min(1, progress.seen.length / total);
}
