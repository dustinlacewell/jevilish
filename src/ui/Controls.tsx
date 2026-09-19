import { type FormEvent, useState } from "react";
import "./Controls.css";

interface ControlsProps {
  readonly disabled: boolean;
  readonly livesLeft: number;
  readonly onGuess: (text: string) => void;
  readonly onHint: () => void;
  readonly hintsLeft: number;
}

export function Controls({ disabled, livesLeft, onGuess, onHint, hintsLeft }: ControlsProps) {
  const [text, setText] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (text.trim() === "") return;
    onGuess(text);
    setText("");
  }

  return (
    <form className="controls" onSubmit={submit}>
      <div className="controls__row">
        <input
          className="controls__input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What is the real phrase?"
          aria-label="Your guess"
          autoComplete="off"
          autoCapitalize="characters"
          disabled={disabled}
        />
        <button className="controls__go" type="submit" disabled={disabled}>
          Solve
        </button>
      </div>
      <div className="controls__meta">
        <span className="lives" aria-label={`${livesLeft} guesses left`}>
          {"●".repeat(livesLeft)}
          {"○".repeat(Math.max(0, 3 - livesLeft))}
        </span>
        <button
          className="controls__hint"
          type="button"
          onClick={onHint}
          disabled={disabled || hintsLeft === 0}
        >
          Reveal a word
        </button>
      </div>
    </form>
  );
}
