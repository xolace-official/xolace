import * as Sentry from "@sentry/react-native";
import { useLettersCalls, useReceivedLetter } from "../use-letters-data";
import type { LetterReader } from "./read-data";

const OPENS: LetterReader["state"]["opens"] = { undo: null };

/** The reader on the letters data module. */
export function useReader(id: string): LetterReader {
	const letter = useReceivedLetter(id);
	const calls = useLettersCalls();
	const report = (error: unknown) => Sentry.captureException(error);
	return {
		actions: {
			acknowledge: () => calls.acknowledge(id).catch(report),
			hide: () => calls.hide(id).catch(report),
			open: () => calls.open(id).catch(report),
			unhide: () => calls.unhide(id).catch(report),
		},
		state: { letter, opens: OPENS },
	};
}
