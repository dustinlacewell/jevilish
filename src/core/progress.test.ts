import { describe, expect, it } from "vitest";
import { FRESH, completion, nextIn, orderFor, prune, seedFor, type Progress } from "./progress";

const bank = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `p${i}` }));

/** Play a run forward and collect the ids it serves. */
function serve(items: readonly { id: string }[], run: string, rounds: number) {
  let progress: Progress = FRESH;
  const served: string[] = [];
  for (let i = 0; i < rounds; i++) {
    const step = nextIn(items, run, progress);
    if (!step) break;
    served.push(step.puzzle.id);
    progress = step.progress;
  }
  return { served, progress };
}

describe("seedFor", () => {
  it("gives distinct runs distinct seeds", () => {
    const seeds = new Set(["standard", "other"].map((r) => seedFor(r, 0)));
    expect(seeds.size).toBe(2);
  });

  it("changes with the cycle", () => {
    expect(seedFor("standard", 0)).not.toBe(seedFor("standard", 1));
  });

  it("is stable for the same input", () => {
    expect(seedFor("standard", 2)).toBe(seedFor("standard", 2));
  });
});

describe("orderFor", () => {
  it("reorders the bank", () => {
    const items = bank(50);
    const order = orderFor(items, "standard", 0).map((i) => i.id);
    expect(order).not.toEqual(items.map((i) => i.id));
  });

  it("keeps every puzzle", () => {
    const items = bank(20);
    const order = orderFor(items, "standard", 0);
    expect(order).toHaveLength(20);
    expect(new Set(order.map((i) => i.id)).size).toBe(20);
  });
});

describe("nextIn", () => {
  it("returns null for an empty bank", () => {
    expect(nextIn([], "standard", FRESH)).toBeNull();
  });

  it("never repeats before the bank is exhausted", () => {
    const items = bank(30);
    const { served } = serve(items, "standard", 30);
    expect(served).toHaveLength(30);
    expect(new Set(served).size).toBe(30);
  });

  it("records what it served", () => {
    const items = bank(5);
    const step = nextIn(items, "standard", FRESH)!;
    expect(step.progress.seen).toEqual([step.puzzle.id]);
  });

  it("starts a new cycle once every puzzle is seen", () => {
    const items = bank(8);
    const { progress } = serve(items, "standard", 8);
    expect(progress.cycle).toBe(0);

    const wrapped = nextIn(items, "standard", progress)!;
    expect(wrapped.progress.cycle).toBe(1);
    expect(wrapped.progress.seen).toEqual([wrapped.puzzle.id]);
  });

  it("serves the second cycle in a different order than the first", () => {
    const items = bank(40);
    const first = serve(items, "standard", 40);
    const second = serve(items, "standard", 80).served.slice(40);
    expect(second).not.toEqual(first.served);
  });

  it("covers the bank again on the second pass", () => {
    const items = bank(12);
    const { served } = serve(items, "standard", 24);
    expect(new Set(served.slice(0, 12)).size).toBe(12);
    expect(new Set(served.slice(12)).size).toBe(12);
  });

  it("resumes mid-cycle from stored progress", () => {
    const items = bank(10);
    const partial: Progress = { seen: ["p0", "p1", "p2"], cycle: 0 };
    const step = nextIn(items, "standard", partial)!;
    expect(["p0", "p1", "p2"]).not.toContain(step.puzzle.id);
  });
});

describe("prune", () => {
  it("drops ids the bank no longer has", () => {
    const progress: Progress = { seen: ["p0", "gone", "p1"], cycle: 2 };
    expect(prune(progress, bank(3))).toEqual({ seen: ["p0", "p1"], cycle: 2 });
  });

  it("returns the same object when nothing is stale", () => {
    const progress: Progress = { seen: ["p0"], cycle: 0 };
    expect(prune(progress, bank(3))).toBe(progress);
  });
});

describe("completion", () => {
  it("is zero for an empty bank", () => {
    expect(completion(FRESH, 0)).toBe(0);
  });

  it("reports the fraction seen", () => {
    expect(completion({ seen: ["a", "b"], cycle: 0 }, 8)).toBe(0.25);
  });

  it("never exceeds one", () => {
    expect(completion({ seen: ["a", "b", "c"], cycle: 0 }, 2)).toBe(1);
  });
});
