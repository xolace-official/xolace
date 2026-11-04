/**
 * Where the badge unlock moment (#693) must wait its turn: crisis help, a
 * vent or session in progress, and the other full-screen moments it would
 * stack on. It opens once the user is somewhere else.
 */
const HOLD_ROUTES = [
	// Crisis help and a session's own screens.
	"/crisis-resources",
	"/trusted-bridge",
	"/voice-vent",
	"/talk",
	"/sit-with-this",
	"/peer-reflections",
	"/session-end",
	// Full-screen moments, this one included.
	"/badge-unlock",
	"/badge-backfill",
	"/follow-up",
	"/streak-held",
	"/kindling-announcement",
	"/browse-intro",
	"/upgrade",
	"/browse-player",
] as const;

export const HOME = "/";

type Where = {
	/** expo-router's pathname (groups stripped). */
	pathname: string;
	/** Home has a session or reflection in progress, a sheet on screen, the streak reveal or the first-run tour. */
	homeBusy: boolean;
};

export function mayOpenUnlock({ homeBusy, pathname }: Where): boolean {
	if (pathname === HOME) {
		return !homeBusy;
	}
	return !HOLD_ROUTES.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`)
	);
}
