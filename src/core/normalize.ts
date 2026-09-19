/** Text normalisation shared by guess matching and candidate handling. Pure. */

/** Strip case, punctuation and redundant whitespace for comparison. */
export function normalize(text: string): string {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Words of a phrase, punctuation removed. */
export function tokenize(phrase: string): string[] {
  const n = normalize(phrase);
  return n === "" ? [] : n.split(" ");
}
