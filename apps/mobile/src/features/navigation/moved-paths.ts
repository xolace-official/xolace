/** A path that moved, and where it lives now. */
type Moved = {
	/** The route under `(protected)` it lives at now: a tab, or a root screen. */
	readonly to: string;
	/**
	 * Its subpaths moved with it (`/browse/topic/sleep` is `/explore/topic/sleep`).
	 * Needs a `<root>/[...rest].tsx` shim to catch them; without `subtree`, only the
	 * path itself moved and the paths under it stay where they are.
	 */
	readonly subtree?: true;
};

/**
 * Paths that moved, by their first segment. Shipped builds, notification
 * payloads and outside links still open the old ones, so each keeps a
 * `MovedRoute` shim under `(protected)` (and an entry in `screens.ts`) that
 * sends it here. A screen PR that moves a path adds one entry, its shim and its
 * screens entry; `moved-paths.test.ts` checks all three.
 */
const MOVED: Readonly<Record<string, Moved>> = {
	browse: { subtree: true, to: "/explore" },
	discovery: { to: "/today" },
	profile: { to: "/you" },
};

/** Where a moved path lives now, or null if it didn't move. */
export function movedPath(pathname: string): string | null {
	const [, root = "", ...rest] = pathname.split("/");
	const moved = Object.hasOwn(MOVED, root) ? MOVED[root] : undefined;
	if (!moved || (rest.length > 0 && !moved.subtree)) {
		return null;
	}
	return [moved.to, ...rest].join("/");
}

/** Each moved root and whether its subpaths moved too, for the route checks. */
export const movedRoots = (): { root: string; subtree: boolean }[] =>
	Object.entries(MOVED).map(([root, moved]) => ({
		root,
		subtree: moved.subtree === true,
	}));
