import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import type { InkPalette } from "../chrome/quote-ink";
import { QUOTE_COPY } from "../copy";
import { EASE, T, useQuoteMotion } from "../motion/quote-motion";
import type { ShareFmt } from "../motion/quote-ui";
import type { QuoteBackground } from "../quotes-model";
import { QuoteSheet } from "../sheets/quote-sheet";
import { Segments, SheetButton, SheetNote } from "../sheets/sheet-parts";
import { ShareCard } from "./share-card";
import { CARD_H, CARD_W } from "./share-fit";
import type { ShareKind } from "./share-kind";

const KINDS = [
	{ id: "video", label: QUOTE_COPY.video },
	{ id: "still", label: QUOTE_COPY.still },
] as const;
const FMTS = [
	{ id: "story", label: QUOTE_COPY.story },
	{ id: "square", label: QUOTE_COPY.square },
] as const;
const PREVIEW_DROP = 0.45;

type Props = {
	ink: InkPalette;
	drop: string;
	background: QuoteBackground;
	text: string;
	fmt: ShareFmt;
	/** The background is a loop and this build can make a video of it. */
	canVideo: boolean;
	kind: ShareKind;
	/** Loops may move (not in Low Power Mode or with Reduce Motion). */
	moving: boolean;
	making: boolean;
	onKind: (k: ShareKind) => void;
	onFmt: (f: ShareFmt) => void;
	onSave: () => void;
	onShare: () => void;
	onClose: () => void;
};

export function ShareSheet(p: Props) {
	const m = useQuoteMotion();
	const video = p.canVideo && p.kind === "video";
	const saveLabel = video ? QUOTE_COPY.saveVideo : QUOTE_COPY.saveImage;
	let note: string = QUOTE_COPY.shareStillNote;
	if (video) {
		note = p.making ? QUOTE_COPY.makingVideo : QUOTE_COPY.shareVideoNote;
	}
	const h = useSharedValue<number>(CARD_H[p.fmt]);
	useEffect(() => {
		h.set(
			withTiming(CARD_H[p.fmt], {
				duration: m.reduced ? 0 : T.shareHeight,
				easing: EASE.stage,
				...PLAY_AS_CHOSEN,
			})
		);
	}, [p.fmt, m.reduced, h]);
	const card = useAnimatedStyle(() => ({ height: h.get() }));

	return (
		<QuoteSheet
			closeLabel={QUOTE_COPY.accessibility.close}
			ink={p.ink}
			label={QUOTE_COPY.sheets.share}
			onClose={p.onClose}
			title={QUOTE_COPY.sheets.share}
		>
			<View className="flex-row items-center gap-4">
				<Animated.View
					accessibilityElementsHidden
					className="overflow-hidden rounded-[22px] border-continuous"
					importantForAccessibility="no-hide-descendants"
					style={[
						{
							shadowColor: p.drop,
							shadowOffset: { height: 10, width: 0 },
							shadowOpacity: PREVIEW_DROP,
							shadowRadius: 15,
							width: CARD_W,
						},
						card,
					]}
				>
					<ShareCard
						background={p.background}
						fill
						fmt={p.fmt}
						playing={video && p.moving}
						scale={1}
						text={p.text}
					/>
				</Animated.View>
				<View className="flex-1 gap-2.5">
					{p.canVideo && (
						<Segments
							ink={p.ink}
							items={KINDS}
							onChange={p.onKind}
							value={p.kind}
						/>
					)}
					<Segments
						column
						ink={p.ink}
						items={FMTS}
						onChange={p.onFmt}
						value={p.fmt}
					/>
					<SheetNote ink={p.ink}>{note}</SheetNote>
				</View>
			</View>
			<View className="flex-row gap-2.5">
				<SheetButton
					className="flex-1"
					disabled={p.making}
					ink={p.ink}
					kind="ghost"
					label={p.making ? QUOTE_COPY.making : saveLabel}
					onPress={p.onSave}
				>
					{p.making && (
						<ActivityIndicator color={p.ink.sheetText} size="small" />
					)}
				</SheetButton>
				<SheetButton
					className="flex-1"
					disabled={p.making}
					ink={p.ink}
					kind="primary"
					label={QUOTE_COPY.shareGo}
					onPress={p.onShare}
				/>
			</View>
		</QuoteSheet>
	);
}
