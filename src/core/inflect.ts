/**
 * Putting a lemma-shaped replacement back into the sentence's grammar.
 *
 * Jev scores candidates in their dictionary form, so RINGS -> TINTINNABULATE
 * must become TINTINNABULATES or the phrase stops parsing. Rules cover the
 * regular cases; irregulars are listed because there are few enough to name.
 */

export type WordForm = "base" | "s" | "ing" | "ed" | "comparative" | "superlative";

const IRREGULAR: Record<string, Partial<Record<WordForm, string>>> = {
  BE: { s: "IS", ing: "BEING", ed: "WAS" },
  GO: { s: "GOES", ing: "GOING", ed: "WENT" },
  HAVE: { s: "HAS", ing: "HAVING", ed: "HAD" },
  DO: { s: "DOES", ing: "DOING", ed: "DID" },
  EAT: { s: "EATS", ing: "EATING", ed: "ATE" },
  GOOD: { comparative: "BETTER", superlative: "BEST" },
  BAD: { comparative: "WORSE", superlative: "WORST" },
};

const VOWELS = "AEIOU";
const isVowel = (ch: string) => VOWELS.includes(ch);

/**
 * Double a final consonant after a short stressed vowel: BIG -> BIGGER.
 *
 * English only doubles when the last syllable carries the stress, which is
 * why MARATHON gives MARATHONING and not MARATHONNING. Stress is not in the
 * data, so the rule approximates it: only one-syllable words double.
 */
function doubles(word: string): boolean {
  const n = word.length;
  if (n < 3) return false;
  const [c1, v, c2] = [word[n - 3], word[n - 2], word[n - 1]];
  if (!isVowel(v) || isVowel(c2) || isVowel(c1)) return false;
  if ("WXY".includes(c2)) return false;
  const syllables = (word.match(/[AEIOUY]+/g) ?? []).length;
  return syllables <= 1;
}

function addS(word: string): string {
  if (/(S|X|Z|CH|SH)$/.test(word)) return `${word}ES`;
  if (/[^AEIOU]Y$/.test(word)) return `${word.slice(0, -1)}IES`;
  if (/[^AEIOU]O$/.test(word)) return `${word}ES`;
  return `${word}S`;
}

function addIng(word: string): string {
  if (word.endsWith("IE")) return `${word.slice(0, -2)}YING`;
  if (word.endsWith("E") && !word.endsWith("EE")) return `${word.slice(0, -1)}ING`;
  if (doubles(word)) return `${word}${word.at(-1)}ING`;
  return `${word}ING`;
}

function addEd(word: string): string {
  if (word.endsWith("E")) return `${word}D`;
  if (/[^AEIOU]Y$/.test(word)) return `${word.slice(0, -1)}IED`;
  if (doubles(word)) return `${word}${word.at(-1)}ED`;
  return `${word}ED`;
}

/**
 * Longer words take MORE/MOST rather than -ER/-EST, which is also the safe
 * choice for the grandiose vocabulary this game favours.
 */
function compare(word: string, form: "comparative" | "superlative"): string {
  const syllables = (word.match(/[AEIOUY]+/g) ?? []).length;
  const prefix = form === "comparative" ? "MORE" : "MOST";
  if (syllables >= 3) return `${prefix} ${word}`;
  if (word.endsWith("E")) return `${word}${form === "comparative" ? "R" : "ST"}`;
  if (/[^AEIOU]Y$/.test(word)) {
    return `${word.slice(0, -1)}${form === "comparative" ? "IER" : "IEST"}`;
  }
  if (doubles(word)) {
    return `${word}${word.at(-1)}${form === "comparative" ? "ER" : "EST"}`;
  }
  return `${word}${form === "comparative" ? "ER" : "EST"}`;
}

/** True when the word already carries the inflection asked for. */
function alreadyInflected(word: string, form: WordForm): boolean {
  switch (form) {
    // A thesaurus lists whatever string its editor typed, so a pool for a
    // past-tense slot can already contain CONSTRUCTED. Inflecting again gives
    // CONSTRUCTEDED.
    case "ed": return word.endsWith("ED");
    case "ing": return word.endsWith("ING");
    case "s": return /(?:[^S]S|ES)$/.test(word);
    case "comparative": return word.endsWith("ER") || word.startsWith("MORE ");
    case "superlative": return word.endsWith("EST") || word.startsWith("MOST ");
    default: return false;
  }
}

/** Reshape a dictionary-form word into the form the sentence needs. */
export function inflect(word: string, form: WordForm): string {
  const upper = word.toUpperCase();
  const irregular = IRREGULAR[upper]?.[form];
  if (irregular) return irregular;
  if (alreadyInflected(upper, form)) return upper;
  switch (form) {
    case "s": return addS(upper);
    case "ing": return addIng(upper);
    case "ed": return addEd(upper);
    case "comparative":
    case "superlative": return compare(upper, form);
    default: return upper;
  }
}
