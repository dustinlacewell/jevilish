import { useCallback, useEffect, useMemo, useState } from "react";
import { nextIn, prune } from "./core/progress";
import { livesLeft, scoreRound, startRound, submitGuess, useHint, type Round } from "./core/session";
import { TASTE } from "./core/select";
import { hydrate, loadBank, type Bank, type RawPuzzle } from "./data/bank";
import { loadProgress, saveProgress } from "./data/progress-store";
import { Board } from "./ui/Board";
import { Controls } from "./ui/Controls";
import { ModeTag } from "./ui/ModeTag";
import { Reveal } from "./ui/Reveal";
import { shareText } from "./ui/share";
import "./App.css";

/** The single run of the bank. Progress is keyed by this, so the name is
    stored data: changing it starts every player over. */
const RUN = "standard";

export function App() {
  const [bank, setBank] = useState<Bank | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [raw, setRaw] = useState<RawPuzzle | null>(null);
  const [seed, setSeed] = useState(1);
  const [round, setRound] = useState<Round | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let live = true;
    loadBank()
      .then((loaded) => live && setBank(loaded))
      .catch((e: Error) => live && setError(e.message));
    return () => { live = false; };
  }, []);

  /** Serve the next unseen puzzle and record that it was served, so the bank
      plays out once through before anything repeats. */
  const serve = useCallback((puzzles: readonly RawPuzzle[]) => {
    const stored = prune(loadProgress(RUN), puzzles);
    const step = nextIn(puzzles, RUN, stored);
    if (!step) return;
    saveProgress(RUN, step.progress);
    setRaw(step.puzzle);
    setSeed((s) => s + 1);
  }, []);

  // The opening puzzle, once the bank arrives.
  useEffect(() => {
    if (bank && !raw) serve(bank.puzzles);
  }, [bank, raw, serve]);

  // The board is derived: same puzzle, new seed, new words.
  const puzzle = useMemo(
    () => (bank && raw ? hydrate(raw, bank, TASTE, seed) : null),
    [bank, raw, seed],
  );

  useEffect(() => {
    if (puzzle) setRound(startRound(puzzle));
    setCopied(false);
  }, [puzzle?.id, puzzle?.words.map((w) => w.shown).join(" ")]);

  const next = useCallback(() => {
    if (bank) serve(bank.puzzles);
  }, [bank, serve]);

  const hintsLeft = useMemo(() => {
    if (!round) return 0;
    const swapped = round.puzzle.words.filter((w) => w.swapped).length;
    return Math.max(0, swapped - round.hintsUsed.length - 1);
  }, [round]);

  if (error) return <Splash>Could not load the puzzle bank. {error}</Splash>;
  if (!bank || !round || !puzzle || !raw) return <Splash>Setting type…</Splash>;

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
        <img className="masthead__seal" src="/logo-512.png" alt="" width={512} height={512} />
        <h1 className="masthead__title">Jevilish</h1>
        <p className="masthead__sub">A common phrase served devilishly opaque.</p>
      </header>

      <ModeTag mode={round.puzzle.mode} />

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
          <Reveal puzzle={round.puzzle} lexicon={bank.lexicon} raw={raw} taste={TASTE} />
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
        {" "}{bank.puzzles.length} phrases.
      </footer>
    </main>
  );
}

function Splash({ children }: { children: React.ReactNode }) {
  return <main className="app app--splash"><p className="splash">{children}</p></main>;
}
