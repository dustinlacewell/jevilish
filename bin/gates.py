"""The thresholds that decide which slots are worth swapping.

Shared by bin/sense.py, which scores candidates, and bin/build.py, which
assembles the bank. Keeping them in one module is not tidiness: when the two
disagreed, sense.py skipped slots the build would have accepted, and the
missing candidates looked like a data problem rather than a threshold one.
"""

MAX_FIXED = 0.6         # above this the word belongs to a phrasal unit
MIN_BROKEN_CONF = 0.4   # a "broken" verdict weaker than this is a coin flip


def swappable(safety_row):
    """Whether a slot may be replaced at all, given its safety answer.

    Jev is asked two things about each slot: whether the word belongs to a
    fixed multi-word unit, and what happens to the phrase if it is swapped.
    A confident "broken" is a veto; a weak one is not, since the median such
    verdict scores 0.33 and vetoing on those loses good phrases.
    """
    if not safety_row:
        return True
    if safety_row["fixed"] > MAX_FIXED:
        return False
    return not (safety_row["effect"] == "broken"
                and safety_row["effect_conf"] >= MIN_BROKEN_CONF)
