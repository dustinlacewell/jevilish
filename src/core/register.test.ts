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

describe("second-person case", () => {
  /** THOU is the subject, THEE the object. Getting this wrong produced
      "the hand that feeds thou". */
  it("uses THEE after a preposition", () => {
    expect(archaicForm("YOU", undefined, "FOR")).toBe("THEE");
    expect(archaicForm("YOU", "IN", "WITH")).toBe("THEE");
  });

  it("uses THEE after a transitive verb", () => {
    expect(archaicForm("YOU", undefined, "FEEDS")).toBe("THEE");
    expect(archaicForm("YOU", "LATER", "SEE")).toBe("THEE");
  });

  it("uses THEE at the end of a phrase", () => {
    expect(archaicForm("YOU", undefined, "HAUNT")).toBe("THEE");
  });

  it("uses THOU when it governs the following verb", () => {
    expect(archaicForm("YOU", "CAN", "BUT")).toBe("THOU");
    expect(archaicForm("YOU", "SEE", "NOW")).toBe("THOU");
    // TOLD takes an object, but SO does not make YOU a subject here.
    expect(archaicForm("YOU", "LOSE", "SNOOZE")).toBe("THOU");
  });

  it("uses THOU at the start of a phrase", () => {
    expect(archaicForm("YOU", "CAN'T", undefined)).toBe("THOU");
  });
});

describe("negation after THOU", () => {
  /** Early modern English negates after the verb. Leaving the contraction
      gave "THOU CANST RUN BUT THOU CAN'T HIDE". */
  it("rewrites a contraction into the post-verbal form", () => {
    expect(archaicPass(["YOU", "CAN'T", "HIDE"]))
      .toEqual(["THOU", "CANST NOT", null]);
  });

  it("handles DON'T", () => {
    expect(archaicPass(["YOU", "DON'T", "KNOW"]))
      .toEqual(["THOU", "DOST NOT", null]);
  });

  it("leaves a negation alone when no THOU precedes it", () => {
    expect(archaicPass(["DON'T", "BITE"])).toEqual([null, null]);
  });

  it("costumes both halves of a paired phrase", () => {
    const tokens = ["YOU", "CAN", "RUN", "BUT", "YOU", "CAN'T", "HIDE"];
    const out = archaicPass(tokens);
    const line = tokens.map((t, i) => out[i] ?? t).join(" ");
    expect(line).toBe("THOU CANST RUN BUT THOU CANST NOT HIDE");
  });
});

describe("second-person contractions", () => {
  it("costumes YOU'RE rather than stranding it beside a THOU", () => {
    expect(archaicForm("YOU'RE")).toBe("THOU ART");
    expect(archaicForm("YOU'LL")).toBe("THOU SHALT");
    expect(archaicForm("YOU'VE")).toBe("THOU HAST");
  });

  it("leaves no modern second person beside an archaic one", () => {
    const tokens = ["YOU", "DON'T", "KNOW", "WHAT", "YOU'RE", "MISSING"];
    const out = archaicPass(tokens);
    const line = tokens.map((t, i) => out[i] ?? t).join(" ");
    expect(line).toBe("THOU DOST NOT KNOW WHAT THOU ART MISSING");
  });
});

describe("MY and MINE", () => {
  it("uses MINE before a vowel", () => {
    expect(archaicForm("MY", "EYES")).toBe("MINE");
  });

  it("leaves MY before a consonant", () => {
    // "mine hands" is wrong; the form splits on sound like THY/THINE.
    expect(archaicForm("MY", "HANDS")).toBeNull();
  });
});
