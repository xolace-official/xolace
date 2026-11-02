import type { api } from "@xolace/backend/api";
import type { FunctionReturnType } from "convex/server";

export type AwarenessEvent = FunctionReturnType<
	typeof api.admin.monthlyEvents.list
>[number];

/**
 * The image box in the app's event sheet: full width, 180pt tall, cropped to
 * fill. Uploads are resized to this before they go to storage.
 */
export const EVENT_IMAGE = { height: 360, width: 686 } as const;

/** How far an upload's shape may drift from 686:360 before it's turned away. */
const RATIO_TOLERANCE = 0.02;

export function imageShapeProblem(width: number, height: number) {
	if (width < EVENT_IMAGE.width || height < EVENT_IMAGE.height) {
		return `It's ${width} × ${height} px; it needs at least ${EVENT_IMAGE.width} × ${EVENT_IMAGE.height} px.`;
	}
	const target = EVENT_IMAGE.width / EVENT_IMAGE.height;
	if (Math.abs(width / height / target - 1) > RATIO_TOLERANCE) {
		return `It's ${width} × ${height} px, which isn't the 686 × 360 shape (about 1.9 : 1). Crop it first.`;
	}
	return null;
}

/**
 * Where the app's button can go. Keep in step with `CTA_ROUTE_ALLOWLIST` in
 * the mobile event sheet and `CTA_ROUTES` in `convex/admin/monthlyEvents.ts`.
 */
export const CTA_ROUTES = {
	"/(protected)/crisis-resources": "Crisis resources",
} as const;

export type EventStatus = "scheduled" | "live" | "ended";

/** Today as the app compares it: the local `YYYY-MM-DD`. */
export function localToday() {
	return new Date().toLocaleDateString("en-CA");
}

export function eventStatus(
	event: Pick<AwarenessEvent, "endDate" | "startDate">,
	today: string
): EventStatus {
	if (today < event.startDate) {
		return "scheduled";
	}
	return today > event.endDate ? "ended" : "live";
}

const DAY = new Intl.DateTimeFormat("en-GB", {
	day: "numeric",
	month: "short",
	timeZone: "UTC",
	year: "numeric",
});

/** `2026-06-01` → `1 Jun 2026`. */
export function formatDay(isoDate: string) {
	return DAY.format(new Date(`${isoDate}T00:00:00Z`));
}
