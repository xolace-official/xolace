/**
 * A moment's data: production's session details, the talk's thread and the mirror's voice, plus
 * the two ways on (Reflect again, share the mirror).
 */
import { api } from "@xolace/backend/api";
import type { Id } from "@xolace/backend/dataModel";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import { Share } from "react-native";
import type { MomentScreenData } from "@/features/you/moments/moment/moment-data";
import { useMirrorAudio } from "@/features/you/moments/moment/use-mirror-audio";
import { momentOf } from "@/features/you/moments/moments-model";
import { useCompanionName } from "@/lib/talk/use-companion-name";

export function useMoment(id: string | undefined): MomentScreenData {
	const sessionId = id ? (id as Id<"sessions">) : null;
	const details = useQuery(
		api.sessions.getSessionDetails,
		sessionId ? { sessionId } : "skip"
	);
	const talk = details?.entryType === "talk";
	const thread = useQuery(
		api.talk.turns.thread,
		sessionId && talk ? { sessionId } : "skip"
	);
	const current = useCompanionName();
	const audio = useMirrorAudio(sessionId);
	const moment = details ? momentOf(details, new Date()) : null;

	const state = (() => {
		if (!sessionId || details === null) {
			return null;
		}
		if (!moment) {
			return;
		}
		return {
			audio: { playing: audio.playing, ready: audio.ready },
			companion: moment.companionName ?? current,
			moment,
			thread: thread ?? [],
		};
	})();

	return {
		actions: {
			// Reflect is the app's root. Seeding its box with your words waits for its port.
			again: () => router.dismissTo("/"),
			share: () => {
				if (moment?.mirror) {
					Share.share({ message: moment.mirror }).catch(() => undefined);
				}
			},
			toggleAudio: () => {
				audio.toggle().catch(() => undefined);
			},
		},
		state,
	};
}
