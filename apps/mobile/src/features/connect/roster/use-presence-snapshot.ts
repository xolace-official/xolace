import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { type DirectoryRow, presentIds, settleSnapshot } from "./roster-model";

/** Presence ranking frozen while the roster is on screen, retaken on focus and on every return
 * to Xolacers (`settleSnapshot`). Null while the directory isn't loaded. */
export function usePresenceSnapshot(
	directory: readonly DirectoryRow[] | undefined
) {
	const [snapshot, setSnapshot] = useState<ReadonlySet<string> | null>(null);
	const settled = settleSnapshot(snapshot, directory);
	if (settled !== snapshot) {
		setSnapshot(settled);
	}

	// Read inside the focus callback only: a dependency on the directory identity would
	// re-fire on every presence change and defeat the freeze.
	const latest = useRef(directory);
	useEffect(() => {
		latest.current = directory;
	}, [directory]);

	useFocusEffect(
		useCallback(() => {
			if (latest.current) {
				setSnapshot(presentIds(latest.current));
			}
		}, [])
	);

	return settled;
}
