import { Pressable, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { CoverImage } from "@/components/shared/cover-image";
import { Equaliser } from "@/components/shared/equaliser";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { COPY } from "@/features/lantern/copy";
import { type HubTrack, useHubScreen } from "@/features/lantern/hub/hub-data";
import { trackMinutes } from "@/features/lantern/lantern-model";
import { LS, LT } from "@/features/lantern/lantern-style";
import { cn } from "@/lib/cn";
import { useTokenColors } from "@/lib/use-token-color";

const L = LS.listen;
const ART = { borderRadius: L.artR, height: L.art, width: L.art };
const LOCK = { android: "lock", ios: "lock.fill" } as const;
const PLAY = { android: "play_arrow", ios: "play.fill" } as const;
const PAUSE = { android: "pause", ios: "pause.fill" } as const;
const WAVE = { android: "graphic_eq", ios: "waveform" } as const;
const FAMILY = { music: "Music", support: "Support audio" } as const;

/**
 * A listen placed among a hub's reads (handoff §4, v2): numbered in the hub's order, its own card,
 * with play right on it. Play starts it here, no navigation; the card itself opens the full
 * player. A free listener sees locks, and either opens Xolace+.
 */
export function ListenCard({
	track,
	index,
}: {
	track: HubTrack;
	index: number;
}) {
	const { state, actions } = useHubScreen();
	const [audio, foreground, background, muted, separator] = useTokenColors([
		"browse-audio-foreground",
		"foreground",
		"background",
		"muted",
		"separator",
	]);
	const { locked } = state.listen;
	const now = state.listen.nowPlaying === track.slug;
	const playing = now && state.listen.playing;
	const min = trackMinutes(track.durationSec);
	const by = [FAMILY[track.family], track.attribution]
		.filter(Boolean)
		.join(" · ");
	// Playing here: pause. Otherwise play; the route decides between resume, load and paywall.
	const onPlay = () => (playing ? actions.toggle() : actions.play(track));
	return (
		<View
			className="flex-row items-center"
			style={{
				gap: LS.row.gap,
				paddingHorizontal: LS.gutter,
				paddingVertical: L.padV,
			}}
		>
			<AppText
				className="text-[13px] leading-[17px]"
				color="subtle"
				style={{ width: LS.row.ix }}
				variant="footnote"
			>
				{index + 1}
			</AppText>
			<View
				className="min-w-0 flex-1 flex-row items-center gap-2.5 bg-surface-secondary py-2.5 pr-3 pl-2.5"
				style={{ borderCurve: "continuous", borderRadius: L.r }}
			>
				<Pressable
					accessibilityLabel={COPY.listen.label(track.title, min, locked)}
					accessibilityRole="button"
					className="min-w-0 flex-1 flex-row items-center gap-3"
					onPress={() => actions.open(track)}
					style={({ pressed }) => ({ opacity: pressed ? LT.rowDim : 1 })}
				>
					<View
						className="overflow-hidden bg-surface"
						style={{ ...ART, borderCurve: "continuous" }}
					>
						<CoverImage
							recyclingKey={track._id}
							style={ART}
							thumbhash={track.thumbhash}
							uri={track.thumbUrl}
						/>
						{playing ? (
							// The bars mount only on the card that's playing.
							<View className="absolute inset-0 items-center justify-center bg-cover-scrim/32">
								<Equaliser playing />
							</View>
						) : null}
						{locked ? (
							<View className="absolute right-1 bottom-1 size-5 items-center justify-center rounded-full bg-background/85">
								<Icon color={foreground} name={LOCK} size={10} />
							</View>
						) : null}
					</View>
					<View className="min-w-0 flex-1 gap-[3px]">
						<View className="flex-row items-center gap-[5px]">
							<Icon color={audio} name={WAVE} size={13} />
							<AppText
								className="text-[12px] leading-[15px]"
								style={{ color: audio }}
								variant="caption"
								weight="semibold"
							>
								{playing ? COPY.listen.playing : COPY.listen.kicker(min)}
							</AppText>
						</View>
						<AppText
							className="text-[15.5px] leading-[20px]"
							numberOfLines={2}
							variant="callout"
							weight="semibold"
						>
							{track.title}
						</AppText>
						<AppText
							className="text-[13px] leading-[17px]"
							color="muted"
							numberOfLines={1}
							variant="footnote"
						>
							{by}
						</AppText>
					</View>
				</Pressable>
				<PressScale
					accessibilityLabel={
						locked
							? COPY.listen.locked
							: playing
								? COPY.listen.pause(track.title)
								: COPY.listen.play(track.title)
					}
					className={cn(
						"items-center justify-center",
						playing ? "bg-foreground" : "bg-surface"
					)}
					onPress={onPlay}
					style={{
						borderRadius: L.play / 2,
						boxShadow: playing ? undefined : `0px 0px 0px 1px ${separator}`,
						height: L.play,
						width: L.play,
					}}
				>
					<Icon
						color={locked ? muted : playing ? background : foreground}
						name={locked ? LOCK : playing ? PAUSE : PLAY}
						size={locked ? 14 : 15}
					/>
				</PressScale>
			</View>
		</View>
	);
}
