import { describe, expect, it } from "vitest";
import { inflect } from "./inflect";

describe("inflect", () => {
  it("leaves the base form alone", () => {
    expect(inflect("PERAMBULATE", "base")).toBe("PERAMBULATE");
  });

  it("adds a plain S", () => {
    expect(inflect("TINTINNABULATE", "s")).toBe("TINTINNABULATES");
  });

  it("adds ES after a sibilant", () => {
    expect(inflect("EXPUNGE", "s")).toBe("EXPUNGES");
    expect(inflect("SQUASH", "s")).toBe("SQUASHES");
    expect(inflect("FIZZ", "s")).toBe("FIZZES");
  });

  it("turns a consonant+Y into IES", () => {
    expect(inflect("MAGNIFY", "s")).toBe("MAGNIFIES");
  });

  it("drops a silent E before ING", () => {
    expect(inflect("PERAMBULATE", "ing", true)).toBe("PERAMBULATING");
  });

  it("doubles a final consonant before ING and ED", () => {
    expect(inflect("SLAM", "ing", true)).toBe("SLAMMING");
    expect(inflect("STOP", "ed", true)).toBe("STOPPED");
  });

  it("does not double after a long vowel", () => {
    expect(inflect("SHOUT", "ed", true)).toBe("SHOUTED");
  });

  it("does not double on an unstressed final syllable", () => {
    expect(inflect("MARATHON", "ing", true)).toBe("MARATHONING");
    expect(inflect("GALLOP", "ed", true)).toBe("GALLOPED");
  });

  it("forms the past of an E-final word", () => {
    expect(inflect("EXPECTORATE", "ed", true)).toBe("EXPECTORATED");
  });

  it("uses MORE for long adjectives", () => {
    expect(inflect("MALODOROUS", "comparative")).toBe("MORE MALODOROUS");
    expect(inflect("GRANDILOQUENT", "superlative")).toBe("MOST GRANDILOQUENT");
  });

  it("uses the suffix for short adjectives", () => {
    expect(inflect("BIG", "comparative")).toBe("BIGGER");
    expect(inflect("GRAND", "superlative")).toBe("GRANDEST");
  });

  it("does not inflect a word that is already in the target form", () => {
    expect(inflect("CONSTRUCTED", "ed", true)).toBe("CONSTRUCTED");
    expect(inflect("FASHIONING", "ing", true)).toBe("FASHIONING");
    expect(inflect("GREATER", "comparative")).toBe("GREATER");
  });

  it("still inflects a base word that merely ends in those letters", () => {
    expect(inflect("SEED", "s")).toBe("SEEDS");
    expect(inflect("RING", "s")).toBe("RINGS");
  });

  it("knows the common irregulars", () => {
    expect(inflect("GO", "ed", true)).toBe("WENT");
    expect(inflect("GOOD", "comparative")).toBe("BETTER");
  });
});

describe("inflect in a verb slot", () => {
  it("strips a participle a thesaurus supplied for a base-form slot", () => {
    // Moby lists BOOZING under DRINK; "don't BOOZING and drive" is broken.
    expect(inflect("BOOZING", "base", true)).toBe("BOOZE");
    expect(inflect("SWIMMING", "base", true)).toBe("SWIM");
  });

  it("leaves adjectives alone outside a verb slot", () => {
    expect(inflect("UNFEELING", "base")).toBe("UNFEELING");
    expect(inflect("BLESSED", "base")).toBe("BLESSED");
  });

  it("still inflects normally in a verb slot", () => {
    expect(inflect("PERAMBULATE", "ing", true)).toBe("PERAMBULATING");
  });
});

describe("participles outside verb slots", () => {
  it("leaves an adjective replacement unsuffixed", () => {
    // GLOWING is an -ing adjective; SPLENDID replaces it as-is.
    expect(inflect("SPLENDID", "ing")).toBe("SPLENDID");
    expect(inflect("AUXILIARY", "ing")).toBe("AUXILIARY");
  });

  it("still forms a participle in a verb slot", () => {
    expect(inflect("PERAMBULATE", "ing", true)).toBe("PERAMBULATING");
    expect(inflect("EXPECTORATE", "ed", true)).toBe("EXPECTORATED");
  });
});
