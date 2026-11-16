import { isHeldRoute } from "@/lib/held-routes";

export const HOME = "/";

type Where = {
	/** expo-router's pathname (groups stripped). */
	pathname: string;
	/** Home has a session or reflection in progress, a sheet on screen, the streak reveal or the first-run tour. */
	homeBusy: boolean;
};

/** The badge unlock moment (#693) waits its turn on a held screen (`held-routes.ts`) and
 * on a busy home; it opens once the user is somewhere else. */
export function mayOpenUnlock({ homeBusy, pathname }: Where): boolean {
	if (pathname === HOME) {
		return !homeBusy;
	}
	return !isHeldRoute(pathname);
}
