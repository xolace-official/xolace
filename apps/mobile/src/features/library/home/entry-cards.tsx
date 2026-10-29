/** Lantern home atoms (#409): photo card, thumbnail row, section title. Every tap opens
 * `library/[slug]` (#407). */

import type { api } from "@xolace/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { SymbolView } from "expo-symbols";
import { usePostHog } from "posthog-react-native";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { AppText } from "@/components/shared/app-text";
import type { ReaderFrom } from "@/features/library/analytics";
import { CoverImage } from "@/features/library/cover-image";
import { facetLabel, readTimeLine } from "@/features/library/home/library-copy";
import { COVER_SCRIM } from "@/features/library/reader/cover-palette";
import { capitalise } from "@/features/library/reader/reader-copy";
import {
	SHARE_ICON,
	shareEntry,
} from "@/features/library/reader/reader-extras";
import {
	SAVE_ICON,
	SAVED_ICON,
	SaveButton,
	useSaveToggle,
} from "@/features/library/reader/reader-parts";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { cn } from "@/lib/utils";

export type EntryItem = FunctionReturnType<
	typeof api.library.entries.listEntries
>[number];

/** Photo cards' corner, shared with the For you blur that sits over them. */
export const CARD_RADIUS = 28;
// iOS's first accessibility text size (AX1) is ~1.65×; at these titles go uncapped.
export const AX_FONT_SCALE = 1.6;

/** `hub` rides along from a hub so the reader's Up next follows its order (#417). */
export const readerHref = (slug: string, from: ReaderFrom, hub?: string) =>
	({
		params: { from, slug, ...(hub && { hub }) },
		pathname: "/library/[slug]",
	}) as const;

/** Full-bleed cover photo, kicker, title, meta and a play mark for audio. At accessibility
 * sizes the title is uncapped (#400). */
export function PhotoCard({
	entry,
	kicker,
	width,
	height,
	href = readerHref(entry.slug, "home"),
	meta = readTimeLine(entry.readMin, entry.views),
	label = `${entry.title}. ${kicker}. ${meta}`,
}: {
	entry: Omit<EntryItem, "views" | "saved"> & { views?: number };
	kicker: string;
	width: number;
	height: number;
	href?: ReturnType<typeof readerHref>;
	meta?: string;
	label?: string;
}) {
	const ax = useWindowDimensions().fontScale >= AX_FONT_SCALE;
	const reduced = useEffectiveReducedMotion();
	const posthog = usePostHog();
	return (
		<View style={{ minHeight: height, width }}>
			<Link asChild href={href}>
				<Link.Trigger withAppleZoom={!reduced}>
					<Pressable
						accessibilityLabel={label}
						accessibilityRole="link"
						className="overflow-hidden bg-cover-scrim active:opacity-90"
						style={{
							borderCurve: "continuous",
							borderRadius: CARD_RADIUS,
							minHeight: height,
							width,
						}}
					>
						<CoverImage
							contentFit="cover"
							style={StyleSheet.absoluteFill}
							thumbhash={entry.coverThumbhash}
							transition={200}
							uri={entry.coverUrl}
						/>
						<LinearGradient
							colors={COVER_SCRIM.colors}
							locations={COVER_SCRIM.locations}
							style={StyleSheet.absoluteFill}
						/>
						<View className="flex-1 justify-end gap-2 p-5">
							<AppText className="font-medium text-[12px] text-cover-ink/70 uppercase tracking-[1.5px]">
								{kicker}
							</AppText>
							<AppText
								className="font-bold text-[24px] text-cover-ink leading-[29px]"
								numberOfLines={ax ? undefined : 3}
							>
								{entry.title}
							</AppText>
							<AppText className="text-[13px] text-cover-ink/75">
								{meta}
							</AppText>
						</View>
					</Pressable>
				</Link.Trigger>
				<Link.Preview />
				{/* No Save here: these entries don't carry `saved`. */}
				<Link.Menu>
					<Link.MenuAction
						icon={SHARE_ICON.ios}
						onPress={() => shareEntry(entry, posthog)}
					>
						Share
					</Link.MenuAction>
				</Link.Menu>
			</Link>
			{entry.listenMin !== undefined && <HasAudio />}
		</View>
	);
}

