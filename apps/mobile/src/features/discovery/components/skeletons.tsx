/**
 * Discovery's loading shapes: each mirrors the section it stands in for, so a
 * cold start reads as "arriving" rather than sections popping in one by one.
 */
import { Skeleton } from "heroui-native";
import { View } from "react-native";

const SectionTitle = () => <Skeleton className="h-5 w-44 rounded-md" />;

/** KindlingTodayCard's footprint: art on the right, title and two lines of copy. */
export function KindlingCardSkeleton() {
	return (
		<View
			accessibilityLabel="Loading your kindling"
			className="h-[120px] flex-row items-center gap-3 overflow-hidden rounded-3xl border border-border/65"
			style={{ borderCurve: "continuous" }}
		>
			<View className="flex-1 gap-2.5 pl-5">
				<Skeleton className="h-5 w-32 rounded-md" />
				<Skeleton className="h-3.5 w-full rounded" />
				<Skeleton className="h-3.5 w-3/4 rounded" />
			</View>
			<Skeleton className="w-24 self-stretch rounded-none" />
		</View>
	);
}

/** LibraryStrip: header row over a row of square tiles running off the edge. */
export function LibraryStripSkeleton({ tile }: { tile: number }) {
	return (
		<View accessibilityLabel="Loading" className="mt-10">
			<View className="px-4">
				<SectionTitle />
			</View>
			<View className="flex-row gap-3 overflow-hidden px-4 pt-3">
				{[0, 1, 2].map((i) => (
					<View className="gap-1.5" key={i} style={{ width: tile }}>
						<Skeleton
							className="rounded-[10px]"
							style={{ height: tile, width: tile }}
						/>
						<Skeleton className="h-3 w-4/5 rounded" />
						<Skeleton className="h-2.5 w-1/2 rounded" />
					</View>
				))}
			</View>
		</View>
	);
}

/** DiscoveryTimelineSection: title, subtitle, one moment card. */
export function MomentsSkeleton({ cardHeight }: { cardHeight: number }) {
	return (
		<View accessibilityLabel="Loading" className="mt-10 px-4">
			<SectionTitle />
			<Skeleton className="mt-2.5 h-3.5 w-3/5 rounded" />
			<Skeleton
				className="mt-4"
				style={{
					borderCurve: "continuous",
					borderRadius: 25,
					height: cardHeight,
				}}
			/>
		</View>
	);
}
