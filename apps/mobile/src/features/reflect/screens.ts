import type { RootScreen } from "@/lib/root-screen";

export const reflectScreens: readonly RootScreen[] = [
	{
		name: "reflect",
		options: ({ reducedMotion }) => ({
			animation: reducedMotion ? "fade" : "default",
		}),
	},
];
