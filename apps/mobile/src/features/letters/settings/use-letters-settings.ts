import * as Sentry from "@sentry/react-native";
import {
	useLettersCalls,
	useLettersPush,
	useLettersStatus,
} from "../use-letters-data";

type LettersSwitch = { on: boolean; set: (on: boolean) => void } | null;

const report = (error: unknown) => Sentry.captureException(error);

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
