import { useWindowDimensions } from "react-native";
import Animated, {
	Extrapolation,
	interpolate,
	type SharedValue,
	useAnimatedScrollHandler,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { useHomeScreen } from "@/features/lantern/home/home-data";
import { PhotoCard, type PhotoEntry } from "@/features/lantern/home/photo-card";
import { type CardItem, reasonLine } from "@/features/lantern/lantern-model";
import { LS } from "@/features/lantern/lantern-style";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

const F = LS.forYou;
const RANGE = [0, F.flat, 1];

export function ForYouCarousel() {
	const { state, actions } = useHomeScreen();
	const { width } = useWindowDimensions();
	const itemW = Math.round(width * F.share);
	const scrollX = useSharedValue(0);
	const reduced = useEffectiveReducedMotion();
	const onScroll = useAnimatedScrollHandler((e) => {
		scrollX.set(e.contentOffset.x);
	});
	return (
		<Animated.ScrollView
			contentContainerStyle={{
				gap: F.gap,
				paddingHorizontal: (width - itemW) / 2,
			}}
			decelerationRate="fast"
			horizontal
			onScroll={onScroll}
			scrollEventThrottle={16}
			showsHorizontalScrollIndicator={false}
			snapToInterval={itemW + F.gap}
		>
			{state.home?.forYou.map((f, i) => (
				<Card
					entry={f.entry}
					index={i}
					itemW={itemW}
					key={f.entry._id}
					kicker={reasonLine(f.reason)}
					onShare={actions.share}
					reduced={reduced}
					scrollX={scrollX}
				/>
			))}
		</Animated.ScrollView>
	);
}

type CardProps = {
	entry: CardItem;
	kicker: string;
	index: number;
	itemW: number;
	scrollX: SharedValue<number>;
	reduced: boolean;
	onShare: (entry: PhotoEntry) => void;
};

function Card({
	entry,
	kicker,
	index,
	itemW,
	scrollX,
	reduced,
	onShare,
}: CardProps) {
	const step = itemW + F.gap;
	const scale = useAnimatedStyle(() => {
		if (reduced) {
			return { transform: [{ scale: 1 }] };
		}
		const d = Math.abs(scrollX.get() - index * step) / step;
		return {
			transform: [
				{ scale: interpolate(d, RANGE, [1, 1, F.scale], Extrapolation.CLAMP) },
			],
		};
	});
	const dim = useAnimatedStyle(() => {
		if (reduced) {
			return { opacity: 0 };
		}
		const d = Math.abs(scrollX.get() - index * step) / step;
		return {
			opacity: interpolate(d, RANGE, [0, 0, F.dim], Extrapolation.CLAMP),
		};
	});
	return (
		<Animated.View style={[{ width: itemW }, scale]}>
			<PhotoCard
				entry={entry}
				from="home"
				height={LS.card.h}
				kicker={kicker}
				onShare={onShare}
				width={itemW}
			/>
			<Animated.View
				className="absolute inset-0 bg-cover-scrim"
				pointerEvents="none"
				style={[{ borderCurve: "continuous", borderRadius: LS.card.r }, dim]}
			/>
		</Animated.View>
	);
}
