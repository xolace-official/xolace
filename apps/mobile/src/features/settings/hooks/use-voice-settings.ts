import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";
import type { VoiceValue } from "@/features/talk/voice-options";
import { usePreferenceMutation } from "@/lib/use-preference-mutation";

/** Reads/writes the Plus custom-voice preference; "auto" clears the stored slug.
 * The write is Plus-gated server-side, so callers guard the UI themselves. */
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
