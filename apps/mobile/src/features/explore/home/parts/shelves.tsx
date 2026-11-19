import { ScrollView, View } from "react-native";
import { EXS, HOME_S } from "@/features/explore/explore-style";
import type { HomeFrom } from "@/features/explore/home/home-data";
import { type HomeItem, pages } from "@/features/explore/home/home-model";
import { Hairline } from "@/features/explore/rows/track-row";
import { ItemRow, ItemTile } from "./home-item";

/** For the hour (handoff §7): three rows in a grouped card. Covers can be held. */
export function HourList({ items }: { items: readonly HomeItem[] }) {
	return (
		<View
			className="rounded-[22px] border border-continuous border-separator bg-surface py-1"
			style={{ marginHorizontal: HOME_S.cardGutter }}
		>
			{items.map((it, i) => (
				<View key={it.key}>
					{i > 0 ? (
						<Hairline left={HOME_S.rule.hour} right={EXS.rule.right} />
					) : null}
					<ItemRow from="explore-hour" hold it={it} slot="hour" />
				</View>
			))}
		</View>
	);
}

/** A shelf of tiles (Because you named, New). Audio covers can be held. */
export function TileShelf({
	items,
	from,
	slot,
}: {
	items: readonly HomeItem[];
	from: HomeFrom;
	slot: string;
}) {
	return (
		<ScrollView
			contentContainerStyle={{
				gap: HOME_S.shelfGap,
				paddingHorizontal: HOME_S.gutter,
			}}
			decelerationRate="fast"
			horizontal
			showsHorizontalScrollIndicator={false}
			snapToInterval={HOME_S.tile.art + HOME_S.shelfGap}
		>
			{items.map((it) => (
				<ItemTile from={from} it={it} key={it.key} slot={slot} />
			))}
		</ScrollView>
	);
}

const SHORT_PAD_V = 7;

/** Five minutes or less (handoff §10): pages of three rows, 318 wide, snapping by page. No hold. */
export function ShortShelf({ items }: { items: readonly HomeItem[] }) {
	const F = HOME_S.five;
	return (
		<ScrollView
			contentContainerStyle={{ gap: F.gap, paddingHorizontal: HOME_S.gutter }}
			decelerationRate="fast"
			horizontal
			showsHorizontalScrollIndicator={false}
			snapToInterval={F.snap}
		>
			{pages(items).map((page) => (
				<View key={page.map((p) => p.key).join()} style={{ width: F.w }}>
					{page.map((it, i) => (
						<View key={it.key}>
							{i > 0 ? <Hairline left={HOME_S.rule.five} right={0} /> : null}
							<ItemRow
								from="explore-short"
								it={it}
								padH={0}
								padV={SHORT_PAD_V}
								slot="short"
							/>
						</View>
					))}
				</View>
			))}
		</ScrollView>
	);
}
