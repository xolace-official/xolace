import { DETACHED_SHEET, type RootScreen } from "@/lib/root-screen";

export const comingBackScreens: readonly RootScreen[] = [
	{ name: "welcome-back", options: DETACHED_SHEET },
	{
		name: "check-in",
		options: ({ background }) => ({
			contentStyle: { backgroundColor: background },
			headerShown: false,
			presentation: "modal",
		}),
	},
];
