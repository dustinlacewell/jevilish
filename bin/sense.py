"""Stage 2: choose each slot's replacement, sense-first.

Three questions per slot, in this order, because the order is the point:

  1. SENSE     Which meaning does this phrase use? Moby files every sense of
               a word under one flat entry, so the pool for BROKE is entirely
               the money sense and "the straw that BANKRUPTED the camel's
               back" is the inevitable result. Filtering on the sense first
               is what makes FRACTURE reachable at all.

  2. KNOWN     Has the reader ever met this word? Not "is it obscure" -- that
               conflates rare with unrecognisable, and rates PERCHANCE worse
               than CULM. Costumed words (THY, FORSOOTH, BEHOLD) are common
               *because* they are archaic, and they are exactly what the game
               wants. A word the reader has never seen is not funny.

  3. THEME     Among the words that survive, which sounds most like a pompous
               Victorian gentleman performing his education?

Sense and recognisability are gates, not weights: a wrong-sense word is not a
worse choice, it is not a choice. Only then does taste get a vote.

Keyed on (phrase, position) because sense is a property of the sentence, not
of the lemma.
"""
import concurrent.futures as cf, glob, json, os, sys, time
sys.path.insert(0, "bin")
from gates import swappable
from lib import Cache, ask, spend
from lexicon import candidates_for, load_moby

QV = "sense-v1"
POOL_CHUNK = 200       # candidates scored per request
SHORTLIST = 18         # survivors carried into the theme question
MAX_UNKNOWN = 0.3      # above this the reader has never met the word
MIN_SENSE = 0.25       # below this the candidate means something else

THEME = ("a pompous Victorian gentleman performing his education: grand, "
         "over-formal, or recognisably old-fashioned in the way of "
         "Shakespeare or the King James Bible")


def load_tags():
    pack = "cache/tag.pack.json"
    if os.path.exists(pack):
        return list(json.load(open(pack, encoding="utf-8")).values())
    return [json.load(open(f, encoding="utf-8")) for f in glob.glob("cache/tag/*.json")]


def same_sense(word, phrase, pool):
    """Score every candidate on whether it carries this phrase's meaning."""
    scored = []
    for chunk in [pool[i:i + POOL_CHUNK] for i in range(0, len(pool), POOL_CHUNK)]:
        questions = {
            f"s{i}": {"type": "noul", "instructions":
                      f"In the phrase '{phrase}', the word '{word}' could be replaced by "
                      f"'{c}' with the same meaning and the same grammatical form"}
            for i, c in enumerate(chunk)
        }
        answers = ask({"phrase": phrase, "word": word}, questions)
        scored.extend((answers[f"s{i}"]["noul"], c) for i, c in enumerate(chunk))
    scored.sort(reverse=True)
    return [(s, c) for s, c in scored if s >= MIN_SENSE][:SHORTLIST]


def vet(word, shortlist):
    """Reject the unrecognisable, then rank what is left by theme."""
    questions = {}
    for i, (_, c) in enumerate(shortlist):
        questions[f"u{i}"] = {"type": "noul", "instructions":
                              f"Most adults have never encountered the word '{c}' at all"}
        questions[f"t{i}"] = {"type": "score", "criteria": [
                                  "a plain modern word",
                                  "somewhat formal or literary",
                                  "gloriously overblown"],
                              "instructions": f"How much does '{c}' sound like {THEME}"}
    answers = ask({"word": word}, questions)
    out = []
    for i, (sense, c) in enumerate(shortlist):
        unknown = answers[f"u{i}"]["noul"]
        if unknown > MAX_UNKNOWN:
            continue
        out.append({"w": c, "sense": round(sense, 2),
                    "unknown": round(unknown, 2),
                    "theme": round(answers[f"t{i}"]["score"], 2)})
    out.sort(key=lambda c: -c["theme"])
    return out


def load_safety():
    pack = "cache/safety.pack.json"
    if os.path.exists(pack):
        return list(json.load(open(pack, encoding="utf-8")).values())
    return [json.load(open(f, encoding="utf-8")) for f in glob.glob("cache/safety/*.json")]


def main():
    """Score every slot the gates allow.

    Reads the tag and safety caches rather than the built puzzles.json: the
    build applies its own thresholds, so taking the slot list from its output
    would silently skip anything a later relaxation of those thresholds lets
    back in.
    """
    moby = load_moby()
    safety = {(s["phrase"], s["position"]): s for s in load_safety()}

    work = []
    for tag in load_tags():
        if tag["pos"] == "other":
            continue
        if not swappable(safety.get((tag["phrase"], tag["position"]))):
            continue
        _, pool = candidates_for(tag["word"], moby)
        if pool:
            work.append((tag["phrase"], tag["position"], tag["word"], pool))

    cache = Cache("sense", QV)
    todo = [w for w in work if cache.get(f"{w[0]}|{w[1]}") is None]
    print(f"slots: {len(work)}  cached: {len(work)-len(todo)}  to resolve: {len(todo)}",
          flush=True)
    if not todo:
        return

    done = [0]
    def run(item):
        phrase, position, word, pool = item
        try:
            shortlist = same_sense(word, phrase, pool)
            candidates = vet(word, shortlist) if shortlist else []
        except Exception as exc:
            print(f"  !! {phrase}[{position}]: {exc}", flush=True)
            return
        cache.put(f"{phrase}|{position}", {
            "phrase": phrase, "position": position, "word": word,
            "pool": len(pool), "cands": candidates,
        })
        done[0] += 1
        if done[0] % 200 == 0:
            print(f"  {done[0]}/{len(todo)}  {spend()}", flush=True)

    start = time.time()
    with cf.ThreadPoolExecutor(max_workers=12) as ex:
        list(ex.map(run, todo))
    print(f"resolved {done[0]} slots in {time.time()-start:.0f}s — {spend()}")


if __name__ == "__main__":
    main()
