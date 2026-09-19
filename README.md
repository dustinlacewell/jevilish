# Jevlish

A common phrase, rendered insufferable. Guess what it was.

> THE CHAFF THAT RENT THE *CAMELUS DROMEDARIUS*' RACHIS
>
> — `THE STRAW THAT BROKE THE CAMEL'S BACK`

Every replacement was chosen by [Jev](https://typesafe.ai), TypeSafe AI's
System One model. Jev does not write text; it returns typed decisions with
calibrated probabilities. That is the whole game: a thesaurus proposes, Jev
judges, and the numbers it produced are what you see when a round ends.

## Play

```bash
npm install
npm run dev
```

The bank is committed, so the game runs with no API key.

## What Jev decides

A raw thesaurus is unusable for a word game. Moby lists 76 "synonyms" for
PENNY, including `grand`, `monkey` and `thousand dollars`. Turning that into
a playable puzzle takes a series of judgements, and Jev makes all of them.

| Pass | Question |
|---|---|
| `screen` | Is this phrase an idiom, a literal phrase, or a proper noun? |
| `tag` | What part of speech and grammatical form is this word, here? |
| `safety` | Would swapping this word break the phrase? |
| `sense` | Which meaning does the phrase use, has the reader met this word, and how grand does it sound? |

### Sense is a gate, not a score

The first build produced `THE STRAW THAT BANKRUPTED THE CAMEL'S BACK`.
BANKRUPTED is a perfectly good synonym for BROKE — the wrong one. Moby files
every sense of a word under one flat entry, so the pool for BROKE was
entirely the money sense, and no amount of ranking could reach FRACTURE.

So sense is settled first, in the context of the phrase, and it eliminates
rather than down-weights. A wrong-sense word is not a worse choice; it is
not a choice. Only the survivors get ranked on how funny they are.

### Costumed, not obscure

The second build produced `A BAWBEE FOR YOUR CEREBRATION`. Also not funny —
merely opaque. But the obvious fix, filtering on obscurity, throws out
PERCHANCE and THY along with BAWBEE, and those are exactly what the game
wants.

The distinction is not rarity. It is whether the reader has ever met the
word. Nobody *says* "forsooth", and everybody knows it — from Shakespeare,
the King James Bible, and every fairy tale. Asked directly, Jev separates the
two cleanly: costumed words score 0.02–0.23 on "most adults have never
encountered this word", and genuinely unknown ones score 0.45–0.83, with no
overlap. That gap is the difficulty slider.

### Where a thesaurus cannot help

Some words have no pompous synonym because the plain word *is* the name of
the thing. CAT offers only a different animal (LYNX) or a word nobody knows
(GRIMALKIN).

Two tables fill the gap, both hand-written because the answers are not a
matter of taste:

- **Scientific names** for the 62 organisms that turn up in idioms.
  *Felis catus*, *Sus scrofa*, *Camelus dromedarius*. Exempt from the
  recognisability gate — not knowing which species is not the same as not
  knowing what kind of word it is. Every binomial was verified by Jev, which
  correctly rejected the higher-rank taxa (Cetacea for whale, Aves for bird)
  that are not species names at all.
- **Archaic function words**, which a thesaurus has nothing to say about.
  YOUR → THY, YOU → THOU, HAS → HATH, PERHAPS → PERCHANCE. With agreement
  rules, because "thou is" reads as broken rather than costumed.

## Layout

```
bin/            generation passes, each cached and resumable
  screen.py       classify the corpus
  tag.py          part of speech and inflection, in context
  safety.py       which slots would break if swapped
  sense.py        sense, recognisability and theme, per slot
  gates.py        the thresholds sense.py and build.py must agree on
  build.py        assemble the shipped data (no API calls)
  pack.py         fold the per-answer cache into committable files
src/core/       pure game logic, no I/O, no React
  select.ts       runtime choice: gates, appeal, softmax
  session.ts      rounds, lives, hints, scoring
  guess.ts        answer matching
  inflect.ts      putting a lemma back into the sentence's grammar
  register.ts     archaic function words and verb agreement
  binomial.ts     scientific names
src/data/       the one module that fetches
src/ui/         board, controls, reveal
public/         the shipped bank
cache/          every Jev answer, keyed by prompt version
```

`cache/*.pack.json` is committed, so the bank rebuilds from scratch with no
API key:

```bash
python bin/build.py        # pure assembly over cached answers
```

## Regenerating

Requires `TYPESAFE_API_KEY` in `.env` and the two corpora (see `data/`).

```bash
python bin/screen.py && python bin/tag.py && python bin/safety.py
python bin/sense.py && python bin/build.py && python bin/pack.py
```

Each pass skips what is already cached. Bump the `QV` constant at the top of
a script to invalidate its cache after changing a prompt.

## Tests

```bash
npm test
```

The pure core only: guess matching, round rules, selection gates, softmax
behaviour, inflection, and archaic agreement. No network, no fixtures.

## Sources

Phrases are the [Buy a Vowel](https://buyavowel.boards.net/page/compendium)
Wheel of Fortune compendium, seasons 1–20, via
[Duthomhas/WOF1-20](https://github.com/Duthomhas/WOF1-20). Candidate words
come from the [Moby thesaurus](https://github.com/words/moby) and
[WordNet](https://github.com/zaibacu/thesaurus).
