import Constants from "expo-constants";
import PostHog from "posthog-react-native";

const apiKey = Constants.expoConfig?.extra?.posthogProjectToken as
	| string
	| undefined;
const host = Constants.expoConfig?.extra?.posthogHost as string | undefined;
const isPostHogConfigured =
	!!apiKey && apiKey !== "phc_your_project_token_here";

if (__DEV__) {
	console.log("PostHog config:", {
		apiKey: apiKey ? "SET" : "NOT SET",
		host: host ? "SET" : "NOT SET",
		isConfigured: isPostHogConfigured,
	});
}

if (!isPostHogConfigured) {
	console.warn(
		"PostHog project token not configured. Analytics will be disabled. " +
			"Set POSTHOG_PROJECT_TOKEN in your .env file to enable analytics."
	);
}

export const posthog = new PostHog(apiKey || "placeholder_key", {
	...(host ? { host } : {}),
	captureAppLifecycleEvents: true,
	disabled: !isPostHogConfigured || __DEV__,
	featureFlagsRequestTimeoutMs: 10_000,
	fetchRetryCount: 3,
	fetchRetryDelay: 3000,
	flushAt: 20,
	flushInterval: 10_000,
	maxBatchSize: 100,
	maxQueueSize: 1000,
	preloadFeatureFlags: true,
	requestTimeout: 10_000,
	sendFeatureFlagEvent: true,
});

if (__DEV__) {
	posthog.debug();
}
