/** Text normalisation shared by guess matching and candidate handling. Pure. */

/** Every shape of apostrophe a keyboard or phone might produce. Typing
    DONT for DON'T is the same guess, so all of them simply vanish. */
const APOSTROPHES = /['‘’ʼʻ`´]/g;

/** Combining marks left behind once accented letters are decomposed. */
const DIACRITICS = /[̀-ͯ]/g;

/**
 * Strip case, accents, punctuation and redundant whitespace for comparison.
 *
 * Apostrophes are deleted rather than replaced with a space: DON'T has to
 * normalise to DONT, or a player who types the contraction without its
 * apostrophe gets two tokens that match nothing. Every other punctuation
 * mark becomes a space, so hyphenated and spaced forms agree —
 * ONCE-IN-A-LIFETIME and "once in a lifetime" are the same guess.
 */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toUpperCase()
    .replace(APOSTROPHES, "")
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Words of a phrase, punctuation removed. */
export function tokenize(phrase: string): string[] {
  const n = normalize(phrase);
  return n === "" ? [] : n.split(" ");
}
