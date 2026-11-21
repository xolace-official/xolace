import { useWindowDimensions, View } from "react-native";
import { Bone, Line, SkeletonBreath } from "@/components/shared/skeleton";
import { LS } from "@/features/lantern/lantern-style";

const F = LS.forYou;
const SIDE_CARD = 300;

function Title() {
	return (
		<View className="mx-4 mt-8 mb-3">
			<Line h={20} lh={24} w={160} />
		</View>
	);
}

export function HomeSkeleton() {
	const { width } = useWindowDimensions();
	const itemW = Math.round(width * F.share);
	return (
		<SkeletonBreath label="Loading Lantern">
			<Title />
			<Bone className="mx-4" h={LS.card.h} r={LS.card.r} w="auto" />
			<Title />
			<View
				className="flex-row items-center justify-center"
				style={{ gap: F.gap }}
			>
				<Bone h={SIDE_CARD} r={LS.card.r} w={itemW} />
				<Bone h={LS.card.h} r={LS.card.r} w={itemW} />
				<Bone h={SIDE_CARD} r={LS.card.r} w={itemW} />
			</View>
		</SkeletonBreath>
	);
}
