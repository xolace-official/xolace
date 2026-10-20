// This week's talk time (#596) for the door, consent card, mirror and settings.
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { WEEKLY_TALK_S } from "./talk-copy";

/** This device's local Monday, "YYYY-MM-DD", as the server keys the week. */
function thisMonday(now = new Date()) {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Undefined while loading or skipped, null off Plus. */
export function useTalkTime(enabled = true) {
  const time = useQuery(api.talk.time.left, enabled ? {} : "skip");
  // A query doesn't re-run as time passes: an answer from a past week is
  // stale, and the server tops up to a full week on the next write.
  if (time && time.week < thisMonday()) return { secondsLeft: WEEKLY_TALK_S, settling: false };
  return time;
}
