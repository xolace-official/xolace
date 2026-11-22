import type { IconName } from "@/components/shared/icon";
import type { CheckInPick } from "../copy";

export const ANSWER_LOOK: Record<
	CheckInPick,
	{ bg: string; dusk: string; ink: string; icon: IconName }
> = {
	heavier: {
		bg: "answer-heavier",
		dusk: "answer-heavier-dusk",
		icon: { android: "rainy", ios: "cloud.drizzle" },
		ink: "answer-heavier-ink",
	},
	lighter: {
		bg: "answer-lighter",
		dusk: "answer-lighter-dusk",
		icon: { android: "light_mode", ios: "sun.max" },
		ink: "answer-lighter-ink",
	},
	processed: {
		bg: "answer-processed",
		dusk: "answer-processed-dusk",
		icon: { android: "verified", ios: "checkmark.seal" },
		ink: "answer-processed-ink",
	},
	still_here: {
		bg: "answer-still",
		dusk: "answer-still-dusk",
		icon: { android: "cloud", ios: "cloud" },
		ink: "answer-still-ink",
	},
};
