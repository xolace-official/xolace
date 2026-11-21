import type { RootScreen } from "@/lib/root-screen";

const MOVED = { animation: "none" } as const;

export const navigationScreens: readonly RootScreen[] = [
	{ name: "browse/[...rest]", options: MOVED },
	{ name: "browse/index", options: MOVED },
	{ name: "browse-player", options: MOVED },
	{ name: "discovery", options: MOVED },
	{ name: "follow-up", options: MOVED },
	{ name: "kindling-announcement", options: MOVED },
	{ name: "profile/index", options: MOVED },
	{ name: "profile/insights", options: MOVED },
	{ name: "streak-held", options: MOVED },
	{ name: "timeline/[...rest]", options: MOVED },
	{ name: "timeline/index", options: MOVED },
];
