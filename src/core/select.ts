/**
 * Runtime choice of a replacement word.
 *
 * Generation answers three questions per candidate and filters none of them
 * out, so all the taste lives here: what the game will allow, how much
 * the theme is worth, and how varied a re-roll should be. Pure, so changing
 * any of it costs nothing.
 */

/** One candidate, as vetted by Jev for one slot in one phrase. */
export interface Candidate {
  readonly w: string;
  /** Does it carry this phrase's meaning? 0..1 */
  readonly sense: number;
  /** Has the reader never met this word? 0..1, lower is safer. */
  readonly unknown: number;
  /** How grandly Victorian it sounds. 0..2 */
  readonly theme: number;
}

export interface Taste {
  /** Reject anything that does not mean the right thing here. */
  readonly minSense: number;
  /**
   * Reject words the reader has never seen. This is not obscurity: THY and
   * PERCHANCE are rare and instantly recognised, while CULM and RACHIS are
   * merely unknown. Costume is the game; a vocabulary test is not.
   */
  readonly maxUnknown: number;
  /** Softmax temperature: low picks the best word, high spreads the field. */
  readonly temperature: number;
}

/**
 * The game's one setting.
 *
 * Tuned against the lexicon rather than by feel. `minSense` is the only
 * threshold that really bites: raising it strands slots with no eligible
 * word, and a slot with no word goes undisguised, which makes the puzzle
 * easier rather than harder. At 0.32 only 1.2% of slots come up empty and
 * the median slot still offers eight candidates.
 *
 * `maxUnknown` sits at the top of the lexicon's own range, because
 * generation already rejected the merely obscure. Anything lower discards
 * costume without buying fairness.
 *
 * `temperature` governs re-roll variety more than difficulty: at 0.25 the
 * grandest candidate wins about a third of the time, so the same phrase
 * dressed twice reads differently.
 */
export const TASTE: Taste = {
  minSense: 0.32,
  maxUnknown: 0.3,
  temperature: 0.25,
};

/**
 * Modal verbs that take a bare infinitive: "must be", "should have".
 * A replacement has to accept the same complement or the sentence breaks.
 */
const BARE_INFINITIVE_MODALS = new Set([
  "MUST", "CAN", "WILL", "SHALL", "MAY", "MIGHT", "COULD", "WOULD", "SHOULD",
]);

/**
 * Words that mean the same as a modal but govern a to-infinitive. They are
 * honest synonyms and still wrong here: "must be" becomes "have be", and
 * "should undergo" becomes "ought undergo". Supplying the missing TO would
 * turn one token into two and desync the board from its answer, so the
 * substitution is refused instead.
 */
const TO_INFINITIVE_MODALS = new Set([
  "HAVE", "HAS", "HAD", "OUGHT", "NEED", "NEEDS", "GET", "GOT", "WANT",
]);

/**
 * LET is causative, not modal, and shares the bare-infinitive frame: "let
 * bygones be", "let the good times roll". Its synonyms all want a TO —
 * "allow bygones TO be" — so none of them can stand in for it.
 *
 * Only LET is listed. MAKE and SEE take the same frame in "make your hair
 * stand" and "hear a pin drop", but they are far more often plain
 * transitives ("make a mountain", "see the forest") where the synonyms are
 * correct. Every LET in the bank is causative; the others are not, and
 * telling the uses apart needs a parse rather than a word list.
 */
const BARE_INFINITIVE_CAUSATIVES = new Set(["LET"]);

/**
 * Verbs of permitting. Fine anywhere else, unusable after a causative LET
 * because each one governs a to-infinitive.
 */
const PERMITTING_VERBS = new Set([
  "ALLOW", "PERMIT", "AUTHORIZE", "SANCTION", "CONSENT", "ACCORD", "GRANT",
  "SUFFER", "LEAVE", "RELEASE", "DISPENSE", "ADMIT", "CONSIDER", "HAVE",
  "ENABLE", "ENTITLE", "LICENSE",
]);

/** Does swapping `candidate` for `original` break the complement frame? */
function breaksModalFrame(candidate: string, original: string): boolean {
  if (BARE_INFINITIVE_MODALS.has(original) && TO_INFINITIVE_MODALS.has(candidate)) return true;
  return BARE_INFINITIVE_CAUSATIVES.has(original) && PERMITTING_VERBS.has(candidate);
}

/** Candidates a given taste is willing to show the player. */
export function eligible(
  candidates: readonly Candidate[],
  original: string,
  taste: Taste,
): Candidate[] {
  const base = original.toUpperCase().replace(/[^A-Z]/g, "");
  return candidates.filter(
    (c) =>
      c.sense >= taste.minSense &&
      c.unknown <= taste.maxUnknown &&
      !sharesStem(c.w, base) &&
      !breaksModalFrame(c.w.toUpperCase().replace(/[^A-Z]/g, ""), base),
  );
}

/** SLEEP and SLEEPING teach the player nothing; nor does PENNY for PENNIES. */
function sharesStem(candidate: string, original: string): boolean {
  const a = candidate.toUpperCase().replace(/[^A-Z]/g, "");
  if (a === original || a === "") return true;
  let shared = 0;
  while (shared < a.length && shared < original.length && a[shared] === original[shared]) {
    shared++;
  }
  return shared >= 4 && shared >= Math.min(a.length, original.length) - 2;
}

/**
 * How much the game wants a word. Theme is the whole point; sense is already
 * a gate, so it only breaks ties between equally grand options.
 */
export function appeal(c: Candidate): number {
  return c.theme + 0.3 * c.sense;
}

/**
 * Pick one candidate by softmax over appeal. `roll` is a 0..1 value, so the
 * caller owns the randomness and a seeded board reproduces exactly.
 */
export function pick(
  candidates: readonly Candidate[],
  original: string,
  taste: Taste,
  roll: number,
): Candidate | null {
  const field = eligible(candidates, original, taste);
  if (field.length === 0) return null;
  if (field.length === 1) return field[0];

  const top = Math.max(...field.map(appeal));
  const weights = field.map((c) => Math.exp((appeal(c) - top) / taste.temperature));
  const total = weights.reduce((sum, w) => sum + w, 0);

  let cursor = roll * total;
  for (let i = 0; i < field.length; i++) {
    cursor -= weights[i];
    if (cursor <= 0) return field[i];
  }
  return field[field.length - 1];
}
