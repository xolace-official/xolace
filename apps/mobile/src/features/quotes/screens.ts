import type { RootScreen } from "@/lib/root-screen";

export const quotesScreens: readonly RootScreen[] = [
	{ name: "quotes/index" },
	// Words you kept lives on the quote screen now; old links land there.
	{ name: "quotes/archive" },
];
