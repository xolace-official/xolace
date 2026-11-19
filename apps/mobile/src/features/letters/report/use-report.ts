import * as Sentry from "@sentry/react-native";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { useLettersCalls, useReceivedLetter } from "../use-letters-data";
import type { LetterReport } from "./report-data";

/** The sheet closes first; the letter goes once it has (You're not alone's report). */
const AFTER_SHEET_MS = 380;
const STATE: LetterReport["state"] = { reason: null };

const close = () =>
	router.canGoBack() ? router.back() : router.replace("/letters");

/**
 * Report on the letters data module. The sheet reads its letter: one that isn't there (a deep
 * link with a gone or empty id, or one taken away while the sheet is up) closes it, once.
 */
export function useReport(id: string): LetterReport {
	const calls = useLettersCalls();
	const letter = useReceivedLetter(id);
	const closed = useRef(false);
	const leave = () => {
		if (!closed.current) {
			closed.current = true;
			close();
		}
	};
	const gone = letter === null;
	useEffect(() => {
		if (gone) {
			leave();
		}
	}, [gone, leave]);
	return {
		actions: {
			report: (reason) => {
				if (!letter) {
					return;
				}
				leave();
				setTimeout(() => {
					calls
						.report(id, reason)
						.catch((error: unknown) => Sentry.captureException(error));
				}, AFTER_SHEET_MS);
			},
		},
		state: STATE,
	};
}
