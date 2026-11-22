import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { type DirectoryRow, presentIds, settleSnapshot } from "./roster-model";

export function usePresenceSnapshot(
	directory: readonly DirectoryRow[] | undefined
) {
	const [snapshot, setSnapshot] = useState<ReadonlySet<string> | null>(null);
	const settled = settleSnapshot(snapshot, directory);
	if (settled !== snapshot) {
		setSnapshot(settled);
	}

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
