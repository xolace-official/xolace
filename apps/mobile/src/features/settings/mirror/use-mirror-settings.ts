import { api } from "@xolace/backend/api";
import { useQuery } from "convex/react";
import { usePostHog } from "posthog-react-native";
import { usePaywall } from "@/features/purchases/use-paywall";
import { usePlusEntitlement } from "@/features/purchases/use-plus-entitlement";
import type { MirrorSettings } from "@/features/settings/mirror/mirror-data";
import {
	entitlementOf,
	shownTone,
	shownVoice,
} from "@/features/settings/mirror/mirror-model";
import { saved } from "@/features/settings/use-save-failed";
import { useCompanionName } from "@/lib/talk/use-companion-name";
import { useTalkStyle } from "@/lib/talk/use-talk-style";
import { useVoicePreview } from "@/lib/talk/use-voice-preview";
import { usePreferenceMutation } from "@/lib/use-preference-mutation";

export function useMirrorSettings(): MirrorSettings {
	const preferences = useQuery(api.preferences.get);
	const update = usePreferenceMutation();
	const posthog = usePostHog();
	const { isPlus, isLoading } = usePlusEntitlement();
	const talk = useTalkStyle();
	const companion = useCompanionName();
	const preview = useVoicePreview();
	const openPaywall = usePaywall((s) => s.open);
	const plus = entitlementOf(isPlus, isLoading);

	return {
		actions: {
			openPlus: (surface) => openPaywall(surface),
			play: (voice) => {
				preview.play(voice).catch(() => undefined);
			},
			reachForTone: () => saved(update({ registerComplaint: true })),
			setDirectness: (directness) => saved(talk.setDirectness(directness)),
			setPace: (pace) => saved(talk.setPace(pace)),
			setTalkVoice: (voice) => saved(talk.setVoice(voice)),
			setTone: (tone) => {
				posthog.capture("tone_changed", { tone });
				saved(update({ mirrorTone: tone }));
			},
			setVoice: (voice) => {
				posthog.capture("voice_changed", { voice });
				saved(update({ voice: voice === "auto" ? null : voice }));
			},
			stop: preview.stop,
		},
		state: {
			companion,
			playing: preview.playingSlug,
			plus,
			saved: {
				tone: preferences?.mirrorTone ?? "adaptive",
				voice: preferences?.voice ?? "auto",
			},
			talk: isPlus
				? { directness: talk.directness, pace: talk.pace, voice: talk.voice }
				: null,
			tone: shownTone(preferences?.mirrorTone ?? "adaptive", plus),
			voice: shownVoice(preferences?.voice ?? "auto", plus),
		},
	};
}
