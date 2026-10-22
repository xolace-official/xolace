import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/** Device-local "YYYY-MM-DD" — the timezone `streaks.state.settle` stores. */
function localDay(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** Today's local day, rolled at midnight and re-checked on foreground (timers sleep in background). */
function useLocalDay(): string {
  const [day, setDay] = useState(localDay);
  useEffect(() => {
    const next = new Date();
    next.setHours(24, 0, 1, 0);
    const timer = setTimeout(() => setDay(localDay()), next.getTime() - Date.now());
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") setDay(localDay());
    });
    return () => {
      clearTimeout(timer);
      sub.remove();
    };
  }, [day]);
  return day;
}

/**
 * `users.getFullContext`, keyed by the local day. Convex caches a query by its
 * args, so the server's Date.now() never re-runs on its own — the day arg
 * rolls the subscription at midnight, re-deriving the live streak and revive
 * offer. Holds the previous day's result while the new one loads (no blank
 * frame); `skip` drops it so a sign-out never shows stale context.
 */
export function useFullContext(skip = false) {
  const day = useLocalDay();
  const result = useQuery(api.users.getFullContext, skip ? "skip" : { day });
  const [held, setHeld] = useState(result);
  const next = skip ? undefined : (result ?? held);
  if (next !== held) setHeld(next);
  return next;
}
