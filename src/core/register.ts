/**
 * Archaic forms of the function words a thesaurus will never help with.
 *
 * YOUR, IS and DOES have no synonyms, so the synonym pipeline skips them —
 * but they have *registers*, and THY, ART and DOTH are the cheapest way to
 * make a phrase sound like it is wearing a costume. Everyone knows these
 * words from Shakespeare and the King James Bible, which is exactly the
 * quality the game wants: old-fashioned, never unfamiliar.
 *
 * A hand-written table rather than a scored one. The set is closed, the
 * answers are not a matter of judgement, and agreement rules are grammar
 * rather than taste.
 */

/** Second-person pronouns and the possessives that go with them. */
const PRONOUNS: Record<string, string> = {
  YOU: "THOU",
  YOUR: "THY",
  YOURS: "THINE",
  YOURSELF: "THYSELF",
  MY: "MINE",
  YE: "YE",
};

/**
 * Third-person -ETH forms. These stand on their own: "the heart wanteth"
 * needs no THOU nearby. The second-person forms (ART, HAST, DOST) do not
 * belong here — "they art" is broken, not costumed — and live in AFTER_THOU.
 */
const VERBS: Record<string, string> = {
  HAS: "HATH",
  DOES: "DOTH",
  SAYS: "SAITH",
  KNOWS: "KNOWETH",
  GOES: "GOETH",
  COMES: "COMETH",
  MAKES: "MAKETH",
  GIVES: "GIVETH",
  TAKES: "TAKETH",
  SPEAKS: "SPEAKETH",
  SEEKS: "SEEKETH",
  WANTS: "WANTETH",
  SEEMS: "SEEMETH",
};

/** Everything else: adverbs, particles and small words with a costumed twin. */
const PARTICLES: Record<string, string> = {
  BEFORE: "ERE",
  ALWAYS: "EVERMORE",
  NEVER: "NEVERMORE",
  ALTHOUGH: "ALBEIT",
  BECAUSE: "FOR",
  UNLESS: "LEST",
  PERHAPS: "PERCHANCE",
  MAYBE: "PERCHANCE",
  OFTEN: "OFT",
  SOON: "ANON",
  HERE: "HITHER",
  THERE: "THITHER",
  WHERE: "WHITHER",
  AWAY: "HENCE",
  TODAY: "THIS DAY",
  TOMORROW: "THE MORROW",
  TRULY: "VERILY",
  INDEED: "VERILY",
  VERY: "PASSING",
  BETWEEN: "BETWIXT",
  AMONG: "AMONGST",
  WHILE: "WHILST",
  AMID: "AMIDST",
  UPON: "UPON",
};

const TABLE: Record<string, string> = { ...PRONOUNS, ...VERBS, ...PARTICLES };

/**
 * Verbs that must agree once YOU has become THOU. Applying a pronoun swap
 * without this gives "thou is", which reads as broken rather than archaic.
 */
const AFTER_THOU: Record<string, string> = {
  ARE: "ART",
  WERE: "WERT",
  HAVE: "HAST",
  HAD: "HADST",
  DO: "DOST",
  DID: "DIDST",
  WILL: "SHALT",
  CAN: "CANST",
  SHOULD: "SHOULDST",
  WOULD: "WOULDST",
  MUST: "MUST",
  KNOW: "KNOWEST",
  SAY: "SAYEST",
  GO: "GOEST",
  COME: "COMEST",
  SEE: "SEEST",
  THINK: "THINKEST",
  WANT: "WANTEST",
  SPEAK: "SPEAKEST",
};

/** THY before a consonant, THINE before a vowel — as in "thine eyes". */
function possessive(next: string | undefined): string {
  const first = next?.replace(/[^A-Za-z]/g, "").charAt(0).toUpperCase();
  return first && "AEIOU".includes(first) ? "THINE" : "THY";
}

/** The costumed form of one word, or null when it has none. */
export function archaicForm(word: string, nextWord?: string): string | null {
  const key = word.toUpperCase().replace(/[^A-Z']/g, "");
  if (key === "") return null;
  if (key === "YOUR") return possessive(nextWord);
  const form = TABLE[key];
  return form && form !== key ? form : null;
}

/**
 * Fix A/AN once the following word has changed. Replacing DOG with
 * *Canis familiaris* turns "an old dog" into "an old Canis", and leaving
 * CHICKEN as *Gallus gallus* turns "a chicken" into "a Gallus" — the article
 * agrees with the sound of whatever now follows it.
 */
export function fixArticles(shown: readonly string[]): string[] {
  return shown.map((word, index) => {
    const bare = word.toUpperCase().replace(/[^A-Z]/g, "");
    if (bare !== "A" && bare !== "AN") return word;
    const next = shown[index + 1]?.replace(/[^A-Za-z]/g, "");
    if (!next) return word;
    const vowel = "AEIOU".includes(next.charAt(0).toUpperCase());
    const fixed = vowel ? "AN" : "A";
    // Keep the original casing: boards are upper case, prose is not.
    return word === word.toLowerCase() ? fixed.toLowerCase() : fixed;
  });
}

/**
 * Rewrite a phrase's function words into their archaic forms, keeping verb
 * agreement after THOU. Returns one entry per input token, null where the
 * token is unchanged, so callers can render the swap however they like.
 */
export function archaicPass(tokens: readonly string[]): (string | null)[] {
  const out: (string | null)[] = tokens.map(() => null);
  tokens.forEach((token, index) => {
    const swapped = archaicForm(token, tokens[index + 1]);
    if (swapped) out[index] = swapped;
  });

  // Fix agreement for the verb following a THOU we just introduced.
  out.forEach((swapped, index) => {
    if (swapped !== "THOU") return;
    const next = tokens[index + 1]?.toUpperCase().replace(/[^A-Z']/g, "");
    if (next && AFTER_THOU[next]) out[index + 1] = AFTER_THOU[next];
  });
  return out;
}
