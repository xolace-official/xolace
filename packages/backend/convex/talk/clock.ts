/**
 * The talk clock (#582, #597): our record, not the app's, decides how a talk
 * winds down. Every turn the endpoint hands the companion the time left and,
 * on a silence turn, that the person has stayed quiet. Pure; the endpoint
 * applies it.
 */
import type { AnthropicTurn } from "../ai/talk/openaiCompat";
import type { TalkLine } from "./transcript";

/** One talk's ceiling at most. The agent's 1,560 s `max_duration_seconds` is only a backstop. */
export const TALK_CEILING_MS = 15 * 60 * 1000;
/** A "Say more" reopening's own ceiling (#604), before what's left of the week limits it. */
export const REOPEN_CEILING_MS = 5 * 60 * 1000;
const WRAP_UP_MS = 5 * 60 * 1000;
const ENDING_SOON_MS = 2 * 60 * 1000;

/**
 * The cues sit at 5 and 2 min left of a full talk; a shorter ceiling (a
 * reopening's 5 min, or a first talk cut short by the week, #604) gets them
 * compressed to its share of the full 15, so no talk opens in wrap-up (#582).
 */
const share = (ms: number, ceilingMs: number) => (ms * Math.min(ceilingMs, TALK_CEILING_MS)) / TALK_CEILING_MS;
/** When the wrap-up starts; the app's clock shows from here too. */
export const wrapUpMs = (ceilingMs: number) => share(WRAP_UP_MS, ceilingMs);

/**
 * `silentTurns`: companion lines since the person last spoke or typed, when
 * this turn is a re-engage on the agent's `turn_timeout` (20 s); null when it
 * answers them. Counted, not timed: a reply is done before its audio plays,
 * so time since it would count the companion's own speech as silence. The
 * first re-engage is the check-in (~20 s), the next the goodbye (~45 s,
 * spoken out near the 60 s mark).
 */
export type TalkClock = { elapsedMs: number; ceilingMs: number; silentTurns: number | null };

/**
 * The talk key carries its start time and ceiling
 * (`<startedAt>.<ceilingS>.<secret>`), so the endpoint reads the clock
 * without waiting on the database. Trusted only because a turn is served
 * once `syncLines` matches the whole key to the session's. The ceiling is the
 * time reserved for the talk (#596): 15 min (5 on a reopening, #604), or
 * what's left of the week. A reopening's secret starts with `r`, never a hex digit.
 */
export const mintTalkKey = (startedAt: number, ceilingS: number, secret: string, reopened = false) =>
  `${startedAt}.${ceilingS}.${reopened ? "r" : ""}${secret}`;

/** Null for a key we didn't mint. */
export function talkClockOf(talkKey: string, lines: TalkLine[], now: number): TalkClock | null {
  // A key minted before #596 has no ceiling: a full 15-min talk.
  const [, start, ceiling] = /^(\d+)\.(?:(\d+)\.)?/.exec(talkKey) ?? [];
  const startedAt = Number(start);
  if (!Number.isSafeInteger(startedAt)) return null;
  const lastPerson = lines.map((l) => l.role).lastIndexOf("person");
  const silentTurns = lines.at(-1)?.role === "companion" ? lines.length - 1 - lastPerson : null;
  const ceilingMs = ceiling ? Number(ceiling) * 1000 : TALK_CEILING_MS;
  return { elapsedMs: now - startedAt, ceilingMs, silentTurns };
}

export type TalkCue = {
  /** Joins the agent's system prompt. */
  note: string;
  /** Ends the turns on the person's side on a silence turn (Anthropic needs the last turn to be theirs). */
  stageDirection: string | null;
  /** This reply is the last: the endpoint emits `end_call` after it. */
  closing: boolean;
};

const NEVER_SAY_TIME =
  "Never say the time, minutes, seconds or any clock number aloud, and never mention this note.";
const SILENCE = "(They stay silent.)";
// Where the talk's end sends them: the mirror, or at crisis the help on
// their screen. A crisis never extends the talk (#581): same clock for all.
const MIRROR = "what they shared goes to their mirror";
const HELP = "the help on their screen stays, with people they can call right now";

/** `crisis`: the talk's safety peak is crisis, so every cue points to help, not the mirror. */
export function talkCue({ elapsedMs, ceilingMs, silentTurns }: TalkClock, crisis = false): TalkCue {
  const left = ceilingMs - elapsedMs;
  const minutes = Math.max(0, Math.ceil(left / 60_000));
  const clock = `Talk clock: about ${minutes} min left of this talk. ${NEVER_SAY_TIME}`;
  const where = crisis ? HELP : MIRROR;

  if (silentTurns !== null) {
    if (silentTurns >= 2 || left <= 0) {
      return {
        note: `${clock}\nThey have been silent a long while. Say a short, warm goodbye in one or two sentences: the talk is ending and ${where}. Ask nothing.`,
        stageDirection: SILENCE,
        closing: true,
      };
    }
    return {
      note: `${clock}\nThey have gone quiet. Check in gently in one short sentence; no pressure to talk, and they can type instead.`,
      stageDirection: SILENCE,
      closing: false,
    };
  }

  if (left <= 0) {
    return {
      note: `${clock}\nThe talk is at its end. Reply with one short, warm closing line: thank them, and say ${where}. Open nothing new and ask nothing.`,
      stageDirection: null,
      closing: true,
    };
  }
  if (left <= share(ENDING_SOON_MS, ceilingMs)) {
    return {
      note: `${clock}\nThe talk ends soon. If you haven't already, say plainly and in your own words that the talk will end soon, and ${crisis ? "ask who they can reach once it ends" : "ask if anything else belongs in their mirror"}. Open no new threads.`,
      stageDirection: null,
      closing: false,
    };
  }
  if (left <= wrapUpMs(ceilingMs)) {
    return {
      note: `${clock}\nThe talk is nearing its end. Open no new threads; ${crisis ? "keep to their safety right now and who they can reach" : "start drawing together what you have heard"}.`,
      stageDirection: null,
      closing: false,
    };
  }
  return { note: clock, stageDirection: null, closing: false };
}

/** The cue applied to a translated request: the note joins `system`, the stage direction ends `turns`. */
export function withCue(system: string, turns: AnthropicTurn[], cue: TalkCue | null): string {
  if (!cue) return system;
  if (cue.stageDirection) {
    // A re-engage may already end on a noise-only person line ("...").
    const last = turns.at(-1);
    if (last?.role === "user" && typeof last.content === "string") last.content += `\n\n${cue.stageDirection}`;
    else turns.push({ role: "user", content: cue.stageDirection });
  }
  return [system, cue.note].filter(Boolean).join("\n\n");
}
