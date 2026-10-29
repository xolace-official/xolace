import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";

type DirectoryRow = { xolacerProfileId: string; present: boolean };

/** Presence ranking frozen while the list is on screen, so a reactive re-sort never slides a
 * row out from under a tap; retaken on focus. Null before the first load. */
export function usePresenceSnapshot(
	directory: readonly DirectoryRow[] | undefined
) {
	const [snapshot, setSnapshot] = useState<Set<string> | null>(null);

	// Read inside callbacks only: a dependency on the directory identity would
	// re-fire on every presence change and defeat the freeze.
	const latest = useRef(directory);
	useEffect(() => {
		latest.current = directory;
	}, [directory]);

	const take = useCallback(() => {
		const rows = latest.current;
		if (!rows) {
			return;
		}
		setSnapshot(
			new Set(rows.filter((r) => r.present).map((r) => r.xolacerProfileId))
		);
	}, []);

	// First load: there is no established order to protect yet, so adopt the
	// server's answer as soon as it arrives rather than waiting for a refocus.
	const loaded = directory !== undefined;
	useEffect(() => {
		if (loaded && snapshot === null) {
			take();
		}
	}, [loaded, snapshot, take]);

	useFocusEffect(take);

	return snapshot;
}
