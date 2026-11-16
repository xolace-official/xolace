import { COMPRESS_MS, FLASH_MS } from "@/features/vent/field/particle-config";
import {
	playAffirmativePress,
	playErrorNotice,
	playGentlePresence,
	playSoftPress,
	useBurnHaptic,
} from "@/lib/haptics";

/**
 * The vent's haptics (handoff §14): production's patterns for the presses, and v2's burn
 * (`@/lib/haptics/burn.ts`) timed to the field's gather and flash.
 */
export function useVentHaptics() {
	const burn = useBurnHaptic(COMPRESS_MS, FLASH_MS);
	return {
		/** Recording really started. */
		affirmativePress: playAffirmativePress,
		/** The release: gather, flash, crackle. */
		burn: burn.play,
		/** A pinch cut the gather: stop the ticks, flash now. */
		burst: burn.fromFlash,
		/** The mic is off and was tapped. */
		errorNotice: playErrorNotice,
		/** 10 s before it lets go on its own. */
		gentlePresence: playGentlePresence,
		/** I understand, Let it go, dropped mid-vent. */
		softPress: playSoftPress,
	};
}
