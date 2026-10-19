import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

const HOUR_MS = 3_600_000;
const utcClock = () => {
  const hour = Math.floor(Date.now() / HOUR_MS);
  return { day: Math.floor(hour / 24), hour };
};

/**
 * UTC days and hours since epoch — the `day` (daily rotation) and `hour`
 * (`newUntil` expiry) args of `api.browse.getNewShelf`. Re-read on every return to the foreground:
 * tab screens stay mounted and a backgrounded app can live for days, so a
 * mount-time value would pin the shelf to the day the app was opened.
 */
export function useUtcDay() {
  const [clock, setClock] = useState(utcClock);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setClock(utcClock());
    });
    return () => sub.remove();
  }, []);

  return clock;
}
