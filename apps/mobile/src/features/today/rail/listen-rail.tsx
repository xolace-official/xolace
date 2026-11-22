import { View } from "react-native";
import Animated from "react-native-reanimated";
import { EaseView } from "@/design/ease";
import { rowTile, useScreen } from "@/lib/wide-layout";
import { COPY } from "../copy";
import { useToday } from "../today-data";
import { useTodayFrame } from "../today-frame";
import { MODULE_GAP } from "../today-motion";
import { todayRiseProps } from "../today-rise";
import { TodaySection } from "../today-section";
import { ChimeTile } from "./chime-tile";
import { TILE } from "./rail-model";
import { useChimes } from "./use-chimes";

const RISE_SLOT = 2;
/** The row's side padding (`px-4`). */
const ROW_PAD = 16;

export function ListenRail() {
	const { state, actions } = useToday();
	const { live, reduced, intro, waiting } = useTodayFrame();
	const tiles = state.rail ?? [];
	const { angles, onScroll } = useChimes(tiles.length, reduced);
	const screen = useScreen();
	const w = rowTile(screen, {
		gap: TILE.gap,
		row: screen.width - ROW_PAD * 2,
		size: TILE.w,
	});
	if (tiles.length === 0) {
		return null;
	}

	return (
		<EaseView
			{...todayRiseProps(RISE_SLOT, intro, reduced, waiting)}
			style={{ marginTop: MODULE_GAP }}
		>
			<View className="mx-4">
				<TodaySection
					action={COPY.listen.seeAll}
					actionLabel={COPY.listen.seeAllLabel}
					onAction={actions.openExplore}
					title={COPY.listen.title}
				/>
			</View>
			<Animated.ScrollView
				className="mt-1.5"
				contentContainerClassName="px-4 pb-2.5"
				contentContainerStyle={{ gap: TILE.gap, paddingTop: TILE.hang }}
				horizontal
				onScroll={onScroll}
				scrollEventThrottle={16}
				showsHorizontalScrollIndicator={false}
			>
				<View
					className="absolute inset-x-0 top-0 h-px bg-separator"
					pointerEvents="none"
				/>
				{tiles.map((tile, i) => {
					const angle = angles[i];
					if (!angle) {
						return null;
					}
					return (
						<ChimeTile
							angle={angle}
							key={tile.id}
							live={live}
							locked={state.listenLocked}
							onPlay={() => actions.openTrack(tile)}
							playing={state.playingSlug === tile.slug}
							reduced={reduced}
							tile={tile}
							w={w}
						/>
					);
				})}
			</Animated.ScrollView>
		</EaseView>
	);
}
