/** Bump when the tour is re-cut. A device stores the version it last finished; anything lower
 * sees the current tour once. Here, not in `reflect-tour`, so the badges' arrival can hold
 * back while the tour runs without importing that feature. */
export const REFLECT_TOUR_VERSION = 1;

/** Whether the tour should run for a device that last finished `version`. */
export const shouldShowReflectTour = (version: number) =>
	version < REFLECT_TOUR_VERSION;
