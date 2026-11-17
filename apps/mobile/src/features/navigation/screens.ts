import type { RootScreen } from "@/lib/root-screen";

/** Nothing to see while a moved path sends you on (`MovedRoute`). */
const MOVED = { animation: "none" } as const;

/** The shims at paths that moved (`MOVED` in `moved-paths.ts`). */
export const navigationScreens: readonly RootScreen[] = [
	{ name: "browse/[...rest]", options: MOVED },
	{ name: "browse/index", options: MOVED },
	{ name: "discovery", options: MOVED },
	{ name: "kindling-announcement", options: MOVED },
	{ name: "profile/index", options: MOVED },
];
