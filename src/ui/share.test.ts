import { describe, expect, it } from "vitest";
import { startRound, submitGuess, useHint } from "../core/session";
import type { Puzzle } from "../core/types";
import { shareText } from "./share";

const puzzle: Puzzle = {
  id: "t", mode: "idiom", answer: "COLD AS ICE", familiarity: 0.9,
  words: [
    { original: "COLD", shown: "GELID", swapped: true },
    { original: "AS", shown: "AS", swapped: false },
    { original: "ICE", shown: "FRAZIL", swapped: true },
  ],
};

describe("shareText", () => {
  it("never leaks the answer", () => {
    const solved = submitGuess(startRound(puzzle), "COLD AS ICE");
    expect(shareText(solved)).not.toContain("COLD");
  });

  it("shows a full life bar on a clean solve", () => {
    const solved = submitGuess(startRound(puzzle), "COLD AS ICE");
    expect(shareText(solved)).toContain("●●●");
  });

  it("marks spent lives and hints", () => {
    let r = useHint(startRound(puzzle));
    r = submitGuess(r, "nope");
    r = submitGuess(r, "COLD AS ICE");
    const text = shareText(r);
    expect(text).toContain("●●○");
    expect(text).toContain("1 hint");
  });

  it("reports a failure without the phrase", () => {
    let r = startRound(puzzle);
    for (const g of ["a", "b", "c"]) r = submitGuess(r, g);
    expect(shareText(r)).toContain("stumped");
    expect(shareText(r)).not.toContain("ICE");
  });
});
