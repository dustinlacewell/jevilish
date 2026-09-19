import { useState } from "react";
import { appeal, eligible, type Taste } from "../core/select";
import type { Puzzle } from "../core/types";
import type { Lexicon, RawPuzzle } from "../data/bank";
import "./Reveal.css";

interface RevealProps {
  readonly puzzle: Puzzle;
  readonly raw: RawPuzzle;
  readonly lexicon: Lexicon;
  readonly taste: Taste;
}

const SHOWN = 5;

/**
 * The payoff: every swapped word was a field Jev scored, and these are the
 * numbers it kept and threw away.
 */
export function Reveal({ puzzle, raw, lexicon, taste }: RevealProps) {
  const slots = raw.slots.filter((slot) => slot.k && puzzle.words[slot.i]?.swapped);
  if (slots.length === 0) return null;

  return (
    <section className="reveal">
      <h2 className="reveal__title">How Jev chose</h2>
      <ol className="reveal__list">
        {slots.map((slot) => (
          <Verdict
            key={slot.i}
            original={puzzle.words[slot.i].original}
            chosen={puzzle.words[slot.i].shown}
            pool={lexicon[slot.k!] ?? []}
            taste={taste}
          />
        ))}
      </ol>
    </section>
  );
}

interface VerdictProps {
  readonly original: string;
  readonly chosen: string;
  readonly pool: Parameters<typeof eligible>[0];
  readonly taste: Taste;
}

function Verdict({ original, chosen, pool, taste }: VerdictProps) {
  const [open, setOpen] = useState(false);
  const field = eligible(pool, original, taste).sort((a, b) => appeal(b) - appeal(a));
  const rejected = pool.length - field.length;
  const listed = open ? field : field.slice(0, SHOWN);

  return (
    <li className="verdict">
      <div className="verdict__head">
        <span className="verdict__from">{original}</span>
        <span className="verdict__arrow" aria-hidden="true">→</span>
        <span className="verdict__to">{chosen}</span>
        <span className="verdict__field">
          {field.length} kept · {rejected} cut
        </span>
      </div>

      <table className="scores">
        <thead>
          <tr>
            <th scope="col">candidate</th>
            <th scope="col" title="Does it mean the right thing here?">sense</th>
            <th scope="col" title="How grand it sounds">theme</th>
            <th scope="col" title="How many readers have never met it">unknown</th>
          </tr>
        </thead>
        <tbody>
          {listed.map((c) => (
            <tr key={c.w} className={c.w.toUpperCase() === chosen ? "scores__row--won" : undefined}>
              <td className="scores__word">{c.w}</td>
              <td><Bar value={c.sense} /></td>
              <td><Bar value={c.theme / 2} tone="gold" /></td>
              <td><Bar value={c.unknown} tone="seal" /></td>
            </tr>
          ))}
        </tbody>
      </table>

      {field.length > SHOWN && (
        <button className="verdict__more" type="button" onClick={() => setOpen(!open)}>
          {open ? "Show fewer" : `Show all ${field.length}`}
        </button>
      )}
    </li>
  );
}

function Bar({ value, tone = "ink" }: { value: number; tone?: "ink" | "gold" | "seal" }) {
  return (
    <span className={`bar bar--${tone}`} title={value.toFixed(2)}>
      <span style={{ width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%` }} />
    </span>
  );
}
