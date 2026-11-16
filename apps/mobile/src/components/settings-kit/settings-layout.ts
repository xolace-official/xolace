/**
 * The settings kit's measures (Settings v2 handoff §2), shared by every
 * settings-like screen: grouped cards with inset hairlines, accent section
 * titles, footnotes and the row press tint.
 */
export const S = {
	cardRadius: 22,
	gutter: 16,
	label: 16,
	labelLine: 22,
	/** The hairline starts here in a card; 58 when the row has a 30 pt tile. */
	lineFrom: 16,
	lineFromTile: 58,
	/** The press tint fades back over this long (no scale). */
	pressFadeMs: 150,
	rowMin: 52,
	rowPadH: 16,
	rowPadV: 12,
	/** Space between sections on the section screens (board `.sec` 30 / 28). */
	section: 30,
	titleInset: 32,
} as const;

/** A card row: 52 min, 11 / 16 padding, 12 gap (S.rowMin, S.rowPadV - 1, S.rowPadH). */
export const ROW = "min-h-13 flex-row items-center gap-3 px-4 py-2.75";
/** A card row's label at 16 / 22 (S.label, S.labelLine). */
export const LABEL = "text-[16px] leading-[22px]";

/** The soft accent tile behind a row's icon: stronger in dark. */
export const accentTile = (dark: boolean) =>
	dark ? "bg-accent/22" : "bg-accent/14";

export type Tile = "accent" | "danger" | "neutral";

/** A row tile's fill: danger tints red, the provider tile is neutral. */
export function tileBg(tile: Tile, dark: boolean) {
	if (tile === "neutral") {
		return "bg-surface-secondary";
	}
	if (tile === "danger") {
		return "bg-danger/13";
	}
	return accentTile(dark);
}

/** The board's 14 pt chevron box draws a 7 pt glyph; SF Symbols fill their box. */
export const CHEVRON_GLYPH = 10;

/** A row's accessibility label: its words in reading order. */
export const rowLabel = (...parts: (string | undefined)[]) =>
	parts.filter(Boolean).join(", ");

/** A name's length as the person sees it (an emoji is one). */
export const visibleLength = (text: string) => [...text].length;
