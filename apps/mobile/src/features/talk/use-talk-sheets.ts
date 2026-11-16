import { useCompanionName } from "@/lib/talk/use-companion-name";
import { useTalkStyle } from "@/lib/talk/use-talk-style";
import { useTalkTime } from "@/lib/talk/use-talk-time";
import type { TalkSheets } from "./talk-sheets-data";

/** Talk's two sheets on Convex: how the companion talks, and this week's time. */
export function useTalkSheetsData(): TalkSheets {
	const style = useTalkStyle();
	const time = useTalkTime();
	return {
		actions: {
			setDirectness: style.setDirectness,
			setPace: style.setPace,
		},
		state: {
			directness: style.directness,
			name: useCompanionName(),
			pace: style.pace,
			week: time === undefined || time === null ? time : time.secondsLeft,
		},
	};
}
