import * as Sentry from "@sentry/react-native";

export function reportFailure(error: unknown) {
	Sentry.captureException(error);
}
