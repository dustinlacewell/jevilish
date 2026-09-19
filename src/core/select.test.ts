import { describe, expect, it } from "vitest";
import { TASTES, appeal, eligible, pick, type Candidate } from "./select";

const c = (w: string, syn: number, pomp: number, obs: number, dec = 0.8): Candidate =>
  ({ w, syn, pomp, obs, dec });

describe("eligible", () => {
  it("drops weak substitutes", () => {
    const out = eligible([c("BULLION", 0.05, 1.8, 0.8)], "PENNY", TASTES.standard);
    expect(out).toHaveLength(0);
  });

  it("drops words nobody knows", () => {
    // Measured: BAWBEE scores 1.28 obscurity, past every tier's ceiling.
    const out = eligible([c("BAWBEE", 0.6, 1.1, 1.28)], "PENNY", TASTES.cruel);
    expect(out).toHaveLength(0);
  });

  it("keeps a showy word an ordinary reader still knows", () => {
    const out = eligible([c("MALODOROUS", 0.7, 0.98, 0.92)], "SMELLY", TASTES.standard);
    expect(out.map((x) => x.w)).toEqual(["MALODOROUS"]);
  });

  it("drops a word just past the recognition boundary", () => {
    const out = eligible([c("WHILOM", 0.7, 1.3, 1.2)], "ONCE", TASTES.standard);
    expect(out).toHaveLength(0);
  });

  it("rejects the original and its inflections", () => {
    const out = eligible(
      [c("PENNY", 1, 1, 0.2), c("PENNIES", 0.9, 1, 0.2), c("FARTHING", 0.7, 1.2, 0.8)],
      "PENNY", TASTES.standard,
    );
    expect(out.map((x) => x.w)).toEqual(["FARTHING"]);
  });

  it("gentle admits less obscurity than cruel", () => {
    const field = [c("OCULUS", 0.6, 1.5, 1.1)];
    expect(eligible(field, "EYE", TASTES.gentle)).toHaveLength(0);
    expect(eligible(field, "EYE", TASTES.cruel)).toHaveLength(1);
  });
});

describe("part-of-speech shape", () => {
  it("rejects a participle offered as a verb", () => {
    const out = eligible([c("PROPELLING", 0.8, 1, 0.5)], "DRIVE", TASTES.standard, "verb");
    expect(out).toHaveLength(0);
  });

  it("rejects an abstract noun offered as a verb", () => {
    const out = eligible([c("PUSHINGNESS", 0.8, 1, 0.9)], "DRIVE", TASTES.cruel, "verb");
    expect(out).toHaveLength(0);
  });

  it("keeps a real verb", () => {
    const out = eligible([c("CHAUFFEUR", 0.6, 1.2, 0.6)], "DRIVE", TASTES.standard, "verb");
    expect(out.map((x) => x.w)).toEqual(["CHAUFFEUR"]);
  });

  it("allows those same shapes for a noun slot", () => {
    const out = eligible([c("PROPULSION", 0.8, 1, 0.5)], "DRIVE", TASTES.standard, "noun");
    expect(out).toHaveLength(1);
  });
});

describe("pick", () => {
  const field = [
    c("FELINE", 0.8, 1.1, 0.7),
    c("PUSS", 0.7, 0.8, 0.3),
    c("KITTY", 0.6, 0.4, 0.1),
  ];

  it("returns null when nothing survives", () => {
    expect(pick([c("X", 0.01, 0, 0)], "CAT", TASTES.standard, 0.5)).toBeNull();
  });

  it("favours the most appealing word at a low roll", () => {
    expect(pick(field, "CAT", TASTES.standard, 0.01)?.w).toBe("FELINE");
  });

  it("is deterministic for a given roll", () => {
    const a = pick(field, "CAT", TASTES.standard, 0.42);
    const b = pick(field, "CAT", TASTES.standard, 0.42);
    expect(a?.w).toBe(b?.w);
  });

  it("covers the whole field across rolls at high temperature", () => {
    const warm = { ...TASTES.standard, temperature: 3 };
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) seen.add(pick(field, "CAT", warm, i / 100)!.w);
    expect(seen.size).toBe(3);
  });

  it("collapses onto the best word at low temperature", () => {
    const cold = { ...TASTES.standard, temperature: 0.01 };
    const seen = new Set<string>();
    for (let i = 0; i < 100; i++) seen.add(pick(field, "CAT", cold, i / 100)!.w);
    expect(seen).toEqual(new Set(["FELINE"]));
  });

  it("handles a roll at the top of the range", () => {
    expect(pick(field, "CAT", TASTES.standard, 1)).not.toBeNull();
  });
});

describe("appeal", () => {
  it("ranks the pompous word above the plain one", () => {
    expect(appeal(c("FELINE", 0.8, 1.1, 0.7))).toBeGreaterThan(appeal(c("KITTY", 0.8, 0.4, 0.1)));
  });

  it("puts an in-context ranking above dictionary pomposity", () => {
    const contextual = { ...c("FRIGID", 0.6, 0.9, 0.5), fit: 0.62 };
    expect(appeal(contextual)).toBeGreaterThan(appeal(c("AFFECTLESS", 0.6, 1.4, 0.8)));
  });

  it("penalises an obscure word against an equally pompous known one", () => {
    expect(appeal(c("GARGANTUAN", 0.7, 1.34, 0.95)))
      .toBeGreaterThan(appeal(c("CACHINNATION", 0.7, 1.34, 1.33)));
  });
});
