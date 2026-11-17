/**
 * Screens nothing may take the user away from or stack a moment on: crisis
 * help, a vent or session in progress, a peer conversation, and the full-screen
 * moments. The badge unlock waits for the user to leave them; a notification
 * tap that would go home leaves them alone.
 */
const HELD_ROUTES = [
	// Crisis help and a session's own screens.
	"/crisis-resources",
	"/trusted-bridge",
	"/voice-vent",
	"/talk",
	"/sit-with-this",
	// A sheet over Sit with this: the exercise is waiting behind it.
	"/sit-with-this-swap",
	"/peer-reflections",
	// A sheet over peer reflections: the session is still behind it.
	"/report-reflection",
	"/session-end",
	// A sheet over the session end: the moment is still behind it.
	"/session-follow-up",
	// A peer conversation: First Xolacer chat lands right after the first message.
	"/chat",
	"/xolace-channel",
	"/rate",
	// Full-screen moments. (A badge's arrival is an overlay, not a route: it holds itself.)
	"/follow-up",
	"/streak-held",
	"/browse-intro",
	"/lantern-welcome",
	"/upgrade",
	"/browse-player",
] as const;

/** Whether `pathname` (expo-router's, groups stripped) is one of those screens or under one. */
export const isHeldRoute = (pathname: string): boolean =>
	HELD_ROUTES.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`)
	);
