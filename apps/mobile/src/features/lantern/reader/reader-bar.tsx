import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedReaction,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { AppText } from "@/components/shared/app-text";
import { CoverImage } from "@/components/shared/cover-image";
import { LinearGradient } from "@/components/shared/styled";
import { COPY } from "@/features/lantern/copy";
import { COVER_SCRIM } from "@/features/lantern/cover-palette";
import { CoverButton } from "@/features/lantern/reader/cover-button";
import type { Fold, FoldStyles } from "@/features/lantern/reader/cover-fold";
import { useReaderScreen } from "@/features/lantern/reader/reader-data";
import { minutesLeft } from "@/features/lantern/reader/reader-model";

/** Capped so the bar stays one row; the full text is in the labels (#400). */
const BAR_MAX_SCALE = 1.5;
const LEFT_FROM = -10;
const ICON = {
	aa: { android: "text_fields", ios: "textformat.size" },
	back: { android: "arrow_back", ios: "chevron.left" },
	save: { android: "bookmark_border", ios: "bookmark" },
	saved: { android: "bookmark", ios: "bookmark.fill" },
	share: { android: "share", ios: "square.and.arrow.up" },
} as const;

// A share link opens the reader with nothing under it.
const goBack = () =>
	router.canGoBack() ? router.back() : router.replace("/(protected)");

/** The cover under its scrim. The reader draws it twice: behind the scroller and in the bar. */
export function CoverPhoto({
	f,
	style,
}: {
	f: Fold;
	style: FoldStyles["photo"];
}) {
	const { entry } = useReaderScreen().state;
	return (
		<Animated.View
			className="bg-cover-scrim"
			style={[{ height: f.coverH, width: f.width }, style]}
		>
			<CoverImage
				style={StyleSheet.absoluteFill}
				thumbhash={entry.coverThumbhash}
				transition={200}
				uri={entry.coverUrl}
			/>
			<LinearGradient
				className="absolute inset-0"
				colors={COVER_SCRIM.colors}
				locations={COVER_SCRIM.locations}
			/>
		</Animated.View>
	);
}

/** The bar window: the same photo at the same offset, clipped to the bar, with its shade and
 * the read line. */
export function BarWindow({ f, styles }: { f: Fold; styles: FoldStyles }) {
	return (
		<View
			accessibilityElementsHidden
			className="absolute inset-x-0 top-0 overflow-hidden"
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
			style={{ height: f.barH }}
		>
			<CoverPhoto f={f} style={styles.photo} />
			<Animated.View
				className="absolute inset-0 bg-cover-scrim/35"
				style={styles.barShade}
			/>
			<Animated.View
				className="absolute inset-x-0 bottom-0 h-0.5 bg-cover-ink/82"
				style={[{ transformOrigin: "left" }, styles.readBar]}
			/>
		</View>
	);
}

/**
 * Back, the title's echo (with minutes left, new in v2), then Save, Share and Aa. Outside the
 * bar's clip, so a pressed glass button can swell past its edge. Inert while a sheet is up.
 */
export function BarRow({
	f,
	y,
	maxScroll,
	titleStyle,
	inert,
}: {
	f: Fold;
	y: SharedValue<number>;
	maxScroll: number;
	titleStyle: FoldStyles["barTitle"];
	inert: boolean;
}) {
	const { state, actions } = useReaderScreen();
	const saved = state.signals?.saved ?? false;
	return (
		<View
			className="absolute inset-x-0 top-0 flex-row items-center gap-2.5 px-4 pt-safe pb-0.5"
			pointerEvents={inert ? "none" : "box-none"}
			style={{ height: f.barH }}
		>
			<CoverButton
				icon={ICON.back}
				label={COPY.reader.bar.back}
				onPress={goBack}
			/>
			{/* A visual echo of the title; screen readers already have the heading. */}
			<Animated.View
				accessibilityElementsHidden
				className="min-w-0 flex-1"
				importantForAccessibility="no-hide-descendants"
				style={titleStyle}
			>
				<AppText
					className="text-[15.5px] text-cover-ink leading-[20px]"
					maxFontSizeMultiplier={BAR_MAX_SCALE}
					numberOfLines={1}
					variant="callout"
					weight="semibold"
				>
					{state.entry.title}
				</AppText>
				<MinutesLeft
					from={f.fold + LEFT_FROM}
					maxScroll={maxScroll}
					readMin={state.entry.readMin}
					y={y}
				/>
			</Animated.View>
			{state.signals ? (
				<CoverButton
					icon={saved ? ICON.saved : ICON.save}
					label={COPY.reader.bar.save}
					onPress={actions.toggleSave}
					selected={saved}
				/>
			) : null}
			<CoverButton
				icon={ICON.share}
				label={COPY.reader.bar.share}
				onPress={() => actions.share()}
			/>
			<CoverButton
				icon={ICON.aa}
				label={COPY.reader.bar.appearance}
				onPress={actions.openAppearance}
			/>
		</View>
	);
}

/** "4 min left", once past the fold. React hears only when the number changes. */
function MinutesLeft({
	readMin,
	y,
	maxScroll,
	from,
}: {
	readMin: number;
	y: SharedValue<number>;
	maxScroll: number;
	from: number;
}) {
	const [left, setLeft] = useState<number | null>(null);
	useAnimatedReaction(
		() => {
			const v = y.get();
			return v <= from || maxScroll <= 0
				? null
				: minutesLeft(readMin, v, maxScroll);
		},
		(now, prev) => {
			if (now !== prev) {
				scheduleOnRN(setLeft, now);
			}
		}
	);
	if (left === null) {
		return null;
	}
	return (
		<AppText
			className="text-[12px] text-cover-ink/78 leading-[15px]"
			maxFontSizeMultiplier={BAR_MAX_SCALE}
			variant="caption"
			weight="medium"
		>
			{COPY.reader.minutesLeft(left)}
		</AppText>
	);
}
