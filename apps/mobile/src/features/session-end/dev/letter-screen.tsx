import { LetterTile } from "@/dev/letters-slots";
import type { SessionEnd } from "../session-end-data";
import { FixtureScreen } from "./fixture-screen";
import { LETTER_WAITING, LETTER_WRITE } from "./fixtures";

const A_LITTLE_LIGHTER = 0.62;

function LetterScreen({ state }: { state: SessionEnd["state"] }) {
	return (
		<FixtureScreen
			scene={{ moment: 2, position: A_LITTLE_LIGHTER }}
			state={{ ...state, letterTile: <LetterTile /> }}
		/>
	);
}

export const LetterWaiting = () => <LetterScreen state={LETTER_WAITING} />;

export const LetterWrite = () => <LetterScreen state={LETTER_WRITE} />;
