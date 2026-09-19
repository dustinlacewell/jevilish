import { describe, expect, it } from "vitest";
import { normalize, tokenize } from "./normalize";

describe("normalize", () => {
  it("strips case", () => {
    expect(normalize("Let Bygones Be")).toBe("LET BYGONES BE");
  });

  it("collapses whitespace and trims", () => {
    expect(normalize("  let   bygones  be  ")).toBe("LET BYGONES BE");
  });

  it("drops trailing punctuation", () => {
    expect(normalize("let bygones be!!")).toBe("LET BYGONES BE");
  });

  describe("apostrophes", () => {
    /** The bug this file was written for: an apostrophe became a space, so
        DON'T was two tokens and a player typing DONT matched neither. */
    it("deletes the apostrophe rather than splitting the word", () => {
      expect(normalize("DON'T")).toBe("DONT");
    });

    it("makes the contraction and its bare spelling identical", () => {
      expect(normalize("don't")).toBe(normalize("dont"));
      expect(normalize("it's")).toBe(normalize("its"));
      expect(normalize("you're")).toBe(normalize("youre"));
    });

    it("accepts the curly apostrophe phones produce", () => {
      expect(normalize("don’t")).toBe("DONT");
      expect(normalize("don‘t")).toBe("DONT");
    });

    it("accepts the modifier-letter and backtick forms", () => {
      expect(normalize("donʼt")).toBe("DONT");
      expect(normalize("don`t")).toBe("DONT");
    });

    it("handles a possessive at the end of a word", () => {
      expect(normalize("dog's life")).toBe("DOGS LIFE");
    });
  });

  describe("accents", () => {
    it("folds accented letters to their base", () => {
      expect(normalize("café")).toBe("CAFE");
      expect(normalize("naïve")).toBe("NAIVE");
      expect(normalize("piñata")).toBe("PINATA");
    });

    it("makes the accented and plain spellings identical", () => {
      expect(normalize("café au lait")).toBe(normalize("cafe au lait"));
    });
  });

  it("turns other punctuation into a word break", () => {
    // Hyphenated and spaced forms are the same guess.
    expect(normalize("once-in-a-lifetime")).toBe("ONCE IN A LIFETIME");
  });

  it("keeps digits", () => {
    expect(normalize("catch 22")).toBe("CATCH 22");
  });

  it("is empty for punctuation alone", () => {
    expect(normalize("!!!")).toBe("");
    expect(normalize("   ")).toBe("");
  });

  it("is idempotent", () => {
    const once = normalize("Don't — café, naïve!");
    expect(normalize(once)).toBe(once);
  });
});

describe("tokenize", () => {
  it("splits on word breaks", () => {
    expect(tokenize("let bygones be")).toEqual(["LET", "BYGONES", "BE"]);
  });

  it("keeps a contraction as one word", () => {
    expect(tokenize("don't drink")).toEqual(["DONT", "DRINK"]);
  });

  it("returns nothing for an empty phrase", () => {
    expect(tokenize("")).toEqual([]);
    expect(tokenize("  !!  ")).toEqual([]);
  });
});
