import { View } from "react-native";
import {
	Bone,
	Line,
	SKELETON,
	SkeletonBreath,
} from "@/components/shared/skeleton";
import { META_W, TITLE_W, widthAt } from "@/components/shared/skeleton-shapes";
import { COPY } from "@/features/explore/copy";
import { EXS } from "@/features/explore/explore-style";

const R = EXS.row;

/** Loading rows in the row's own shape and the shared look: the 52 pt cover, a title and its meta.
 * Breathes on its own; `bare` leaves that to a section that already breathes (Explore home). */
export function RowsSkeleton({
	count = 6,
	bare,
}: {
	count?: number;
	bare?: boolean;
}) {
	const rows = Array.from({ length: count }, (_, i) => (
		<View
			className="flex-row items-center"
			key={i}
			style={{
				gap: R.gap,
				paddingHorizontal: R.padH,
				paddingVertical: R.padV,
			}}
		>
			<Bone h={R.art} r={R.artR} w={R.art} />
			<View className="flex-1 gap-0.5">
				<Line lh={21} w={widthAt(TITLE_W, i)} />
				<Line h={SKELETON.meta} lh={18} w={widthAt(META_W, i)} />
			</View>
		</View>
	));
	return bare ? (
		rows
	) : (
		<SkeletonBreath label={COPY.loading}>{rows}</SkeletonBreath>
	);
}
