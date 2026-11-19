import { ScrollView, View } from "react-native";
import { HOME } from "@/features/explore/copy";
import { useHome } from "@/features/explore/home/home-data";
import {
	fromShort,
	fromTrack,
	hourTitle,
	pickPool,
} from "@/features/explore/home/home-model";
import { ChooseForMe } from "@/features/explore/home/parts/choose-for-me";
import { ContinueShelf } from "@/features/explore/home/parts/continue-shelf";
import { Doors } from "@/features/explore/home/parts/doors";
import { FeaturedCard } from "@/features/explore/home/parts/featured-card";
import { HomeMenu } from "@/features/explore/home/parts/home-menu";
import { HomeSection } from "@/features/explore/home/parts/home-section";
import {
	FeaturedSkeleton,
	HourSkeleton,
	ShortSkeleton,
	TilesSkeleton,
} from "@/features/explore/home/parts/home-skeletons";
import {
	HourList,
	ShortShelf,
	TileShelf,
} from "@/features/explore/home/parts/shelves";
import { useMiniPlayerInset } from "@/lib/now-playing/now-playing-store";

/** The doors sit this far under the search field (the board's 18, less the bar's own). */
const DOORS_TOP = 8;
const BOTTOM = 40;

/**
 * Explore, before you type (handoff `explore.md`, the owner's cut): the four doors, then the
 * shelves. Pick up where you left off and Because you named… show only when there's something
 * of yours; the rest wait in their own shape. One page, no dots, no greeting.
 */
export function HomeScreen() {
	const { state, actions } = useHome();
	const playerInset = useMiniPlayerInset();
	const { cont, featured, forYou, fresh, hour, short } = state;
	const pool = hour && short ? pickPool(hour, short) : [];

	return (
		<ScrollView
			className="flex-1 bg-background"
			contentContainerStyle={{ paddingBottom: BOTTOM + playerInset }}
			contentInsetAdjustmentBehavior="automatic"
		>
			<HomeSection top={DOORS_TOP}>
				<Doors />
			</HomeSection>
			{cont && cont.length > 0 ? (
				<HomeSection title={HOME.cont}>
					<ContinueShelf cards={cont} />
				</HomeSection>
			) : null}
			{featured === null ? null : (
				<HomeSection
					loading={featured === undefined}
					skeleton={<FeaturedSkeleton />}
					title={HOME.feat}
					why={HOME.featWhy}
				>
					{featured ? <FeaturedCard track={featured} /> : null}
				</HomeSection>
			)}
			{hour?.length === 0 ? null : (
				<HomeSection
					loading={hour === undefined}
					skeleton={<HourSkeleton />}
					title={hourTitle(state.phase)}
				>
					<HourList items={(hour ?? []).map(fromTrack)} />
				</HomeSection>
			)}
			{forYou ? (
				<HomeSection
					headerWrap={(header) => (
						<HomeMenu
							icon="eye.slash"
							label={HOME.noSessions}
							onPress={actions.stopUsingSessions}
						>
							<View>{header}</View>
						</HomeMenu>
					)}
					title={HOME.named(forYou.word)}
					why={HOME.namedWhy}
				>
					<TileShelf
						from="explore-named"
						items={forYou.tracks.map(fromTrack)}
						slot="named"
					/>
				</HomeSection>
			) : null}
			{fresh?.length === 0 ? null : (
				<HomeSection
					loading={fresh === undefined}
					skeleton={<TilesSkeleton />}
					title={HOME.new}
				>
					<TileShelf
						from="hub-new"
						items={(fresh ?? []).map(fromTrack)}
						slot="new"
					/>
				</HomeSection>
			)}
			{short?.length === 0 ? null : (
				<HomeSection
					loading={short === undefined}
					skeleton={<ShortSkeleton />}
					title={HOME.five}
				>
					<ShortShelf items={(short ?? []).map(fromShort)} />
				</HomeSection>
			)}
			{pool.length > 0 ? (
				<HomeSection>
					<ChooseForMe pool={pool} />
				</HomeSection>
			) : null}
		</ScrollView>
	);
}
