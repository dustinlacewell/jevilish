import type { CSSProperties } from "react";
import type { Puzzle, PuzzleWord } from "../core/types";
import { boardFontSize } from "./fit";
import "./Board.css";

interface BoardProps {
  readonly puzzle: Puzzle;
  readonly revealed: boolean;
  /** Indices of answer words the player has already matched. */
  readonly matched: readonly number[];
}

/** The puzzle as printed: inflated words above, the recovered phrase below. */
export function Board({ puzzle, revealed, matched }: BoardProps) {
  // The type is sized from the phrase itself, so a long replacement word
  // shrinks the line instead of stranding itself on one.
  const style = { "--board-size": boardFontSize(puzzle.words) } as CSSProperties;

  return (
    <div className="board" style={style} aria-live="polite">
      {puzzle.words.map((word, index) => (
        <WordCard
          key={index}
          word={word}
          revealed={revealed}
          matched={matched.includes(index)}
          pivot={puzzle.pivotIndex === index}
        />
      ))}
    </div>
  );
}

interface WordCardProps {
  readonly word: PuzzleWord;
  readonly revealed: boolean;
  readonly matched: boolean;
  readonly pivot: boolean;
}

function WordCard({ word, revealed, matched, pivot }: WordCardProps) {
  const classes = ["word"];
  if (word.swapped) classes.push("word--swapped");
  if (word.scientific) classes.push("word--scientific");
  if (pivot) classes.push("word--pivot");
  if (revealed) classes.push("word--revealed");
  else if (matched) classes.push("word--matched");

  return (
    <span className={classes.join(" ")}>
      <span className="word__shown">{word.shown}</span>
      {revealed && word.swapped && (
        <span className="word__original">{word.original}</span>
      )}
    </span>
  );
}
