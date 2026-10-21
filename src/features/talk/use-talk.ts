// One live talk (#593): the ElevenLabs conversation, the thread it writes and
// the voice levels the aurora and composer read. A talk is a session (#592):
// ending it hands off to the reflect screens' processing → mirror. "Say more"
// on its mirror opens it again (#604): `reopen`, with the thread so far.
import { useEffect, useRef, useState } from "react";
import { router } from "expo-router";
import { AudioModule } from "expo-audio";
import { useConversation } from "@elevenlabs/react-native";
import { useAction, useMutation } from "convex/react";
import { ConvexError } from "convex/values";
import { useSharedValue, withTiming } from "react-native-reanimated";
import { api } from "@/convex/_generated/api";
import { stripAudioTags } from "@/convex/ai/talk/audioTags";
import { wrapUpMs } from "@/convex/talk/clock";
import type { Id } from "@/convex/_generated/dataModel";
import { TALK_TIME_RESETS } from "./talk-copy";
import { useThread, type ThreadLine } from "./use-thread";

export type Presence = "Connecting…" | "Listening" | "Thinking…" | "Speaking" | "Mic off";

// Voice volumes sit low (speech is ~0.05–0.3); the root lifts them into view.
const lift = (v: number) => Math.min(1, Math.sqrt(Math.max(0, v)));
const messageOf = (e: unknown) =>
  e instanceof ConvexError && e.data?.code === "talk_time_used"
    ? `There isn't enough talk time left this week. ${TALK_TIME_RESETS}.`
    : e instanceof Error
      ? e.message
      : String(e);

export function useTalk(reopen?: { sessionId: Id<"sessions">; thread: ThreadLine[] }) {
  const startTalk = useAction(api.talk.live.start);
  const attachConversation = useMutation(api.talk.session.attachConversation);
  const endTalk = useMutation(api.talk.session.end);
  const thread = useThread(reopen?.thread);
  // The open talk's session; cleared once ended so a second disconnect is a no-op.
  const sessionRef = useRef<Id<"sessions"> | null>(null);
  // The last typed line, in case it comes back as a transcript.
  const lastTyped = useRef<string | null>(null);
  /** The talk's session, kept after it ends: help stays on screen (#599). */
  const [sessionId, setSessionId] = useState<Id<"sessions"> | null>(null);
  const [started, setStarted] = useState(false);
  /** When the talk's time runs out, on this device's clock (#597). */
  const [endsAt, setEndsAt] = useState<number | null>(null);
  /** Seconds left when the clock shows: with the wrap-up cue, compressed on a reopening. */
  const clockFromS = wrapUpMs(!!reopen) / 1000;
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Either voice, for the aurora. */
  const level = useSharedValue(0);
  /** The person's voice, for the composer's level bars. */
  const micLevel = useSharedValue(0);

  // However the talk ended (the person, end_call, a dropped line).
  const finish = async () => {
    const sessionId = sessionRef.current;
    sessionRef.current = null;
    if (!sessionId) return;
    try {
      // The reflect screen picks the session up via getActive and takes it
      // through processing → mirror.
      if (await endTalk({ sessionId })) router.replace("/");
      else {
        setStarted(false);
        setError("Nothing was said, so there's no mirror.");
      }
    } catch (e) {
      setError(messageOf(e));
    }
  };

  const convo = useConversation({
    onConnect: ({ conversationId }) => {
      if (sessionRef.current) attachConversation({ sessionId: sessionRef.current, conversationId }).catch(console.warn);
    },
    onDisconnect: () => void finish(),
    onError: (message) => {
      setError(message);
      // A talk that never connected goes back to the card, so it can be
      // retried; closing its session gives the reserved talk time back.
      if (status !== "connected") {
        setStarted(false);
        const sessionId = sessionRef.current;
        sessionRef.current = null;
        if (sessionId) endTalk({ sessionId }).catch(console.warn);
      }
    },
    onMessage: ({ message, role }) => {
      if (role === "user") {
        if (message === lastTyped.current) return void (lastTyped.current = null);
        // ElevenLabs transcribes noise it couldn't make out as "...".
        // Same test as convex/talk/transcript.ts: a letter or digit in any script.
        if (!/[\p{L}\p{N}]/u.test(message)) return;
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
    onAudioAlignment: (a) => {
      setThinking(false);
      thread.spoken(a);
    },
    onInterruption: () => thread.interrupted(),
  });
  const { status, isSpeaking, isMuted, setMuted, getInputVolume, getOutputVolume } = convo;
  const connected = status === "connected";

  useEffect(() => {
    if (!connected) return;
    const id = setInterval(() => {
      const mic = isMuted ? 0 : lift(getInputVolume());
      micLevel.set(withTiming(mic, { duration: 80 }));
      level.set(withTiming(Math.max(mic, lift(getOutputVolume())), { duration: 80 }));
    }, 80);
    return () => clearInterval(id);
  }, [connected, isMuted, getInputVolume, getOutputVolume, level, micLevel]);

  const presence: Presence = !connected
    ? "Connecting…"
    : isSpeaking
      ? "Speaking"
      : thinking
        ? "Thinking…"
        : isMuted
          ? "Mic off"
          : "Listening";

  return {
    sessionId,
    started,
    connected,
    presence,
    isMuted,
    error,
    endsAt,
    clockFromS,
    turns: thread.turns,
    level,
    micLevel,
    async start() {
      setError(null);
      // Asked once, from the consent card; the OS remembers the answer.
      const { granted } = await AudioModule.requestRecordingPermissionsAsync();
      if (!granted) return setError("A talk needs the microphone. You can allow it in Settings.");
      setStarted(true);
      try {
        const { token, sessionId, talkKey, msLeft, voiceId, speed } = await startTalk(
          reopen ? { reopen: reopen.sessionId } : {},
        );
        sessionRef.current = sessionId;
        setSessionId(sessionId);
        setEndsAt(Date.now() + msLeft);
        convo.startSession({
          conversationToken: token,
          // Relayed to our endpoint on every turn (#591), binding it to this
          // talk's session. Needs the agent's `custom_llm_extra_body` override on.
          customLlmExtraBody: { sessionId, talkKey },
          // This talk's voice and pace, fixed until it ends (#603). Needs the
          // agent's voice and speed overrides on.
          overrides: { tts: { voiceId, speed } },
        });
      } catch (e) {
        setStarted(false);
        setError(messageOf(e));
      }
    },
    send(text: string) {
      const line = text.trim();
      if (!line || !connected) return;
      lastTyped.current = line;
      thread.typed(line);
      setThinking(true);
      convo.sendUserMessage(line);
    },
    toggleMic: () => setMuted(!isMuted),
    end: () => convo.endSession(),
  };
}

export type Talk = ReturnType<typeof useTalk>;
