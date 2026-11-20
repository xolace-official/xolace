import { useWindowDimensions, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { CoverImage } from "@/components/shared/cover-image";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { LinearGradient } from "@/components/shared/styled";
import { COPY, HOME } from "@/features/explore/copy";
import { EXS, HOME_S, ON_ART } from "@/features/explore/explore-style";
import { useHome } from "@/features/explore/home/home-data";
import {
	fromTrack,
	isLocked,
	type ShelfTrack,
} from "@/features/explore/home/home-model";

const F = HOME_S.feat;
const LOCK = 22;
const LOCK_INSET = 16;
const PLAY_GLYPH = 17;
const SCRIM = [ON_ART.scrimFrom, ON_ART.scrimTo] as const;

export function FeaturedCard({ track }: { track: ShelfTrack }) {
	const { state, actions } = useHome();
	const { width } = useWindowDimensions();
	const w = width - HOME_S.gutter * 2;
	const it = fromTrack(track);
	const locked = isLocked(it, state.locked);
	const here = state.nowPlaying === track.slug;
	const playing = here && state.playing;
	const kicker = COPY.family[track.family].toUpperCase();

	return (
		<View style={{ paddingHorizontal: HOME_S.gutter }}>
			<PressScale
				accessibilityLabel={[
					track.title,
					COPY.family[track.family],
					...(track.attribution ? [track.attribution] : []),
					...(locked ? [COPY.locked] : []),
				].join(", ")}
				card
				className="overflow-hidden border-continuous bg-surface-secondary"
				onPress={() => actions.open(it, "explore-featured")}
				style={{ borderRadius: F.r, height: F.h, width: w }}
			>
				<CoverImage
					recyclingKey={track._id}
					style={{ height: F.h, width: w }}
					thumbhash={track.thumbhash}
					uri={track.thumbUrl}
				/>
				<LinearGradient
					className="absolute inset-x-0 bottom-0 h-[62%]"
					colors={SCRIM}
					pointerEvents="none"
				/>
				<View
					className="absolute right-21 bottom-4.5 left-5 gap-0.75"
					pointerEvents="none"
				>
					<AppText
						className="text-[11.5px] text-white/85 leading-[14px] tracking-[0.92px]"
						variant="caption"
						weight="bold"
					>
						{kicker}
					</AppText>
					<AppText
						className="text-[26px] text-white leading-[27.5px]"
						numberOfLines={2}
						variant="headline"
					>
						{track.title}
					</AppText>
					{track.attribution ? (
						<AppText
							className="text-white/85"
							numberOfLines={1}
							variant="detail"
						>
							{track.attribution}
						</AppText>
					) : null}
				</View>
				{locked ? <Lock /> : null}
				<PressScale
					accessibilityLabel={`${playing ? HOME.pause : HOME.play} ${track.title}`}
					className="absolute right-4.5 bottom-4.5 items-center justify-center rounded-full"
					onPress={() => actions.playHere(track, "explore-featured")}
					style={{
						backgroundColor: ON_ART.playBg,
						height: F.play,
						width: F.play,
					}}
				>
					<Icon
						color={ON_ART.playFg}
						name={
							playing
								? { android: "pause", ios: "pause.fill" }
								: { android: "play_arrow", ios: "play.fill" }
						}
						size={PLAY_GLYPH}
					/>
				</PressScale>
			</PressScale>
		</View>
	);
}

function Lock() {
	return (
		<View
			accessibilityElementsHidden
			className="absolute items-center justify-center rounded-full"
			importantForAccessibility="no-hide-descendants"
			style={{
				backgroundColor: ON_ART.playBg,
				height: LOCK,
				left: LOCK_INSET,
				top: LOCK_INSET,
				width: LOCK,
			}}
		>
			<Icon
				color={ON_ART.playFg}
				name={{ android: "lock", ios: "lock.fill" }}
				size={EXS.lock.glyph}
				weight="bold"
			/>
		</View>
	);
}
