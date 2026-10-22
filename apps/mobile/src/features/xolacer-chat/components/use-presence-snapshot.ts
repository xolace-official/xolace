import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

type DirectoryRow = { xolacerProfileId: string; present: boolean };

/**
 * Presence ordering, but frozen while the seeker is actually looking at the
 * list.
 *
 * `directory` is reactive, so a xolacer opening or backgrounding the app
 * re-runs it and would re-sort the roster live. On a list whose whole purpose
 * is being tapped, that is not a cosmetic problem: a row can slide out from
 * under a finger mid-tap and route someone to a xolacer they didn't choose.
 *
 * So the presence *ranking* is snapshotted and the rows hold position; only
 * the ordering is frozen, never the data — a row still re-renders in place
 * with whatever the server currently says. The snapshot is retaken when the
 * screen regains focus, which is the moment nobody is mid-reach, so a seeker
 * returning to Connect always gets a current ranking.
 *
 * Returns the id set to rank by, or null before the first load, when there is
 * no order yet to disturb.
 */
export function usePresenceSnapshot(directory: readonly DirectoryRow[] | undefined) {
  const [snapshot, setSnapshot] = useState<Set<string> | null>(null);

  // Read inside callbacks only, so taking a snapshot never itself depends on
  // the directory identity — a dependency there would re-fire on every
  // presence change and defeat the freeze.
  const latest = useRef(directory);
  useEffect(() => {
    latest.current = directory;
  }, [directory]);

  const take = useCallback(() => {
    const rows = latest.current;
    if (!rows) return;
    setSnapshot(new Set(rows.filter((r) => r.present).map((r) => r.xolacerProfileId)));
  }, []);

  // First load: there is no established order to protect yet, so adopt the
  // server's answer as soon as it arrives rather than waiting for a refocus.
  const loaded = directory !== undefined;
  useEffect(() => {
    if (loaded && snapshot === null) take();
  }, [loaded, snapshot, take]);

  useFocusEffect(take);

  return snapshot;
}
