/**
 * Scientific names for the animals and plants that turn up in idioms.
 *
 * A thesaurus cannot help with CAT. The plain word *is* the name of the
 * thing, so every "synonym" Moby offers is either a different animal (LYNX,
 * TOMCAT) or a word nobody knows (GRIMALKIN). The binomial always exists,
 * and it is always more pompous: LET THE FELIS CATUS OUT OF THE BAG.
 *
 * These are exempt from the recognisability gate that governs ordinary
 * vocabulary. Nobody knows *Sus scrofa* — but everyone can see it is Latin
 * for some animal, announced by someone insufferable, and that is the joke
 * rather than an obstacle. Not knowing which species is not the same as not
 * knowing what kind of word it is.
 *
 * Every entry was verified by Jev against "is this the correct standard
 * scientific name for the common X"; the higher-rank taxa that failed
 * (Cetacea for whale, Aves for bird) were replaced with real species.
 */

/** Common word (including plurals) to its scientific name. */
export type BinomialTable = Readonly<Record<string, string>>;

/** The scientific name for a word, if the game knows one. */
export function binomialFor(word: string, table: BinomialTable): string | null {
  const bare = word.toUpperCase().replace(/[^A-Z']/g, "");
  // "the camel's back" is the same animal as "a camel", so a possessive
  // resolves to the singular rather than falling through to the plural.
  const possessive = bare.replace(/'S$/, "");
  const key = possessive.replace(/[^A-Z]/g, "");
  return table[key] ?? null;
}

/**
 * Printed form. Scientific names are conventionally italicised with only the
 * genus capitalised, and the board is otherwise all caps — so the shape alone
 * signals "this one is showing off".
 */
export function renderBinomial(name: string): string {
  return name;
}
