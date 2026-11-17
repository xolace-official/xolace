import {
	type LayoutChangeEvent,
	Pressable,
	useWindowDimensions,
	View,
} from "react-native";
import Animated from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { Image } from "@/components/shared/styled";
import { fadeUp } from "@/design/entering";
import { COPY } from "@/features/lantern/copy";
import { PhotoCard } from "@/features/lantern/home/photo-card";
import { capitalise, readTimeLine } from "@/features/lantern/lantern-model";
import { LT } from "@/features/lantern/lantern-style";
import { useReaderScreen } from "@/features/lantern/reader/reader-data";
import { attributionLines } from "@/features/lantern/reader/reader-model";
import { cn } from "@/lib/cn";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColors } from "@/lib/use-token-color";

const CAMPFIRE = require("@/assets/images/flux/flux-campfire.png");
const PAIR = require("@/assets/images/flux/flux-pair-listening.png");
const ICON = {
	books: { android: "menu_book", ios: "books.vertical" },
	chevron: { android: "chevron_right", ios: "chevron.right" },
	heart: { android: "favorite_border", ios: "heart" },
	heartOn: { android: "favorite", ios: "heart.fill" },
} as const;
/** The sheet's side padding, either side. */
const SHEET_PAD = 48;
const NEXT_RATIO = 0.75;

/**
 * Attribution straight after the body (#469): an adapted read's View sources, then the licence
 * lines. `onLayout` marks the end of the article.
 */
export function Credits({
	onLayout,
}: {
	onLayout: (e: LayoutChangeEvent) => void;
}) {
	const { state, actions } = useReaderScreen();
	const { reuse, sources } = state.entry;
	const [muted] = useTokenColors(["muted"]);
	return (
		<View className="mt-8 border-separator border-t pt-1.5" onLayout={onLayout}>
			{reuse === "adapted" ? (
				<Pressable
					accessibilityHint={COPY.reader.sources.viewHint(sources.length)}
					accessibilityLabel={COPY.reader.sources.view}
					accessibilityRole="button"
					className="h-12 flex-row items-center gap-3 active:opacity-70"
					onPress={actions.openSources}
				>
					<Icon color={muted} name={ICON.books} size={17} />
					<AppText
						className="flex-1 text-[14px] leading-[18px]"
						variant="callout"
						weight="semibold"
					>
						{COPY.reader.sources.view}
					</AppText>
					<Icon color={muted} name={ICON.chevron} size={13} weight="semibold" />
				</Pressable>
			) : null}
			<AppText
				className="pt-2.5 text-[12px] leading-[18px]"
				color="muted"
				variant="caption"
			>
				{attributionLines(sources).join("\n")}
			</AppText>
		</View>
	);
}

/**
 * The end of a read (production's `EndOfRead`): Finished once the dwell has run (never a button),
 * This helped, the helped count once 15 say so, then Up next.
 */
export function EndOfRead() {
	const { state, actions } = useReaderScreen();
	const { width } = useWindowDimensions();
	const reduced = useEffectiveReducedMotion();
	const [ink, onAccent] = useTokenColors(["foreground", "accent-foreground"]);
	const s = state.signals;
	if (!s) {
		return null;
	}
	const cardW = width - SHEET_PAD;
	return (
		<View className="mt-12 gap-5">
			<View className="flex-row items-center gap-3 border-separator border-t pt-5">
				<Image
					contentFit="contain"
					source={CAMPFIRE}
					style={{ height: 46, width: 30 }}
				/>
				<View className="flex-1">
					{s.finished ? (
						<Animated.View
							entering={fadeUp(0, LT.riseMs, LT.rise, reduced, LT.press)}
						>
							<AppText
								className="text-[15px] leading-[20px]"
								variant="callout"
								weight="semibold"
							>
								{COPY.reader.finished}
							</AppText>
							<AppText
								className="text-[12px] leading-[16px]"
								color="muted"
								variant="caption"
							>
								{COPY.reader.markedRead}
							</AppText>
						</Animated.View>
					) : null}
				</View>
				<PressScale
					accessibilityHint={s.helped ? COPY.reader.helpedHint : undefined}
					accessibilityLabel={COPY.reader.helped}
					accessibilityState={{ selected: s.helped }}
					className={cn(
						"h-[38px] flex-row items-center gap-1.5 rounded-full px-4",
						s.helped ? "bg-accent" : "bg-surface-secondary"
					)}
					onPress={actions.toggleHelped}
				>
					<Icon
						color={s.helped ? onAccent : ink}
						name={s.helped ? ICON.heartOn : ICON.heart}
						size={14}
						weight="semibold"
					/>
					<AppText
						className="text-[14px] leading-[18px]"
						color={s.helped ? "accentForeground" : "foreground"}
						variant="callout"
						weight="semibold"
					>
						{COPY.reader.helped}
					</AppText>
				</PressScale>
			</View>
			{s.helpedCount === null ? null : <HelpedCount n={s.helpedCount} />}
			{state.next ? (
				<PhotoCard
					entry={state.next}
					from="next"
					height={Math.round(cardW * NEXT_RATIO)}
					hub={state.hub}
					kicker={COPY.reader.upNext(capitalise(state.next.kind))}
					meta={readTimeLine(state.next.readMin, 0, state.next.listenMin)}
					onShare={actions.share}
					width={cardW}
				/>
			) : null}
		</View>
	);
}

function HelpedCount({ n }: { n: number }) {
	const [line] = useTokenColors(["separator"]);
	return (
		<View
			className="flex-row items-center gap-4 rounded-tile bg-surface p-4"
			style={{ boxShadow: `0px 0px 0px 1px ${line}` }}
		>
			<Image
				contentFit="contain"
				source={PAIR}
				style={{ height: 64, width: 64 }}
			/>
			<View className="flex-1 gap-0.5">
				<AppText
					className="text-[15px] leading-[20px]"
					variant="callout"
					weight="semibold"
				>
					{COPY.reader.helpedCount(n)}
				</AppText>
				<AppText
					className="text-[14px] leading-[19px]"
					color="muted"
					variant="callout"
				>
					{COPY.reader.notAlone}
				</AppText>
			</View>
		</View>
	);
}
