"""Stage 1b: mark slots where a swap would break the phrase.

Some words are not free-standing vocabulary: the OUT in "running out of" is
half a phrasal verb, and the MIND in "never mind" is a fixed expression.
Swapping those produces nonsense that is not funny, only wrong.

Idiomatic sense is deliberately NOT a reason to skip. Inflating the
metaphorical cat in "let the cat out of the bag" is the joke; breaking
"out of" is a bug.
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

QV = "safety-v1"

def main():
    tags = load_tags()
    tags = [t for t in tags if t["pos"] != "other"]
    cache = Cache("safety", QV)
    todo = [t for t in tags if cache.get(f'{t["phrase"]}|{t["position"]}') is None]
    print(f"slots: {len(tags)}  cached: {len(tags)-len(todo)}  to check: {len(todo)}", flush=True)
    if not todo:
        return

    batches = [todo[i:i + 70] for i in range(0, len(todo), 70)]
    done = [0]

    def run(batch):
        questions = {}
        for i, t in enumerate(batch):
            phrase, word = t["phrase"], t["word"]
            questions[f"f{i}"] = {"type": "noul", "instructions":
                f"'{word}' is part of a fixed multi-word unit in '{phrase}' "
                f"(phrasal verb, set greeting, or grammatical particle)"}
            questions[f"e{i}"] = {"type": "choice", "criteria": {
                    "fine": "the phrase still reads naturally",
                    "awkward": "clumsy but understandable",
                    "broken": "the phrase stops making sense"},
                "instructions": f"If you replaced '{word}' with a synonym in "
                                f"'{phrase}', what happens"}
        answers = ask({"task": "decide which words can be swapped in a word game"}, questions)
        for i, t in enumerate(batch):
            cache.put(f'{t["phrase"]}|{t["position"]}', {
                "phrase": t["phrase"], "position": t["position"], "word": t["word"],
                "fixed": answers[f"f{i}"]["noul"],
                "effect": answers[f"e{i}"]["choice"],
                "effect_conf": answers[f"e{i}"]["confidence"],
            })
        done[0] += len(batch)
        if done[0] % 1400 < 70:
            print(f"  {done[0]}/{len(todo)}  {spend()}", flush=True)

    start = time.time()
    with cf.ThreadPoolExecutor(max_workers=10) as ex:
        list(ex.map(run, batches))
    print(f"checked {done[0]} slots in {time.time()-start:.0f}s — {spend()}")

if __name__ == "__main__":
    main()
