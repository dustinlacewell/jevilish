import { useCallback, useEffect, useMemo, useState } from "react";
import { livesLeft, scoreRound, startRound, submitGuess, useHint, type Round } from "./core/session";
import { TASTES } from "./core/select";
import { shuffled } from "./core/shuffle";
import { hydrate, loadBank, puzzleOfTheDay, type Bank, type RawPuzzle } from "./data/bank";
import { Board } from "./ui/Board";
import { Controls } from "./ui/Controls";
import { Reveal } from "./ui/Reveal";
import { shareText } from "./ui/share";
import "./App.css";

type Difficulty = keyof typeof TASTES;
const LEVELS: readonly Difficulty[] = ["gentle", "standard", "cruel"];

export function App() {
  const [bank, setBank] = useState<Bank | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [order, setOrder] = useState<readonly RawPuzzle[]>([]);
  const [index, setIndex] = useState(0);
  const [seed, setSeed] = useState(1);
  const [level, setLevel] = useState<Difficulty>("standard");
  const [round, setRound] = useState<Round | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    loadBank()
      .then((loaded) => {
        if (!live) return;
        const today = puzzleOfTheDay(loaded.puzzles);
        const rest = shuffled(loaded.puzzles.filter((p) => p.id !== today.id), Date.now() & 0xffff);
        setBank(loaded);
        setOrder([today, ...rest]);
      })
      .catch((e: Error) => live && setError(e.message));
    return () => { live = false; };
  }, []);

  const raw = order[index];

  // The board is derived: same puzzle, new seed or difficulty, new words.
  const puzzle = useMemo(
    () => (bank && raw ? hydrate(raw, bank.lexicon, TASTES[level], seed) : null),
    [bank, raw, level, seed],
  );

  useEffect(() => {
    if (puzzle) setRound(startRound(puzzle));
    setCopied(false);
  }, [puzzle?.id, puzzle?.words.map((w) => w.shown).join(" ")]);

  const next = useCallback(() => {
    setIndex((at) => (at + 1) % Math.max(1, order.length));
    setSeed((s) => s + 1);
  }, [order.length]);

  const hintsLeft = useMemo(() => {
    if (!round) return 0;
    const swapped = round.puzzle.words.filter((w) => w.swapped).length;
    return Math.max(0, swapped - round.hintsUsed.length - 1);
  }, [round]);

  if (error) return <Splash>Could not load the puzzle bank. {error}</Splash>;
  if (!bank || !round || !puzzle) return <Splash>Setting type…</Splash>;

  const over = round.status !== "playing";
  const shown = round.puzzle.words.map((word, i) =>
    round.hintsUsed.includes(i) ? { ...word, shown: word.original, swapped: false } : word,
  );

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(shareText(round!));
      setCopied(true);
    } catch { /* clipboard blocked; the button simply does not confirm */ }
  }

  return (
    <main className="app">
      <header className="masthead">
        <h1 className="masthead__title">Jevlish</h1>
        <p className="masthead__sub">A common phrase, rendered insufferable.</p>
        <div className="levels" role="group" aria-label="Difficulty">
          {LEVELS.map((name) => (
            <button
              key={name}
              type="button"
              className={`level${name === level ? " level--on" : ""}`}
              onClick={() => setLevel(name)}
            >
              {name}
            </button>
          ))}
        </div>
      </header>

      <Board puzzle={{ ...round.puzzle, words: shown }} revealed={over} matched={round.matched} />

      {over ? (
        <section className="outcome">
          <p className={`outcome__verdict outcome__verdict--${round.status}`}>
            {round.status === "solved"
              ? `Solved — ${scoreRound(round)} points`
              : `It was “${round.puzzle.answer}”`}
          </p>
          <div className="outcome__actions">
            <button className="btn btn--primary" type="button" onClick={next}>Next phrase</button>
            <button className="btn" type="button" onClick={copyShare}>
              {copied ? "Copied" : "Share"}
            </button>
          </div>
          <Reveal puzzle={round.puzzle} lexicon={bank.lexicon} raw={raw} taste={TASTES[level]} />
        </section>
      ) : (
        <>
          <Controls
            disabled={false}
            livesLeft={livesLeft(round)}
            hintsLeft={hintsLeft}
            onGuess={(text) => setRound(submitGuess(round, text))}
            onHint={() => setRound(useHint(round))}
          />
          <button className="reroll" type="button" onClick={() => setSeed((s) => s + 1)}>
            Different words, same phrase
          </button>
        </>
      )}

      {round.attempts.length > 0 && !over && (
        <ul className="attempts">
          {round.attempts.map((attempt, i) => (
            <li key={i} className={`attempt attempt--${attempt.verdict}`}>{attempt.text}</li>
          ))}
        </ul>
      )}

      <footer className="colophon">
        Every word vetted by <a href="https://typesafe.ai" target="_blank" rel="noreferrer">Jev</a> —
        scored for meaning, pomposity and obscurity against a thesaurus.
        {" "}{order.length} phrases.
      </footer>
    </main>
  );
}

function Splash({ children }: { children: React.ReactNode }) {
  return <main className="app app--splash"><p className="splash">{children}</p></main>;
}
