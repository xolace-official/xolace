import { registerNativeHandlers } from "stream-chat-expo";
import {
	playAffirmativePress,
	playErrorNotice,
	playSoftPress,
	playTextureSelect,
} from "@/lib/haptics";

type TriggerHaptic = NonNullable<
	Parameters<typeof registerNativeHandlers>[0]["triggerHaptic"]
>;
type StreamHaptic = Parameters<TriggerHaptic>[0];

// Stream's names are UIKit feedback styles; each maps onto the app's own
// vocabulary so chat feels like the rest of Xolace.
const streamHaptics: Record<StreamHaptic, () => void> = {
	// Recording locked hands-free.
	impactHeavy: playAffirmativePress,
	// Reaction picked.
	impactLight: playTextureSelect,
	// Message long-press menu; recorder start, stop and delete.
	impactMedium: playSoftPress,
	notificationError: playErrorNotice,
	// Voice message sent.
	notificationSuccess: playAffirmativePress,
	notificationWarning: playErrorNotice,
	selection: playTextureSelect,
};

/**
 * Routes Stream's haptics through `@/lib/haptics` (CoreHaptics on iOS, Pulsar
 * elsewhere). stream-chat-expo's default handler calls expo-haptics, which bun
 * installs as its optional peer but autolinking never links into the app, so
 * every call rejected with an `UnavailabilityError`. Call after stream-chat-expo
 * has loaded: it registers its default at import, and the last call wins.
 */
export function registerStreamHaptics(): void {
	registerNativeHandlers({
		triggerHaptic: (method) => streamHaptics[method](),
	});
}
