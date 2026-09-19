import "./ModePicker.css";

/** How the player is working through the bank. */
export type PlayMode = "daily" | "addict";

const MODES: readonly { readonly id: PlayMode; readonly label: string; readonly gloss: string }[] = [
  { id: "daily", label: "Daily", gloss: "One phrase a day, the same for everyone." },
  { id: "addict", label: "Addict", gloss: "Can't wait another day to play." },
];

interface ModePickerProps {
  readonly mode: PlayMode;
  readonly onPick: (mode: PlayMode) => void;
}

export function ModePicker({ mode, onPick }: ModePickerProps) {
  return (
    <div className="modes" role="group" aria-label="How to play">
      {MODES.map(({ id, label, gloss }) => (
        <span className="mode-pill__slot" key={id}>
          <button
            type="button"
            className={`mode-pill${id === mode ? " mode-pill--on" : ""}`}
            aria-pressed={id === mode}
            aria-describedby={`mode-gloss-${id}`}
            onClick={() => onPick(id)}
          >
            {label}
          </button>
          <span className="mode-pill__gloss" id={`mode-gloss-${id}`} role="tooltip">
            {gloss}
          </span>
        </span>
      ))}
    </div>
  );
}
