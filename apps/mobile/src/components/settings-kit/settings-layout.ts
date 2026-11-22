export const S = {
	cardRadius: 22,
	gutter: 16,
	label: 16,
	labelLine: 22,
	lineFrom: 16,
	lineFromTile: 58,
	pressFadeMs: 150,
	rowMin: 52,
	rowPadH: 16,
	rowPadV: 12,
	section: 30,
	titleInset: 32,
} as const;

export const ROW = "min-h-13 flex-row items-center gap-3 px-4 py-2.75";
export const ROW_TALL = "min-h-13 flex-row items-center gap-3 px-4 py-3";
export const LABEL = "text-[16px] leading-[22px]";

export const accentTile = (dark: boolean) =>
	dark ? "bg-accent/22" : "bg-accent/14";

export type Tile = "accent" | "danger" | "neutral";

export function tileBg(tile: Tile, dark: boolean) {
	if (tile === "neutral") {
		return "bg-surface-secondary";
	}
	if (tile === "danger") {
		return "bg-danger/13";
	}
	return accentTile(dark);
}

export const CHEVRON_GLYPH = 10;

export const rowLabel = (...parts: (string | undefined)[]) =>
	parts.filter(Boolean).join(", ");

export const visibleLength = (text: string) => [...text].length;
