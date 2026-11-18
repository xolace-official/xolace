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
	/**
	 * Single subpaths that moved somewhere of their own (`/profile/insights` is
	 * `/you/steadiness`), each with its own `<root>/<sub>.tsx` shim.
	 */
	readonly paths?: Readonly<Record<string, string>>;
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
	// Its beat folded into the session end's next step (S3).
	"kindling-announcement": { to: "/session-end" },
	profile: { paths: { insights: "/you/steadiness" }, to: "/you" },
};

/** Where a moved path lives now, or null if it didn't move. */
export function movedPath(pathname: string): string | null {
	const [, root = "", ...rest] = pathname.split("/");
	const moved = Object.hasOwn(MOVED, root) ? MOVED[root] : undefined;
	if (!moved) {
		return null;
	}
	const own = rest.length === 1 ? moved.paths?.[rest[0]] : undefined;
	if (own) {
		return own;
	}
	if (rest.length > 0 && !moved.subtree) {
		return null;
	}
	return [moved.to, ...rest].join("/");
}

/** Each moved root, whether its subpaths moved too and its single moved subpaths, for the
 * route checks. */
export const movedRoots = (): {
	root: string;
	subtree: boolean;
	paths: string[];
}[] =>
	Object.entries(MOVED).map(([root, moved]) => ({
		paths: Object.keys(moved.paths ?? {}),
		root,
		subtree: moved.subtree === true,
	}));
