/**
 * Native appearance (alerts, sheets, keyboards, the window itself) and the launch cover.
 *
 * The native splash is drawn in the app's window and follows the phone's light or dark. Forcing
 * the window to the app's mode (`Appearance.setColorScheme`: `NavThemeProvider`, and
 * `Uniwind.setTheme` for Default's `light` and `dark`) would redraw the splash in the other
 * scheme before the cover is over it. Undoing it straight after isn't enough: each call is its
 * own trip to the main thread, and a frame can land in between, a one-frame flash of the other
 * scheme. So until the cover starts leaving (`releaseNativeAppearance()`), every call is held
 * back and only the last one is kept, then applied. The app's own colours come from Uniwind and
 * are right from the first frame. `theme-bootstrap.ts` imports this file before its first
 * `Uniwind.setTheme`.
 */
import { Appearance } from "react-native";

type SchemeOverride = Parameters<typeof Appearance.setColorScheme>[0];

/**
 * The phone's light or dark at launch, read before anything can force one: the native splash
 * follows it, so the launch cover starts on the same colour.
 */
export const LAUNCH_PHONE_SCHEME: "light" | "dark" =
	Appearance.getColorScheme() === "dark" ? "dark" : "light";

/** React Native's own setter, wrapped below. */
const setOnWindow = Appearance.setColorScheme;

let held = true;
/** The last call while held: what the app would have set by now. */
let wish: SchemeOverride | null = null;

// Every caller, Uniwind included, reaches native appearance through this export.
Appearance.setColorScheme = (scheme: SchemeOverride) => {
	if (held) {
		wish = scheme;
		return;
	}
	setOnWindow(scheme);
};

/** The launch cover is leaving: native UI takes the app's light or dark now. Once. */
export function releaseNativeAppearance(): void {
	if (!held) {
		return;
	}
	held = false;
	if (wish !== null) {
		setOnWindow(wish);
	}
}
