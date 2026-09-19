/**
 * Round state as pure transitions. The component holds the value; every rule
 * about scoring, hints and lives lives here where it can be tested.
 */
import { evaluateGuess, type GuessVerdict } from "./guess";
import type { Puzzle } from "./types";

export const MAX_LIVES = 3;

export interface Attempt {
  readonly text: string;
  readonly verdict: GuessVerdict;
}

export interface Round {
  readonly puzzle: Puzzle;
  readonly attempts: readonly Attempt[];
  /** Indices of swapped words the player spent a hint to reveal. */
  readonly hintsUsed: readonly number[];
  /** Answer-word indices the player has matched across all attempts. */
  readonly matched: readonly number[];
  readonly status: "playing" | "solved" | "failed";
}

export function startRound(puzzle: Puzzle): Round {
  return { puzzle, attempts: [], hintsUsed: [], matched: [], status: "playing" };
}

export function livesLeft(round: Round): number {
  const wasted = round.attempts.filter((a) => a.verdict !== "correct").length;
  return Math.max(0, MAX_LIVES - wasted);
}

/** Apply a guess. Returns the same round when play is already over. */
export function submitGuess(round: Round, raw: string): Round {
  if (round.status !== "playing" || raw.trim() === "") return round;

  const result = evaluateGuess(raw, round.puzzle.answer);
  const attempts = [...round.attempts, { text: raw.trim(), verdict: result.verdict }];
  const matched = [...new Set([...round.matched, ...result.matchedIndices])];

  if (result.verdict === "correct") {
    return { ...round, attempts, matched, status: "solved" };
  }
  const spent = attempts.filter((a) => a.verdict !== "correct").length;
  return {
    ...round, attempts, matched,
    status: spent >= MAX_LIVES ? "failed" : "playing",
  };
}

/** Reveal the original behind one swapped word. Costs nothing but pride. */
export function useHint(round: Round): Round {
  if (round.status !== "playing") return round;
  const next = round.puzzle.words.findIndex(
    (w, i) => w.swapped && !round.hintsUsed.includes(i),
  );
  if (next === -1) return round;
  return { ...round, hintsUsed: [...round.hintsUsed, next] };
}

/** 100 for a first-guess solve, less for each attempt and hint spent. */
export function scoreRound(round: Round): number {
  if (round.status !== "solved") return 0;
  const misses = round.attempts.length - 1;
  return Math.max(10, 100 - misses * 25 - round.hintsUsed.length * 20);
}
