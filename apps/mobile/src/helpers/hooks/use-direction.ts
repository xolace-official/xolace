/** Reading direction context, kept apart from `Direction` so `Text` can read it: RN aligns
 * paragraphs from `I18nManager.isRTL`, not Yoga. */
import { createContext, useContext } from "react";
import { I18nManager } from "react-native";

export type DirectionValue = "ltr" | "rtl";

/** What the device is set to, for anything outside a provider. */
const deviceDirection = (): DirectionValue =>
	I18nManager.isRTL ? "rtl" : "ltr";

const DirectionContext = createContext<DirectionValue | null>(null);

/** The reading direction in force. Safe with no provider mounted: falls back to the device
 * setting. */
export function useDirection(): DirectionValue {
	return useContext(DirectionContext) ?? deviceDirection();
}
