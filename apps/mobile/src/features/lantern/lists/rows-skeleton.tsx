import { View } from "react-native";
import {
	Bone,
	Line,
	SKELETON,
	SkeletonBreath,
} from "@/components/shared/skeleton";
import { META_W, TITLE_W, widthAt } from "@/components/shared/skeleton-shapes";
import { LS } from "@/features/lantern/lantern-style";

const R = LS.row;

export function RowsSkeleton({
	count = 6,
	label = "Loading",
}: {
	count?: number;
	label?: string;
}) {
	return (
		<SkeletonBreath label={label}>
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
					<Bone h={R.thumbH} r={R.thumbR} w={R.thumbW} />
					<View className="flex-1">
						<Line h={SKELETON.meta} lh={16} w="33%" />
						<Line lh={21} w={widthAt(TITLE_W, i + 2)} />
						<Line h={SKELETON.meta} lh={18} w={widthAt(META_W, i)} />
					</View>
				</View>
			))}
		</SkeletonBreath>
	);
}
