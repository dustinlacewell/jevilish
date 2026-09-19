"""Vocabulary helpers shared by the generation passes.

The candidate pool for a word is whatever Moby and WordNet list under its
lemma. Neither is a list of drop-in substitutes -- Moby files `monkey` under
PENNY -- so nothing here judges a word. That is Jev's job, in bin/score.py.
"""
import json
import os

# Irregular past and participle forms. Moby files BROKE as its own headword
# (the adjective, "out of money"), so a phrase using the past tense of BREAK
# is handed a pool that cannot express fracture at all. Mapping to the base
# form first is what makes FRACTURE reachable.
_IRREGULAR_PATH = os.path.join("data", "irregulars.json")
IRREGULAR = (json.load(open(_IRREGULAR_PATH, encoding="utf-8"))
             if os.path.exists(_IRREGULAR_PATH) else {})

STOP = set("""A AN THE OF FOR TO IN ON AT AND OR BUT IS ARE WAS WERE BE BEEN AM IT ITS
YOUR MY HIS HER THEIR OUR THIS THAT THESE THOSE WITH FROM BY AS SO IF NOT NO YES YOU I WE
THEY HE SHE ALL DO DOES DID WHAT WHEN WHERE WHO HOW WHY CAN WILL JUST GET GOT""".split())

def load_moby():
    """Moby first (florid, huge), WordNet second (precise) for words Moby lacks."""
    pool = {}
    for line in open("data/moby.txt", encoding="utf-8", errors="replace"):
        parts = [p.strip() for p in line.strip().split(",") if p.strip()]
        if parts:
            pool[parts[0].upper()] = parts[1:]
    for line in open("data/wordnet.jsonl", encoding="utf-8", errors="replace"):
        try: rec = json.loads(line)
        except Exception: continue
        head = rec.get("word", "").replace("_", " ").upper()
        syns = [s.replace("_", " ") for s in rec.get("synonyms", [])]
        if not head or not syns: continue
        pool.setdefault(head, [])
        pool[head].extend(syns)
    return pool

def lemmas(word):
    base = IRREGULAR.get(word)
    if base:
        yield base
    """Candidate base forms, best guess first. A thesaurus is keyed on lemmas,
    so BIGGER must reach BIG or the word silently loses its swap."""
    yield word
    w, n = word, len(word)
    if w.endswith("IES") and n > 4: yield w[:-3] + "Y"
    if w.endswith("ES") and n > 4: yield w[:-2]
    if w.endswith("S") and n > 3 and not w.endswith("SS"): yield w[:-1]
    if w.endswith("ING") and n > 5:
        yield w[:-3]; yield w[:-3] + "E"
        if len(w) > 6 and w[-4] == w[-5]: yield w[:-4]        # RUNNING -> RUN
    if w.endswith("ED") and n > 4:
        yield w[:-2]; yield w[:-1]
        if len(w) > 5 and w[-3] == w[-4]: yield w[:-3]        # STOPPED -> STOP
        if w.endswith("IED"): yield w[:-3] + "Y"
    if w.endswith("ER") and n > 4:                            # BIGGER -> BIG
        yield w[:-2]; yield w[:-1]
        if len(w) > 5 and w[-3] == w[-4]: yield w[:-3]
    if w.endswith("EST") and n > 5:                           # BIGGEST -> BIG
        yield w[:-3]; yield w[:-2]
        if len(w) > 6 and w[-4] == w[-5]: yield w[:-4]
    if w.endswith("LY") and n > 4: yield w[:-2]               # QUICKLY -> QUICK

def clean_word(raw):
    return raw.strip(".,!?\"").strip("'-").upper()

def _clean_pool(raw):
    out, seen = [], set()
    for c in raw:
        cu = c.upper()
        # single words only: a multi-word gloss ruins the puzzle grid
        if " " in cu or "-" in cu or len(cu) < 3 or cu in seen:
            continue
        seen.add(cu); out.append(cu)
    return out

def candidates_for(word, moby):
    """Richest pool across all plausible lemmas. A sparse entry for the surface
    form must not shadow a full entry for its base (BIGGER vs BIG)."""
    best_lemma, best = None, []
    for lemma in lemmas(word):
        pool = _clean_pool(moby.get(lemma, []))
        if len(pool) > len(best):
            best_lemma, best = lemma, pool
    return best_lemma, best
