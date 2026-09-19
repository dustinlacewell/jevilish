import { describe, expect, it } from "vitest";
import { TASTE, appeal, eligible, pick, type Candidate } from "./select";

const c = (w: string, sense: number, theme: number, unknown: number): Candidate =>
  ({ w, sense, theme, unknown });

describe("eligible", () => {
  it("drops a word that means something else here", () => {
    // BANKRUPTED is a fine synonym for BROKE, and wrong for the camel.
    const out = eligible([c("BANKRUPTED", 0.1, 1.1, 0.03)], "BROKE", TASTE);
    expect(out).toHaveLength(0);
  });

  it("drops a word the reader has never met", () => {
    // Measured: CULM scores 0.65 unknown, well past the threshold.
    expect(eligible([c("CULM", 0.8, 1.2, 0.65)], "STRAW", TASTE)).toHaveLength(0);
  });

  it("keeps a costumed word that is rare but recognised", () => {
    // PERCHANCE is archaic and universally understood: exactly the target.
    const out = eligible([c("PERCHANCE", 0.7, 1.3, 0.12)], "MAYBE", TASTE);
    expect(out.map((x) => x.w)).toEqual(["PERCHANCE"]);
  });

  it("rejects the original word and its inflections", () => {
    const out = eligible(
      [c("SLEEP", 1, 1, 0.02), c("SLEEPING", 0.9, 1, 0.02), c("REPOSE", 0.67, 0.7, 0.15)],
      "SLEEP",
      TASTE,
    );
    expect(out.map((x) => x.w)).toEqual(["REPOSE"]);
  });

  it("admits a word at the top of the lexicon's unfamiliarity range", () => {
    // The lexicon tops out at 0.30 unknown, and the taste allows exactly
    // that: generation already rejected the merely obscure, so filtering
    // harder here would discard costume without buying fairness.
    expect(eligible([c("SCATHE", 0.6, 1.1, 0.3)], "HURT", TASTE)).toHaveLength(1);
  });

  it("drops a word whose meaning is too loose for the phrase", () => {
    // Just under minSense: plausible in a thesaurus, wrong in this sentence.
    expect(eligible([c("SCATHE", 0.31, 1.1, 0.1)], "HURT", TASTE)).toHaveLength(0);
  });
});

describe("appeal", () => {
  it("prefers the grander of two valid words", () => {
    expect(appeal(c("HALLOWED", 0.6, 1.27, 0.05)))
      .toBeGreaterThan(appeal(c("BLESSED", 0.6, 0.4, 0.02)));
  });

  it("breaks a tie on sense", () => {
    expect(appeal(c("SLUMBER", 0.91, 0.51, 0.09)))
      .toBeGreaterThan(appeal(c("DROWSE", 0.27, 0.51, 0.05)));
  });
});

describe("pick", () => {
  const field = [
    c("FELINE", 0.6, 0.96, 0.09),
    c("PUSSYCAT", 0.68, 0.52, 0.05),
    c("TABBY", 0.68, 0.22, 0.08),
  ];

  it("returns null when nothing survives", () => {
    expect(pick([c("X", 0.01, 1, 0.01)], "CAT", TASTE, 0.5)).toBeNull();
  });

  it("favours the most appealing word at a low roll", () => {
    expect(pick(field, "CAT", TASTE, 0.01)?.w).toBe("FELINE");
  });

  it("is deterministic for a given roll", () => {
    expect(pick(field, "CAT", TASTE, 0.42)?.w)
      .toBe(pick(field, "CAT", TASTE, 0.42)?.w);
  });

  it("covers the whole field at high temperature", () => {
    const warm = { ...TASTE, temperature: 3 };
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) seen.add(pick(field, "CAT", warm, i / 100)!.w);
    expect(seen.size).toBe(3);
  });

  it("collapses onto the best word at low temperature", () => {
    const cold = { ...TASTE, temperature: 0.01 };
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) seen.add(pick(field, "CAT", cold, i / 100)!.w);
    expect(seen).toEqual(new Set(["FELINE"]));
  });

  it("handles a roll at the top of the range", () => {
    expect(pick(field, "CAT", TASTE, 1)).not.toBeNull();
  });
});
