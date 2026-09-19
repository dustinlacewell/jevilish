# Jevlish

A common phrase, rendered insufferable. Guess what it was.

> DON'T IMBIBE AND CHARIOTEER
>
> — `DON'T DRINK AND DRIVE`

Every replacement word was chosen by [Jev](https://typesafe.ai), TypeSafe AI's
System One model. Jev does not write text; it returns typed decisions with
calibrated probabilities. That is the whole game: a thesaurus proposes, Jev
judges, and the numbers it produces are what you see when a round ends.

## Play

```bash
npm install
npm run dev
```

The puzzle bank is committed, so the game runs with no API key.

## What Jev decides

A raw thesaurus is unusable for a word game. Moby lists 76 "synonyms" for
PENNY, including `grand`, `monkey` and `thousand dollars`. Turning that bag
into a playable puzzle takes five judgements, and Jev makes all of them.

| Pass | Question put to Jev | Cost |
|---|---|---|
| `screen` | Is this phrase an idiom, a literal phrase, or a proper noun? | $0.07 |
| `tag` | What part of speech and grammatical form is this word, here? | $0.06 |
| `safety` | Would swapping this word break the phrase? | $0.03 |
| `score` | For every candidate: does it substitute, how pompous, how obscure? | $2.61 |
| `fit` | In this exact sentence, which replacement is funniest and still correct? | $0.07 |

Total: **$2.84** for 12,869 phrases screened and 1,437 puzzles built, across
roughly 64M tokens. The slowest pass takes nine minutes; the rest take
seconds.

The `score` pass is the one that matters. It asks four questions about every
candidate word, and keeps all four numbers:

- `syn` — can it replace the word and keep the meaning?
- `pomp` — how over-the-top does it sound?
- `obs` — how obscure is it?
- `dec` — could a reader decode it from its roots?

Nothing is filtered at build time. The game ships every number Jev produced
and decides at runtime, so difficulty is a slider rather than a regenerate.

### Pompous, not archaic

The first build produced `A BAWBEE FOR YOUR CEREBRATION` and
`AUTHORIZE THE GRIMALKIN EGRESS OF THE RETICULE`. Those are not funny, they
are merely opaque — the prompt had asked for words that were "pompous,
archaic or overwrought", and got exactly that.

Splitting obscurity from pomposity fixed it. Measured across all 46k scored
candidates, words an ordinary reader knows (FELINE, GARGANTUAN, MALODOROUS)
score at or below 1.0 obscurity, while the ones nobody knows (WHILOM,
POTATION, CACHINNATION) sit at 1.1 and above. The three difficulty tiers are
that boundary, approached from either side.

## Layout

```
bin/            generation passes, each cached and resumable
  screen.py       classify the corpus
  tag.py          part of speech and inflection, in context
  safety.py       which slots would break if swapped
  score.py        score every candidate on four axes
  fit.py          pick per slot, in the context of its phrase
  build.py        assemble the shipped data (no API calls)
src/core/       pure game logic, no I/O, no React
  select.ts       runtime choice: gates, appeal, softmax
  session.ts      rounds, lives, hints, scoring
  guess.ts        answer matching
  inflect.ts      putting a lemma back into the sentence's grammar
src/data/       the one module that fetches
src/ui/         board, controls, reveal
public/         puzzles.json + lexicon.json, 320 KB gzipped
cache/          every Jev answer, keyed by prompt version
```

`cache/` is committed. Reruns after a prompt change re-score only what the
change touched, and the bank can be rebuilt from scratch with no API key:

```bash
python bin/build.py        # pure assembly over cached scores
```

## Regenerating

Requires `TYPESAFE_API_KEY` in `.env`.

```bash
python bin/screen.py && python bin/tag.py && python bin/safety.py
python bin/score.py && python bin/fit.py && python bin/build.py
```

Each pass skips what is already cached. Bump the `QV` constant at the top of
a script to invalidate its cache after changing a prompt.

## Tests

```bash
npm test
```

61 tests over the pure core: guess matching, round rules, selection gates,
softmax behaviour, and inflection. No network, no fixtures.

## Sources

Phrases are the [Buy a Vowel](https://buyavowel.boards.net/page/compendium)
Wheel of Fortune compendium, seasons 1–20, via
[Duthomhas/WOF1-20](https://github.com/Duthomhas/WOF1-20). Candidate words
come from the [Moby thesaurus](https://github.com/words/moby) and
[WordNet](https://github.com/zaibacu/thesaurus).
