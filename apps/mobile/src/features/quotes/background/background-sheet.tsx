import { useState } from "react";
import { Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { Presets } from "react-native-pulsar";
import { AppText } from "@/components/shared/app-text";
import { QuoteIcon } from "../chrome/quote-icons";
import { type InkPalette, useQuoteInk } from "../chrome/quote-ink";
import { QUOTE_COPY } from "../copy";
import type { QuoteBackground } from "../quotes-model";
import { QuoteSheet } from "../sheets/quote-sheet";
import { Segments, SheetNote } from "../sheets/sheet-parts";
import { POSTER_SEMI } from "../stage/quote-type";
import { BackgroundTile, TILE } from "./background-tile";

/** The row's inset: the sheet's 20 pt padding. */
const ROW_INSET = 20;
/** The sheet sits 8 pt in from each side. */
const SHEET_EDGE = 8;
/** Scroll events while dragging: often enough to start a tile as it comes on screen. */
const SCROLL_THROTTLE = 64;
const CATS = [
	{ id: "still", label: QUOTE_COPY.still },
	{ id: "loop", label: QUOTE_COPY.loop },
] as const;

type Props = {
	ink: InkPalette;
	backgrounds: readonly QuoteBackground[];
	current: string;
	cat: "still" | "loop";
	/** Loops may move (no Reduce Motion, no Low Power Mode). */
	moving: boolean;
	lowPower: boolean;
	isPlus: boolean;
	onCat: (c: "still" | "loop") => void;
	onPick: (b: QuoteBackground) => void;
	onClose: () => void;
};

/** Background: Still | Loop and a row of tiles; a tap applies it at once. No Apply button. */
export function BackgroundSheet(p: Props) {
	const { width } = useWindowDimensions();
	const [scrollX, setScrollX] = useState(0);
	const tiles = p.backgrounds.filter((b) => b.kind === p.cat);
	const viewport = width - SHEET_EDGE * 2;
	// A tile plays only while some of it is on screen.
	const onScreen = (i: number) => {
		const left = ROW_INSET + i * (TILE.w + TILE.gap) - scrollX;
		return left + TILE.w > 0 && left < viewport;
	};
	let note: string | null = null;
	if (p.cat === "loop") {
		note = p.lowPower ? QUOTE_COPY.lowPowerNote : QUOTE_COPY.loopNote;
	}
	return (
		<QuoteSheet
			closeIcon="check"
			closeLabel={QUOTE_COPY.accessibility.done}
			ink={p.ink}
			label={QUOTE_COPY.sheets.background}
			onClose={p.onClose}
			title={QUOTE_COPY.sheets.background}
		>
			<Segments
				ink={p.ink}
				items={CATS}
				onChange={(c) => {
					setScrollX(0);
					p.onCat(c);
				}}
				value={p.cat}
			/>
			<ScrollView
				className="-mx-5"
				contentContainerClassName="gap-2.5 px-5 pt-1 pb-0.5"
				horizontal
				key={p.cat}
				onScroll={(e) => setScrollX(e.nativeEvent.contentOffset.x)}
				scrollEventThrottle={SCROLL_THROTTLE}
				showsHorizontalScrollIndicator={false}
			>
				{tiles.map((b, i) => (
					<BackgroundTile
						background={b}
						ink={p.ink}
						key={b.key}
						locked={b.plus && !p.isPlus}
						on={b.key === p.current}
						onPress={() => {
							Presets.System.selection();
							p.onPick(b);
						}}
						play={p.moving && onScreen(i)}
					/>
				))}
			</ScrollView>
			{note && <SheetNote ink={p.ink}>{note}</SheetNote>}
		</QuoteSheet>
	);
}
