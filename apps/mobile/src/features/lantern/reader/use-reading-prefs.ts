import { Presets } from "react-native-pulsar";
import {
	type ReadingModeKey,
	stepTextSize,
} from "@/features/lantern/reader/reading-modes";
import { useAppStore } from "@/store/store";

export type ReadingPrefs = {
	mode: ReadingModeKey;
	size: number;
	fire: boolean;
};

export type ReadingPrefsActions = {
	setMode: (mode: ReadingModeKey) => void;
	stepSize: (by: 1 | -1) => void;
	setFire: (on: boolean) => void;
};

export function useReadingPrefs(): {
	state: ReadingPrefs;
	actions: ReadingPrefsActions;
} {
	const mode = useAppStore((s) => s.readingMode);
	const size = useAppStore((s) => s.readerTextSize);
	const fire = useAppStore((s) => s.readByFire);
	const setMode = useAppStore((s) => s.setReadingMode);
	const setSize = useAppStore((s) => s.setReaderTextSize);
	const setFire = useAppStore((s) => s.setReadByFire);
	const tick = Presets.System.selection;
	return {
		actions: {
			setFire: (on) => {
				tick();
				setFire(on);
			},
			setMode: (m) => {
				if (m === mode) {
					return;
				}
				tick();
				setMode(m);
			},
			stepSize: (by) => {
				const to = stepTextSize(size, by);
				if (to === size) {
					return;
				}
				tick();
				setSize(to);
			},
		},
		state: { fire, mode, size },
	};
}
