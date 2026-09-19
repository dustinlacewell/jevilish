/** Domain types shared by the generator and the game. No I/O, no engine. */

export type PuzzleMode = "idiom" | "before-after";

/** One word of a puzzle, as shown to the player. */
export interface PuzzleWord {
  /** The original word from the source phrase. */
  readonly original: string;
  /** What the player sees. Equals `original` when the word was not swapped. */
  readonly shown: string;
  /** True when Jev replaced this word with a synonym. */
  readonly swapped: boolean;
  /** Jev's confidence in this replacement, 0..1. Absent when not swapped. */
  readonly confidence?: number;
  /** Runners-up Jev rejected, best first. Shown in the reveal. */
  readonly rivals?: readonly RankedWord[];
  /** Number of candidates this word beat. */
  readonly fieldSize?: number;
}

export interface RankedWord {
  readonly word: string;
  readonly probability: number;
}

export interface Puzzle {
  readonly id: string;
  readonly mode: PuzzleMode;
  /** The original phrase the player must recover. */
  readonly answer: string;
  readonly words: readonly PuzzleWord[];
  /** Index of the shared pivot word for before-after puzzles. */
  readonly pivotIndex?: number;
  /** Jev's 0..1 estimate that an average adult knows this phrase. */
  readonly familiarity: number;
}
