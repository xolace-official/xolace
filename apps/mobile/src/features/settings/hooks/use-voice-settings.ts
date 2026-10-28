import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";
import type { VoiceValue } from "@/features/settings/voice-options";
import { usePreferenceMutation } from "./use-preference-mutation";

/**
 * Reads/writes the Plus custom-voice preference. "auto" (the free default)
 * maps to clearing the stored slug (null); a named voice stores its slug.
 * The write is Plus-gated server-side — callers must guard the UI themselves.
 */
export const useVoiceSettings = () => {
	const preferences = useQuery(api.preferences.get);
	const updatePreferences = usePreferenceMutation();
	const posthog = usePostHog();

	const voice: VoiceValue = preferences?.voice ?? "auto";

	const setVoice = (next: VoiceValue) => {
		posthog.capture("voice_changed", { voice: next });
		updatePreferences({ voice: next === "auto" ? null : next });
	};

	return { setVoice, voice };
};
