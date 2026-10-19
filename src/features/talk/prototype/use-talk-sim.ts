// PROTOTYPE (#584) — throwaway. Fakes a live talk in memory: scripted turns,
// streamed words, a ceiling clock and an audio level for the visuals.
import { useEffect, useRef, useState } from "react";
import { useSharedValue, withTiming } from "react-native-reanimated";
import { CLOSING, OPENING, REOPEN_LINE, REPLIES, SPOKEN_LINES, WRAP_UP_CUE } from "./talk-script";

export type Phase = "consent" | "live" | "ending" | "ended";
export type Presence = "listening" | "thinking" | "speaking" | "idle";
export type Turn = {
  id: number;
  speaker: "companion" | "person";
  via: "voice" | "text";
  text: string;
  /** Still streaming (companion speaking or person mid-sentence). */
  live?: boolean;
};

const CEILING = 15 * 60;
const REOPEN_CEILING = 5 * 60;
const WRAP_AT = 5 * 60;

export function useTalkSim() {
  const [phase, setPhase] = useState<Phase>("consent");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [presence, setPresence] = useState<Presence>("idle");
  const [remaining, setRemaining] = useState(CEILING);
  const [weekLeftMin, setWeekLeftMin] = useState(15);
  const [micOn, setMicOn] = useState(true);
  const [reopened, setReopened] = useState(false);
  const level = useSharedValue(0);
  const nextId = useRef(0);
  const replyIdx = useRef(0);
  const spokenIdx = useRef(0);
  const wrapped = useRef(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Fake mic/voice amplitude for the aurora and orbs.
  useEffect(() => {
    const id = setInterval(() => {
      const active = presence === "speaking" || (presence === "listening" && micOn);
      level.set(withTiming(active ? 0.35 + Math.random() * 0.65 : 0.05, { duration: 140 }));
    }, 150);
    return () => clearInterval(id);
  }, [presence, micOn, level]);

  // The ceiling clock.
  useEffect(() => {
    if (phase !== "live") return;
    const id = setInterval(() => setRemaining((r) => Math.max(0, r - 1)), 1000);
    return () => clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "live") return;
    if (remaining <= WRAP_AT && !wrapped.current) {
      wrapped.current = true;
      speak(WRAP_UP_CUE);
    }
    if (remaining === 0) end();
  }, [remaining, phase]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Streams a line word by word into a new turn. */
  function stream(speaker: Turn["speaker"], via: Turn["via"], text: string, done?: () => void) {
    const id = nextId.current++;
    const words = text.split(" ");
    setTurns((t) => [...t, { id, speaker, via, text: "", live: true }]);
    words.forEach((_, i) =>
      later(i * (speaker === "companion" ? 170 : 220), () =>
        setTurns((t) =>
          t.map((x) =>
            x.id === id ? { ...x, text: words.slice(0, i + 1).join(" "), live: i < words.length - 1 } : x,
          ),
        ),
      ),
    );
    later(words.length * (speaker === "companion" ? 170 : 220) + 200, () => done?.());
  }

  function speak(line: string, after: Presence = "listening") {
    setPresence("thinking");
    later(700, () => {
      setPresence("speaking");
      stream("companion", "voice", line, () => setPresence(after));
    });
  }

  function reply() {
    speak(REPLIES[Math.min(replyIdx.current++, REPLIES.length - 1)]);
  }

  return {
    phase, turns, presence, remaining, weekLeftMin, micOn, reopened, level,
    ceiling: reopened ? REOPEN_CEILING : CEILING,
    start() {
      setPhase("live");
      speak(reopened ? REOPEN_LINE : OPENING);
    },
    /** Person speaks: the next canned spoken line streams in as a voice turn. */
    talk() {
      if (presence === "speaking") setPresence("listening"); // barge-in
      const line = SPOKEN_LINES[spokenIdx.current++ % SPOKEN_LINES.length];
      setPresence("listening");
      stream("person", "voice", line, reply);
    },
    send(text: string) {
      if (!text.trim()) return;
      setTurns((t) => [...t, { id: nextId.current++, speaker: "person", via: "text", text: text.trim() }]);
      reply();
    },
    toggleMic: () => setMicOn((m) => !m),
    end,
    reopen() {
      setReopened(true);
      wrapped.current = false;
      setRemaining(REOPEN_CEILING);
      setPhase("live");
      speak(REOPEN_LINE);
    },
    // Prototype-only jumps, driven from the switcher bar.
    jumpToWrap: () => setRemaining(WRAP_AT + 3),
    jumpToEnd: () => setRemaining(3),
    lowWeek: () => setWeekLeftMin(4),
    reset() {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      replyIdx.current = 0;
      spokenIdx.current = 0;
      wrapped.current = false;
      setTurns([]);
      setReopened(false);
      setRemaining(CEILING);
      setWeekLeftMin(15);
      setPresence("idle");
      setPhase("consent");
    },
  };

  function end() {
    setPhase("ending");
    speak(CLOSING, "idle");
    later(4500, () => {
      setPhase("ended");
      setWeekLeftMin((w) => Math.max(0, w - 3));
    });
  }
}

export type TalkSim = ReturnType<typeof useTalkSim>;

export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
