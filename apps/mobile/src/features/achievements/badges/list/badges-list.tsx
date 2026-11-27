import { ActivityIndicator, View } from "react-native";
import Animated, {
	type AnimatedRef,
	type SharedValue,
	useAnimatedScrollHandler,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { Loading } from "@/components/shared/loading";
import { useBadgesScreen } from "@/features/achievements/badges/badges-data";
import { BAR } from "@/features/achievements/badges/list/badges-bar";
import { CategoryRow } from "@/features/achievements/badges/list/category-row";
import { FreezeCard } from "@/features/achievements/badges/list/freeze-card";
import { SparksCard } from "@/features/achievements/badges/list/sparks-card";
import { COPY } from "@/features/achievements/copy";

const UNDER_BAR = -4;
const FOOT = 26;

export function BadgesList({
	scroll,
	y,
}: {
	scroll: AnimatedRef<Animated.ScrollView>;
	y: SharedValue<number>;
}) {
	const { state } = useBadgesScreen();
	const insets = useSafeAreaInsets();
	const onScroll = useAnimatedScrollHandler((e) => {
		y.set(e.contentOffset.y);
	});
	const { view } = state;
	return (
		<Animated.ScrollView
			contentContainerStyle={{
				paddingBottom: insets.bottom + FOOT,
				paddingTop: insets.top + BAR + UNDER_BAR,
			}}
			contentInsetAdjustmentBehavior="never"
			onScroll={onScroll}
			ref={scroll}
			scrollEventThrottle={16}
		>
			<AppText
				accessibilityRole="header"
				className="mx-5 mb-3 text-[34px] leading-[41px] tracking-[-0.85px]"
				variant="display"
			>
				{COPY.list.title}
			</AppText>
			{view ? (
				<>
					<SparksCard sparks={view.sparks} />
					{view.categories.map((c) => (
						<CategoryRow category={c} key={c.title} />
					))}
					<FreezeCard />
				</>
			) : (
				<Loading>
					<View className="items-center pt-10">
						<ActivityIndicator accessibilityLabel={COPY.list.loading} />
					</View>
				</Loading>
			)}
		</Animated.ScrollView>
	);
}
