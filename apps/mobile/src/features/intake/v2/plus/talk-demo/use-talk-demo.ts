// The Talk demo's wiring (#714): opens it on the server as the overlay mounts, sends the one
// line once, plays Flux's spoken question, and counts how it finished. The reducer decides
// what shows; nothing here keeps the words.
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
	refusalOf,
} from "@/features/intake/v2/plus/talk-demo/demo-machine";
import { useTypedLine } from "@/features/intake/v2/use-typed-line";
import { useVoicePreview } from "@/features/talk/use-voice-preview";
import {
	claimAudioSession,
	holdsAudioFocus,
	releaseAudioFocus,
} from "@/lib/audio/session";

/** Past the typed-out reply, how long its audio may take before the way on shows anyway. */
const SAID_GRACE_MS = 15_000;

/** `onSafety`: the safeguard ended it; from here, closing goes on past the Xolace+ step. */
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

	useEffect(() => {
		let live = true;
		const run = async () => {
			try {
				const opened = await openDemo({});
				if (live) {
					setOpening(opened.opening);
					dispatch({ type: "OPENED" });
				}
			} catch (error) {
				if (live) {
					dispatch({ reason: refusalOf(error), type: "OPEN_REFUSED" });
				}
			}
		};
		void run();
		return () => {
			live = false;
		};
	}, [openDemo]);

	// One line, once: the reducer leaves `thinking` only on the answer.
	const send = useEffectEvent(async () => {
		try {
			const answer = await sendLine({ line: state.line, voice: state.voice });
			dispatch({ reply: answer, type: "REPLIED" });
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

	useEffect(() => {
		if (status.didJustFinish) {
			setHeard(true);
		}
	}, [status.didJustFinish]);

	// Said once it has typed out and been heard; audio that never ends doesn't hold it up.
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

	const ended = finishedBy(state);
	const track = useEffectEvent(() => {
		if (ended === "safety") {
			onSafety();
		}
		if (ended) {
			trackTalkDemoFinished(posthog, {
				endedBy: ended,
				mode: state.mode,
				voice: state.voice,
			});
		}
	});
	useEffect(() => track(), [ended]);

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
		/** Before the mic opens: a preview still playing would be heard by it. */
		stopPreview: preview.stop,
	};
}
