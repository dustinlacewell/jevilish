/** Loading and hydrating the generated bank. The app's only I/O. */
import { binomialFor, type BinomialTable } from "../core/binomial";
import { inflect, type WordForm } from "../core/inflect";
import { archaicPass, fixArticles } from "../core/register";
import { pick, type Candidate, type Taste } from "../core/select";
import { randomFrom } from "../core/shuffle";
import type { Puzzle, PuzzleWord } from "../core/types";

/** A slot the generator decided is worth replacing. */
export interface Slot {
  /** Token index in the phrase. */
  readonly i: number;
  /** Lexicon key, when the replacement comes from the thesaurus. */
  readonly k?: string;
  /** A scientific name, when the word is an organism. */
  readonly sci?: string;
  /** Grammatical form the sentence needs. */
  readonly f: WordForm;
  /** Present when the slot is unambiguously a verb. */
  readonly v?: number;
}

export interface RawPuzzle {
  readonly id: string;
  readonly mode: "idiom" | "before-after";
  readonly answer: string;
  readonly tokens: readonly string[];
  readonly slots: readonly Slot[];
  readonly fam: number;
  readonly pivot?: number;
}

/** Slot key -> the candidates Jev vetted for it, ranked by theme. */
export type Lexicon = Record<string, Candidate[]>;

export interface Bank {
  readonly puzzles: readonly RawPuzzle[];
  readonly lexicon: Lexicon;
  readonly binomials: BinomialTable;
}

export async function loadBank(): Promise<Bank> {
  const base = import.meta.env.BASE_URL;
  const [puzzles, lexicon, binomials] = await Promise.all([
    fetch(`${base}puzzles.json`).then(expectJson<RawPuzzle[]>),
    fetch(`${base}lexicon.json`).then(expectJson<Lexicon>),
    fetch(`${base}binomials.json`).then(expectJson<BinomialTable>),
  ]);
  return { puzzles, lexicon, binomials };
}

async function expectJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`data unavailable (${response.status})`);
  return (await response.json()) as T;
}

/**
 * Turn a stored puzzle into a playable board.
 *
 * Three kinds of replacement, in order of precedence: a scientific name for
 * an organism, a vetted synonym for ordinary vocabulary, and an archaic form
 * for the function words neither of those can touch. The seed makes a board
 * reproducible, so a shared link and a re-roll are the same mechanism with a
 * different number.
 */
export function hydrate(
  raw: RawPuzzle,
  bank: Pick<Bank, "lexicon" | "binomials">,
  taste: Taste,
  seed: number,
): Puzzle {
  const roll = randomFrom(seed);
  const bySlot = new Map(raw.slots.map((slot) => [slot.i, slot]));
  const archaic = archaicPass(raw.tokens);

  const words: PuzzleWord[] = raw.tokens.map((token, index) => {
    const plain = { original: token, shown: token, swapped: false };
    const slot = bySlot.get(index);

    if (slot?.sci) {
      return { original: token, shown: slot.sci, swapped: true, scientific: true };
    }

    if (slot?.k) {
      const candidates = bank.lexicon[slot.k];
      const chosen = candidates && pick(candidates, stripPunctuation(token), taste, roll());
      if (chosen) {
        return {
          original: token,
          shown: inflect(chosen.w, slot.f, slot.v === 1),
          swapped: true,
          confidence: chosen.sense,
        };
      }
    }

    // Function words have no synonyms, only registers: YOUR -> THY.
    const costumed = archaic[index];
    if (costumed) return { original: token, shown: costumed, swapped: true };

    return plain;
  });

  // A/AN agrees with the sound of what follows, which the swaps just changed.
  const articled = fixArticles(words.map((w) => w.shown));
  const settled = words.map((word, i) =>
    articled[i] === word.shown ? word : { ...word, shown: articled[i] });

  return {
    id: raw.id, mode: raw.mode, answer: raw.answer, words: settled,
    familiarity: raw.fam, pivotIndex: raw.pivot,
  };
}

function stripPunctuation(token: string): string {
  return token.replace(/[^A-Za-z']/g, "");
}

/** Deterministic daily pick, so everyone shares the same puzzle. */
export function puzzleOfTheDay(bank: readonly RawPuzzle[], today = new Date()): RawPuzzle {
  const epoch = Date.UTC(2026, 0, 1);
  const day = Math.floor((Date.UTC(
    today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()) - epoch) / 86_400_000);
  return bank[((day % bank.length) + bank.length) % bank.length];
}

export { binomialFor };
