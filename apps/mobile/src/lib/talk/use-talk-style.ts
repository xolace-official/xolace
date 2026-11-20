import { api } from "@xolace/backend/convex/_generated/api";
import type {
	TalkDirectness,
	TalkLook,
	TalkPace,
	TalkView,
} from "@xolace/backend/convex/lib/voices";
import {
	isVoiceSlug,
	TALK_FALLBACK_VOICE,
	type VoiceSlug,
} from "@xolace/backend/shared";
import { useQuery } from "convex/react";
import { lookOf } from "@/lib/talk/talk-looks";
import { usePreferenceMutation } from "@/lib/use-preference-mutation";

export type Directness = TalkDirectness | "balanced";

export function useTalkStyle() {
	const prefs = useQuery(api.preferences.get);
	const update = usePreferenceMutation();
	return {
		directness: prefs?.talkDirectness ?? ("balanced" as const),
		look: lookOf(prefs?.talkLook),
		pace: prefs?.talkPace ?? "normal",
		setDirectness: (d: Directness) =>
			update({ talkDirectness: d === "balanced" ? null : d }),
		setLook: (talkLook: TalkLook) => update({ talkLook }),
		setPace: (talkPace: TalkPace) => update({ talkPace }),
		setView: (talkView: TalkView) => update({ talkView }),
		setVoice: (talkVoice: VoiceSlug) => update({ talkVoice }),
		view: prefs?.talkView ?? ("companion" as const),
		voice: talkVoiceOf(prefs?.talkVoice, prefs?.voice),
	};
}

export function talkVoiceOf(
	talkVoice: string | undefined,
	mirrorVoice: string | undefined
): VoiceSlug {
	return [talkVoice, mirrorVoice].find(isVoiceSlug) ?? TALK_FALLBACK_VOICE;
}
