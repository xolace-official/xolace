import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { Presets } from "react-native-pulsar";
import { AppText } from "@/components/shared/app-text";
import type { PlusStatus } from "@/features/purchases/plus-status";
import { QuoteIcon } from "../chrome/quote-icons";
import { type InkPalette, useQuoteInk } from "../chrome/quote-ink";
import { QUOTE_COPY } from "../copy";
import type { QuoteBackground } from "../quotes-model";
import { QuoteSheet } from "../sheets/quote-sheet";
import { Segments, SheetNote } from "../sheets/sheet-parts";
import { POSTER_SEMI } from "../stage/quote-type";
import { BackgroundTile, TILE } from "./background-tile";
import { inWindow, tilePlays, tileWindow } from "./tile-window";

const ROW_INSET = 20;
const SHEET_EDGE = 8;
const SCROLL_THROTTLE = 64;
const CATS = [
	{ id: "still", label: QUOTE_COPY.still },
	{ id: "loop", label: QUOTE_COPY.loop },
] as const;

const rowFor = (viewport: number) => ({
	gap: TILE.gap,
	inset: ROW_INSET,
	tile: TILE.w,
	viewport,
});

type Props = {
	ink: InkPalette;
	backgrounds: readonly QuoteBackground[];
	current: string;
	cat: "still" | "loop";
	moving: boolean;
	lowPower: boolean;
	plus: PlusStatus;
	onCat: (c: "still" | "loop") => void;
	onPick: (b: QuoteBackground) => void;
	onClose: () => void;
};

export function BackgroundSheet(p: Props) {
	const { width } = useWindowDimensions();
	const tiles = p.backgrounds.filter((b) => b.kind === p.cat);
	const count = tiles.length;
	const viewport = width - SHEET_EDGE * 2;
	// The latest offset lives in a ref; the window is state, set to the same string while the
	// same tiles stay in view, so scrolling renders only when the window changes. New tiles or a
	// new width recompute it from where the row really is.
	const offset = useRef(0);
	const [inView, setInView] = useState(() =>
		tileWindow(0, count, rowFor(viewport))
	);
	useEffect(() => {
		setInView(tileWindow(offset.current, count, rowFor(viewport)));
	}, [count, viewport]);
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
					offset.current = 0;
					setInView(
						tileWindow(
							0,
							p.backgrounds.filter((b) => b.kind === c).length,
							rowFor(viewport)
						)
					);
					p.onCat(c);
				}}
				value={p.cat}
			/>
			<ScrollView
				className="-mx-5"
				contentContainerClassName="gap-2.5 px-5 pt-1 pb-0.5"
				horizontal
				key={p.cat}
				onScroll={(e) => {
					offset.current = e.nativeEvent.contentOffset.x;
					setInView(tileWindow(offset.current, count, rowFor(viewport)));
				}}
				scrollEventThrottle={SCROLL_THROTTLE}
				showsHorizontalScrollIndicator={false}
			>
				{tiles.map((b, i) => (
					<BackgroundTile
						background={b}
						ink={p.ink}
						key={b.key}
						locked={b.plus && p.plus === "free"}
						on={b.key === p.current}
						onPress={() => {
							Presets.System.selection();
							p.onPick(b);
						}}
						play={tilePlays({
							chosen: b.key === p.current,
							inView: inWindow(inView, i),
							moving: p.moving,
						})}
					/>
				))}
			</ScrollView>
			{note && <SheetNote ink={p.ink}>{note}</SheetNote>}
		</QuoteSheet>
	);
}
