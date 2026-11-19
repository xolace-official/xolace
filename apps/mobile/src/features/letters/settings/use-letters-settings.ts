import * as Sentry from "@sentry/react-native";
import {
	useLettersCalls,
	useLettersPush,
	useLettersStatus,
} from "../use-letters-data";

/** A Settings switch for letters, composed in by its route; null while letters load. */
type LettersSwitch = { on: boolean; set: (on: boolean) => void } | null;

const report = (error: unknown) => Sentry.captureException(error);

/**
 * Settings › Privacy › Receive letters: the opt-in. On is "yes"; off is "no", the same as the
 * offer's Not now. Unset reads off, and only turning it on or off here answers it.
 */
export function useReceiveLetters(): LettersSwitch {
	const status = useLettersStatus();
	const calls = useLettersCalls();
	if (status === undefined) {
		return null;
	}
	return {
		on: status.optIn === "yes",
		set: (on) => {
			calls.setOptIn(on ? "yes" : "no").catch(report);
		},
	};
}

/** Settings › Notifications › Letters: every letter push, on by default, apart from the opt-in. */
export function useLettersPushSwitch(): LettersSwitch {
	const push = useLettersPush();
	const calls = useLettersCalls();
	if (push === undefined) {
		return null;
	}
	return {
		on: push,
		set: (on) => {
			calls.setPush(on).catch(report);
		},
	};
}
