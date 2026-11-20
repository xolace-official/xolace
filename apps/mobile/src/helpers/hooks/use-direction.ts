import { createContext, useContext } from "react";
import { I18nManager } from "react-native";

export type DirectionValue = "ltr" | "rtl";

const deviceDirection = (): DirectionValue =>
	I18nManager.isRTL ? "rtl" : "ltr";

const DirectionContext = createContext<DirectionValue | null>(null);

export function useDirection(): DirectionValue {
	return useContext(DirectionContext) ?? deviceDirection();
}
