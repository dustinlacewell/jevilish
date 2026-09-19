"""Stage 2: score every synonym candidate on the four axes the game selects by.

No filtering and no winner: the runtime picks, so every judgement Jev makes is
kept. Keyed on (lemma, pos) — the sense is what changes which pool is right,
and that reuses across every phrase using the word the same way.
"""
import concurrent.futures as cf, glob, json, os, sys, time
sys.path.insert(0, "bin")
from lib import Cache, ask, spend
from lexicon import candidates_for, load_moby

def load_tags():
    """Tag answers, from the committed pack or from loose files."""
    pack = "cache/tag.pack.json"
    if os.path.exists(pack):
        return list(json.load(open(pack, encoding="utf-8")).values())
    return [json.load(open(f, encoding="utf-8")) for f in glob.glob("cache/tag/*.json")]

QV = "score-v1"
POS_WORD = {"noun": "noun", "verb": "verb", "adj": "adjective", "adv": "adverb"}
BATCH = 120          # candidates per request; 4 questions each

def score_pool(lemma, pos, pool):
    out = []
    for chunk in [pool[i:i + BATCH] for i in range(0, len(pool), BATCH)]:
        questions = {}
        for i, c in enumerate(chunk):
            questions[f"s{i}"] = {"type": "noul", "instructions":
                f"As a {POS_WORD[pos]}, '{c}' means the same as '{lemma}' and could replace it"}
            questions[f"p{i}"] = {"type": "score", "instructions":
                f"How pompous and over-the-top does '{c}' sound",
                "criteria": ["plain everyday word", "noticeably formal", "absurdly grandiose"]}
            questions[f"o{i}"] = {"type": "score", "instructions": f"How obscure is '{c}'",
                "criteria": ["everyone knows it", "educated readers know it",
                             "only a lexicographer knows it"]}
            questions[f"g{i}"] = {"type": "noul", "instructions":
                f"A reader who has never seen '{c}' could still work out that it means "
                f"'{lemma}' from its roots and the sentence around it"}
        answers = ask({"word": lemma, "part_of_speech": pos}, questions)
        for i, c in enumerate(chunk):
            out.append({
                "w": c,
                "syn": round(answers[f"s{i}"]["noul"], 2),
                "pomp": round(answers[f"p{i}"]["score"], 2),
                "obs": round(answers[f"o{i}"]["score"], 2),
                "dec": round(answers[f"g{i}"]["noul"], 2),
            })
    return out

def main():
    moby = load_moby()
    tags = load_tags()
    wanted = {}
    for tag in tags:
        if tag["pos"] == "other":
            continue
        lemma, pool = candidates_for(tag["word"], moby)
        if pool:
            wanted[(lemma, tag["pos"])] = pool

    cache = Cache("score", QV)
    todo = [(l, p, pool) for (l, p), pool in wanted.items()
            if cache.get(f"{l}|{p}") is None]
    print(f"(lemma,pos) pairs: {len(wanted)}  cached: {len(wanted)-len(todo)}  "
          f"to score: {len(todo)}", flush=True)
    if not todo:
        return

    done = [0]
    def run(item):
        lemma, pos, pool = item
        try:
            scored = score_pool(lemma, pos, pool)
        except Exception as exc:
            print(f"  !! {lemma}/{pos}: {exc}", flush=True)
            return
        # Drop only what can never be selected at any temperature.
        scored = [c for c in scored if c["syn"] >= 0.2]
        scored.sort(key=lambda c: -c["syn"])
        cache.put(f"{lemma}|{pos}", {"lemma": lemma, "pos": pos,
                                     "pool": len(pool), "cands": scored[:120]})
        done[0] += 1
        if done[0] % 200 == 0:
            print(f"  {done[0]}/{len(todo)}  {spend()}", flush=True)

    start = time.time()
    with cf.ThreadPoolExecutor(max_workers=10) as ex:
        list(ex.map(run, todo))
    print(f"scored {done[0]} pairs in {time.time()-start:.0f}s — {spend()}")

if __name__ == "__main__":
    main()
