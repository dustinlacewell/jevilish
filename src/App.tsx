import { useCallback, useEffect, useMemo, useState } from "react";
import { dailyIndex, dayNumber, isSpent, spend, type DailyState } from "./core/daily";
import { nextIn, prune } from "./core/progress";
import { livesLeft, scoreRound, startRound, submitGuess, useHint, type Round } from "./core/session";
import { TASTE } from "./core/select";
import { hydrate, loadBank, type Bank, type RawPuzzle } from "./data/bank";
import { loadDaily, saveDaily } from "./data/daily-store";
import { loadProgress, saveProgress } from "./data/progress-store";
import { Board } from "./ui/Board";
import { Controls } from "./ui/Controls";
import { ModePicker, type PlayMode } from "./ui/ModePicker";
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
  const [mode, setMode] = useState<PlayMode>("daily");
  const [daily, setDaily] = useState<DailyState | null>(() => loadDaily());

  // Fixed for the session: a player who crosses midnight mid-round finishes
  // the puzzle they started rather than having it swapped underneath them.
  const [today] = useState(() => dayNumber());

  useEffect(() => {
    let live = true;
    loadBank()
      .then((loaded) => live && setBank(loaded))
      .catch((e: Error) => live && setError(e.message));
    return () => { live = false; };
  }, []);

  /** Serve the next unseen puzzle and record that it was served, so the bank
      plays out once through before anything repeats. Addict mode only. */
  const serve = useCallback((puzzles: readonly RawPuzzle[]) => {
    const stored = prune(loadProgress(RUN), puzzles);
    const step = nextIn(puzzles, RUN, stored);
    if (!step) return;
    saveProgress(RUN, step.progress);
    setRaw(step.puzzle);
    setSeed((s) => s + 1);
  }, []);

  /** Switch modes, dropping the board so the new mode draws its own. */
  const pickMode = useCallback((next: PlayMode) => {
    setMode((current) => {
      if (current !== next) setRaw(null);
      return next;
    });
  }, []);

  // Which puzzle the current mode is asking for. Daily is a pure function of
  // the date, so it survives a reload and matches every other player's.
  useEffect(() => {
    if (!bank || raw) return;
    if (mode === "daily") {
      setRaw(bank.puzzles[dailyIndex(today, bank.puzzles.length)]);
      // One dressing per day: the seed is the day, so a reload shows the
      // same words rather than re-rolling them.
      setSeed(today);
    } else {
      serve(bank.puzzles);
    }
  }, [bank, mode, today, raw, serve]);

  // The board is derived: same puzzle, new seed, new words.
  const puzzle = useMemo(
    () => (bank && raw ? hydrate(raw, bank, TASTE, seed) : null),
    [bank, raw, seed],
  );

  useEffect(() => {
    if (!puzzle) return;
    const fresh = startRound(puzzle);
    // A daily already finished today reopens on its result, not playable
    // again. The attempts are gone, so the board simply shows the answer.
    const spentToday = mode === "daily" && daily?.day === today ? daily : null;
    setRound(spentToday ? { ...fresh, status: spentToday.outcome } : fresh);
    setCopied(false);
  }, [puzzle?.id, puzzle?.words.map((w) => w.shown).join(" ")]);

  // A finished daily is spent: record it once, so a reload shows the result
  // rather than offering the same puzzle again.
  useEffect(() => {
    if (mode !== "daily" || !round) return;
    if (round.status === "playing" || isSpent(daily, today)) return;
    const state = spend(today, round.status === "solved" ? "solved" : "failed");
    saveDaily(state);
    setDaily(state);
  }, [mode, round, daily, today]);

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
        <ModePicker mode={mode} onPick={pickMode} />
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
            {mode === "addict" && (
              <button className="btn btn--primary" type="button" onClick={next}>Next phrase</button>
            )}
            <button className="btn" type="button" onClick={copyShare}>
              {copied ? "Copied" : "Share"}
            </button>
          </div>
          {mode === "daily" && (
            <p className="outcome__adieu">
              The day's phrase is spent. Return upon the morrow for another.
            </p>
          )}
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
        <span className="colophon__ask">
          Procure the author a caffeinated infusion.{" "}
          <a href="https://buymeacoffee.com/idle" target="_blank" rel="noreferrer">
            Buy me a coffee
          </a>.
        </span>
      </footer>
    </main>
  );
}

function Splash({ children }: { children: React.ReactNode }) {
  return <main className="app app--splash"><p className="splash">{children}</p></main>;
}
