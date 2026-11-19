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
	making: boolean;
	onFmt: (f: ShareFmt) => void;
	onSave: () => void;
	onShare: () => void;
	onClose: () => void;
};

/** Share: the preview card, Story / Square, Save image and Share…. A loop shares its still. */
export function ShareSheet(p: Props) {
	const m = useQuoteMotion();
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
						scale={1}
						text={p.text}
					/>
				</Animated.View>
				<View className="flex-1 gap-2.5">
					<Segments
						column
						ink={p.ink}
						items={FMTS}
						onChange={p.onFmt}
						value={p.fmt}
					/>
					<SheetNote ink={p.ink}>{QUOTE_COPY.shareStillNote}</SheetNote>
				</View>
			</View>
			<View className="flex-row gap-2.5">
				<SheetButton
					className="flex-1"
					disabled={p.making}
					ink={p.ink}
					kind="ghost"
					label={p.making ? QUOTE_COPY.making : QUOTE_COPY.saveImage}
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
