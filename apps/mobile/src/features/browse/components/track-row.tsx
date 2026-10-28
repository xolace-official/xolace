import type { api } from "@xolace/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { SymbolView } from "expo-symbols";
import { Pressable, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { AppText } from "@/components/shared/app-text";
import {
	type BrowseFrom,
	useOpenTrack,
} from "@/features/browse/use-open-track";
import { CoverImage } from "@/features/library/cover-image";

export type { BrowseFrom };
export type TrackItem = FunctionReturnType<typeof api.browse.getTopic>[number];

export const FAMILY_LABEL = {
	music: "Music",
	support: "Support audio",
} as const;

const THUMB = 56;

/**
 * One catalogue row (§9.3): square artwork, title, one subtitle line. No
 * inline play — a tap opens the player (#340). `glyph` marks the family and
 * is only shown on the topic screen, the one list both families share.
 *
 * Free users (§9.4): the thumbnail wears a lock and the tap opens the paywall
 * instead of the player (`useOpenTrack`).
 */
export function TrackRow({
	track,
	from,
	glyph = false,
	onOpen,
}: {
	track: TrackItem;
	from: BrowseFrom;
	glyph?: boolean;
	/** Runs before the open, e.g. Browse search's tap analytics. */
	onOpen?: () => void;
}) {
	const { open, locked } = useOpenTrack(from);
	const tint = useCSSVariable(
		track.family === "music"
			? "--color-browse-music-foreground"
			: "--color-browse-audio-foreground"
	);

	const lockTint = useCSSVariable("--color-foreground");

	const subtitle =
		track.episodeNumber === undefined
			? track.attribution
			: `Episode ${track.episodeNumber}${track.attribution ? ` · ${track.attribution}` : ""}`;

	return (
		<Pressable
			accessibilityLabel={`${track.title}${subtitle ? `, ${subtitle}` : ""}`}
			accessibilityRole="button"
			className="flex-row items-center gap-3 pl-4 active:opacity-60"
			onPress={() => {
				onOpen?.();
				open(track);
			}}
		>
			<View
				className="overflow-hidden rounded-lg bg-surface-tertiary"
				style={{ height: THUMB, width: THUMB }}
			>
				<CoverImage
					recyclingKey={track._id}
					style={{ height: THUMB, width: THUMB }}
					thumbhash={track.thumbhash}
					uri={track.thumbUrl}
				/>
				{locked && (
					<View className="absolute right-1 bottom-1 h-5 w-5 items-center justify-center rounded-full bg-background/85">
						<SymbolView
							accessibilityLabel="Xolace+"
							name={{ android: "lock", ios: "lock.fill", web: "lock" }}
							size={10}
							tintColor={String(lockTint)}
						/>
					</View>
				)}
			</View>
			<View
				className="flex-1 flex-row items-center gap-2 border-border/65 border-b py-3 pr-4"
				style={{ minHeight: THUMB + 12 }}
			>
				<View className="flex-1">
					<AppText className="font-medium text-[16px]" numberOfLines={1}>
						{track.title}
					</AppText>
					{subtitle && (
						<AppText
							className="mt-0.5 text-[13px] text-muted"
							numberOfLines={1}
						>
							{subtitle}
						</AppText>
					)}
				</View>
				{glyph && (
					<SymbolView
						accessibilityLabel={track.family === "music" ? "Music" : "Spoken"}
						name={
							track.family === "music"
								? {
										android: "music_note",
										ios: "music.note",
										web: "music_note",
									}
								: { android: "graphic_eq", ios: "waveform", web: "graphic_eq" }
						}
						size={16}
						tintColor={String(tint)}
					/>
				)}
			</View>
		</Pressable>
	);
}
