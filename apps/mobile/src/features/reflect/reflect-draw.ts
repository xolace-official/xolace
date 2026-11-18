import { createContext, use } from "react";
import type { SharedValue } from "react-native-reanimated";
import type { LightValues } from "./chrome/ambient-light";

/**
 * What every Reflect stage shares to draw: the hour, motion, the light, and where the words lift
 * from. Screen-local, beside the data provider (`reflect-data.tsx`), which holds what Reflect
 * reads and does.
 */
export type ReflectDraw = {
	late: boolean;
	reduced: boolean;
	/** Focused, in the foreground and not reduced: loops may run. */
	live: boolean;
	light: LightValues;
	/** The writing box's window position when Let it out was pressed (the lift's start). */
	liftFrom: SharedValue<{ x: number; y: number }>;
	/** The quality gate stepped down on the first wait: no bleed, no paper. */
	low: boolean;
	setLow: (low: boolean) => void;
};

export const ReflectDrawContext = createContext<ReflectDraw | null>(null);

export function useReflectDraw(): ReflectDraw {
	const ctx = use(ReflectDrawContext);
	if (!ctx) {
		throw new Error("useReflectDraw needs the Reflect screen above it");
	}
	return ctx;
}
