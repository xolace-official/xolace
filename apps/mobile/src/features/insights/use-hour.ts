import { useEffect, useState } from "react";

const HOUR = 60 * 60 * 1000;
const hour = () => Math.floor(Date.now() / HOUR) * HOUR;

/**
 * The current hour, ticking over on the hour. Passed to the insights queries as
 * `now`: Convex won't rerun a query as time passes, so the client moves it on.
 * Hourly keeps the subscription cache warm while still crossing day boundaries.
 */
export function useHour() {
  const [now, setNow] = useState(hour);
  useEffect(() => {
    const id = setTimeout(() => setNow(hour()), now + HOUR - Date.now());
    return () => clearTimeout(id);
  }, [now]);
  return now;
}
