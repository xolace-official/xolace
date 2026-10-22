import type { SFSymbol } from "expo-symbols";

export type StarterRowId =
	| "reflect"
	| "vent"
	| "lantern"
	| "listen"
	| "xolacer";

export type StarterRow = {
	id: StarterRowId;
	title: string;
	subtitle: string;
	icon: { ios: SFSymbol; android: string };
};

/** Default order (CONTEXT.md "Starter suggestions"). Intake reorders it via orderStarterRows (ADR-0017). */
export const STARTER_ROWS: StarterRow[] = [
	{
		icon: { android: "edit", ios: "square.and.pencil" },
		id: "reflect",
		subtitle: "Get clarity on what's on your mind",
		title: "Reflect",
	},
	{
		icon: { android: "mic", ios: "mic" },
		id: "vent",
		subtitle: "Say it out loud",
		title: "Vent",
	},
	{
		icon: { android: "menu_book", ios: "book" },
		id: "lantern",
		subtitle: "Read something that fits",
		title: "Lantern",
	},
	{
		icon: { android: "headphones", ios: "headphones" },
		id: "listen",
		subtitle: "Music and support audio",
		title: "Listen",
	},
	{
		icon: { android: "forum", ios: "bubble.left.and.bubble.right" },
		id: "xolacer",
		subtitle: "Talk with someone who's been there",
		title: "Xolacer chat",
	},
];