const PLAY = {
	android: "play_arrow",
	ios: "play.fill",
	web: "play_arrow",
} as const;

/** A mark, not a control: this entry has audio. Taps fall through to the card. */
function HasAudio() {
	const coverInk = String(useCSSVariable("--color-cover-ink"));
	const glass = isLiquidGlassAvailable();
	return (
		<View
			accessibilityElementsHidden
			className={cn(
				"absolute top-3 right-3 h-10 w-10 items-center justify-center rounded-full",
				!glass && "bg-cover-scrim/30"
			)}
			importantForAccessibility="no-hide-descendants"
			pointerEvents="none"
		>
			{/* Fixed palette over the photo: dark clear glass, not the themed GlassSurface. */}
			{glass && (
				<GlassView
					colorScheme="dark"
					glassEffectStyle="clear"
					style={BADGE_GLASS}
				/>
			)}
			<SymbolView
				name={PLAY}
				size={15}
				tintColor={coverInk}
				weight="semibold"
			/>
		</View>
	);
}

const BADGE_GLASS = {
	borderRadius: 20,
	inset: 0,
	position: "absolute",
} as const;

/** Thumbnail left, "Kind · Subject" kicker, bold title, meta. */
export function EntryRow({
	entry,
	index,
	from,
	hub,
	onOpen,
}: {
	entry: EntryItem;
	index?: number;
	from: ReaderFrom;
	hub?: string;
	/** Runs before the open, e.g. Browse search's tap analytics. */
	onOpen?: () => void;
}) {
	const save = useSaveToggle(entry._id, entry.saved);
	const posthog = usePostHog();
	return (
		<View className="flex-row items-center pr-4">
			<Link asChild href={readerHref(entry.slug, from, hub)} onPress={onOpen}>
				{/* No zoom: the thumb is too small to grow from. */}
				<Link.Trigger>
					<Pressable
						accessibilityRole="link"
						className="flex-1 flex-row items-center gap-4 py-3 pl-4 active:opacity-70"
					>
						{index !== undefined && (
							<AppText className="w-4 text-[13px] text-muted">
								{index + 1}
							</AppText>
						)}
						<View
							className="overflow-hidden rounded-[14px] bg-surface-secondary"
							style={THUMB}
						>
							<CoverImage
								style={THUMB}
								thumbhash={entry.coverThumbhash}
								transition={200}
								uri={entry.coverThumbUrl ?? entry.coverUrl}
							/>
						</View>
						<View className="flex-1 gap-1">
							<AppText className="text-[12px] text-muted">
								{capitalise(entry.kind)} · {facetLabel(entry.primarySubject)}
							</AppText>
							<AppText
								className="font-semibold text-[16px] leading-[21px]"
								numberOfLines={2}
							>
								{entry.title}
							</AppText>
							<AppText className="text-[13px] text-muted">
								{readTimeLine(entry.readMin, entry.views, entry.listenMin)}
							</AppText>
						</View>
					</Pressable>
				</Link.Trigger>
				<Link.Preview />
				<Link.Menu>
					<Link.MenuAction
						icon={save.shown ? SAVED_ICON.ios : SAVE_ICON.ios}
						onPress={save.toggle}
					>
						{save.shown ? "Remove from saved" : "Save"}
					</Link.MenuAction>
					<Link.MenuAction
						icon={SHARE_ICON.ios}
						onPress={() => shareEntry(entry, posthog)}
					>
						Share
					</Link.MenuAction>
				</Link.Menu>
			</Link>
			<SaveButton save={save} />
		</View>
	);
}

const THUMB = { height: 78, width: 104 };

export function SectionTitle({
	title,
	action,
	onAction,
}: {
	title: string;
	action?: string;
	onAction?: () => void;
}) {
	return (
		<View className="flex-row items-end justify-between px-4 pt-8 pb-3">
			<AppText accessibilityRole="header" className="font-bold text-[22px]">
				{title}
			</AppText>
			{action && (
				<Pressable accessibilityRole="button" hitSlop={8} onPress={onAction}>
					<AppText className="font-medium text-[15px] text-accent">
						{action}
					</AppText>
				</Pressable>
			)}
		</View>
	);
}
