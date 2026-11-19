/**
 * The one place that writes the app's theme and native appearance (alerts, sheets, keyboards,
 * the window itself). `theme-switch.test.ts` fails if any other file does.
 *
 * The native splash is drawn in the app's window and follows the phone's light or dark. Forcing
 * the window to the app's mode would redraw the splash in the other scheme before the launch
 * cover is over it. So until the cover starts leaving (`releaseNativeAppearance()`), every write
 * is held back and only the last one is kept, then applied. The app's own colours come from
 * Uniwind and are right from the first frame.
 *
 * `Uniwind.setTheme` writes native appearance itself (Default's `light` and `dark` force it, every
 * other name resets it). Writing it and undoing it straight after isn't enough: each write is its
 * own trip to the main thread, and a frame can land in between, a one-frame flash of the other
 * scheme. So while held, React Native's setter is swapped for one that only records the wish,
 * which catches Uniwind's write too. Release puts the real setter back.
 *
 * `theme-bootstrap.ts` imports this file first, so the phone's scheme is read before anything
 * forces one.
 */
import { Appearance } from "react-native";
import { type ThemeName, Uniwind } from "uniwind";

type SchemeOverride = Parameters<typeof Appearance.setColorScheme>[0];

/** What native UI should follow: a fixed light or dark, or the phone's setting. */
type NativeScheme = "light" | "dark" | "system";

/** Adaptive names: Uniwind sets native appearance to match them, as NavThemeProvider does. */
const ADAPTIVE: readonly string[] = ["light", "dark", "system"];

/**
 * This module's state, on the JS global so it outlives the module: a dev fast refresh of this
 * file would otherwise read the recorder as React Native's own setter, or hold appearance again
 * with no cover left to release it. A reload starts a new JS context, and all of this with it.
 */
type Held = {
	/** The phone's light or dark at launch. */
	phone: "light" | "dark";
	/** React Native's own setter. */
	setOnWindow: (scheme: SchemeOverride) => void;
	held: boolean;
	/** The last write while held: what the app would have set by now. */
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

/**
 * The phone's light or dark at launch, read before anything can force one: the native splash
 * follows it, so the launch cover starts on the same colour.
 */
export const LAUNCH_PHONE_SCHEME = state.phone;

/**
 * Switches Uniwind to a theme variant, or "system" for Default following the phone. Call
 * `setThemeWithFonts` (`design/fonts.ts`): it waits for the theme's font pair. Only it and
 * `theme-bootstrap.ts` call this.
 */
export function applyTheme(name: ThemeName | "system"): void {
	if (ADAPTIVE.includes(name)) {
		// Uniwind's own "system" isn't in its ThemeName union.
		Uniwind.setTheme(name as ThemeName);
		return;
	}
	// A custom theme: Uniwind would set native to follow the phone, undoing the app's own light or
	// dark (`setNativeAppearance`, from NavThemeProvider, which doesn't run again when only the
	// variant changes: Default dark into the night theme). Its write is dropped.
	const current = Appearance.setColorScheme;
	Appearance.setColorScheme = () => undefined;
	try {
		Uniwind.setTheme(name as ThemeName);
	} finally {
		Appearance.setColorScheme = current;
	}
}

/** Native UI follows the app's light or dark, or the phone's setting. Applied when released. */
export function setNativeAppearance(scheme: NativeScheme): void {
	Appearance.setColorScheme(scheme === "system" ? "auto" : scheme);
}

/** The launch cover is leaving: native UI takes the last write now, and every later one at once. */
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
