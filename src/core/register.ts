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

/** Second-person pronouns and the possessives that go with them. YOU is
    absent: it is THOU as a subject and THEE as an object, which needs the
    surrounding words to decide. See `secondPerson`. */
const PRONOUNS: Record<string, string> = {
  YOUR: "THY",
  YOURS: "THINE",
  YOURSELF: "THYSELF",
  YE: "YE",
};

/**
 * Contracted second-person forms. YOU'RE beside a THOU reads as a mistake
 * rather than a costume, so these carry their own archaic pairings.
 */
const CONTRACTIONS: Record<string, string> = {
  "YOU'RE": "THOU ART",
  "YOU'LL": "THOU SHALT",
  "YOU'VE": "THOU HAST",
  "YOU'D": "THOU WOULDST",
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

const TABLE: Record<string, string> = { ...PRONOUNS, ...CONTRACTIONS, ...VERBS, ...PARTICLES };

/**
 * Negated verbs after THOU. Early modern English negates after the verb —
 * "thou canst not", never "thou can't" — so one token becomes two words.
 * Leaving the contraction alone is what produced "THOU CANST RUN BUT THOU
 * CAN'T HIDE", half costumed and half not.
 */
const NEGATED_AFTER_THOU: Record<string, string> = {
  "CAN'T": "CANST NOT",
  "WON'T": "SHALT NOT",
  "DON'T": "DOST NOT",
  "DIDN'T": "DIDST NOT",
  "DOESN'T": "DOTH NOT",
  "HAVEN'T": "HAST NOT",
  "HASN'T": "HATH NOT",
  "HADN'T": "HADST NOT",
  "COULDN'T": "COULDST NOT",
  "WOULDN'T": "WOULDST NOT",
  "SHOULDN'T": "SHOULDST NOT",
  "AREN'T": "ART NOT",
  "WEREN'T": "WERT NOT",
  "AIN'T": "ART NOT",
  "MUSTN'T": "MUST NOT",
};

/** Prepositions: a YOU after one of these is an object. */
const PREPOSITIONS = new Set([
  "TO", "FOR", "WITH", "ON", "AT", "BY", "FROM", "NEAR", "BEHIND", "BESIDE",
  "UPON", "OF", "INTO", "AGAINST", "BETWEEN", "AROUND", "ABOUT",
]);

/**
 * Transitive verbs the bank actually puts in front of YOU. A closed list
 * beats a guess: every other position defaults to the subject, so a verb
 * missing from here costs a THEE, never a wrong THOU.
 */
const TAKES_OBJECT = new Set([
  "HEAR", "SEEING", "FEEDS", "READ", "MEETING", "GIVE", "TOLD", "STEER",
  "HAUNT", "SEE", "MADE", "HURT", "GET", "SUITS", "LOVE", "TELL", "SHOW",
  "BRING", "SEND", "CATCH", "FOOL", "BEAT", "HELP", "MISS", "THANK",
  "BLESS", "SAVE", "TEACH", "WATCH",
]);

/**
 * Words that mark the YOU before them as a subject, because YOU governs
 * them. This outranks every object test: in "I told you so" TOLD makes an
 * object, but in "now you see it" SEE makes a subject.
 */
const GOVERNED_BY_SUBJECT = new Set([
  "CAN", "CAN'T", "COULD", "COULDN'T", "WILL", "WON'T", "WOULD", "WOULDN'T",
  "SHOULD", "SHOULDN'T", "SHALL", "MAY", "MIGHT", "MUST", "DO", "DON'T",
  "DID", "DIDN'T", "DOES", "DOESN'T", "ARE", "AREN'T", "WERE", "WEREN'T",
  "HAVE", "HAVEN'T", "HAS", "HAD", "IS", "WAS", "BE",
  "SEE", "SEES", "KNOW", "GO", "GET", "SAY", "THINK", "WANT", "NEED",
  "MAKE", "TAKE", "GIVE", "LOSE", "SNOOZE", "REAP", "SOW", "WISH",
  "MENTION", "SPEAK", "TRY", "PLAY", "LIVE", "DIE", "EAT", "HEAR", "PICK",
  "TOP", "FIND", "BELIEVE", "SCARED", "MADE", "BROKE", "LEFT", "LOST",
  "BARGAINED", "DROP", "FLIPPED", "MISSING",
]);

/**
 * Is this YOU an object, and so THEE rather than THOU?
 *
 * Subject is the default and object needs evidence, because a wrong THEE
 * ("thee canst") reads as broken while a missed one ("feeds thou") merely
 * reads as plain. Governing a following verb settles it outright; otherwise
 * a preposition, a known transitive verb, or the end of the phrase marks
 * the object.
 */
export function isObjectPosition(previous?: string, next?: string): boolean {
  const before = bare(previous);
  const after = bare(next);
  if (after !== "" && GOVERNED_BY_SUBJECT.has(after)) return false;
  if (PREPOSITIONS.has(before)) return true;
  if (TAKES_OBJECT.has(before)) return true;
  return after === "" && before !== "";
}

/** The costumed second-person pronoun for one position. */
function secondPerson(previous?: string, next?: string): string {
  return isObjectPosition(previous, next) ? "THEE" : "THOU";
}

function bare(word?: string): string {
  return (word ?? "").toUpperCase().replace(/[^A-Z']/g, "");
}

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

/** THY before a consonant, THINE before a vowel — as in "thine eyes". MY and
    MINE split on the same sound, so both possessives share the rule. */
function possessive(next: string | undefined, vowelForm: string, consonantForm: string): string {
  const first = next?.replace(/[^A-Za-z]/g, "").charAt(0).toUpperCase();
  return first && "AEIOU".includes(first) ? vowelForm : consonantForm;
}

/** The costumed form of one word, or null when it has none. YOU needs both
    neighbours: the next word for agreement, the previous one for case. */
export function archaicForm(word: string, nextWord?: string, prevWord?: string): string | null {
  const key = bare(word);
  if (key === "") return null;
  const form = contextual(key, nextWord, prevWord) ?? TABLE[key];
  // MY before a consonant is still MY: a form equal to its input is not a
  // swap, and reporting one would mark an unchanged word as costumed.
  return form && form !== key ? form : null;
}

/** The forms that depend on their neighbours rather than the table alone. */
function contextual(key: string, nextWord?: string, prevWord?: string): string | null {
  if (key === "YOUR") return possessive(nextWord, "THINE", "THY");
  if (key === "MY") return possessive(nextWord, "MINE", "MY");
  if (key === "YOU") return secondPerson(prevWord, nextWord);
  return null;
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
    const swapped = archaicForm(token, tokens[index + 1], tokens[index - 1]);
    if (swapped) out[index] = swapped;
  });

  // Fix agreement for the verb following a THOU we just introduced. Negated
  // verbs take the post-verbal form — THOU CANST NOT, not THOU CAN'T.
  out.forEach((swapped, index) => {
    if (swapped !== "THOU") return;
    const next = bare(tokens[index + 1]);
    if (!next) return;
    const agreed = AFTER_THOU[next] ?? NEGATED_AFTER_THOU[next];
    if (agreed) out[index + 1] = agreed;
  });
  return out;
}
