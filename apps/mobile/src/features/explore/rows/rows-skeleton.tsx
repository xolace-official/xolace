import { Skeleton } from "heroui-native";
import { View } from "react-native";
import { COPY } from "@/features/explore/copy";
import { EXS } from "@/features/explore/explore-style";

const R = EXS.row;

/** Loading rows in the row's own shape: the 52 pt cover, a title and its meta. */
export function RowsSkeleton({ count = 6 }: { count?: number }) {
	return (
		<View accessibilityLabel={COPY.loading}>
			{Array.from({ length: count }, (_, i) => (
				<View
					className="flex-row items-center"
					key={i}
					style={{
						gap: R.gap,
						paddingHorizontal: R.padH,
						paddingVertical: R.padV,
					}}
				>
					<Skeleton
						style={{ borderRadius: R.artR, height: R.art, width: R.art }}
					/>
					<View className="flex-1 gap-2">
						<Skeleton className="h-3.75 w-3/5 rounded" />
						<Skeleton className="h-3 w-2/5 rounded" />
					</View>
				</View>
			))}
		</View>
	);
}
