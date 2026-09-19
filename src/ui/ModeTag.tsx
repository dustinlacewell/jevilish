import type { PuzzleMode } from "../core/types";
import "./ModeTag.css";

/** What each mode asks of the player, in the player's terms. */
const EXPLAIN: Record<PuzzleMode, { readonly label: string; readonly gloss: string }> = {
  idiom: {
    label: "Idiom",
    gloss: "An everyday saying",
  },
  "before-after": {
    label: "Before & After",
    gloss: "Two phrases joined by a shared word",
  },
};

interface ModeTagProps {
  readonly mode: PuzzleMode;
}

/** The kind of puzzle on the board. The gloss appears on hover and on focus,
    so it is reachable without a mouse. */
export function ModeTag({ mode }: ModeTagProps) {
  const { label, gloss } = EXPLAIN[mode];
  const id = `mode-gloss-${mode}`;

  return (
    <p className="mode">
      <span className="mode__tag" tabIndex={0} aria-describedby={id}>
        {label}
        <span className="mode__gloss" id={id} role="tooltip">{gloss}</span>
      </span>
    </p>
  );
}
