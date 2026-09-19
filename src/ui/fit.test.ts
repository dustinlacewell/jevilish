import { describe, expect, it } from "vitest";
import { boardFontSize, fitRem, measure } from "./fit";

const words = (...shown: string[]) => shown.map((s) => ({ shown: s }));

/** The column the fit is solved against, and the advance it assumes. Kept in
    step with fit.ts; the point of restating them is to catch a change there
    that silently breaks the overflow guarantee. */
const COLUMN = 42;
const ADVANCE = 0.62;

const widthOf = (word: string, rem: number) => word.length * ADVANCE * rem;

describe("measure", () => {
  it("reports the longest word and the whole length", () => {
    expect(measure(words("THE", "VERITABLE", "McCOY"))).toEqual({
      longest: 9,
      total: 19,
    });
  });

  it("counts no separator for a single word", () => {
    expect(measure(words("SOLO"))).toEqual({ longest: 4, total: 4 });
  });

  it("handles an empty board", () => {
    expect(measure([])).toEqual({ longest: 0, total: 0 });
  });
});

describe("fitRem", () => {
  it("gives short phrases the largest size", () => {
    expect(fitRem(measure(words("THE", "BIG", "ONE")))).toBe(2.9);
  });

  it("steps down for a long phrase", () => {
    // Inflated words, as the player actually sees them: the same ten-word
    // phrase once Jev has swapped in its pompous synonyms.
    const short = fitRem(measure(words("THE", "BIG", "ONE")));
    const long = fitRem(
      measure(words(
        "THE", "EXCLUSIVE", "CONSIDERATION", "WE", "POSSESS", "TO",
        "APPREHENSION", "IS", "APPREHENSION", "ITSELF",
      )),
    );
    expect(long).toBeLessThan(short);
  });

  it("leaves a phrase of short words at full size", () => {
    // Ten short words still fit the column at the ceiling; only length past
    // roughly sixty characters should pull the type down.
    expect(
      fitRem(measure(words("THE", "ONLY", "THING", "WE", "HAVE", "TO", "FEAR"))),
    ).toBe(2.9);
  });

  it("never returns less than the floor", () => {
    const absurd = measure(words(...Array(40).fill("PREPOSTEROUS")));
    expect(fitRem(absurd)).toBeGreaterThanOrEqual(1.15);
  });

  it("never exceeds the ceiling", () => {
    expect(fitRem(measure(words("A")))).toBeLessThanOrEqual(2.9);
  });
});

describe("the overflow guarantee", () => {
  /** The whole reason the module exists: no single word may be wider than the
      column, because a word that overflows cannot wrap — the board sets
      white-space: nowrap on each one. */
  it("keeps the longest real word inside the column", () => {
    const worst = "INTERCOMMUNICATION"; // 18 chars, the longest in the lexicon
    const rem = fitRem(measure(words("RECIPROCAL", worst)));
    expect(widthOf(worst, rem)).toBeLessThanOrEqual(COLUMN);
  });

  it("holds for every word length the lexicon can produce", () => {
    for (let length = 1; length <= 18; length++) {
      const word = "X".repeat(length);
      const rem = fitRem(measure(words(word)));
      expect(widthOf(word, rem)).toBeLessThanOrEqual(COLUMN);
    }
  });

  it("holds when a long word sits in a long phrase", () => {
    const phrase = words("ONCE", "IN", "A", "LIFETIME", "INTERCOMMUNICATION", "OPPORTUNITY");
    const rem = fitRem(measure(phrase));
    for (const { shown } of phrase) {
      expect(widthOf(shown, rem)).toBeLessThanOrEqual(COLUMN);
    }
  });
});

describe("boardFontSize", () => {
  it("emits a three-part clamp", () => {
    expect(boardFontSize(words("THE", "VERITABLE", "McCOY"))).toMatch(
      /^clamp\(\d+(\.\d+)?rem, \d+(\.\d+)?vw, \d+(\.\d+)?rem\)$/,
    );
  });

  it("orders the clamp floor below its ceiling", () => {
    const [, floor, , ceiling] = boardFontSize(words("SUPERCALIFRAGILISTIC"))
      .match(/clamp\((\d+(?:\.\d+)?)rem, (\d+(?:\.\d+)?)vw, (\d+(?:\.\d+)?)rem\)/)!;
    expect(Number(floor)).toBeLessThanOrEqual(Number(ceiling));
  });

  it("is stable for the same words", () => {
    const phrase = words("A", "ROLLING", "STONE");
    expect(boardFontSize(phrase)).toBe(boardFontSize(phrase));
  });
});
