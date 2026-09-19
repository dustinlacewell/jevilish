"""Stage 3: emit the shipped data. Pure assembly over cached Jev scores.

Two files, normalised so candidate ladders are stored once per (lemma, pos)
rather than repeated at every slot that uses them:

  puzzles.json  phrases, their swappable slots, and the answer
  lexicon.json  lemma|pos -> the scored candidates Jev vetted
"""
import glob, json, os, re, sys
sys.path.insert(0, "bin")
from lexicon import candidates_for, load_moby

MIN_SYN = 0.2          # below this a candidate is unusable at any difficulty
MAX_CANDS = 40         # per lemma+pos; the tail is never selected
MIN_SLOTS = 1
MAX_FIXED = 0.6        # above this the word belongs to a phrasal unit
MIN_FIT = 2            # a slot needs real alternatives to be worth a swap

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
    moby = load_moby()
    tags = {(t["phrase"], t["position"]): t for t in load("tag")}
    safety = {(s["phrase"], s["position"]): s for s in load("safety")}
    fits = {(f["phrase"], f["position"]): f for f in load("fit")}
    scores = {}
    for rec in load("score"):
        cands = [c for c in rec["cands"] if c["syn"] >= MIN_SYN]
        cands.sort(key=lambda c: -(c["pomp"] + 0.5 * c["syn"]))
        if cands:
            scores[f'{rec["lemma"]}|{rec["pos"]}'] = cands[:MAX_CANDS]
    print(f"tags {len(tags)}  lexicon entries {len(scores)}")

    sources = [(r["phrase"], "idiom", r["fam"], None) for r in json.load(open("data/idioms.json"))]
    for r in json.load(open("data/ba-puzzles.json")):
        if r["pivot_conf"] >= 0.4:
            sources.append((r["phrase"], "before-after", 0.6, r["pivot_index"]))

    puzzles, used = [], set()
    for phrase, mode, familiarity, pivot in sources:
        tokens = phrase.replace("&", " & ").split()
        slots = []
        for position, raw in enumerate(tokens):
            tag = tags.get((phrase, position))
            if not tag or tag["pos"] == "other" or position == pivot:
                continue
            # Skip words that are structurally part of the phrase rather than
            # vocabulary in it: swapping those breaks the sentence.
            safe = safety.get((phrase, position))
            if safe and (safe["effect"] == "broken" or safe["fixed"] > MAX_FIXED):
                continue
            lemma, _ = candidates_for(tag["word"], moby)
            key = f'{lemma}|{tag["pos"]}'
            if key not in scores:
                continue
            slot = {"i": position, "k": key, "f": tag["form"]}
            # Jev's in-context ranking, where we have one: it knows the sense
            # and the grammar of this particular sentence.
            fit = fits.get((phrase, position))
            if fit and len(fit["ranked"]) >= MIN_FIT:
                slot["r"] = [[r["w"], r["p"]] for r in fit["ranked"]]
            elif len(scores[key]) < 3:
                continue          # nothing worth offering here
            slots.append(slot)
            used.add(key)
        if len(slots) < MIN_SLOTS:
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

    # Ship only the candidates the runtime can actually reach: a slot with an
    # in-context ranking never looks past it, and one without is sampled from
    # the head of the appeal order. The rest is dead weight on the wire.
    reachable = {}
    for puzzle in puzzles:
        for slot in puzzle["slots"]:
            names = reachable.setdefault(slot["k"], set())
            if "r" in slot:
                names.update(w.upper() for w, _ in slot["r"])
            else:
                ordered = sorted(scores.get(slot["k"], []),
                                 key=lambda c: -(c["pomp"] + 0.5 * c["syn"] - 0.35 * c["obs"]))
                names.update(c["w"].upper() for c in ordered[:12])
    lexicon = {}
    for key in used:
        keep = [c for c in scores[key] if c["w"].upper() in reachable.get(key, ())]
        if keep:
            lexicon[key] = keep
    json.dump(puzzles, open("public/puzzles.json", "w"), separators=(",", ":"))
    json.dump(lexicon, open("public/lexicon.json", "w"), separators=(",", ":"))
    for name in ("puzzles", "lexicon"):
        size = os.path.getsize(f"public/{name}.json") / 1024
        print(f"public/{name}.json  {size:.0f} KB")
    modes = {}
    for p in puzzles:
        modes[p["mode"]] = modes.get(p["mode"], 0) + 1
    print(f"puzzles {len(puzzles)}  {modes}")
    print(f"avg slots/puzzle {sum(len(p['slots']) for p in puzzles)/len(puzzles):.1f}")

if __name__ == "__main__":
    main()
