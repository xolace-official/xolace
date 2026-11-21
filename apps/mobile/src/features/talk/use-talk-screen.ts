import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { useConvex, useQuery } from "convex/react";
import {
	getRecordingPermissionsAsync,
	requestRecordingPermissionsAsync,
} from "expo-audio";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Linking } from "react-native";
import { toast } from "@/components/shared/toast";
import { playAffirmativePress } from "@/lib/haptics";
import { useCompanionName } from "@/lib/talk/use-companion-name";
import { useTalkStyle } from "@/lib/talk/use-talk-style";
import { useTalkTime } from "@/lib/talk/use-talk-time";
import { useVoicePreview } from "@/lib/talk/use-voice-preview";
import { useSingleFlight } from "@/lib/use-single-flight";
import { TALK_COPY } from "./copy";
import type { TalkScreen } from "./talk-data";
import { isLow, phaseOf, resourceUrl } from "./talk-model";
import { useTalk } from "./use-talk";
import type { ThreadLine } from "./use-thread";

type Reopen = { sessionId: Id<"sessions">; thread: ThreadLine[] };

export function useReopenedThread(): Reopen | "loading" | undefined {
	const { reopen } = useLocalSearchParams<{ reopen?: string }>();
	const sessionId = reopen as Id<"sessions"> | undefined;
	const convex = useConvex();
	const [thread, setThread] = useState<ThreadLine[] | Error>();
	useEffect(() => {
		if (sessionId) {
			convex
				.query(api.talk.turns.thread, { sessionId })
				.then(setThread, setThread);
		}
	}, [convex, sessionId]);
	if (thread instanceof Error) {
		throw thread;
	}
	if (!sessionId) {
		return;
	}
	return thread ? { sessionId, thread } : "loading";
}

export function useTalkScreenData(reopen?: Reopen): TalkScreen {
	const talk = useTalk(reopen);
	const style = useTalkStyle();
	const time = useTalkTime();
	const name = useCompanionName();
	const preview = useVoicePreview();
	const help =
		useQuery(
			api.talk.safety.help,
			talk.sessionId ? { sessionId: talk.sessionId } : "skip"
		) ?? null;
	const [micAsk, setMicAsk] = useState(false);
	const { busy: starting, run: runStart } = useSingleFlight();
	const [startError, setStartError] = useState<string | null>(null);
	const justEnded = useRef(false);
	const week = time === undefined || time === null ? time : time.secondsLeft;

	useEffect(() => {
		getRecordingPermissionsAsync()
			.then((p) => setMicAsk(p.status === "undetermined"))
			.catch(() => setMicAsk(false));
	}, []);
	const startReopened = useEffectEvent(() => {
		if (reopen) {
			void talk.start();
		}
	});
	useEffect(() => startReopened(), []);
	// Only an error that arrives after "Just end" cancels the toast: one from earlier in the
	// talk stays set until the next start.
	const errorAtEnd = useRef<string | null>(null);
	const leave = useEffectEvent(() => {
		if (justEnded.current && talk.error === errorAtEnd.current) {
			toast(TALK_COPY.live.ended);
		}
	});
	useEffect(() => () => leave(), []);

	return {
		actions: {
			begin: () =>
				void runStart(async () => {
					justEnded.current = false;
					setStartError(null);
					preview.stop();
					if (isLow(week) || talk.started) {
						return;
					}
					playAffirmativePress();
					const { granted } = await requestRecordingPermissionsAsync();
					setMicAsk(false);
					if (!granted) {
						toast(TALK_COPY.start.micOff, {
							action: {
								label: TALK_COPY.start.openSettings,
								onPress: () => void Linking.openSettings(),
							},
							variant: "warning",
						});
						return;
					}
					await talk.start();
				}).catch(() => setStartError(TALK_COPY.start.couldNotStart)),
			end() {
				justEnded.current = false;
				talk.end();
			},
			justEnd() {
				justEnded.current = true;
				errorAtEnd.current = talk.error;
				talk.endWithoutMirror();
			},
			openHelp: () => router.push("/crisis-resources?from=talk"),
			openKept: () => router.push("/talk-kept"),
			openResource(resource) {
				const url = resourceUrl(resource);
				if (url) {
					Linking.openURL(url).catch(() =>
						toast(TALK_COPY.live.cantOpen(resource.type))
					);
				}
			},
			openStyle: () => router.push("/talk-style"),
			pickVoice(voice) {
				if (voice !== style.voice) {
					style.setVoice(voice);
				}
				preview.toggle(voice);
			},
			send: talk.send,
			setLook: style.setLook,
			setView: style.setView,
			stopSample: preview.stop,
			toggleMic: talk.toggleMic,
		},
		state: {
			clockFromS: talk.clockFromS,
			directness: style.directness,
			endsAt: talk.connected ? talk.endsAt : null,
			error: talk.error ?? startError,
			help,
			live: talk.live,
			look: style.look,
			micAsk,
			micLevel: talk.micLevel,
			muted: talk.isMuted,
			name,
			pace: style.pace,
			phase: phaseOf(talk, reopen !== undefined),
			presence: talk.presence,
			reopened: reopen !== undefined,
			sample: preview.playingSlug,
			starting,
			turns: talk.turns,
			view: style.view,
			voice: style.voice,
			week,
		},
	};
}
