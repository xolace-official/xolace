import { Skeleton } from "heroui-native";
import { useWindowDimensions, View } from "react-native";
import { LS } from "@/features/lantern/lantern-style";

const F = LS.forYou;
const SIDE_CARD = 300;

const Title = () => <Skeleton className="mx-4 mt-8 mb-3 h-6 w-40 rounded-md" />;

/** Production's loading home: Continue's card, then For you's centred row, its neighbours peeking. */
export function HomeSkeleton() {
	const { width } = useWindowDimensions();
	const itemW = Math.round(width * F.share);
	const card = { borderRadius: LS.card.r, height: LS.card.h };
	return (
		<View accessibilityLabel="Loading Lantern">
			<Title />
			<Skeleton className="mx-4" style={card} />
			<Title />
			<View
				className="flex-row items-center justify-center"
				style={{ gap: F.gap }}
			>
				<Skeleton style={{ ...card, height: SIDE_CARD, width: itemW }} />
				<Skeleton style={{ ...card, width: itemW }} />
				<Skeleton style={{ ...card, height: SIDE_CARD, width: itemW }} />
			</View>
		</View>
	);
}
