/** A store release to download, or an OTA update fetched and waiting for the next cold start. */
export type UpdateMode = "new-version" | "ota-update";

/** The route's `mode` param; anything else is the OTA notice, which asks nothing of anyone. */
export const updateModeOf = (param: unknown): UpdateMode =>
	param === "new-version" ? "new-version" : "ota-update";

/** Whether the prompt may present now: once the gate settled and the launch cover left, so the
 * native sheet never lands over the cover or before the stack exists, and while no sheet or modal
 * is up (`presented`): a root sheet can't present over one, and would sit unseen under it. */
export const mayPresent = (now: {
	pending: UpdateMode | null;
	gateLoading: boolean;
	revealed: boolean;
	navigationReady: boolean;
	presented: boolean;
}): now is typeof now & { pending: UpdateMode } =>
	now.pending !== null &&
	!now.gateLoading &&
	now.revealed &&
	now.navigationReady &&
	!now.presented;
