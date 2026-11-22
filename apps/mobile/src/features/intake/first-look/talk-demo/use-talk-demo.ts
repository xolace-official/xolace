import { api } from "@xolace/backend/convex/_generated/api";
import type { VoiceSlug } from "@xolace/backend/convex/lib/voices";
import { useAction, useMutation } from "convex/react";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { usePostHog } from "posthog-react-native";
import { useEffect, useEffectEvent, useReducer, useRef, useState } from "react";
import { trackTalkDemoFinished } from "@/features/intake/analytics";
import {
	demoReducer,
	finishedBy,
	initialDemoState,
	isSettling,
	openRefused,
	refusalOf,
} from "@/features/intake/first-look/talk-demo/demo-machine";
import { useTypedLine } from "@/features/intake/v2/use-typed-line";
import {
	claimAudioSession,
	holdsAudioFocus,
	releaseAudioFocus,
} from "@/lib/audio/session";
import { useVoicePreview } from "@/lib/talk/use-voice-preview";

const SAID_GRACE_MS = 15_000;

const SETTLE_RETRY_MS = 2000;

export function useTalkDemo({ onSafety }: { onSafety: () => void }) {
	const posthog = usePostHog();
	const [state, dispatch] = useReducer(
		demoReducer,
		undefined,
		initialDemoState
	);
	const openDemo = useMutation(api.talkDemo.demo.open);
	const sendLine = useAction(api.ai.talkDemo.reply.reply);
	const preview = useVoicePreview();
	const player = useAudioPlayer(null);
	const status = useAudioPlayerStatus(player);
	const focus = useRef(null);
	const [opening, setOpening] = useState("");
	const [heard, setHeard] = useState(false);

	const intro = useTypedLine(opening);
	const reply = useTypedLine(state.reply ?? "");

	const openedOnSafety = useEffectEvent(onSafety);
	useEffect(() => {
		let live = true;
		let retry: ReturnType<typeof setTimeout> | undefined;
		const run = async () => {
			try {
				const opened = await openDemo({});
				if (live) {
					setOpening(opened.opening);
					dispatch({ type: "OPENED" });
				}
			} catch (error) {
				if (!live) {
					return;
				}
				if (isSettling(error)) {
					retry = setTimeout(() => void run(), SETTLE_RETRY_MS);
					return;
				}
				const refused = openRefused(error);
				dispatch(refused);
				if (refused.type === "OPENED_ON_SAFETY") {
					openedOnSafety();
				}
			}
		};
		void run();
		return () => {
			live = false;
			clearTimeout(retry);
		};
	}, [openDemo]);

	const send = useEffectEvent(async () => {
		try {
			const answer = await sendLine({ line: state.line, voice: state.voice });
			if (answer.route === "safety") {
				onSafety();
			}
			const replied = { reply: answer, type: "REPLIED" } as const;
			dispatch(replied);
			const ended = finishedBy(demoReducer(state, replied));
			if (ended) {
				trackTalkDemoFinished(posthog, {
					endedBy: ended,
					mode: state.mode,
					voice: state.voice,
				});
			}
		} catch (error) {
			dispatch({ reason: refusalOf(error), type: "REPLY_REFUSED" });
		}
	});
	useEffect(() => {
		if (state.phase === "thinking") {
			void send();
		}
	}, [state.phase]);

	const speak = useEffectEvent(async (uri: string) => {
		try {
			await claimAudioSession(focus, () => player.pause());
			if (holdsAudioFocus(focus)) {
				player.replace({ uri });
				player.play();
				return;
			}
		} catch (e) {
			console.error("[talkDemo] play failed:", e);
		}
		setHeard(true);
	});
	useEffect(() => {
		if (state.phase !== "reply") {
			return;
		}
		if (state.audioUrl) {
			void speak(state.audioUrl);
		} else {
			setHeard(true);
		}
	}, [state.phase, state.audioUrl]);

	if (status.didJustFinish && !heard) {
		setHeard(true);
	}

	useEffect(() => {
		if (state.phase !== "reply" || !reply.done) {
			return;
		}
		if (heard) {
			dispatch({ type: "SAID" });
			return;
		}
		const timer = setTimeout(() => dispatch({ type: "SAID" }), SAID_GRACE_MS);
		return () => clearTimeout(timer);
	}, [state.phase, reply.done, heard]);

	const stopSound = useEffectEvent(() => {
		preview.stop();
		if (status.playing) {
			player.pause();
		}
	});
	useEffect(
		() => () => {
			stopSound();
			releaseAudioFocus(focus);
		},
		[]
	);

	return {
		dispatch,
		intro,
		pickVoice: (voice: VoiceSlug) => {
			dispatch({ type: "PICK_VOICE", voice });
			preview.toggle(voice);
		},
		playingVoice: preview.playingSlug,
		reply,
		state,
		stopPreview: preview.stop,
	};
}
