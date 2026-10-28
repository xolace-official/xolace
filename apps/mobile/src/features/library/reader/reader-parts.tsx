import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useThemeColor } from "heroui-native";
import { type ComponentProps, type ReactNode, useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import {
	EnrichedMarkdownText,
	type MarkdownStyle,
} from "react-native-enriched-markdown";
import Animated from "react-native-reanimated";
import { useCSSVariable } from "uniwind";

import { AppText } from "@/components/shared/app-text";
import { CoverImage } from "@/features/library/cover-image";
import {
	COVER_BUTTON,
	CoverGlass,
} from "@/features/library/reader/cover-glass";
import { COVER_SCRIM } from "@/features/library/reader/cover-palette";
import {
	headerCredit,
	metaLabel,
	metaLine,
	prepareBody,
} from "@/features/library/reader/reader-copy";
import type { ReaderEntry } from "@/features/library/reader/reader-screen";
import {
	logDropped,
	useRecord,
} from "@/features/library/reader/use-read-signals";
import { cn } from "@/lib/utils";

const BACK_ICON = {
	android: "arrow_back",
	ios: "chevron.left",
	web: "arrow_back",
} as const;
const AA_ICON = {
	android: "text_fields",
	ios: "textformat.size",
	web: "text_fields",
} as const;
export const SAVE_ICON = {
	android: "bookmark_border",
	ios: "bookmark",
	web: "bookmark_border",
} as const;
export const SAVED_ICON = {
	android: "bookmark_added",
	ios: "bookmark.fill",
	web: "bookmark_added",
} as const;
const SOURCE_ICON = {
	android: "account_balance",
	ios: "building.columns",
	web: "account_balance",
} as const;
const XOLACE_LOGO = require("@/assets/images/icon.png");
// Callouts arrive as quotes led by their kind in bold (`prepareBody`), so the kind reads first.
const A11Y_LABELS = { blockquote: { quote: "Quote" } };

// A share link opens the reader with nothing under it.
const goBack = () =>
	router.canGoBack() ? router.back() : router.replace("/(protected)");

/** Round back control; on the cover photo it takes the fixed cover ink. */
export function BackButton({ onCover = false }: { onCover?: boolean }) {
	const coverInk = String(useCSSVariable("--color-cover-ink"));
	const foreground = useThemeColor("foreground");
	const icon = (
		<SymbolView
			name={BACK_ICON}
			size={17}
			tintColor={onCover ? coverInk : foreground}
			weight="semibold"
		/>
	);
	return (
		<Pressable
			accessibilityLabel="Back"
			accessibilityRole="button"
			className={
				onCover
					? COVER_BUTTON
					: "h-10 w-10 items-center justify-center rounded-full bg-surface-secondary active:opacity-60"
			}
			hitSlop={8}
			onPress={goBack}
		>
			{onCover ? <CoverGlass>{icon}</CoverGlass> : icon}
		</Pressable>
	);
}

/** Opens the Aa sheet. Sits on the cover photo, so it takes the fixed cover ink. */
export function AaButton({ onPress }: { onPress: () => void }) {
	const coverInk = String(useCSSVariable("--color-cover-ink"));
	return (
		<Pressable
			accessibilityLabel="Reading appearance"
			accessibilityRole="button"
			className={COVER_BUTTON}
			hitSlop={8}
			onPress={onPress}
		>
			<CoverGlass>
				<SymbolView
					name={AA_ICON}
					size={17}
					tintColor={coverInk}
					weight="semibold"
				/>
			</CoverGlass>
		</Pressable>
	);
}

/** Save toggle (#410), one per row. Holds the tapped value until the server answers: list
 * queries miss the optimistic update. */
export function useSaveToggle(entryId: ReaderEntry["_id"], saved: boolean) {
	const record = useRecord();
	const [pending, setPending] = useState<boolean | null>(null);
	const shown = pending ?? saved;
	const toggle = () => {
		if (pending !== null) {
			return;
		}
		setPending(!shown);
		record({ entryId, saved: !shown })
			.catch(logDropped)
			.finally(() => setPending(null));
	};
	return { pending, shown, toggle };
}

export function SaveButton({
	save,
	onCover = false,
}: {
	save: ReturnType<typeof useSaveToggle>;
	onCover?: boolean;
}) {
	const { shown, pending, toggle } = save;
	const coverInk = String(useCSSVariable("--color-cover-ink"));
	const foreground = useThemeColor("foreground");
	const icon = (
		<SymbolView
			name={shown ? SAVED_ICON : SAVE_ICON}
			size={17}
			tintColor={onCover ? coverInk : foreground}
			weight="semibold"
		/>
	);
	return (
		<Pressable
			accessibilityLabel="Save"
			accessibilityRole="button"
			accessibilityState={{ selected: shown }}
			className={
				onCover
					? COVER_BUTTON
					: "h-10 w-10 items-center justify-center rounded-full active:opacity-60"
			}
			disabled={pending !== null}
			hitSlop={8}
			onPress={toggle}
		>
			{onCover ? <CoverGlass>{icon}</CoverGlass> : icon}
		</Pressable>
	);
}

/** Title and meta line. First thing a screen reader lands on (#400); resume is an action, never
 * automatic. */
export function ReaderTitle({
	entry,
	onCover,
	onBackToTop,
	onResume,
}: {
	entry: ReaderEntry;
	onCover: boolean;
	onBackToTop: () => void;
	/** Only when there is a place to resume. */
	onResume?: () => void;
}) {
	return (
		<>
			<AppText
				accessibilityActions={[
					{ label: "Back to top", name: "backToTop" },
					...(onResume
						? [{ label: "Resume where you left off", name: "resume" }]
						: []),
				]}
				accessibilityRole="header"
				className={cn(
					"font-bold text-[32px] leading-[38px]",
					onCover ? "text-cover-ink" : "text-foreground"
				)}
				onAccessibilityAction={(e) =>
					e.nativeEvent.actionName === "resume" ? onResume?.() : onBackToTop()
				}
			>
				{entry.title}
			</AppText>
			<AppText
				accessibilityLabel={metaLabel(entry)}
				className={cn(
					"mt-2 text-sm",
					onCover ? "text-cover-ink/80" : "text-muted"
				)}
			>
				{metaLine(
					entry.kind,
					entry.readMin,
					entry.storyDescriptor,
					entry.listenMin
				)}
			</AppText>
		</>
	);
}

/** Source credit keyed on `reuse`, on every entry (#383); `aside` is the Listen pill (#411). */
export function SourceCredit({
	entry,
	aside,
}: {
	entry: Pick<ReaderEntry, "reuse" | "sources">;
	aside?: ReactNode;
}) {
	const muted = useThemeColor("muted");
	const { name, line, href, logoUrl, xolace } = headerCredit(entry);

	return (
		<View className="flex-row items-center gap-3">
			<Pressable
				accessibilityHint={href ? "Opens the original" : undefined}
				accessibilityLabel={`${name}, ${line}`}
				accessibilityRole={href ? "link" : undefined}
				className="flex-1 flex-row items-center gap-3 active:opacity-70"
				disabled={!href}
				onPress={() => href && Linking.openURL(href)}
			>
				<View className="h-9 w-9 items-center justify-center overflow-hidden rounded-full bg-surface-secondary">
					{xolace || logoUrl ? (
						<Image
							contentFit="cover"
							source={xolace ? XOLACE_LOGO : { uri: logoUrl }}
							style={{ height: 36, width: 36 }}
						/>
					) : (
						<SymbolView name={SOURCE_ICON} size={15} tintColor={muted} />
					)}
				</View>
				<View className="flex-1">
					<AppText className="font-semibold text-sm">{name}</AppText>
					<AppText className="text-muted text-xs">{line}</AppText>
				</View>
			</Pressable>
			{aside}
		</View>
	);
}

/** The cover photo under its scrim; the reader draws it twice (behind the scroller, in the bar). */
export function CoverPhoto({
	uri,
	thumbhash,
	style,
}: {
	uri?: string;
	thumbhash?: string;
	style: ComponentProps<typeof Animated.View>["style"];
}) {
	return (
		<Animated.View className="bg-cover-scrim" style={style}>
			{/* No cover: the plain scrim until subjects get art. */}
			<CoverImage
				contentFit="cover"
				style={StyleSheet.absoluteFill}
				thumbhash={thumbhash}
				transition={200}
				uri={uri}
			/>
			<LinearGradient
				colors={COVER_SCRIM.colors}
				locations={COVER_SCRIM.locations}
				style={StyleSheet.absoluteFill}
			/>
		</Animated.View>
	);
}

/** The entry body. The renderer handles headings, links, alt text, lists and quotes for screen
 * readers. */
export function ReaderBody({
	markdown,
	style,
}: {
	markdown: string;
	style: MarkdownStyle;
}) {
	return (
		<EnrichedMarkdownText
			accessibilityLabels={A11Y_LABELS}
			flavor="github"
			markdown={prepareBody(markdown)}
			markdownStyle={style}
			onLinkPress={({ url }) => Linking.openURL(url)}
		/>
	);
}
