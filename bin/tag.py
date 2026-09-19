"""Stage 1: tag every swappable slot with its part of speech and inflection.

POS is what makes a synonym pool correct (DRIVE the verb, not the noun), and
the form is what lets assembly conjugate the winner back into the sentence.
Slots are tagged in context; scoring is then keyed on (lemma, pos) so the
expensive stage still caches across phrases.
"""
import concurrent.futures as cf, json, re, sys, time
sys.path.insert(0, "bin")
from lib import Cache, ask, spend
from lexicon import STOP, clean_word, candidates_for, load_moby

QV = "tag-v1"
POS = {
    "noun": "a person, place, thing or idea",
    "verb": "an action or state",
    "adj": "describes a noun",
    "adv": "modifies a verb or adjective",
    "other": "a function word, name, or none of these",
}
FORM = {
    "base": "base or infinitive form (walk, eat, big, cat)",
    "s": "third-person singular verb or plural noun (walks, eyes)",
    "ing": "present participle (walking)",
    "ed": "past tense or past participle (walked)",
    "comparative": "comparative (bigger)",
    "superlative": "superlative (biggest)",
}

def slots(phrase):
    """Positions in a phrase that are worth swapping at all."""
    for position, raw in enumerate(phrase.replace("&", " & ").split()):
        word = clean_word(raw)
        if word and word not in STOP and len(word) >= 3 and re.fullmatch(r"[A-Z']+", word):
            yield position, word

def main():
    moby = load_moby()
    phrases = [r["phrase"] for r in json.load(open("data/idioms.json"))]
    ba = json.load(open("data/ba-puzzles.json"))
    phrases += [r["phrase"] for r in ba if r["pivot_conf"] >= 0.4]

    work = []
    for phrase in phrases:
        for position, word in slots(phrase):
            if candidates_for(word, moby)[1]:
                work.append((phrase, position, word))

    cache = Cache("tag", QV)
    todo = [w for w in work if cache.get(f"{w[0]}|{w[1]}") is None]
    print(f"slots: {len(work)}  cached: {len(work)-len(todo)}  to tag: {len(todo)}", flush=True)
    if not todo:
        return

    batches = [todo[i:i + 60] for i in range(0, len(todo), 60)]
    done = [0]

    def run(batch):
        questions = {}
        for i, (phrase, _, word) in enumerate(batch):
            questions[f"p{i}"] = {"type": "choice", "criteria": POS,
                "instructions": f"In the phrase '{phrase}', what part of speech is '{word}'"}
            questions[f"f{i}"] = {"type": "choice", "criteria": FORM,
                "instructions": f"In the phrase '{phrase}', what grammatical form is '{word}'"}
        answers = ask({"task": "tag words for a synonym-swap word game"}, questions)
        for i, (phrase, position, word) in enumerate(batch):
            cache.put(f"{phrase}|{position}", {
                "phrase": phrase, "position": position, "word": word,
                "pos": answers[f"p{i}"]["choice"], "pos_conf": answers[f"p{i}"]["confidence"],
                "form": answers[f"f{i}"]["choice"], "form_conf": answers[f"f{i}"]["confidence"],
            })
        done[0] += len(batch)
        if done[0] % 1200 < 60:
            print(f"  {done[0]}/{len(todo)}  {spend()}", flush=True)

    start = time.time()
    with cf.ThreadPoolExecutor(max_workers=10) as ex:
        list(ex.map(run, batches))
    print(f"tagged {done[0]} slots in {time.time()-start:.0f}s — {spend()}")

if __name__ == "__main__":
    main()
