import { LetterTile } from "@/dev/letters-slots";
import type { SessionEnd } from "../session-end-data";
import { FixtureScreen } from "./fixture-screen";
import { LETTER_WAITING, LETTER_WRITE } from "./fixtures";

/** Where the board's moment-two renders sit on the slider (as in `states.tsx`). */
const A_LITTLE_LIGHTER = 0.62;

/** Letters' two cards (renders 29, 30), with Letters' tile from the dev bridge. */
function LetterScreen({ state }: { state: SessionEnd["state"] }) {
	return (
		<FixtureScreen
			scene={{ moment: 2, position: A_LITTLE_LIGHTER }}
			state={{ ...state, letterTile: <LetterTile /> }}
		/>
	);
}

/** Render 30: a letter is waiting for you. */
export const LetterWaiting = () => <LetterScreen state={LETTER_WAITING} />;

/** Render 29: write a letter to a stranger. */
export const LetterWrite = () => <LetterScreen state={LETTER_WRITE} />;
