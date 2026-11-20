import { Link } from "expo-router";
import { useWindowDimensions, View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedScrollHandler,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { CoverImage } from "@/components/shared/cover-image";
import { PressScale } from "@/components/shared/press-scale";
import { LinearGradient } from "@/components/shared/styled";
import { clearOf } from "@/design/clear-of";
import { useHomeScreen } from "@/features/lantern/home/home-data";
import { hubHref } from "@/features/lantern/lantern-links";
import { type HomeHub, hubCountLine } from "@/features/lantern/lantern-model";
import { LS } from "@/features/lantern/lantern-style";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColors } from "@/lib/use-token-color";

const H = LS.hub;

export function HubCarousel() {
	const hubs = useHomeScreen().state.home?.hubs ?? [];
	const { width } = useWindowDimensions();
	const [page, separator] = useTokenColors(["background", "separator"]);
	const cardW = width - H.inset * 2;
	const step = cardW + H.gap;
	const scrollX = useSharedValue(0);
	const onScroll = useAnimatedScrollHandler((e) => {
		scrollX.set(e.contentOffset.x);
	});
	return (
		<View>
			<View>
				<Animated.ScrollView
					contentContainerStyle={{ gap: H.gap, paddingHorizontal: H.inset }}
					decelerationRate="fast"
					horizontal
					onScroll={onScroll}
					scrollEventThrottle={16}
					showsHorizontalScrollIndicator={false}
					snapToInterval={step}
				>
					{hubs.map((h) => (
						<HubCard hub={h} key={h._id} line={separator} width={cardW} />
					))}
				</Animated.ScrollView>
				<LinearGradient
					className="absolute top-0 bottom-0 left-0"
					colors={[page, clearOf(page)]}
					end={{ x: 1, y: 0 }}
					pointerEvents="none"
					start={{ x: 0, y: 0 }}
					style={{ width: H.fade }}
				/>
				<LinearGradient
					className="absolute top-0 right-0 bottom-0"
					colors={[clearOf(page), page]}
					end={{ x: 1, y: 0 }}
					pointerEvents="none"
					start={{ x: 0, y: 0 }}
					style={{ width: H.fade }}
				/>
			</View>
			{hubs.length > 1 ? (
				<View
					accessibilityElementsHidden
					className="flex-row items-center justify-center pt-4"
					importantForAccessibility="no-hide-descendants"
					style={{ gap: H.dotGap }}
				>
					{hubs.map((h, i) => (
						<Dot index={i} key={h._id} page={step} scrollX={scrollX} />
					))}
				</View>
			) : null}
		</View>
	);
}

function HubCard({
	hub,
	width,
	line,
}: {
	hub: HomeHub;
	width: number;
	line: string;
}) {
	const reduced = useEffectiveReducedMotion();
	const count = hubCountLine(hub);
	const cover = {
		borderRadius: H.coverR,
		height: width * H.cover,
		width: width - H.pad * 2,
	};
	return (
		<Link asChild href={hubHref(hub.slug)}>
			<Link.Trigger withAppleZoom={!reduced}>
				<PressScale
					accessibilityLabel={`${hub.title}. ${count}`}
					accessibilityRole="link"
					card
					className="bg-surface"
					style={{
						borderCurve: "continuous",
						borderRadius: H.r,
						boxShadow: `0px 0px 0px 1px ${line}`,
						padding: H.pad,
						width,
					}}
				>
					<View
						className="overflow-hidden bg-surface-secondary"
						style={{ ...cover, borderCurve: "continuous" }}
					>
						<CoverImage
							style={cover}
							thumbhash={hub.coverThumbhash}
							transition={200}
							uri={hub.coverUrl}
						/>
					</View>
					<View className="gap-1.5 px-3 pt-3 pb-2.5">
						<AppText
							className="text-[22px] leading-[26.4px] tracking-[-0.33px]"
							variant="headlineL"
						>
							{hub.title}
						</AppText>
						<AppText
							className="text-[14px] leading-[20px]"
							color="muted"
							numberOfLines={2}
							variant="callout"
						>
							{hub.intro}
						</AppText>
						<AppText
							className="text-[13px] leading-[17px]"
							color="accent"
							variant="footnote"
							weight="semibold"
						>
							{count}
						</AppText>
					</View>
				</PressScale>
			</Link.Trigger>
		</Link>
	);
}

function Dot({
	index,
	page,
	scrollX,
}: {
	index: number;
	page: number;
	scrollX: SharedValue<number>;
}) {
	const style = useAnimatedStyle(() => {
		const p = Math.max(
			0,
			Math.min(2, (scrollX.get() - (index - 1) * page) / page)
		);
		const k = p <= 1 ? p : 2 - p;
		return { opacity: 0.25 + 0.75 * k, width: H.dot + (H.dotOn - H.dot) * k };
	});
	return (
		<Animated.View
			className="bg-accent"
			style={[{ borderRadius: H.dot / 2, height: H.dot }, style]}
		/>
	);
}
