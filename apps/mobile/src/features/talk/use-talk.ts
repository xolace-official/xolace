import { useConversation } from "@elevenlabs/react-native";
import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { stripAudioTags } from "@xolace/backend/convex/ai/talk/audioTags";
import { TALK_CEILING_MS, wrapUpMs } from "@xolace/backend/convex/talk/clock";
import { hasSpokenContent } from "@xolace/backend/shared";
import { useAction, useMutation } from "convex/react";
import { AudioModule } from "expo-audio";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useSharedValue, withTiming } from "react-native-reanimated";
import { endWithRetry } from "@/features/talk/end-with-retry";
import { type ThreadLine, useThread } from "@/features/talk/use-thread";
import { TALK_COPY } from "./copy";
import { talkErrorMessage } from "./talk-model";

export type Presence =
	| "Connecting…"
	| "Ending…"
	| "Listening"
	| "Thinking…"
	| "Speaking"
	| "Mic off";

const lift = (v: number) => Math.min(1, Math.sqrt(Math.max(0, v)));

export function useTalk(reopen?: {
	sessionId: Id<"sessions">;
	thread: ThreadLine[];
}) {
	const startTalk = useAction(api.talk.live.start);
	const attachConversation = useMutation(api.talk.session.attachConversation);
	const endTalk = useMutation(api.talk.session.end);
	const markMirrorLater = useMutation(api.talk.session.markMirrorLater);
	const thread = useThread(reopen?.thread);
	const sessionRef = useRef<Id<"sessions"> | null>(null);
	const lastTyped = useRef<string | null>(null);
	const [sessionId, setSessionId] = useState<Id<"sessions"> | null>(null);
	const [started, setStarted] = useState(false);
	const [wasLive, setWasLive] = useState(false);
	const [endsAt, setEndsAt] = useState<number | null>(null);
	const [clockFromS, setClockFromS] = useState(
		wrapUpMs(TALK_CEILING_MS) / 1000
	);
	const [thinking, setThinking] = useState(false);
	const [ending, setEnding] = useState(false);
	const mirrorLater = useRef(false);
	const mounted = useRef(true);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);
	const [error, setError] = useState<string | null>(null);
	const level = useSharedValue(0);
	const micLevel = useSharedValue(0);

	const finish = async () => {
		const sessionId = sessionRef.current;
		sessionRef.current = null;
		if (!sessionId) {
			return;
		}
		setEnding(true);
		const later = mirrorLater.current;
		try {
			if (
				(await endWithRetry(() =>
					endTalk(later ? { mirrorLater: true, sessionId } : { sessionId })
				)) ||
				later
			) {
				if (mounted.current) {
					router.dismissTo("/reflect");
				}
			} else {
				setEnding(false);
				setStarted(false);
				setWasLive(false);
				setError("Nothing was said, so there's no mirror.");
			}
		} catch (e) {
			setEnding(false);
			setError(talkErrorMessage(e, TALK_COPY.live.endFailed));
		}
	};

	const convo = useConversation({
		onAudioAlignment: (a) => {
			setThinking(false);
			thread.spoken(a);
		},
		onConnect: ({ conversationId }) => {
			setWasLive(true);
			if (sessionRef.current) {
				attachConversation({
					conversationId,
					sessionId: sessionRef.current,
				}).catch(console.warn);
			}
		},
		onDisconnect: () => void finish(),
		onError: (message) => {
			if (!sessionRef.current) {
				return;
			}
			setError(message);
			if (status !== "connected") {
				setStarted(false);
				const sessionId = sessionRef.current;
				sessionRef.current = null;
				if (sessionId) {
					endTalk({ sessionId }).catch(console.warn);
				}
			}
		},
		onInterruption: () => thread.interrupted(),
		onMessage: ({ message, role }) => {
			if (role === "user") {
				if (message === lastTyped.current) {
					return void (lastTyped.current = null);
				}
				if (!hasSpokenContent(message)) {
					return;
				}
				setThinking(true);
				thread.heard(message);
			} else {
				lastTyped.current = null;
				setThinking(false);
				thread.said(stripAudioTags(message));
			}
		},
	});
	const {
		status,
		isSpeaking,
		isMuted,
		setMuted,
		getInputVolume,
		getOutputVolume,
	} = convo;
	const connected = status === "connected";

	useEffect(() => {
		if (!connected) {
			return;
		}
		const id = setInterval(() => {
			const mic = isMuted ? 0 : lift(getInputVolume());
			micLevel.set(withTiming(mic, { duration: 80 }));
			level.set(
				withTiming(Math.max(mic, lift(getOutputVolume())), { duration: 80 })
			);
		}, 80);
		return () => {
			clearInterval(id);
			micLevel.set(withTiming(0, { duration: 80 }));
			level.set(withTiming(0, { duration: 80 }));
		};
	}, [connected, isMuted, getInputVolume, getOutputVolume, level, micLevel]);

	const presence: Presence = ending
		? "Ending…"
		: connected
			? isSpeaking
				? "Speaking"
				: thinking
					? "Thinking…"
					: isMuted
						? "Mic off"
						: "Listening"
			: "Connecting…";

	return {
		clockFromS,
		connected,
		end() {
			mirrorLater.current = false;
			setEnding(true);
			convo.endSession();
		},
		endsAt,
		endWithoutMirror() {
			mirrorLater.current = true;
			setEnding(true);
			const sessionId = sessionRef.current;
			if (sessionId) {
				endWithRetry(() => markMirrorLater({ sessionId })).catch(console.warn);
			}
			convo.endSession();
		},
		error,
		isMuted,
		level,
		live: connected && !ending,
		micLevel,
		presence,
		send(text: string) {
			const line = text.trim();
			if (!(line && connected)) {
				return;
			}
			lastTyped.current = line;
			thread.typed(line);
			setThinking(true);
			convo.sendUserMessage(line);
		},
		sessionId,
		async start() {
			setError(null);
			mirrorLater.current = false;
			setEnding(false);
			const { granted } = await AudioModule.requestRecordingPermissionsAsync();
			if (!granted) {
				return setError(
					"A talk needs the microphone. You can allow it in Settings."
				);
			}
			if (!mounted.current) {
				return;
			}
			setStarted(true);
			try {
				const {
					token,
					sessionId,
					talkKey,
					msLeft,
					ceilingS,
					voiceId,
					speed,
					firstMessage,
				} = await startTalk(reopen ? { reopen: reopen.sessionId } : {});
				if (!mounted.current) {
					endTalk({ sessionId }).catch(console.warn);
					return;
				}
				sessionRef.current = sessionId;
				setSessionId(sessionId);
				setEndsAt(Date.now() + msLeft);
				setClockFromS(wrapUpMs(ceilingS * 1000) / 1000);
				convo.startSession({
					conversationToken: token,
					customLlmExtraBody: { sessionId, talkKey },
					// Voice and pace fixed until the talk ends (#603); the greeting names
					// the companion (#583). Needs the voice, speed and first message overrides on.
					overrides: { agent: { firstMessage }, tts: { speed, voiceId } },
				});
			} catch (e) {
				setStarted(false);
				setError(talkErrorMessage(e, TALK_COPY.start.couldNotStart));
			}
		},
		started,
		toggleMic: () => setMuted(!isMuted),
		turns: thread.turns,
		wasLive,
	};
}
