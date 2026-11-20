export type UpdateMode = "new-version" | "ota-update";

export const updateModeOf = (param: unknown): UpdateMode =>
	param === "new-version" ? "new-version" : "ota-update";

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
