// This week's talk time (#596) for the door, consent card, mirror and settings.
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { WEEKLY_TALK_S } from "./talk-copy";
import { useTimeLeft } from "./use-time-left";

const HOUR_MS = 60 * 60 * 1000;

/** Undefined while loading or skipped, null off Plus. */
export function useTalkTime(enabled = true) {
  const time = useQuery(api.talk.time.left, enabled ? {} : "skip");
  // A query doesn't re-run as time passes: an answer whose week has ended on
  // the server's clock (not this device's Monday) is stale, and the server
  // tops up to a full week on the next write. The tick re-renders at the turn.
  const expired = useTimeLeft(time?.resetsAt ?? null, HOUR_MS) === 0;
  if (time && expired) return { secondsLeft: WEEKLY_TALK_S, settling: false };
  return time;
}
