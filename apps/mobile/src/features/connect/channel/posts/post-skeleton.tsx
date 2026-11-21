import { View } from "react-native";
import { Line, Pill, SkeletonBreath } from "@/components/shared/skeleton";
import { CHANNEL } from "../copy";

const CARDS = 2;

export function PostSkeleton() {
	return (
		<SkeletonBreath
			className="flex-1 justify-end gap-3 px-3.5 pb-24"
			fill
			label={CHANNEL.loading}
		>
			{Array.from({ length: CARDS }, (_, i) => (
				<View
					className="gap-1 rounded-[24px] border-continuous bg-surface p-4"
					key={i}
				>
					<Line lh={21} w={176} />
					<Line lh={20} w="100%" />
					<Line lh={20} w="60%" />
					<View className="mt-1.5">
						<Pill h={32} w={80} />
					</View>
				</View>
			))}
		</SkeletonBreath>
	);
}
