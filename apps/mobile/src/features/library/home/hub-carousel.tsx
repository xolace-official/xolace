/**
 * Paged hub carousel (#396): photo cards with HeroUI ScrollShadow on the
 * edges, and dots whose active one stretches and fades with the scroll
 * instead of snapping.
 */

import type { api } from "@xolace/backend/convex/_generated/api";
import type { FunctionReturnType } from "convex/server";
import { LinearGradient } from "expo-linear-gradient";
import { Link } from "expo-router";
import { ScrollShadow, useThemeColor } from "heroui-native";
import { Pressable, useWindowDimensions, View } from "react-native";
import Animated, {
	type SharedValue,
	useAnimatedScrollHandler,
	useAnimatedStyle,
	useSharedValue,
} from "react-native-reanimated";
import { AppText } from "@/src/components/shared/app-text";
import { CoverImage } from "@/src/features/library/cover-image";

type Hub = FunctionReturnType<typeof api.library.home.getHome>["hubs"][number];

const DOT = 6;
const DOT_ACTIVE = 18;
const GAP = 12;

function Dot({
	index,
	scrollX,
	page,
	color,
}: {
	index: number;
	scrollX: SharedValue<number>;
	page: number;
	color: string;
}) {
	const style = useAnimatedStyle(() => {
		// 0 → 1 → 2 as the page approaches, centres on, then leaves this dot
		const p = Math.max(
			0,
			Math.min(2, (scrollX.get() - (index - 1) * page) / page)
		);
		const t = p <= 1 ? p : 2 - p;
		return { opacity: 0.25 + 0.75 * t, width: DOT + (DOT_ACTIVE - DOT) * t };
	});
	return (
		<Animated.View
			style={[
				{ backgroundColor: color, borderRadius: DOT / 2, height: DOT },
				style,
			]}
		/>
	);
}

const countLine = (h: Hub) =>
	[
		`${h.entries} ${h.entries === 1 ? "entry" : "entries"}`,
		h.listens > 0 && `${h.listens} to listen`,
	]
		.filter(Boolean)
		.join(" · ");

export function HubCarousel({ hubs }: { hubs: Hub[] }) {
	const { width } = useWindowDimensions();
	const cardW = width - 48;
	const page = cardW + GAP;
	const scrollX = useSharedValue(0);
	const onScroll = useAnimatedScrollHandler((e) =>
		scrollX.set(e.contentOffset.x)
	);
	const accent = useThemeColor("accent");

	return (
		<View>
			<ScrollShadow LinearGradientComponent={LinearGradient} size={28}>
				<Animated.ScrollView
					contentContainerStyle={{ gap: GAP, paddingHorizontal: 24 }}
					decelerationRate="fast"
					horizontal
					onScroll={onScroll}
					scrollEventThrottle={16}
					showsHorizontalScrollIndicator={false}
					snapToInterval={page}
				>
					{hubs.map((hub) => (
						<Link
							asChild
							href={{
								params: { slug: hub.slug },
								pathname: "/browse/library/hub/[slug]",
							}}
							key={hub._id}
						>
							<Link.Trigger>
								<Pressable
									accessibilityRole="link"
									className="rounded-[28px] bg-surface p-2 active:opacity-90"
									style={{ borderCurve: "continuous", width: cardW }}
								>
									<View
										className="overflow-hidden rounded-[22px] bg-surface-secondary"
										style={{ height: cardW * 0.62 }}
									>
										<CoverImage
											style={{ height: "100%", width: "100%" }}
											thumbhash={hub.coverThumbhash}
											transition={200}
											uri={hub.coverUrl}
										/>
									</View>
									<View className="gap-1.5 px-3 pt-3 pb-3">
										<AppText className="font-bold text-[22px] leading-[27px]">
											{hub.title}
										</AppText>
										<AppText
											className="text-[14px] text-muted leading-5"
											numberOfLines={2}
										>
											{hub.intro}
										</AppText>
										<AppText className="font-semibold text-[13px] text-accent">
											{countLine(hub)}
										</AppText>
									</View>
								</Pressable>
							</Link.Trigger>
							<Link.Preview />
						</Link>
					))}
				</Animated.ScrollView>
			</ScrollShadow>
			{hubs.length > 1 && (
				<View
					className="flex-row items-center justify-center gap-2 pt-4"
					importantForAccessibility="no-hide-descendants"
				>
					{hubs.map((h, i) => (
						<Dot
							color={accent}
							index={i}
							key={h._id}
							page={page}
							scrollX={scrollX}
						/>
					))}
				</View>
			)}
		</View>
	);
}
