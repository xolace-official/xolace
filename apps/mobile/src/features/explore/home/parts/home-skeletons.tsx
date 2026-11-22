import { View } from "react-native";
import { Bone } from "@/components/shared/skeleton";
import { EXS, HOME_S } from "@/features/explore/explore-style";
import { RowsSkeleton } from "@/features/explore/rows/rows-skeleton";
import { useScreen } from "@/lib/wide-layout";
import { featuredSize, tileArt } from "./home-sizes";

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
	const { w, h } = featuredSize(useScreen());
	return (
		<View style={{ paddingHorizontal: HOME_S.gutter }}>
			<Bone h={h} r={HOME_S.feat.r} w={w} />
		</View>
	);
}

export function HourSkeleton() {
	return (
		<View
			className="rounded-[22px] border border-continuous border-separator bg-surface py-1"
			style={{ marginHorizontal: HOME_S.cardGutter }}
		>
			<RowsSkeleton bare count={3} />
		</View>
	);
}

export function TilesSkeleton() {
	const T = HOME_S.tile;
	const art = tileArt(useScreen());
	return (
		<Shelf>
			{Array.from({ length: SHELF_TILES }, (_, i) => (
				<View key={i} style={{ gap: T.gap, width: art }}>
					<Bone h={art} r={T.artR} w={art} />
					<Bone h={15} r={4} w="80%" />
					<Bone h={12} r={4} w="50%" />
				</View>
			))}
		</Shelf>
	);
}

export function ShortSkeleton() {
	return (
		<View style={{ marginHorizontal: HOME_S.gutter - EXS.row.padH }}>
			<RowsSkeleton bare count={3} />
		</View>
	);
}
