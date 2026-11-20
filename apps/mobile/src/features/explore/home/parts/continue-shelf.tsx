import { ScrollView, View } from "react-native";
import Animated, { FadeOut, LinearTransition } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { HOME } from "@/features/explore/copy";
import { EXS, HOME_S } from "@/features/explore/explore-style";
import { useHome } from "@/features/explore/home/home-data";
import {
	type CardMark,
	type ContinueCard,
	continueLabel,
	continueMeta,
	continueShare,
	isLocked,
} from "@/features/explore/home/home-model";
import { TrackCover } from "@/features/explore/rows/track-cover";
import { HomeMenu } from "./home-menu";
import { ProgressRing } from "./progress-ring";

const C = HOME_S.cont;
const FADE_MS = 200;
const MOVE_MS = 320;
const RING_SLOP = 6;

export function ContinueShelf({ cards }: { cards: readonly ContinueCard[] }) {
	const { actions } = useHome();
	return (
		<ScrollView
			contentContainerStyle={{
				gap: HOME_S.shelfGap,
				paddingHorizontal: HOME_S.gutter,
			}}
			decelerationRate="fast"
			horizontal
			showsHorizontalScrollIndicator={false}
			snapToInterval={C.w + HOME_S.shelfGap}
		>
			{cards.map((c) => (
				<Animated.View
					exiting={FadeOut.duration(FADE_MS)}
					key={c.id}
					layout={LinearTransition.duration(MOVE_MS)}
				>
					<HomeMenu
						icon="minus.circle"
						label={HOME.remove}
						onPress={() => actions.removeContinue(c)}
						width={C.w}
					>
						<ContinueCardView c={c} />
					</HomeMenu>
				</Animated.View>
			))}
		</ScrollView>
	);
}

function ContinueCardView({ c }: { c: ContinueCard }) {
	const { state, actions } = useHome();
	const mark: CardMark =
		c.kind === "track" && state.nowPlaying === c.track.slug
			? state.playing
				? "playing"
				: "paused"
			: null;
	const locked = isLocked(c, state.locked);
	const share = continueShare(c);
	const art =
		c.kind === "track"
			? { hash: c.track.thumbhash, uri: c.track.thumbUrl }
			: {
					hash: c.entry.coverThumbhash,
					uri: c.entry.coverThumbUrl ?? c.entry.coverUrl,
				};

	return (
		<PressScale
			accessibilityLabel={continueLabel(c, mark, state.locked)}
			card
			className="flex-row items-center gap-3 border border-continuous border-separator bg-surface px-3"
			onPress={() => actions.resume(c)}
			style={{ borderRadius: C.r, height: C.h, width: C.w }}
		>
			<TrackCover
				locked={locked}
				playing={null}
				radius={EXS.row.artR}
				recyclingKey={c.id}
				size={EXS.row.art}
				thumbhash={art.hash}
				uri={art.uri}
			/>
			<View className="min-w-0 flex-1 gap-0.5">
				<AppText
					className="leading-[18px]"
					numberOfLines={1}
					variant="callout"
					weight="semibold"
				>
					{c.kind === "track" ? c.track.title : c.entry.title}
				</AppText>
				<AppText
					className="leading-[16px]"
					color="muted"
					numberOfLines={1}
					variant="footnote"
				>
					{continueMeta(c, mark)}
				</AppText>
				{c.kind === "entry" ? <ReadBar share={share} /> : null}
			</View>
			{c.kind === "track" ? (
				<PressScale
					accessibilityLabel={HOME.contAction(
						mark === "playing" ? "Pause" : mark ? "Resume" : "Play",
						c.track.title
					)}
					hitSlop={RING_SLOP}
					onPress={() =>
						actions.playHere(c.track, "explore-continue", c.positionSec)
					}
				>
					<ProgressRing playing={mark === "playing"} share={share} />
				</PressScale>
			) : null}
		</PressScale>
	);
}

function ReadBar({ share }: { share: number }) {
	return (
		<View className="mt-1.25 h-0.75 overflow-hidden rounded-xs bg-separator">
			<View
				className="h-0.75 rounded-xs bg-accent"
				style={{ width: `${share * 100}%` }}
			/>
		</View>
	);
}
