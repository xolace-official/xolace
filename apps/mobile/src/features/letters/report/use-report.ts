import * as Sentry from "@sentry/react-native";
import { router } from "expo-router";
import { useLettersCalls } from "../use-letters-data";
import type { LetterReport } from "./report-data";

/** The sheet closes first; the letter goes once it has (You're not alone's report). */
const AFTER_SHEET_MS = 380;
const STATE: LetterReport["state"] = { reason: null };

/** Report on the letters data module. */
export function useReport(id: string): LetterReport {
	const calls = useLettersCalls();
	return {
		actions: {
			report: (reason) => {
				router.back();
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
