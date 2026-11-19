import { Skeleton } from "heroui-native";
import { useWindowDimensions, View } from "react-native";
import { EXS, HOME_S } from "@/features/explore/explore-style";
import { RowsSkeleton } from "@/features/explore/rows/rows-skeleton";

/**
 * Explore home's loading shapes: blocks the size of what they stand in for, so the swap to
 * content doesn't move the page. The section's header stays real; only the content waits.
 */
const SHELF_TILES = 3;

function Shelf({ children }: { children: React.ReactNode }) {
	return (
		<View
			className="flex-row overflow-hidden"
			style={{ gap: HOME_S.shelfGap, paddingHorizontal: HOME_S.gutter }}
		>
			{children}
		</View>
	);
}

export function FeaturedSkeleton() {
	const { width } = useWindowDimensions();
	const F = HOME_S.feat;
	return (
		<View style={{ paddingHorizontal: HOME_S.gutter }}>
			<Skeleton
				style={{
					borderRadius: F.r,
					height: F.h,
					width: width - HOME_S.gutter * 2,
				}}
			/>
		</View>
	);
}

export function HourSkeleton() {
	return (
		<View
			className="rounded-[22px] border border-continuous border-separator bg-surface py-1"
			style={{ marginHorizontal: HOME_S.cardGutter }}
		>
			<RowsSkeleton count={3} />
		</View>
	);
}

export function TilesSkeleton() {
	const T = HOME_S.tile;
	return (
		<Shelf>
			{Array.from({ length: SHELF_TILES }, (_, i) => (
				<View key={i} style={{ gap: T.gap, width: T.art }}>
					<Skeleton
						style={{ borderRadius: T.artR, height: T.art, width: T.art }}
					/>
					<Skeleton className="h-3.75 w-4/5 rounded" />
					<Skeleton className="h-3 w-1/2 rounded" />
				</View>
			))}
		</Shelf>
	);
}

export function ShortSkeleton() {
	return (
		<View style={{ marginHorizontal: HOME_S.gutter - EXS.row.padH }}>
			<RowsSkeleton count={3} />
		</View>
	);
}
