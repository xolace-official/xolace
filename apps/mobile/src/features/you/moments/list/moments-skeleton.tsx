import { View } from "react-native";
import { Line, Pill, SkeletonBreath } from "@/components/shared/skeleton";
import { TITLE_W, widthAt } from "@/components/shared/skeleton-shapes";
import { MOMENTS_COPY } from "@/features/you/moments/copy";

const CARDS = 4;

export function MomentsSkeleton() {
	return (
		<SkeletonBreath className="gap-2.5 pt-2" label={MOMENTS_COPY.list.loading}>
			<View className="px-1 pb-0.5">
				<Line lh={20} w={64} />
			</View>
			{Array.from({ length: CARDS }, (_, i) => (
				<View
					className="gap-2 rounded-[24px] border border-continuous border-separator bg-surface p-4"
					key={i}
				>
					<View>
						<Line lh={23} w="92%" />
						<Line lh={23} w={widthAt(TITLE_W, i)} />
					</View>
					<View className="flex-row items-center justify-between">
						<Line h={11} lh={18} w="40%" />
						<Pill h={24} w={64} />
					</View>
				</View>
			))}
		</SkeletonBreath>
	);
}
