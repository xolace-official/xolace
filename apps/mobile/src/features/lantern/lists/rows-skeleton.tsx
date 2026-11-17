import { Skeleton } from "heroui-native";
import { View } from "react-native";
import { LS } from "@/features/lantern/lantern-style";

const R = LS.row;

/** Production's loading rows in the row's own shape: photo, kicker, two-line title, meta. */
export function RowsSkeleton({ count = 6 }: { count?: number }) {
	return (
		<View accessibilityLabel="Loading">
			{Array.from({ length: count }, (_, i) => (
				<View
					className="flex-row items-center"
					key={i}
					style={{
						gap: R.gap,
						paddingHorizontal: LS.gutter,
						paddingVertical: R.padV,
					}}
				>
					<Skeleton
						style={{
							borderRadius: R.thumbR,
							height: R.thumbH,
							width: R.thumbW,
						}}
					/>
					<View className="flex-1 gap-2">
						<Skeleton className="h-3 w-1/3 rounded" />
						<Skeleton className="h-4 w-11/12 rounded" />
						<Skeleton className="h-3 w-1/2 rounded" />
					</View>
				</View>
			))}
		</View>
	);
}
