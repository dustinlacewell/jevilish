import { describe, expect, it } from "vitest";
import { MAX_LIVES, livesLeft, scoreRound, startRound, submitGuess, useHint } from "./session";
import type { Puzzle } from "./types";

const puzzle: Puzzle = {
  id: "t", mode: "idiom", answer: "COLD AS ICE", familiarity: 0.9,
  words: [
    { original: "COLD", shown: "GELID", swapped: true },
    { original: "AS", shown: "AS", swapped: false },
    { original: "ICE", shown: "FRAZIL", swapped: true },
  ],
};

describe("round", () => {
  it("solves on the right answer", () => {
    const r = submitGuess(startRound(puzzle), "cold as ice");
    expect(r.status).toBe("solved");
    expect(scoreRound(r)).toBe(100);
  });

  it("spends a life on a wrong guess", () => {
    const r = submitGuess(startRound(puzzle), "hot as fire");
    expect(r.status).toBe("playing");
    expect(livesLeft(r)).toBe(MAX_LIVES - 1);
  });

  it("fails after three wrong guesses", () => {
    let r = startRound(puzzle);
    for (const g of ["a", "b", "c"]) r = submitGuess(r, g);
    expect(r.status).toBe("failed");
    expect(livesLeft(r)).toBe(0);
    expect(scoreRound(r)).toBe(0);
  });

  it("keeps partial matches across attempts", () => {
    let r = submitGuess(startRound(puzzle), "cold as fire");
    expect(r.matched).toContain(0);
    r = submitGuess(r, "warm as ice");
    expect(r.matched).toEqual(expect.arrayContaining([0, 1, 2]));
  });

  it("ignores an empty guess", () => {
    const r = submitGuess(startRound(puzzle), "   ");
    expect(r.attempts).toHaveLength(0);
  });

  it("ignores guesses once the round is over", () => {
    const solved = submitGuess(startRound(puzzle), "COLD AS ICE");
    expect(submitGuess(solved, "anything")).toBe(solved);
  });

  it("reveals one swapped word per hint and stops", () => {
    let r = useHint(startRound(puzzle));
    expect(r.hintsUsed).toEqual([0]);
    r = useHint(r); r = useHint(r);
    expect(r.hintsUsed).toEqual([0, 2]);        // only two words are swapped
  });

  it("docks score for misses and hints", () => {
    let r = useHint(startRound(puzzle));
    r = submitGuess(r, "wrong");
    r = submitGuess(r, "COLD AS ICE");
    expect(scoreRound(r)).toBe(100 - 25 - 20);
  });
});
