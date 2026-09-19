/** The X-shareable result block. Pure string building. */
import type { Round } from "../core/session";
import { MAX_LIVES, scoreRound } from "../core/session";

export function shareText(round: Round, url = "jevlish.app"): string {
  const misses = round.attempts.filter((a) => a.verdict !== "correct").length;
  const marks = "●".repeat(Math.max(0, MAX_LIVES - misses)) + "○".repeat(misses);
  const hints = round.hintsUsed.length;
  const head = round.status === "solved"
    ? `Jevlish — solved for ${scoreRound(round)}`
    : "Jevlish — stumped";
  const clue = round.puzzle.words.map((w) => (w.swapped ? "🟨" : "⬜")).join("");
  const lines = [head, clue, `${marks}${hints > 0 ? `  ${hints} hint${hints > 1 ? "s" : ""}` : ""}`, url];
  return lines.join("\n");
}
