import { api } from "@xolace/backend/convex/_generated/api";
import { useQuery } from "convex/react";
import { Image } from "expo-image";
import { router } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { usePostHog } from "posthog-react-native";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, useWindowDimensions, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { AppText } from "@/src/components/shared/app-text";
import { pickListeningTip } from "@/src/features/browse/components/listening-tip";
import { ShelfTile } from "@/src/features/browse/components/shelf-tile";
import { useMiniPlayerInset } from "@/src/features/browse/now-playing/now-playing-store";
import { useUtcDay } from "@/src/features/browse/use-utc-day";
import { playSoftPress } from "@/src/lib/haptics";
import { imageSource } from "@/src/lib/image-source";
import { PlayfulLip } from "@/src/lib/playful/playful-lip";
import { useIsPlayful, usePlayfulPress } from "@/src/lib/playful/use-playful";

type Entry = {
	id: "support" | "music" | "topics" | "lantern";
	label: string;
	icon: SymbolViewProps["name"];
	bg: string;
	/** Playful's lip under the circle: the tint, solid enough to read as an edge. */
	lip: string;
	fg:
		| "--color-browse-audio-foreground"
		| "--color-browse-music-foreground"
		| "--color-browse-topics-foreground";
	href: string;
};

const ENTRIES: Entry[] = [
	{
		bg: "bg-browse-audio",
		fg: "--color-browse-audio-foreground",
		href: "/browse/list?family=support",
		icon: { android: "graphic_eq", ios: "waveform", web: "graphic_eq" },
		id: "support",
		label: "Support audio",
		lip: "bg-browse-audio-foreground/45",
	},
	{
		bg: "bg-browse-music",
		fg: "--color-browse-music-foreground",
		href: "/browse/list?family=music",
		icon: { android: "music_note", ios: "music.note", web: "music_note" },
		id: "music",
		label: "Music",
		lip: "bg-browse-music-foreground/45",
	},
	{
		bg: "bg-browse-topics",
		fg: "--color-browse-topics-foreground",
		href: "/browse/topics",
		icon: { android: "grid_view", ios: "square.grid.2x2", web: "grid_view" },
		id: "topics",
		label: "Topics",
		lip: "bg-browse-topics-foreground/45",
	},
	// The Library's home, inside Browse (#393, #409); branded Lantern (#394).
	{
		bg: "bg-browse-topics",
		fg: "--color-browse-topics-foreground",
		href: "/browse/library",
		icon: { android: "menu_book", ios: "book", web: "menu_book" },
		id: "lantern",
		label: "Lantern",
		lip: "bg-browse-topics-foreground/45",
	},
];

const ENTRY_RADIUS = 32;

function EntryButton({ entry }: { entry: Entry }) {
	const tint = useCSSVariable(entry.fg);
	const isPlayful = useIsPlayful();
	const press = usePlayfulPress();

	const circle = (
		<View
			className={`h-16 w-16 items-center justify-center rounded-full ${entry.bg}`}
		>
			<SymbolView name={entry.icon} size={26} tintColor={String(tint)} />
		</View>
	);

	return (
		<Pressable
			accessibilityLabel={entry.label}
			accessibilityRole="button"
			className="items-center gap-2"
			onPress={() => {
				playSoftPress();
				// #339 hasn't landed these routes yet — this slice (#338) only needs
				// the hub to point at the right destination.
				router.push(entry.href as never);
			}}
			onPressIn={isPlayful ? press.onPressIn : undefined}
			onPressOut={isPlayful ? press.onPressOut : undefined}
		>
			{isPlayful ? (
				<PlayfulLip
					lipClassName={entry.lip}
					pressed={press.pressed}
					radius={ENTRY_RADIUS}
				>
					{/* The tints are translucent: back the face so the lip can't show through. */}
					<View className="rounded-full bg-background">{circle}</View>
				</PlayfulLip>
			) : (
				circle
			)}
			<AppText className="font-medium text-xs">{entry.label}</AppText>
		</Pressable>
	);
}

/**
 * Browse hub (#338, docs/paths-v1.md §9.3) — entry row + New shelf. Open to
 * every signed-in user; the free-user gate is on playback, not browsing.
 */
export function BrowseHubScreen() {
	// Clears the floating mini-player off the last row (none on iOS 26).
	const playerInset = useMiniPlayerInset();
	const { width } = useWindowDimensions();
	const posthog = usePostHog();
	const clock = useUtcDay();
	const shelf = useQuery(api.browse.getNewShelf, clock);
	const featured = useQuery(api.browse.getFeatured, {});
	const [tip] = useState(pickListeningTip);
	const mutedTint = useCSSVariable("--muted");

	useEffect(() => {
		posthog.capture("browse_opened");
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	return (
		<ScrollView
			className="flex-1 bg-background"
			contentContainerStyle={{ paddingBottom: 40 + playerInset }}
			contentInsetAdjustmentBehavior="automatic"
		>
			<View className="flex-row items-center gap-1.5 px-4 pt-4">
				<SymbolView
					name={{ android: "headphones", ios: "headphones", web: "headphones" }}
					size={13}
					tintColor={String(mutedTint)}
				/>
				<AppText className="flex-1 text-[13px] text-muted">{tip}</AppText>
			</View>

			<View className="flex-row justify-around px-4 pt-6">
				{ENTRIES.map((entry) => (
					<EntryButton entry={entry} key={entry.id} />
				))}
			</View>

			{featured && (
				<View className="px-4 pt-8">
					<AppText className="font-semibold text-[13px] text-muted uppercase tracking-wide">
						Featured this week
					</AppText>
					<AppText className="mt-0.5 font-bold text-2xl">
						{featured.title}
					</AppText>
					{featured.attribution && (
						<AppText className="mb-3 text-[15px] text-muted">
							{featured.attribution}
						</AppText>
					)}
					<View
						className="overflow-hidden rounded-[14px] bg-surface-tertiary"
						style={{
							height: (width - 32) * 0.55,
							marginTop: featured.attribution ? 0 : 8,
							width: width - 32,
						}}
					>
						<Image
							placeholder={
								featured.thumbhash
									? { thumbhash: featured.thumbhash }
									: undefined
							}
							placeholderContentFit="cover"
							source={imageSource(featured.thumbUrl)}
							style={{ height: "100%", width: "100%" }}
							transition={200}
						/>
					</View>
				</View>
			)}

			{shelf && shelf.length > 0 && (
				<>
					<AppText className="px-4 pt-8 pb-2 font-bold text-[22px]">
						New
					</AppText>
					<ScrollView
						contentContainerStyle={{ gap: 14, paddingHorizontal: 16 }}
						horizontal
						showsHorizontalScrollIndicator={false}
					>
						{shelf.map((item) => (
							<ShelfTile from="hub-new" item={item} key={item._id} />
						))}
					</ScrollView>
				</>
			)}
		</ScrollView>
	);
}
