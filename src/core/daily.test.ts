import { describe, expect, it } from "vitest";
import { dailyIndex, dayNumber, isSpent, spend } from "./daily";

const utc = (y: number, m: number, d: number, h = 0) => new Date(Date.UTC(y, m, d, h));

describe("dayNumber", () => {
  it("counts from the epoch", () => {
    expect(dayNumber(utc(2026, 0, 1))).toBe(0);
    expect(dayNumber(utc(2026, 0, 2))).toBe(1);
    expect(dayNumber(utc(2026, 1, 1))).toBe(31);
  });

  /** The whole point of UTC: two players in different zones are looking at
      the same instant, so they compute the same day and get the same
      puzzle. A local-date rotation would split them. */
  it("is the same at every hour of the UTC day", () => {
    const hours = [0, 6, 12, 18, 23].map((h) => dayNumber(utc(2026, 5, 10, h)));
    expect(new Set(hours).size).toBe(1);
  });

  it("advances at UTC midnight", () => {
    expect(dayNumber(utc(2026, 5, 10, 23))).toBe(dayNumber(utc(2026, 5, 10, 0)));
    expect(dayNumber(utc(2026, 5, 11, 0))).toBe(dayNumber(utc(2026, 5, 10, 0)) + 1);
  });

  it("handles dates before the epoch", () => {
    expect(dayNumber(utc(2025, 11, 31))).toBe(-1);
  });
});

describe("dailyIndex", () => {
  it("walks the bank one a day", () => {
    expect(dailyIndex(0, 10)).toBe(0);
    expect(dailyIndex(7, 10)).toBe(7);
  });

  it("wraps at the end of the bank", () => {
    expect(dailyIndex(10, 10)).toBe(0);
    expect(dailyIndex(13, 10)).toBe(3);
  });

  it("stays in range for a day before the epoch", () => {
    expect(dailyIndex(-1, 10)).toBe(9);
    expect(dailyIndex(-11, 10)).toBe(9);
  });

  it("covers the whole bank before repeating", () => {
    const seen = new Set(Array.from({ length: 10 }, (_, d) => dailyIndex(d, 10)));
    expect(seen.size).toBe(10);
  });

  it("survives an empty bank", () => {
    expect(dailyIndex(5, 0)).toBe(0);
  });
});

describe("isSpent", () => {
  it("is false when nothing was ever played", () => {
    expect(isSpent(null, 12)).toBe(false);
  });

  it("is true for the day that was played", () => {
    expect(isSpent(spend(12, "solved"), 12)).toBe(true);
  });

  it("is false once the day has moved on", () => {
    expect(isSpent(spend(12, "solved"), 13)).toBe(false);
  });

  it("counts a loss as spent", () => {
    expect(isSpent(spend(12, "failed"), 12)).toBe(true);
  });
});

describe("spend", () => {
  it("records the day and outcome", () => {
    expect(spend(4, "failed")).toEqual({ day: 4, outcome: "failed" });
  });

  it("replaces an older day", () => {
    const yesterday = spend(3, "solved");
    const todayState = spend(4, "failed");
    expect(todayState.day).toBe(4);
    expect(yesterday.day).toBe(3);
  });
});
