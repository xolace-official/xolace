import { useEffect, useState } from 'react';
import { AppState } from 'react-native';

const DAY_MS = 86_400_000;
const utcDay = () => Math.floor(Date.now() / DAY_MS);

/**
 * UTC days since epoch — the `day` arg of `api.browse.getNewShelf`, which
 * rotates the New shelf daily. Re-read on every return to the foreground:
 * tab screens stay mounted and a backgrounded app can live for days, so a
 * mount-time value would pin the shelf to the day the app was opened.
 */
export function useUtcDay() {
  const [day, setDay] = useState(utcDay);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setDay(utcDay());
    });
    return () => sub.remove();
  }, []);

  return day;
}
