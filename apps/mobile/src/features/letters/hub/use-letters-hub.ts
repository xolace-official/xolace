import * as Sentry from "@sentry/react-native";
import {
	useLettersCalls,
	useLettersStatus,
	useReceivedLetters,
	useSentLetters,
} from "../use-letters-data";
import type { LettersHub } from "./hub-data";

const OPENS: LettersHub["state"]["opens"] = { hidden: false, withdraw: null };

export function useLettersHub(): LettersHub | undefined {
	const status = useLettersStatus();
	const sent = useSentLetters();
	const received = useReceivedLetters();
	const calls = useLettersCalls();
	const report = (error: unknown) => Sentry.captureException(error);
	if (status === undefined || sent === undefined || received === undefined) {
		return;
	}
	return {
		actions: {
			answerOffer: (optIn) => calls.setOptIn(optIn).catch(report),
			dismiss: (id) => calls.dismiss(id).catch(report),
			markSeen: (ids) => calls.markSeen(ids).catch(report),
			turnOn: () => calls.setOptIn("yes").catch(report),
			withdraw: (id) => calls.withdraw(id).catch(report),
		},
		state: { opens: OPENS, received, sent, status },
	};
}
