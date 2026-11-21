const HELD_ROUTES = [
	"/crisis-resources",
	"/trusted-bridge",
	"/voice-vent",
	"/talk",
	"/sit-with-this",
	"/sit-with-this-swap",
	"/peer-reflections",
	"/report-reflection",
	"/session-end",
	"/session-follow-up",
	"/chat",
	"/xolace-channel",
	"/rate",
	"/welcome-back",
	"/check-in",
	"/browse-intro",
	"/lantern-welcome",
	"/upgrade",
	"/player",
] as const;

export const isHeldRoute = (pathname: string): boolean =>
	HELD_ROUTES.some(
		(route) => pathname === route || pathname.startsWith(`${route}/`)
	);
