"""Stage 3: emit the shipped data. Pure assembly over cached Jev answers.

Three files, normalised so a candidate list is stored once rather than at
every slot that uses it:

  puzzles.json   phrases, their swappable slots, and the answer
  lexicon.json   slot key -> the candidates Jev vetted, ranked by theme
  register.json  the archaic function-word and binomial tables

No API calls, so the whole bank can be re-cut for free after a change of
taste. Selection itself happens at runtime: every number Jev produced ships,
and the game decides how much obscurity a difficulty allows.
"""
import glob, json, os, re, sys
sys.path.insert(0, "bin")

MAX_FIXED = 0.6        # above this the word belongs to a phrasal unit
MIN_CANDS = 2          # a slot needs alternatives to be worth a swap
MAX_CANDS = 8          # per slot; softmax never reaches past this


def load(kind):
    """Every answer from a pass, whether packed or still in loose files."""
    pack = f"cache/{kind}.pack.json"
    if os.path.exists(pack):
        return list(json.load(open(pack, encoding="utf-8")).values())
    out = []
    for path in glob.glob(f"cache/{kind}/*.json"):
        try:
            out.append(json.load(open(path, encoding="utf-8")))
        except Exception:
            continue
    return out


def main():
    tags = {(t["phrase"], t["position"]): t for t in load("tag")}
    safety = {(s["phrase"], s["position"]): s for s in load("safety")}
    senses = {(s["phrase"], s["position"]): s for s in load("sense")}
    binomials = json.load(open("data/binomials.json", encoding="utf-8"))

    sources = [(r["phrase"], "idiom", r["fam"], None)
               for r in json.load(open("data/idioms.json", encoding="utf-8"))]
    for r in json.load(open("data/ba-puzzles.json", encoding="utf-8")):
        if r["pivot_conf"] >= 0.4:
            sources.append((r["phrase"], "before-after", 0.6, r["pivot_index"]))

    puzzles, lexicon = [], {}
    for phrase, mode, familiarity, pivot in sources:
        tokens = phrase.replace("&", " & ").split()
        slots = []
        for position, raw in enumerate(tokens):
            tag = tags.get((phrase, position))
            if not tag or tag["pos"] == "other" or position == pivot:
                continue
            # Words that are structurally part of the phrase rather than
            # vocabulary in it: swapping those breaks the sentence.
            safe = safety.get((phrase, position))
            if safe and (safe["effect"] == "broken" or safe["fixed"] > MAX_FIXED):
                continue

            bare = re.sub(r"[^A-Z]", "", raw.upper().replace("'S", ""))
            resolved = senses.get((phrase, position))
            cands = (resolved or {}).get("cands", [])[:MAX_CANDS]

            # An organism gets its scientific name whatever the thesaurus
            # thinks: the plain word *is* the name, so no synonym exists.
            species = binomials.get(bare)
            if species:
                slots.append({"i": position, "sci": species, "f": tag["form"]})
                continue
            if len(cands) < MIN_CANDS:
                continue

            key = f"{phrase}|{position}"
            lexicon[key] = cands
            slot = {"i": position, "k": key, "f": tag["form"]}
            # Only a verb slot may assume an -ING or -ED ending is a tense:
            # UNFEELING and BLESSED are adjectives, not inflections.
            if tag["pos"] == "verb":
                slot["v"] = 1
            slots.append(slot)

        if not slots:
            continue
        puzzle = {
            "id": re.sub(r"[^a-z0-9]+", "-", phrase.lower()).strip("-")[:56],
            "mode": mode, "answer": phrase, "tokens": tokens,
            "slots": slots, "fam": round(familiarity, 2),
        }
        if pivot is not None:
            puzzle["pivot"] = pivot
        puzzles.append(puzzle)

    puzzles.sort(key=lambda p: -p["fam"])
    json.dump(puzzles, open("public/puzzles.json", "w"), separators=(",", ":"))
    json.dump(lexicon, open("public/lexicon.json", "w"), separators=(",", ":"))

    modes, sci = {}, 0
    for p in puzzles:
        modes[p["mode"]] = modes.get(p["mode"], 0) + 1
        sci += sum(1 for s in p["slots"] if "sci" in s)
    for name in ("puzzles", "lexicon"):
        print(f"public/{name}.json  {os.path.getsize(f'public/{name}.json')/1024:.0f} KB")
    print(f"puzzles {len(puzzles)}  {modes}")
    print(f"slots {sum(len(p['slots']) for p in puzzles)} "
          f"({sci} scientific names)  avg {sum(len(p['slots']) for p in puzzles)/len(puzzles):.1f}/puzzle")


if __name__ == "__main__":
    main()
