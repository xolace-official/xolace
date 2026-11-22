import { lanternSystemPath } from "@/lib/lantern-share-links";

/**
 * Rewrites a deep link before the router sees it. Lantern shares link to
 * `https://www.xolaceinc.com/lantern/<slug>`; the reader lives at
 * `library/<slug>`. Every other link passes through untouched.
 */
export function redirectSystemPath({
	path,
}: {
	initial: boolean;
	path: string;
}) {
	try {
		return lanternSystemPath(path);
	} catch {
		return path;
	}
}
