---
id: "adjectives-offered-for-plural-noun-slots-2026-09-19"
status: "backlog"
priority: "medium"
assignee: null
dueDate: null
created: "2026-09-19T03:26:05.000Z"
modified: "2026-09-19T03:26:05.000Z"
completedAt: null
labels: ["generation", "grammar"]
order: "a0"
---

# Adjectives offered for plural-noun slots

Jev offers adjectives and participles as candidates for slots marked
`f: "s"`. The runtime then pluralises them, producing non-words.

Surfaced when `LET BYGONES BE BYGONES` rendered as `LET PASTS BE PASTS`
on the daily board.

## The failure

`public/lexicon.json`, key `LET BYGONES BE BYGONES|1`:

```json
[{"w":"BYPAST","sense":0.31},{"w":"PAST","sense":0.4},
 {"w":"DEPARTED","sense":0.25},{"w":"PASSED","sense":0.28},
 {"w":"PASSE","sense":0.35}]
```

Every one is an adjective or participle. BYGONES is a plural noun, so
the slot carries `f: "s"` and `inflect()` appends an S. PAST becomes
PASTS, DEPARTED becomes DEPARTEDS.

`src/core/inflect.ts` is behaving correctly — PAST + s really is PASTS.
The fault is that an adjective reached a plural-noun slot at all.

## Why it was not fixed at runtime

A morphology filter was tried and rejected. Matching adjective-shaped
endings (`-ED`, `-ING`, `-OUS`, `-AL`, `-Y`, ...) against the bank
flagged 88 swaps, but the large majority were correct plural nouns that
merely share those endings:

- `ACTIONS -> DOINGS`
- `DAYS -> HEYDAYS`
- `THINGS -> HAPPENINGS`
- `FRIENDS -> PALS`
- `TRADES -> CALLINGS`
- `WORDS -> TIDINGS`

The genuine failures are a handful: `PASTS`, `UNMATCHEDS`,
`REMAININGS`, `ANTITHETICALS`, `CONTRASTINGS`. Word shape cannot
separate these from the good ones, so any regex-based gate would break
more output than it repaired.

## The fix

Part of speech has to be known at generation time, not guessed at
runtime. Two routes:

1. **Ask Jev for it.** The scoring pass already answers three questions
   per candidate. A fourth — "is this a noun that can be pluralised in
   this sense?" — is the same shape of question and lands in the
   lexicon alongside `sense`, `unknown` and `theme`. `eligible()` then
   drops non-nouns when the slot wants a plural.

2. **Screen at candidate-generation time**, so adjectives never enter
   the lexicon for a plural-noun slot in the first place. Cheaper to
   run but loses the data for any future use.

Route 1 is preferred: it keeps the pipeline's existing shape, and the
score is reusable if other inflections later need the same guard.

## Acceptance

- [ ] A plural-noun slot never receives an adjective or participle.
- [ ] `LET BYGONES BE BYGONES` no longer renders `PASTS`.
- [ ] `DOINGS`, `HEYDAYS`, `HAPPENINGS`, `PALS`, `TIDINGS` and
      `CALLINGS` still appear — the fix must not take the good plurals
      with the bad.
- [ ] A regression test covers one true failure and one lookalike.

## Related

Two other frame-mismatch bugs were fixed at runtime in `select.ts`,
both the same underlying story of a semantically fair candidate that
does not fit its slot's grammar:

- to-infinitive verbs in bare-modal slots (`I HAVE BE HEARING`)
- permitting verbs after causative LET (`ALLOW PASTS BE PASTS`)

The LET rule is itself unsettled — see
[[let-synonyms-may-be-too-strict]].
