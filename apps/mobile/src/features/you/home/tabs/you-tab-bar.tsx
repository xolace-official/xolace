import { useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import {
	type TabBarRenderProps,
	useCollapseProgress,
} from "react-native-collapsible-tab";
import Animated, {
	Extrapolation,
	interpolate,
	useAnimatedReaction,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { AppText } from "@/components/shared/app-text";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { COPY } from "@/features/you/copy";
import { TabBadge, TabPill } from "@/features/you/home/tabs/tab-pill";
import { tap } from "@/lib/haptics";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";

const GUTTER = 20;
const DOCK_THRESHOLD = 0.99;
const DOCK_SPRING = { damping: 14, mass: 0.8, stiffness: 320 };
const UNDOCK_MS = 150;
const FADE_MS = 200;
const PILL_FROM = 0.85;

type Props = TabBarRenderProps & {
	badges?: Record<string, number>;
};

export function YouTabBar({
	tabNames,
	tabLabels,
	indexDecimal,
	activeIndex,
	onTabPress,
	badges,
}: Props) {
	const reduced = useEffectiveReducedMotion();
	const { width } = useWindowDimensions();
	const tabWidth = (width - GUTTER * 2) / tabNames.length;
	const collapse = useCollapseProgress();
	const morph = useSharedValue(0);
	const [docked, setDocked] = useState(false);

	useAnimatedReaction(
		() => collapse.get() >= DOCK_THRESHOLD,
		(isDocked, wasDocked) => {
			if (wasDocked === null || isDocked === wasDocked) {
				return;
			}
			if (!isDocked) {
				morph.set(withTiming(0, { duration: UNDOCK_MS, ...PLAY_AS_CHOSEN }));
			} else if (reduced) {
				morph.set(withTiming(1, { duration: FADE_MS, ...PLAY_AS_CHOSEN }));
			} else {
				morph.set(withSpring(1, { ...DOCK_SPRING, ...PLAY_AS_CHOSEN }));
			}
			scheduleOnRN(setDocked, isDocked);
		}
	);

	const press = (index: number) => {
		const name = tabNames[index];
		if (name === undefined) {
			return;
		}
		if (index !== activeIndex) {
			tap();
		}
		onTabPress(name);
	};

	const pillRowStyle = useAnimatedStyle(() => ({
		opacity: morph.get(),
		transform: [
			{ scale: reduced ? 1 : interpolate(morph.get(), [0, 1], [PILL_FROM, 1]) },
		],
	}));
	const lineRowStyle = useAnimatedStyle(() => ({
		opacity: interpolate(morph.get(), [0, 1], [1, 0], Extrapolation.CLAMP),
	}));
	const indicatorStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: indexDecimal.get() * tabWidth }],
	}));

	const tabs = tabNames.map((name, index) => {
		const badge = badges?.[name] ?? 0;
		const label = tabLabels[name] ?? name;
		return {
			a11y: COPY.tabs.label(label, badge, index, tabNames.length),
			badge,
			focused: index === activeIndex,
			index,
			label,
			name,
		};
	});

	return (
		<View accessibilityRole="tablist" className="h-13">
			<Animated.View
				accessibilityElementsHidden={docked}
				className="absolute inset-0 flex-row px-5"
				importantForAccessibility={docked ? "no-hide-descendants" : "auto"}
				pointerEvents={docked ? "none" : "auto"}
				style={lineRowStyle}
			>
				{tabs.map((t) => (
					<Pressable
						accessibilityLabel={t.a11y}
						accessibilityRole="tab"
						accessibilityState={{ selected: t.focused }}
						className="flex-1 flex-row items-center justify-center gap-1.5"
						key={t.name}
						onPress={() => press(t.index)}
					>
						<AppText
							className="text-[15px]"
							color={t.focused ? "foreground" : "subtle"}
							variant="callout"
							weight="semibold"
						>
							{t.label}
						</AppText>
						<TabBadge count={t.badge} />
					</Pressable>
				))}
				<View className="absolute right-5 bottom-0 left-5 h-[0.5px] bg-separator" />
				<Animated.View
					className="absolute bottom-0 left-5 items-center"
					style={[{ width: tabWidth }, indicatorStyle]}
				>
					<View className="h-[2.5px] w-12 rounded-[2px] bg-foreground" />
				</Animated.View>
			</Animated.View>

			<Animated.View
				accessibilityElementsHidden={!docked}
				className="absolute inset-0 flex-row items-center gap-2 px-5"
				importantForAccessibility={docked ? "auto" : "no-hide-descendants"}
				pointerEvents={docked ? "auto" : "none"}
				style={pillRowStyle}
			>
				{tabs.map((t) => (
					<TabPill
						a11y={t.a11y}
						badge={t.badge}
						focused={t.focused}
						index={t.index}
						indexDecimal={indexDecimal}
						key={t.name}
						label={t.label}
						onPress={() => press(t.index)}
					/>
				))}
			</Animated.View>
		</View>
	);
}
