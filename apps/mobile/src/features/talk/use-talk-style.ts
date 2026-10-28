// How the companion sounds in a talk (#603): voice, pace, directness. Saved
// per person; a talk reads them once, at its start.

import { api } from "@xolace/backend/convex/_generated/api";
import {
	TALK_FALLBACK_VOICE,
	type TalkDirectness,
	type TalkPace,
	type VoiceSlug,
} from "@xolace/backend/convex/lib/voices";
import { useQuery } from "convex/react";
import { usePreferenceMutation } from "@/lib/use-preference-mutation";

export type Directness = TalkDirectness | "balanced";

export function useTalkStyle() {
	const prefs = useQuery(api.preferences.get);
	const update = usePreferenceMutation();
	return {
		directness: prefs?.talkDirectness ?? ("balanced" as const),
		pace: prefs?.talkPace ?? "normal",
		setDirectness: (d: Directness) =>
			update({ talkDirectness: d === "balanced" ? null : d }),
		setPace: (talkPace: TalkPace) => update({ talkPace }),
		setVoice: (talkVoice: VoiceSlug) => update({ talkVoice }),
		// Unpicked, it speaks in their mirror voice, else Vesper (the server's order).
		voice: prefs?.talkVoice ?? prefs?.voice ?? TALK_FALLBACK_VOICE,
	};
}
