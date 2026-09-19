import { describe, expect, it } from "vitest";
import { evaluateGuess } from "./guess";

describe("evaluateGuess", () => {
  const answer = "A PENNY FOR YOUR THOUGHTS";

  it("accepts the exact phrase", () => {
    expect(evaluateGuess(answer, answer).verdict).toBe("correct");
  });

  it("ignores case and punctuation", () => {
    expect(evaluateGuess("a penny, for your thoughts!", answer).verdict).toBe("correct");
  });

  it("accepts a single typo in a long word", () => {
    expect(evaluateGuess("A PENNY FOR YOUR THOUGHTZ", answer).verdict).toBe("correct");
  });

  it("does not accept a typo in a short word", () => {
    // FOR -> FAR would make too many wrong guesses pass.
    expect(evaluateGuess("A PENNY FAR YOUR THOUGHTS", answer).wordAccuracy).toBeLessThan(1);
  });

  it("reports partial credit as close", () => {
    expect(evaluateGuess("A PENNY FOR SOMETHING", answer).verdict).toBe("close");
  });

  it("rejects an unrelated phrase", () => {
    expect(evaluateGuess("HOME ON THE RANGE", answer).verdict).toBe("wrong");
  });

  it("does not double-count one guess word against repeats", () => {
    const result = evaluateGuess("ROW", "ROW ROW ROW YOUR BOAT");
    expect(result.matchedIndices).toHaveLength(1);
  });

  it("handles an empty guess", () => {
    expect(evaluateGuess("", answer).verdict).toBe("wrong");
  });
});

describe("contractions", () => {
  /** A player typing DONT for DON'T is making the same guess. Before
      normalize() dropped apostrophes this scored 0.60 and read "close". */
  it("accepts a contraction typed without its apostrophe", () => {
    expect(evaluateGuess("dont drink and drive", "DON'T DRINK AND DRIVE").verdict)
      .toBe("correct");
  });

  it("accepts it with the apostrophe", () => {
    expect(evaluateGuess("don't drink and drive", "DON'T DRINK AND DRIVE").verdict)
      .toBe("correct");
  });

  it("accepts the curly apostrophe a phone inserts", () => {
    expect(evaluateGuess("don’t drink and drive", "DON'T DRINK AND DRIVE").verdict)
      .toBe("correct");
  });

  it("accepts several contractions in one phrase", () => {
    expect(evaluateGuess("what you dont know wont hurt you", "WHAT YOU DON'T KNOW WON'T HURT YOU").verdict)
      .toBe("correct");
  });

  it("still rejects a genuinely wrong guess", () => {
    expect(evaluateGuess("something else entirely", "DON'T DRINK AND DRIVE").verdict)
      .toBe("wrong");
  });
});
