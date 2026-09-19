/**
 * Runtime choice of a replacement word.
 *
 * Generation scores every candidate and filters nothing, so all the taste
 * lives here: which axes matter, how hard to punish obscurity, and how much
 * variety a re-roll should give. Pure, so tuning costs nothing.
 */

/** One candidate as scored by Jev at generate time. */
export interface Candidate {
  readonly w: string;
  /** Can it stand in for the lemma in this sense? 0..1 */
  readonly syn: number;
  /** How over-the-top it sounds. 0..2 */
  readonly pomp: number;
  /** How obscure it is. 0..2 */
  readonly obs: number;
  /** Could a reader decode it from roots and context? 0..1 */
  readonly dec: number;
  /** Jev's probability for this word in this exact sentence, when known. */
  readonly fit?: number;
}

export interface Taste {
  /** Reject anything Jev doubts is a real substitute. */
  readonly minSynonymy: number;
  /** Reject words past the point where a reader stops recognising them. */
  readonly maxObscurity: number;
  /** Softmax temperature: low picks the best word, high spreads the field. */
  readonly temperature: number;
}

/**
 * Three difficulty settings, differing mainly in how much obscurity they allow.
 *
 * The obscurity thresholds are measured, not guessed: across the 46k scored
 * candidates, words an ordinary reader knows (FELINE, GARGANTUAN, MALODOROUS)
 * score at or below 1.0, while the ones nobody knows (WHILOM, POTATION,
 * CACHINNATION) sit at 1.1 and above. Crossing 1.0 is what turns the game
 * from "pompous" into "unfair".
 */
export const TASTES: Record<"gentle" | "standard" | "cruel", Taste> = {
  gentle:   { minSynonymy: 0.45, maxObscurity: 0.65, temperature: 0.45 },
  standard: { minSynonymy: 0.38, maxObscurity: 0.95, temperature: 0.3 },
  cruel:    { minSynonymy: 0.3, maxObscurity: 1.15, temperature: 0.25 },
};

/**
 * A thesaurus entry is a bag of related words, not a list of drop-in
 * substitutes: Moby lists PROPELLING and PUSHINGNESS under the verb DRIVE.
 * Those cannot be inflected back into the sentence, so a candidate whose
 * shape contradicts the slot's part of speech is rejected outright.
 */
const WRONG_SHAPE: Partial<Record<Pos, RegExp>> = {
  verb: /(ING|NESS|MENT|ITY|TION|SION|ANCE|ENCE|IST|ISM)$/,
  adj: /(NESS|MENT|ITY|TION|SION|ISM)$/,
  adv: /(NESS|MENT|ING)$/,
};

export type Pos = "noun" | "verb" | "adj" | "adv";

/** Candidates a given taste is willing to show the player. */
export function eligible(
  candidates: readonly Candidate[],
  original: string,
  taste: Taste,
  pos?: Pos,
): Candidate[] {
  const base = original.toUpperCase().replace(/[^A-Z]/g, "");
  const wrongShape = pos ? WRONG_SHAPE[pos] : undefined;
  return candidates.filter((c) => {
    if (c.syn < taste.minSynonymy) return false;
    if (c.obs > taste.maxObscurity) return false;
    if (wrongShape?.test(c.w.toUpperCase())) return false;
    return !sharesStem(c.w, base);
  });
}

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
 * How much the game wants a given word. Pomposity is the point, but a word
 * the player cannot recognise is not funny, so obscurity is a cost rather
 * than a second kind of appeal.
 */
export function appeal(c: Candidate): number {
  // A slot Jev ranked in context is a judgement about this sentence, and it
  // outranks dictionary scores: it is the only signal that knows which sense
  // the phrase means.
  const context = c.fit === undefined ? 0 : 2.5 * c.fit;
  return c.pomp + 0.5 * c.syn - 0.35 * c.obs + context;
}

/**
 * Pick one candidate by softmax over appeal. `roll` is a 0..1 value, so the
 * caller owns the randomness and a seeded run reproduces exactly.
 */
export function pick(
  candidates: readonly Candidate[],
  original: string,
  taste: Taste,
  roll: number,
  pos?: Pos,
): Candidate | null {
  const field = eligible(candidates, original, taste, pos);
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
