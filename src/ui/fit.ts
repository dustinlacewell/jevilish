/** Choosing the board's type size. Pure arithmetic on the phrase — no DOM,
    no measurement, no layout pass. The board sets what this returns and the
    browser does the rest. */

/** Mean advance of a capital in the board's serif, in em, including the
    0.02em letter-spacing the board applies. Measured against Palatino and
    Georgia, which agree closely at these sizes. */
const ADVANCE = 0.62;

/** Usable width of the board in rem: the 44rem column less its 1rem gutters. */
const COLUMN = 42;

/** The phrase should settle into about this many lines. Fewer looks stranded
    at small sizes; more turns a headline into a paragraph. */
const TARGET_LINES = 2.6;

/** Typographic floor and ceiling. Below the floor the puzzle stops reading as
    a headline; above the ceiling it overpowers the masthead. */
const MIN_REM = 1.15;
const MAX_REM = 2.9;

/** The column is this many rem wide including gutters. A size of `n` rem in
    the column is worth `n / COLUMN_VW` vw once the viewport is narrower than
    the column, which is what keeps the fitted size responsive. */
const COLUMN_VW = COLUMN + 2;

export interface Measured {
  /** Characters in the longest single word. Nothing may overflow it. */
  readonly longest: number;
  /** Characters in the whole phrase, spaces included. */
  readonly total: number;
}

/** What the board must fit: its longest word and its overall length. */
export function measure(words: readonly { readonly shown: string }[]): Measured {
  let longest = 0;
  let total = 0;
  for (const { shown } of words) {
    longest = Math.max(longest, shown.length);
    total += shown.length + 1;
  }
  return { longest, total: Math.max(0, total - 1) };
}

/** The largest size in rem at which both constraints hold.

    Two things bound the type. A single word may not be wider than the column,
    or it strands itself on its own line and leaves a ragged gap above it. And
    the phrase as a whole wants to land in roughly `TARGET_LINES` lines. The
    tighter of the two wins. */
export function fitRem({ longest, total }: Measured): number {
  if (longest === 0) return MAX_REM;
  const byLongestWord = COLUMN / (longest * ADVANCE);
  const byTotalLength = (TARGET_LINES * COLUMN) / (Math.max(1, total) * ADVANCE);
  const wanted = Math.min(byLongestWord, byTotalLength);
  return clamp(wanted, MIN_REM, MAX_REM);
}

/** The board's `font-size`, as a clamp that stays responsive.

    The rem value is the ideal at full column width. The `vw` term takes over
    on viewports too narrow for it, so one declaration covers every screen
    without a media query. */
export function boardFontSize(words: readonly { readonly shown: string }[]): string {
  const rem = fitRem(measure(words));
  // Same proportion of a narrow viewport as the fitted size is of the column.
  const vw = (rem / COLUMN_VW) * 100;
  const floor = Math.min(MIN_REM, rem);
  return `clamp(${round(floor)}rem, ${round(vw)}vw, ${round(rem)}rem)`;
}

function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value));
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}
