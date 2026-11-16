import type { NativeStackNavigationOptions } from "expo-router";
import type { ComponentType } from "react";

/**
 * One state of a screen, drawn on fixtures, that a dev build opens by deep link:
 * `xolace://dev/<feature>/<id>`. A feature lists its states as `devStates` in its
 * own `dev/states.tsx`; `src/dev/` finds every such file, so nothing central is
 * edited. Release builds never see any of it.
 */
export type DevState = {
	/** The link's last segment: kebab-case, unique in its feature (`needs-plus`). */
	readonly id: string;
	/** The state in a few words, for the dev index and the header (`Telegram needs Xolace+`). */
	readonly title: string;
	/** The feature's screen inside its provider, fed fixtures instead of the data hook. */
	readonly Screen: ComponentType;
	/**
	 * The header, as the real route sets it: its `title`, or `headerShown: false`
	 * for a screen that draws its own (which then has no back button: swipe back on
	 * iOS, the system back on Android). Without it the header shows `title`. A state
	 * always opens pushed, so `presentation` can't be set.
	 */
	readonly options?: Omit<NativeStackNavigationOptions, "presentation">;
};
