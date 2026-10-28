// One live talk (#593): the ElevenLabs conversation, the thread it writes and
// the voice levels the aurora and composer read. A talk is a session (#592):
// ending it hands off to the reflect screens' processing → mirror, or with
// "Just end" files the mirror in the timeline instead. "Say more" on its
// mirror opens it again (#604): `reopen`, with the thread so far.

import { useConversation } from "@elevenlabs/react-native";
import { api } from "@xolace/backend/convex/_generated/api";
import type { Id } from "@xolace/backend/convex/_generated/dataModel";
import { stripAudioTags } from "@xolace/backend/convex/ai/talk/audioTags";
import { TALK_CEILING_MS, wrapUpMs } from "@xolace/backend/convex/talk/clock";
import { useAction, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { AudioModule } from "expo-audio";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { useSharedValue, withTiming } from "react-native-reanimated";
import { endWithRetry } from "@/features/talk/end-with-retry";
import { TALK_TIME_RESETS } from "@/features/talk/talk-copy";
import { type ThreadLine, useThread } from "@/features/talk/use-thread";

export type Presence =
	| "Connecting…"
	| "Listening"
	| "Thinking…"
	| "Speaking"
	| "Mic off";

// Voice volumes sit low (speech is ~0.05–0.3); the root lifts them into view.
const lift = (v: number) => Math.min(1, Math.sqrt(Math.max(0, v)));
const messageOf = (e: unknown) =>
	e instanceof ConvexError && e.data?.code === "talk_time_used"
		? `There isn't enough talk time left this week. ${TALK_TIME_RESETS}.`
		: e instanceof Error
			? e.message
			: String(e);

export function useTalk(reopen?: {
	sessionId: Id<"sessions">;
	thread: ThreadLine[];
}) {
	const startTalk = useAction(api.talk.live.start);
	const attachConversation = useMutation(api.talk.session.attachConversation);
	const endTalk = useMutation(api.talk.session.end);
	const markMirrorLater = useMutation(api.talk.session.markMirrorLater);
	const thread = useThread(reopen?.thread);
	// The open talk's session; cleared once ended so a second disconnect is a no-op.
	const sessionRef = useRef<Id<"sessions"> | null>(null);
	// The last typed line, in case it comes back as a transcript.
	const lastTyped = useRef<string | null>(null);
	/** The talk's session, kept after it ends: help stays on screen (#599). */
	const [sessionId, setSessionId] = useState<Id<"sessions"> | null>(null);
	const [started, setStarted] = useState(false);
	/** Connected at least once: the consent card stays down while the talk ends. */
	const [wasLive, setWasLive] = useState(false);
	/** When the talk's time runs out, on this device's clock (#597). */
	const [endsAt, setEndsAt] = useState<number | null>(null);
	/** Seconds left when the clock shows: with the wrap-up cue, compressed to the talk's ceiling. */
	const [clockFromS, setClockFromS] = useState(
		wrapUpMs(TALK_CEILING_MS) / 1000
	);
	const [thinking, setThinking] = useState(false);
	/** The person chose to end: leaving no longer asks first. */
	const [ending, setEnding] = useState(false);
	// "Just end": the mirror is made for the timeline, not shown now.
	const mirrorLater = useRef(false);
	// The SDK hangs up when the screen goes, so a talk can close after it has.
	const mounted = useRef(true);
	useEffect(() => {
		mounted.current = true;
		return () => {
			mounted.current = false;
		};
	}, []);
	const [error, setError] = useState<string | null>(null);
	/** Either voice, for the aurora. */
	const level = useSharedValue(0);
	/** The person's voice, for the composer's level bars. */
	const micLevel = useSharedValue(0);

	// However the talk ended (the person, end_call, a dropped line).
	const finish = async () => {
		const sessionId = sessionRef.current;
		sessionRef.current = null;
		if (!sessionId) {
			return;
		}
		const later = mirrorLater.current;
		try {
			// Back to the home underneath, not a new one on top of it: its reflect
			// screen picks the session up via getActive and takes it through
			// processing → mirror. Ended with "Just end", it doesn't.
			if (
				(await endWithRetry(() =>
					endTalk(later ? { mirrorLater: true, sessionId } : { sessionId })
				)) ||
				later
			) {
				if (mounted.current) {
					router.dismissTo("/");
				}
			} else {
				setEnding(false);
				setStarted(false);
				setWasLive(false);
				setError("Nothing was said, so there's no mirror.");
			}
		} catch (e) {
			// Not ended after all: leaving asks again while the line is up.
			setEnding(false);
			setError(messageOf(e));
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
			// Teardown noise after the talk has ended isn't the person's problem.
			if (!sessionRef.current) {
				return;
			}
			setError(message);
			// A talk that never connected goes back to the card, so it can be
			// retried; closing its session gives the reserved talk time back.
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
				// ElevenLabs transcribes noise it couldn't make out as "...".
				// Same test as convex/talk/transcript.ts: a letter or digit in any script.
				if (!/[\p{L}\p{N}]/u.test(message)) {
					return;
				}
				setThinking(true);
				thread.heard(message);
			} else {
				// A typed line that wasn't echoed by now won't be.
				lastTyped.current = null;
				setThinking(false);
				// Tags are heard, not read (#603).
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
		return () => clearInterval(id);
	}, [connected, isMuted, getInputVolume, getOutputVolume, level, micLevel]);

	const presence: Presence = connected
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
		/** Ends the talk; its mirror comes now. */
		end() {
			mirrorLater.current = false;
			setEnding(true);
			convo.endSession();
		},
		endsAt,
		/** Ends the talk; its mirror waits in the timeline. */
		endWithoutMirror() {
			mirrorLater.current = true;
			setEnding(true);
			// Kept on the talk before hanging up, in case the end call never lands.
			const sessionId = sessionRef.current;
			if (sessionId) {
				endWithRetry(() => markMirrorLater({ sessionId })).catch(console.warn);
			}
			convo.endSession();
		},
		error,
		isMuted,
		level,
		/** Live and not ending: leaving asks first. */
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
			// A new talk starts unended, its mirror shown when it ends.
			mirrorLater.current = false;
			setEnding(false);
			// Asked once, from the consent card; the OS remembers the answer.
			const { granted } = await AudioModule.requestRecordingPermissionsAsync();
			if (!granted) {
				return setError(
					"A talk needs the microphone. You can allow it in Settings."
				);
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
				sessionRef.current = sessionId;
				setSessionId(sessionId);
				setEndsAt(Date.now() + msLeft);
				setClockFromS(wrapUpMs(ceilingS * 1000) / 1000);
				convo.startSession({
					conversationToken: token,
					// Relayed to our endpoint on every turn (#591), binding it to this
					// talk's session. Needs the agent's `custom_llm_extra_body` override on.
					customLlmExtraBody: { sessionId, talkKey },
					// This talk's voice and pace, fixed until it ends (#603). Needs the
					// agent's voice and speed overrides on. The greeting names this
					// talk's companion (#583); needs the first message override on.
					overrides: { agent: { firstMessage }, tts: { speed, voiceId } },
				});
			} catch (e) {
				setStarted(false);
				setError(messageOf(e));
			}
		},
		started,
		toggleMic: () => setMuted(!isMuted),
		turns: thread.turns,
		wasLive,
	};
}

export type Talk = ReturnType<typeof useTalk>;
