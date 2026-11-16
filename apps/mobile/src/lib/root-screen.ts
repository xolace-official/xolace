import type { NativeStackNavigationOptions } from "expo-router";

/** What a root screen's options may depend on, read once by the `(protected)` layout. */
export type ScreenContext = {
	/** The theme's `--background`, for sheets that can't show glass. */
	readonly background: string;
	/** The theme's `--surface`: the redesign's sheets are drawn on it. */
	readonly surface: string;
	/** iOS 26 paints its own glass behind a transparent sheet. */
	readonly liquidGlass: boolean;
	readonly reducedMotion: boolean;
};

/**
 * One `Stack.Screen` in the `(protected)` stack. Each feature lists its own in
 * `src/features/<feature>/screens.ts`; `features/navigation/root-screens.ts`
 * spreads them, so two PRs never edit the same lines.
 */
export type RootScreen = {
	/** The route path under `src/app/(protected)/`, without the extension. */
	readonly name: string;
	readonly options?:
		| NativeStackNavigationOptions
		| ((context: ScreenContext) => NativeStackNavigationOptions);
};

export const screenOptions = (
	screen: RootScreen,
	context: ScreenContext
): NativeStackNavigationOptions | undefined =>
	typeof screen.options === "function"
		? screen.options(context)
		: screen.options;

export const NO_GESTURE = {
	gestureEnabled: false,
} as const satisfies NativeStackNavigationOptions;

/** Full screen from the bottom: players, celebrations, dismissable moments. */
export const PLAYER_OPTIONS = {
	animation: "slide_from_bottom",
	presentation: "fullScreenModal",
} as const satisfies NativeStackNavigationOptions;

/** A transparent, untitled native header that only carries the screen's Stack.Toolbar
 * buttons, so they get the system's glass. */
export const TOOLBAR_HEADER = {
	// Android would add its own up arrow beside the close.
	headerBackVisible: false,
	headerShadowVisible: false,
	headerShown: true,
	headerTransparent: true,
	title: "",
} as const satisfies NativeStackNavigationOptions;

/** Slides up from the bottom; with reduced motion it fades in instead. */
export const riseOrFade = ({
	reducedMotion,
}: ScreenContext): NativeStackNavigationOptions => ({
	animation: reducedMotion ? "fade" : "slide_from_bottom",
});

/** The old screens' sheets sized to their rows. iOS 26 paints its own glass behind a
 * transparent screen; iOS 18 and Android show transparent literally. New screens use
 * `fitSheet`. */
export const legacyFitSheet = ({
	background,
	liquidGlass,
}: ScreenContext): NativeStackNavigationOptions => ({
	contentStyle: liquidGlass ? undefined : { backgroundColor: background },
	presentation: "formSheet",
	sheetAllowedDetents: "fitToContents",
	sheetGrabberVisible: true,
});

/** The redesign's sheet corner. */
const SHEET_RADIUS = 40;

/**
 * The redesign's form sheet: sized to its content, a grabber, 40 pt corners, on
 * the theme's surface (opaque on iOS 26 too: the boards draw it that way). The
 * prototype's `fitSheet`; spread it to change one thing (`sheetAllowedDetents`).
 */
export const fitSheet = ({
	surface,
}: ScreenContext): NativeStackNavigationOptions => ({
	contentStyle: { backgroundColor: surface },
	presentation: "formSheet",
	sheetAllowedDetents: "fitToContents",
	sheetCornerRadius: SHEET_RADIUS,
	sheetGrabberVisible: true,
});
