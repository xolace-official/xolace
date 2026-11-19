import type { ReactNode } from "react";
import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import {
	type ExploreTrack,
	type Listen,
	rowLabel,
} from "@/features/explore/explore-model";
import { EXS } from "@/features/explore/explore-style";
import { type PlayingMark, TrackCover } from "./track-cover";

/** Whether this track is the one in the mini player, and if it plays. */
export function playingMark(listen: Listen, slug: string): PlayingMark {
	if (listen.nowPlaying !== slug) {
		return null;
	}
	return listen.playing ? "playing" : "paused";
}

/**
 * Explore's row: 52 pt cover, the title over the meta, and on a topic production's kind icon at
 * the end. The whole row presses to .98; a tap plays, or opens Xolace+ for a free listener.
 */
export function TrackRow({
	track,
	meta,
	listen,
	end,
	kind = false,
	rule = false,
}: {
	track: ExploreTrack;
	meta: string;
	listen: Listen;
	end?: ReactNode;
	/** A topic row: VoiceOver hears ", spoken" or ", music". */
	kind?: boolean;
	/** A hairline above it, from the text to 16 from the right. */
	rule?: boolean;
}) {
	const R = EXS.row;
	return (
		<View>
			{rule ? <Hairline left={EXS.rule.left} right={EXS.rule.right} /> : null}
			<PressScale
				accessibilityLabel={rowLabel(track, meta, listen.locked, kind)}
				card
				className="flex-row items-center"
				onPress={() => listen.open(track)}
				style={{
					gap: R.gap,
					paddingHorizontal: R.padH,
					paddingVertical: R.padV,
				}}
			>
				<TrackCover
					locked={listen.locked}
					playing={playingMark(listen, track.slug)}
					radius={R.artR}
					recyclingKey={track._id}
					size={R.art}
					thumbhash={track.thumbhash}
					uri={track.thumbUrl}
				/>
				<View className="min-w-0 flex-1 gap-0.5">
					<AppText
						className="text-[15.5px] leading-[19px]"
						numberOfLines={1}
						variant="callout"
						weight="semibold"
					>
						{track.title}
					</AppText>
					<AppText
						className="leading-[17px]"
						color="muted"
						numberOfLines={1}
						variant="footnote"
					>
						{meta}
					</AppText>
				</View>
				{end}
			</PressScale>
		</View>
	);
}

/** A 1 pt rule in `separator`, inset on both sides. */
export function Hairline({ left, right }: { left: number; right: number }) {
	return (
		<View
			className="absolute top-0 h-px bg-separator"
			pointerEvents="none"
			style={{ left, right }}
		/>
	);
}
