/** Guess evaluation. Pure functions on plain data. */
import { normalize, tokenize } from "./normalize";

export type GuessVerdict = "correct" | "close" | "wrong";

export interface GuessResult {
  readonly verdict: GuessVerdict;
  /** Fraction of answer words the guess got right, 0..1. */
  readonly wordAccuracy: number;
  /** Which answer words the guess contained, by index. */
  readonly matchedIndices: readonly number[];
}

/** Levenshtein distance, capped for early exit. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) {
      next[j] = Math.min(
        prev[j] + 1,
        next[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = next;
  }
  return prev[b.length];
}

/** A word matches if it is equal, or within a typo of a long-enough word. */
function wordMatches(guess: string, answer: string): boolean {
  if (guess === answer) return true;
  if (answer.length < 5) return false;
  return editDistance(guess, answer) <= 1;
}

/** Compare a raw guess against the answer phrase. */
export function evaluateGuess(raw: string, answer: string): GuessResult {
  const guessWords = tokenize(raw);
  const answerWords = tokenize(answer);
  if (answerWords.length === 0) {
    return { verdict: "wrong", wordAccuracy: 0, matchedIndices: [] };
  }

  if (normalize(raw) === normalize(answer)) {
    return {
      verdict: "correct",
      wordAccuracy: 1,
      matchedIndices: answerWords.map((_, i) => i),
    };
  }

  const pool = [...guessWords];
  const matchedIndices: number[] = [];
  answerWords.forEach((answerWord, index) => {
    const hit = pool.findIndex((g) => wordMatches(g, answerWord));
    if (hit !== -1) {
      pool.splice(hit, 1);
      matchedIndices.push(index);
    }
  });

  const wordAccuracy = matchedIndices.length / answerWords.length;
  // Every answer word present, only ordering or filler differs.
  const verdict: GuessVerdict =
    wordAccuracy === 1 ? "correct" : wordAccuracy >= 0.5 ? "close" : "wrong";
  return { verdict, wordAccuracy, matchedIndices };
}
