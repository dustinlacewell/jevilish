# Corpora

`wof-raw.txt` is committed: 12,881 Wheel of Fortune puzzles, seasons 1-20,
scraped by [Duthomhas/WOF1-20](https://github.com/Duthomhas/WOF1-20) from the
[Buy a Vowel](https://buyavowel.boards.net/page/compendium) compendium.

The two candidate sources are large and gitignored. Fetch them before running
`bin/score.py`:

```bash
curl -sL https://raw.githubusercontent.com/words/moby/master/words.txt -o data/moby.txt
curl -sL https://raw.githubusercontent.com/zaibacu/thesaurus/master/en_thesaurus.jsonl -o data/wordnet.jsonl
```

`idioms.json` and `ba-puzzles.json` are derived by `bin/screen.py` and the
Before-and-After pass, and are committed so the later passes can run without
re-screening.
