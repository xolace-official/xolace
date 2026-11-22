import type { PlusStatus } from "@/features/purchases/plus-status";

export type KindlingEmptyMode = "plus" | "free" | "setting-up";
export type KindlingCardMode = "live" | KindlingEmptyMode;

export function kindlingEmptyMode(s: {
	plus: PlusStatus;
	settingUp: object | null | undefined;
}): KindlingEmptyMode | undefined {
	if (s.plus === "loading") {
		return;
	}
	if (s.plus === "free") {
		return "free";
	}
	if (s.settingUp === undefined) {
		return;
	}
	return s.settingUp === null ? "plus" : "setting-up";
}

export function kindlingCardMode(
	kindling: object | null | undefined,
	empty: KindlingEmptyMode | undefined
): KindlingCardMode | undefined {
	if (kindling) {
		return "live";
	}
	return kindling === null ? empty : undefined;
}

export function heldEmptyMode(
	last: KindlingEmptyMode | undefined,
	next: KindlingEmptyMode | undefined
): KindlingEmptyMode | undefined {
	return next ?? last;
}
