"""Stage 2b: pick each slot's replacement in the context of its phrase.

Scoring judges a word against a bare lemma, which cannot see that MAKE in
"make yourself comfortable" wants RENDER rather than MANUFACTURE, or that the
COLD in "cold as ice" is temperature and not temperament. One choice question
per slot, over candidates the scoring pass already vetted, resolves both the
sense and the grammar — and asks for absurdity in the same breath so the
answer stays funny instead of merely correct.

The result is a per-slot ranking; the runtime still samples from it, so
difficulty and variety remain live knobs.
"""
import concurrent.futures as cf, glob, json, os, sys, time
sys.path.insert(0, "bin")
from lib import Cache, ask, spend

def load_tags():
    """Tag answers, from the committed pack or from loose files."""
    pack = "cache/tag.pack.json"
    if os.path.exists(pack):
        return list(json.load(open(pack, encoding="utf-8")).values())
    return [json.load(open(f, encoding="utf-8")) for f in glob.glob("cache/tag/*.json")]

QV = "fit-v1"
POOL = 28              # candidates offered per slot; Jev's cap is 255
MIN_SYN = 0.35
MAX_OBS = 1.15

def shortlist(cands):
    ok = [c for c in cands if c["syn"] >= MIN_SYN and c["obs"] <= MAX_OBS]
    ok.sort(key=lambda c: -(c["pomp"] + 0.5 * c["syn"] - 0.35 * c["obs"]))
    return ok[:POOL]

def main():
    lexicon = json.load(open("public/lexicon.json", encoding="utf-8"))
    tags = {(t["phrase"], t["position"]): t
            for t in load_tags()}
    puzzles = json.load(open("public/puzzles.json", encoding="utf-8"))

    work = []
    for puzzle in puzzles:
        for slot in puzzle["slots"]:
            cands = shortlist(lexicon.get(slot["k"], []))
            if len(cands) >= 2:
                tag = tags.get((puzzle["answer"], slot["i"]))
                if tag:
                    work.append((puzzle["answer"], slot["i"], tag["word"], cands))

    cache = Cache("fit", QV)
    todo = [w for w in work if cache.get(f"{w[0]}|{w[1]}") is None]
    print(f"slots: {len(work)}  cached: {len(work)-len(todo)}  to fit: {len(todo)}", flush=True)
    if not todo:
        return

    done = [0]
    def run(item):
        phrase, position, word, cands = item
        criteria = {c["w"].upper(): f"use '{c['w']}'" for c in cands}
        try:
            answers = ask({"phrase": phrase, "word": word}, {"pick": {
                "type": "choice", "criteria": criteria,
                "instructions": f"In the phrase '{phrase}', which replacement for '{word}' "
                                f"is the most absurdly pompous and over-formal, while still "
                                f"being grammatical and keeping the intended sense"}})
        except Exception as exc:
            print(f"  !! {phrase}[{position}]: {exc}", flush=True)
            return
        answer = answers["pick"]
        ranked = sorted(answer["probabilities"].items(), key=lambda kv: -kv[1])
        cache.put(f"{phrase}|{position}", {
            "phrase": phrase, "position": position, "word": word,
            "best": answer["choice"], "conf": answer["confidence"],
            "ranked": [{"w": w, "p": round(p, 4)} for w, p in ranked if p >= 0.002][:12],
        })
        done[0] += 1
        if done[0] % 400 == 0:
            print(f"  {done[0]}/{len(todo)}  {spend()}", flush=True)

    start = time.time()
    with cf.ThreadPoolExecutor(max_workers=12) as ex:
        list(ex.map(run, todo))
    print(f"fitted {done[0]} slots in {time.time()-start:.0f}s — {spend()}")

if __name__ == "__main__":
    main()
