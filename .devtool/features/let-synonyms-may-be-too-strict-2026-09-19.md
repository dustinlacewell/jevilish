---
id: "let-synonyms-may-be-too-strict-2026-09-19"
status: "todo"
priority: "medium"
assignee: null
dueDate: null
created: "2026-09-19T03:26:05.000Z"
modified: "2026-09-19T03:26:05.000Z"
completedAt: null
labels: ["grammar", "decision"]
order: "a0"
---

# LET synonym ban may be too strict

`select.ts` currently refuses every permitting verb in a causative LET
slot, so LET stays undisguised in all nine LET puzzles. Dustin pushed
back: the synonyms may have been acceptable.

## What shipped

`BARE_INFINITIVE_CAUSATIVES` holds LET; `PERMITTING_VERBS` holds ALLOW,
PERMIT, AUTHORIZE, SANCTION, CONSENT, ACCORD, GRANT, SUFFER, LEAVE,
RELEASE, DISPENSE, ADMIT, CONSIDER, HAVE, ENABLE, ENTITLE, LICENSE.
Any pairing is refused.

Before the change:

```
AUTHORIZE PASTS BE PASTS
PERMIT THE SPLENDID ERAS ROLL
LEAVE ME GO ON RECORD AS ENUNCIATING
DON'T ACCORD IT SLIP HENCE
```

## Why the ban is arguably wrong

Two of the banned verbs take a bare infinitive in exactly the register
the game trades on:

- **SUFFER** — "suffer it be so now" (Matthew 3:15, KJV).
- **LEAVE** — "leave me go" is dialectal and archaic, but real.

Banning these costs costume the game wants. The game is words in
costume, so stilted output may be a feature rather than a fault: the
player's task is to see through the register to the plain phrase.

Against that, `ACCORD IT SLIP` and `DISPENSE` read as errors in any
register, not as costume.

## Options

1. **Revert entirely.** LET keeps every synonym; accept "permit the
   good times roll".
2. **Allow the archaic pair.** Drop SUFFER and LEAVE from
   `PERMITTING_VERBS`, keep refusing ALLOW / PERMIT / AUTHORIZE /
   ACCORD / DISPENSE.
3. **Keep as shipped.** LET stays plain in nine puzzles.

Option 2 is the recommendation: it restores the two forms that are
genuinely good archaic English while still refusing the ones that only
read as mistakes.

## Decision

Unresolved — Dustin's call. Nine puzzles are affected either way, and
nothing is blocked while it sits.

## Related

Same family as [[adjectives-offered-for-plural-noun-slots]]: a
candidate that is semantically fair but does not fit the grammar of its
slot. That one is a generator fix; this one is a taste question.
