import { describe, expect, it } from "vitest";
import { binomialFor } from "./binomial";

const table = {
  CAT: "Felis catus",
  CATS: "Felis catus",
  MICE: "Mus musculus",
  CAMEL: "Camelus dromedarius",
};

describe("binomialFor", () => {
  it("finds the scientific name", () => {
    expect(binomialFor("CAT", table)).toBe("Felis catus");
  });

  it("handles plurals and irregular plurals", () => {
    expect(binomialFor("CATS", table)).toBe("Felis catus");
    expect(binomialFor("MICE", table)).toBe("Mus musculus");
  });

  it("ignores case and punctuation", () => {
    expect(binomialFor("camel's", table)).toBe("Camelus dromedarius");
  });

  it("returns null for a word with no entry", () => {
    expect(binomialFor("PENNY", table)).toBeNull();
  });
});
