import * as Sentry from "@sentry/react-native";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { useLettersCalls, useReceivedLetter } from "../use-letters-data";
import type { LetterReport } from "./report-data";

const AFTER_SHEET_MS = 380;
const STATE: LetterReport["state"] = { reason: null };

const close = () =>
	router.canGoBack() ? router.back() : router.replace("/letters");

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
