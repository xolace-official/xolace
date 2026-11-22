type Moved = {
	readonly to: string;
	readonly subtree?: true;
	readonly paths?: Readonly<Record<string, string>>;
};

const MOVED: Readonly<Record<string, Moved>> = {
	browse: { subtree: true, to: "/explore" },
	"browse-player": { to: "/player" },
	discovery: { to: "/today" },
	"follow-up": { to: "/check-in" },
	"kindling-announcement": { to: "/session-end" },
	profile: { paths: { insights: "/you/steadiness" }, to: "/you" },
	"streak-held": { to: "/today" },
	timeline: { subtree: true, to: "/moments" },
};

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
