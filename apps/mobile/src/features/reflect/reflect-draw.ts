import { createContext, use } from "react";
import type { SharedValue } from "react-native-reanimated";
import type { LightValues } from "./chrome/ambient-light";

export type ReflectDraw = {
	late: boolean;
	reduced: boolean;
	live: boolean;
	light: LightValues;
	liftFrom: SharedValue<{ x: number; y: number }>;
	low: boolean;
};

export const ReflectDrawContext = createContext<ReflectDraw | null>(null);

export function useReflectDraw(): ReflectDraw {
	const ctx = use(ReflectDrawContext);
	if (!ctx) {
		throw new Error("useReflectDraw needs the Reflect screen above it");
	}
	return ctx;
}
