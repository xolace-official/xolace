/**
 * `Uniwind.setTheme` writes native appearance itself (Default's `light` and `dark` force it, every
 * other name resets it). Writing it and undoing it straight after isn't enough: each write is its
 * own trip to the main thread, and a frame can land in between, a one-frame flash of the other
 * scheme. So while held, React Native's setter is swapped for one that only records the wish,
 * which catches Uniwind's write too. Release puts the real setter back.
 */
import { Appearance } from "react-native";
import { type ThemeName, Uniwind } from "uniwind";

type SchemeOverride = Parameters<typeof Appearance.setColorScheme>[0];

type NativeScheme = "light" | "dark" | "system";

const ADAPTIVE: readonly string[] = ["light", "dark", "system"];

type Held = {
	phone: "light" | "dark";
	setOnWindow: (scheme: SchemeOverride) => void;
	held: boolean;
	wish: SchemeOverride | null;
};
const appGlobal = globalThis as { __xolaceNativeAppearance?: Held };
const state: Held = (appGlobal.__xolaceNativeAppearance ??= {
	held: true,
	phone: Appearance.getColorScheme() === "dark" ? "dark" : "light",
	setOnWindow: Appearance.setColorScheme,
	wish: null,
});

const record = (scheme: SchemeOverride) => {
	state.wish = scheme;
};
if (state.held) {
	Appearance.setColorScheme = record;
}

export const LAUNCH_PHONE_SCHEME = state.phone;

export function applyTheme(name: ThemeName | "system"): void {
	if (ADAPTIVE.includes(name)) {
		Uniwind.setTheme(name as ThemeName);
		return;
	}
	const current = Appearance.setColorScheme;
	Appearance.setColorScheme = () => undefined;
	try {
		Uniwind.setTheme(name as ThemeName);
	} finally {
		Appearance.setColorScheme = current;
	}
}

export function setNativeAppearance(scheme: NativeScheme): void {
	Appearance.setColorScheme(scheme === "system" ? "auto" : scheme);
}

export function releaseNativeAppearance(): void {
	if (!state.held) {
		return;
	}
	state.held = false;
	Appearance.setColorScheme = state.setOnWindow;
	if (state.wish !== null) {
		state.setOnWindow(state.wish);
	}
}
