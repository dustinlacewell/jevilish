import { describe, expect, it } from "vitest";
import { archaicForm, archaicPass, fixArticles } from "./register";

describe("archaicForm", () => {
  it("costumes the second person", () => {
    expect(archaicForm("YOU")).toBe("THOU");
    expect(archaicForm("YOURSELF")).toBe("THYSELF");
  });

  it("uses THY before a consonant and THINE before a vowel", () => {
    expect(archaicForm("YOUR", "THOUGHTS")).toBe("THY");
    expect(archaicForm("YOUR", "EYES")).toBe("THINE");
  });

  it("treats a leading apostrophe as no vowel", () => {
    expect(archaicForm("YOUR", "'ROUND")).toBe("THY");
  });

  it("costumes verbs and particles", () => {
    expect(archaicForm("HAS")).toBe("HATH");
    expect(archaicForm("PERHAPS")).toBe("PERCHANCE");
    expect(archaicForm("BEFORE")).toBe("ERE");
  });

  it("ignores case and punctuation", () => {
    expect(archaicForm("does,")).toBe("DOTH");
  });

  it("returns null for a word with no costumed form", () => {
    expect(archaicForm("PENNY")).toBeNull();
    expect(archaicForm("")).toBeNull();
  });

  it("does not report a word as its own replacement", () => {
    expect(archaicForm("YE")).toBeNull();
    expect(archaicForm("UPON")).toBeNull();
  });
});

describe("archaicPass", () => {
  it("leaves untouched words as null", () => {
    expect(archaicPass(["A", "PENNY"])).toEqual([null, null]);
  });

  it("rewrites the function words of a phrase", () => {
    expect(archaicPass(["A", "PENNY", "FOR", "YOUR", "THOUGHTS"]))
      .toEqual([null, null, null, "THY", null]);
  });

  it("makes the verb agree after THOU", () => {
    // "you are" must become "thou art", never "thou are".
    expect(archaicPass(["YOU", "ARE", "WELCOME"])).toEqual(["THOU", "ART", null]);
  });

  it("agrees for verbs that have no standalone costumed form", () => {
    expect(archaicPass(["YOU", "CAN", "DO", "IT"])).toEqual(["THOU", "CANST", null, null]);
  });

  it("does not force agreement without a preceding THOU", () => {
    expect(archaicPass(["THEY", "ARE", "HERE"])).toEqual([null, null, "HITHER"]);
  });

  it("handles an empty phrase", () => {
    expect(archaicPass([])).toEqual([]);
  });
});

describe("fixArticles", () => {
  it("corrects A before a word that now starts with a vowel", () => {
    expect(fixArticles(["A", "OVUM"])).toEqual(["AN", "OVUM"]);
  });

  it("corrects AN before a word that now starts with a consonant", () => {
    // "an old dog" becomes "an old Canis familiaris" without this.
    expect(fixArticles(["AN", "Canis"])).toEqual(["A", "Canis"]);
  });

  it("leaves a correct article alone", () => {
    expect(fixArticles(["A", "PENNY"])).toEqual(["A", "PENNY"]);
  });

  it("keeps lower case lower", () => {
    expect(fixArticles(["a", "ovum"])).toEqual(["an", "ovum"]);
  });

  it("leaves a trailing article alone", () => {
    expect(fixArticles(["GIVE", "A"])).toEqual(["GIVE", "A"]);
  });
});
