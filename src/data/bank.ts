/** Loading and hydrating the generated bank. The app's only I/O. */
import { inflect, type WordForm } from "../core/inflect";
import { randomFrom } from "../core/shuffle";
import { pick, type Candidate, type Pos, type Taste } from "../core/select";
import type { Puzzle, PuzzleWord } from "../core/types";

/** A puzzle as stored: tokens plus which of them may be swapped. */
export interface RawPuzzle {
  readonly id: string;
  readonly mode: "idiom" | "before-after";
  readonly answer: string;
  readonly tokens: readonly string[];
  readonly slots: readonly {
    /** Token index in the phrase. */
    i: number;
    /** Lexicon key, `lemma|pos`. */
    k: string;
    /** Grammatical form the sentence needs. */
    f: WordForm;
    /** Jev's in-context ranking for this exact slot: [word, probability]. */
    r?: readonly (readonly [string, number])[];
  }[];
  readonly fam: number;
  readonly pivot?: number;
}

/** lemma|pos -> the candidates Jev scored for that sense. */
export type Lexicon = Record<string, Candidate[]>;

export interface Bank {
  readonly puzzles: readonly RawPuzzle[];
  readonly lexicon: Lexicon;
}

export async function loadBank(): Promise<Bank> {
  const base = import.meta.env.BASE_URL;
  const [puzzles, lexicon] = await Promise.all([
    fetch(`${base}puzzles.json`).then(expectJson<RawPuzzle[]>),
    fetch(`${base}lexicon.json`).then(expectJson<Lexicon>),
  ]);
  return { puzzles, lexicon };
}

async function expectJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error(`data unavailable (${response.status})`);
  return (await response.json()) as T;
}

/**
 * Turn a stored puzzle into a playable one by choosing each slot's
 * replacement. The seed makes a board reproducible, so a shared link and a
 * re-roll are the same mechanism with a different number.
 */
export function hydrate(
  raw: RawPuzzle,
  lexicon: Lexicon,
  taste: Taste,
  seed: number,
): Puzzle {
  const roll = randomFrom(seed);
  const bySlot = new Map(raw.slots.map((slot) => [slot.i, slot]));

  const words: PuzzleWord[] = raw.tokens.map((token, index) => {
    const slot = bySlot.get(index);
    const candidates = slot ? lexicon[slot.k] : undefined;
    if (!slot || !candidates) return { original: token, shown: token, swapped: false };

    const pos = slot.k.split("|")[1] as Pos;
    // Prefer Jev's ranking for this exact sentence: it alone knows which
    // sense the phrase wants. Fall back to the lemma's scores.
    const field = slot.r ? contextual(slot.r, candidates) : candidates;
    const chosen = pick(field, stripPunctuation(token), taste, roll(), pos);
    if (!chosen) return { original: token, shown: token, swapped: false };

    return {
      original: token,
      shown: inflect(chosen.w, slot.f),
      swapped: true,
      confidence: chosen.syn,
    };
  });

  return {
    id: raw.id, mode: raw.mode, answer: raw.answer, words,
    familiarity: raw.fam, pivotIndex: raw.pivot,
  };
}

/**
 * Fold the in-context ranking into the scored candidates. The contextual
 * probability replaces synonymy, since it is a judgement about this sentence
 * rather than about the dictionary.
 */
function contextual(
  ranked: readonly (readonly [string, number])[],
  scored: readonly Candidate[],
): Candidate[] {
  const byWord = new Map(scored.map((c) => [c.w.toUpperCase(), c]));
  const out: Candidate[] = [];
  let mass = 0;
  for (const [word, probability] of ranked) {
    const base = byWord.get(word.toUpperCase());
    if (!base) continue;
    // Keep the head of the distribution only. Below it Jev is expressing
    // "anything but this", and sampling there is what produced readings like
    // "AFFECTLESS AS ICE" for a phrase about temperature.
    if (mass > 0.98 && out.length >= 4) break;
    mass += probability;
    out.push({ ...base, syn: Math.max(base.syn, probability), fit: probability });
  }
  return out.length > 0 ? out : [...scored];
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
