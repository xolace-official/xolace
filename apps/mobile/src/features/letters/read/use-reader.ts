import * as Sentry from "@sentry/react-native";
import { toast } from "@/components/shared/toast";
import { LETTERS } from "../copy";
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
			open: () =>
				calls.open(id).then(
					() => true,
					(error: unknown) => {
						report(error);
						// The letter seals again; the reader puts VoiceOver back on Open.
						toast(LETTERS.read.openFailed);
						return false;
					}
				),
			unhide: () => calls.unhide(id).catch(report),
		},
		state: { letter, opens: OPENS },
	};
}
