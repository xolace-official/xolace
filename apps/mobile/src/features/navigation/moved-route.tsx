import { type Href, useLocalSearchParams, usePathname } from "expo-router";
import { movedPath } from "@/features/navigation/tabs";
import { ReturnTo } from "@/lib/return-to";

/**
 * The route at a path that moved (`movedPath`): sends whoever opens it to the
 * new path, its query kept, back into the tabs rather than stacking a second
 * copy of them. Renders nothing; its stack entry has no animation.
 */
export function MovedRoute() {
	const pathname = usePathname();
	// `rest` is the catch-all segment of `browse/[...rest]`, already in the path.
	const { rest: _rest, ...params } = useLocalSearchParams();
	const to = movedPath(pathname);
	// Built from the path at run time; `tabs.test.ts` checks every target is a tab.
	return to ? <ReturnTo href={{ params, pathname: to } as Href} /> : null;
}
