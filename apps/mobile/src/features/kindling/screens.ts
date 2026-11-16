import { type RootScreen, riseOrFade } from "@/lib/root-screen";

export const kindlingScreens: readonly RootScreen[] = [
	{
		name: "kindling-announcement",
		options: (context) => ({ ...riseOrFade(context), gestureEnabled: false }),
	},
	{ name: "kindling/index" },
];
