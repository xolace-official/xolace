import { COMPRESS_MS, FLASH_MS } from "@/features/vent/field/particle-config";
import {
	playAffirmativePress,
	playErrorNotice,
	playGentlePresence,
	playSoftPress,
	useBurnHaptic,
} from "@/lib/haptics";

export function useVentHaptics() {
	const burn = useBurnHaptic(COMPRESS_MS, FLASH_MS);
	return {
		affirmativePress: playAffirmativePress,
		burn: burn.play,
		burst: burn.fromFlash,
		errorNotice: playErrorNotice,
		gentlePresence: playGentlePresence,
		softPress: playSoftPress,
	};
}
