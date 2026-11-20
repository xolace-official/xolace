export const DAYS_IN_WEEK = 7;

export const LEVEL_OPACITY = [1, 0.28, 0.5, 0.74, 1] as const;

export function isToken(value: string | undefined): value is string {
	return typeof value === "string" && value.startsWith("--");
}

export const DEFAULT_AXIS_WIDTH = 26;

export const TOOLTIP_HEIGHT = 26;

export const DEFAULT_HOLD = 180;

export const WEEKDAYS = [
	"Sunday",
	"Monday",
	"Tuesday",
	"Wednesday",
	"Thursday",
	"Friday",
	"Saturday",
] as const;

export const MONTHS = [
	"Jan",
	"Feb",
	"Mar",
	"Apr",
	"May",
	"Jun",
	"Jul",
	"Aug",
	"Sep",
	"Oct",
	"Nov",
	"Dec",
] as const;
