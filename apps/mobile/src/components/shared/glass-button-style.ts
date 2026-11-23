import type { ViewStyle } from "react-native";

type Style = Record<string, unknown>;

const SURFACE_KEYS = new Set([
	"alignContent",
	"alignItems",
	"borderCurve",
	"columnGap",
	"flexDirection",
	"flexWrap",
	"gap",
	"justifyContent",
	"overflow",
	"rowGap",
]);

function onSurface(key: string): boolean {
	return (
		SURFACE_KEYS.has(key) || key.startsWith("padding") || key.endsWith("Radius")
	);
}

/**
 * Splits a filled button's style between the pressable (`outer`: size,
 * placement, opacity) and the glass inside it (`surface`: padding, alignment,
 * gap, corners, clipping), so one `className` still lays the button out.
 */
export function splitSurfaceStyle(style: ViewStyle | null | undefined): {
	outer: ViewStyle;
	surface: ViewStyle;
} {
	const outer: Style = {};
	const surface: Style = {};
	for (const [key, value] of Object.entries(style ?? {})) {
		if (onSurface(key)) {
			surface[key] = value;
		} else {
			outer[key] = value;
		}
	}
	return { outer: outer as ViewStyle, surface: surface as ViewStyle };
}
