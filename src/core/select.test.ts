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

describe("modal complement frames", () => {
  /** MUST takes a bare infinitive; HAVE and OUGHT take a to-infinitive.
      Swapping them gave "I HAVE BE HEARING THINGS" and "THOU OUGHT
      UNDERGO". The words are honest synonyms and still unusable here. */
  it("rejects a to-infinitive verb in a bare-modal slot", () => {
    const field = [c("HAVE", 0.37, 0.29, 0.01), c("OUGHT", 0.5, 0.38, 0.05)];
    expect(eligible(field, "MUST", TASTE)).toHaveLength(0);
  });

  it("rejects NEED for SHOULD", () => {
    expect(eligible([c("NEED", 0.51, 0.49, 0.02)], "SHOULD", TASTE)).toHaveLength(0);
  });

  it("keeps a modal that shares the frame", () => {
    // MUST for SHOULD is grammatical: both take a bare infinitive.
    expect(eligible([c("MUST", 0.37, 0.46, 0.02)], "SHOULD", TASTE).map((x) => x.w))
      .toEqual(["MUST"]);
  });

  it("leaves ordinary verbs untouched by the rule", () => {
    // The guard must not fire outside modal slots: HAVE is a fine swap
    // for OWN, which is not a modal at all.
    expect(eligible([c("HAVE", 0.8, 0.4, 0.02)], "OWN", TASTE).map((x) => x.w))
      .toEqual(["HAVE"]);
  });

  it("strands a slot rather than breaking the sentence", () => {
    // "I MUST BE HEARING THINGS" offers only OUGHT and HAVE. Both are
    // refused, so MUST stays plain and the puzzle is one word less
    // disguised — the correct trade against a broken phrase.
    const field = [c("OUGHT", 0.25, 0.38, 0.05), c("HAVE", 0.37, 0.29, 0.01)];
    expect(pick(field, "MUST", TASTE, 0.5)).toBeNull();
  });
});

describe("causative LET", () => {
  /** LET takes a bare infinitive — "let bygones be" — and every synonym
      for it governs a to-infinitive. "ALLOW PASTS BE PASTS" was the daily
      puzzle on the day this was found. */
  it("refuses a permitting verb for LET", () => {
    const field = [
      c("ALLOW", 0.88, 0.69, 0.02),
      c("PERMIT", 0.72, 0.6, 0.03),
      c("AUTHORIZE", 0.5, 0.57, 0.03),
      c("LEAVE", 0.75, 0.46, 0.02),
    ];
    expect(eligible(field, "LET", TASTE)).toHaveLength(0);
  });

  it("strands the slot, leaving LET plain", () => {
    expect(pick([c("ALLOW", 0.88, 0.69, 0.02)], "LET", TASTE, 0.5)).toBeNull();
  });

  it("does not touch the same verbs elsewhere", () => {
    // ALLOW for PERMIT is a fine swap; the rule is about LET's frame,
    // not about the word ALLOW.
    expect(eligible([c("ALLOW", 0.8, 0.5, 0.02)], "PERMIT", TASTE).map((x) => x.w))
      .toEqual(["ALLOW"]);
  });

  it("leaves MAKE alone", () => {
    // MAKE is causative in "make your hair stand" and a plain transitive
    // in "make a mountain". Refusing its synonyms would break far more
    // puzzles than it fixed, so the rule names only LET.
    expect(eligible([c("CONSTRUCT", 0.63, 0.7, 0.03)], "MAKE", TASTE).map((x) => x.w))
      .toEqual(["CONSTRUCT"]);
  });
});
