import { api } from "@xolace/backend/api";
import type { Id } from "@xolace/backend/dataModel";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import { usePostHog } from "posthog-react-native";
import { Share } from "react-native";
import type { MomentScreenData } from "@/features/you/moments/moment/moment-data";
import { useMirrorAudio } from "@/features/you/moments/moment/use-mirror-audio";
import { momentOf, reflectSeed } from "@/features/you/moments/moments-model";
import { useCompanionName } from "@/lib/talk/use-companion-name";
import { useAppStore } from "@/store/store";

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
	const setReplySeed = useAppStore((s) => s.setReplySeed);
	const posthog = usePostHog();

	const state = (() => {
		if (!sessionId) {
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
			again: () => {
				const seed = reflectSeed(moment?.said ?? null);
				if (seed) {
					posthog.capture("moment_reflection_seeded", {
						entry_type: details?.entryType ?? null,
						seed_length: seed.length,
					});
					setReplySeed(seed);
				}
				router.dismissTo("/reflect");
			},
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
