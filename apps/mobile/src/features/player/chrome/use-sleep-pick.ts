import { Presets } from "react-native-pulsar";
import type { SleepChoice } from "@/lib/now-playing/sleep-timer";
import { usePlayer } from "../player-data";

export function useSleepPick() {
	const { actions } = usePlayer();
	return (choice: SleepChoice) => {
		Presets.System.selection();
		actions.setSleep(choice);
	};
}
