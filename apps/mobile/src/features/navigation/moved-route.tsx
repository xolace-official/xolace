import { type Href, useLocalSearchParams, usePathname } from "expo-router";
import { movedPath } from "@/features/navigation/moved-paths";
import { ReturnTo } from "@/lib/return-to";

/**
 * The route at a path that moved (`movedPath`): sends whoever opens it to where
 * it lives now, its query kept. Back to that route if it is already in the
 * stack (the tabs, say) instead of stacking a second copy; in this route's place
 * if it isn't. Renders nothing; its stack entry has no animation.
 */
export function MovedRoute() {
	const pathname = usePathname();
	// `rest` is the catch-all segment of `browse/[...rest]`, already in the path.
	const { rest: _rest, ...params } = useLocalSearchParams();
	const to = movedPath(pathname);
	// Built from the path at run time; `moved-paths.test.ts` checks every target is a route.
	return to ? <ReturnTo href={{ params, pathname: to } as Href} /> : null;
}
