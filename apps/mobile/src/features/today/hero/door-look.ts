import type { IconName } from "@/components/shared/icon";
import type { Door } from "../today-model";

/** Each door's icon and colours, worn by its tile and by its word in the card's hint. */
export const DOOR_LOOK: Record<
	Door,
	{ icon: IconName; tile: string; ink: string }
> = {
	sit: {
		icon: { android: "waves", ios: "water.waves" },
		ink: "door-sit-ink",
		tile: "bg-door-sit",
	},
	talk: {
		icon: { android: "mic", ios: "mic" },
		ink: "door-talk-ink",
		tile: "bg-door-talk",
	},
	vent: {
		icon: { android: "graphic_eq", ios: "waveform.path.ecg" },
		ink: "door-vent-ink",
		tile: "bg-door-vent",
	},
};
