import type { NativeStackNavigationOptions } from "expo-router";

export type ScreenContext = {
	readonly background: string;
	readonly surface: string;
	readonly liquidGlass: boolean;
	readonly reducedMotion: boolean;
};

export type RootScreen = {
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

export const PLAYER_OPTIONS = {
	animation: "slide_from_bottom",
	presentation: "fullScreenModal",
} as const satisfies NativeStackNavigationOptions;

const SHEET_RADIUS = 40;

export const fitSheet = ({
	surface,
}: ScreenContext): NativeStackNavigationOptions => ({
	contentStyle: { backgroundColor: surface },
	presentation: "formSheet",
	sheetAllowedDetents: "fitToContents",
	sheetCornerRadius: SHEET_RADIUS,
	sheetGrabberVisible: true,
});

export const DETACHED_SHEET = {
	animation: "none",
	contentStyle: { backgroundColor: "transparent" },
	presentation: "transparentModal",
} as const satisfies NativeStackNavigationOptions;
