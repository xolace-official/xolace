import { View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { Equaliser } from "@/components/shared/equaliser";
import { Icon, type IconName } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { COPY } from "@/features/explore/copy";
import {
	type ExploreTrack,
	type Listen,
	minutesOf,
} from "@/features/explore/explore-model";
import { TOPIC } from "@/features/explore/explore-style";
import { Hairline, playingMark } from "@/features/explore/rows/track-row";
import { cn } from "@/lib/cn";
import { useTokenColors } from "@/lib/use-token-color";

const E = TOPIC.ep;
const LOCK: IconName = { android: "lock", ios: "lock" };
const PLAY: IconName = { android: "play_arrow", ios: "play.fill" };

/**
 * An episode: its number in the display face, the title and length, and a play circle, or a lock
 * for a free listener. While it's the one in the mini player, the number turns into the bars.
 */
export function SeriesRow({
	track,
	listen,
	rule,
}: {
	track: ExploreTrack;
	listen: Listen;
	rule: boolean;
}) {
	const [muted, accentInk] = useTokenColors(["muted", "accent-ink"]);
	const mark = playingMark(listen, track.slug);
	const n = track.episodeNumber ?? 0;
	const min = minutesOf(track.durationSec);
	const locked = listen.locked;
	const label = COPY.episode(n, track.title, min);

	return (
		<View>
			{rule ? <Hairline left={E.rule} right={E.padH} /> : null}
			<PressScale
				accessibilityLabel={locked ? `${label}, ${COPY.locked}` : label}
				card
				className="flex-row items-center"
				onPress={() => listen.open(track)}
				style={{
					gap: E.gap,
					paddingHorizontal: E.padH,
					paddingVertical: E.padV,
				}}
			>
				<View
					className="justify-center"
					style={{ height: E.num, width: E.num }}
				>
					{mark ? (
						<Equaliser className="bg-accent" playing={mark === "playing"} />
					) : (
						<AppText
							className="font-display-bold text-[17px] leading-[21px]"
							color="subtle"
						>
							{String(n)}
						</AppText>
					)}
				</View>
				<View className="min-w-0 flex-1 gap-0.5">
					<AppText
						className="text-[15.5px] leading-[19px]"
						numberOfLines={1}
						variant="callout"
						weight="semibold"
					>
						{track.title}
					</AppText>
					<AppText className="leading-[17px]" color="muted" variant="footnote">
						{COPY.minutes(min)}
					</AppText>
				</View>
				<View
					className={cn(
						"items-center justify-center",
						locked ? "bg-surface-secondary" : "bg-accent-wash"
					)}
					style={{
						borderRadius: E.circle / 2,
						height: E.circle,
						width: E.circle,
					}}
				>
					<Icon
						color={locked ? muted : accentInk}
						name={locked ? LOCK : PLAY}
						size={E.glyph}
					/>
				</View>
			</PressScale>
		</View>
	);
}
