import * as Sentry from "@sentry/react-native";
import { router } from "expo-router";
import { openLetter, openWrite } from "../letters-routes";
import { useLettersCalls, useLettersStatus } from "../use-letters-data";
import type { ConnectCard } from "./connect-card-data";

/** The card on the letters data module; `undefined` until letters' status has loaded. */
export function useConnectCardData(): ConnectCard | undefined {
	const status = useLettersStatus();
	const calls = useLettersCalls();
	if (status === undefined) {
		return;
	}
	return {
		actions: {
			answerOffer: (optIn) => {
				calls.setOptIn(optIn).catch((e) => Sentry.captureException(e));
			},
			openLetter,
			openLetters: () => router.push("/letters"),
			openWrite,
		},
		state: { status },
	};
}
