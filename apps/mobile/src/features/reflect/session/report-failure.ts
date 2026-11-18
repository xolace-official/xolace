import * as Sentry from "@sentry/react-native";

/** A call that failed where nothing on screen depends on it: reported, never thrown. */
export function reportFailure(error: unknown) {
	Sentry.captureException(error);
}
