import { useState } from "react";
import { Pressable, useWindowDimensions, View } from "react-native";
import {
	type TabBarRenderProps,
	useCollapseProgress,
} from "react-native-collapsible-tab";
import Animated, {
	clamp,
	Extrapolation,
	interpolate,
	type SharedValue,
	useAnimatedReaction,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
	withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import { AppText } from "@/components/shared/app-text";
import { tap } from "@/lib/haptics";
import { cn } from "@/lib/utils";

const TAB_BAR_HEIGHT = 52;
const GUTTER = 20;
// Morph only once the header is fully docked, so a slow scroll doesn't flicker.
const DOCK_THRESHOLD = 0.99;
// Pop in with a short overshoot; leave quickly with no bounce.
const DOCK_SPRING = { damping: 14, mass: 0.8, stiffness: 320 };
const UNDOCK_MS = 150;

type Props = TabBarRenderProps & {
	/** Count shown beside a tab's label, keyed by tab name. Zero hides it. */
	badges?: Record<string, number>;
};

/** Underlined text tabs while the header is open; once it docks under the top
 * bar they spring into pills. Both rows track the pager mid-swipe. */
export function ProfileTabBar({
	tabNames,
	tabLabels,
	indexDecimal,
	activeIndex,
	onTabPress,
	badges,
}: Props) {
	const { width } = useWindowDimensions();
	const tabWidth = (width - GUTTER * 2) / tabNames.length;
	const collapse = useCollapseProgress();
	// 0 = underline row, 1 = pill row. Separate from collapse so the two
	// directions can use different curves.
	const morph = useSharedValue(0);
	const [docked, setDocked] = useState(false);

	useAnimatedReaction(
		() => collapse.get() >= DOCK_THRESHOLD,
		(isDocked, wasDocked) => {
			if (wasDocked === null || isDocked === wasDocked) {
				return;
			}
			morph.set(
				isDocked
					? withSpring(1, DOCK_SPRING)
					: withTiming(0, { duration: UNDOCK_MS })
			);
			scheduleOnRN(setDocked, isDocked);
		}
	);

	const press = (index: number) => {
		if (index !== activeIndex) {
			tap();
		}
		onTabPress(tabNames[index]);
	};

	const pillRowStyle = useAnimatedStyle(() => ({
		opacity: morph.get(),
		transform: [{ scale: interpolate(morph.get(), [0, 1], [0.85, 1]) }],
	}));
	const lineRowStyle = useAnimatedStyle(() => ({
		opacity: interpolate(morph.get(), [0, 1], [1, 0], Extrapolation.CLAMP),
	}));
	const indicatorStyle = useAnimatedStyle(() => ({
		transform: [{ translateX: indexDecimal.get() * tabWidth }],
	}));

	const tabs = tabNames.map((name, index) => ({
		badge: badges?.[name] ?? 0,
		focused: index === activeIndex,
		index,
		label: tabLabels[name] ?? name,
		name,
	}));

	return (
		<View accessibilityRole="tablist" style={{ height: TAB_BAR_HEIGHT }}>
			<Animated.View
				accessibilityElementsHidden={docked}
				className="absolute inset-0 flex-row"
				importantForAccessibility={docked ? "no-hide-descendants" : "auto"}
				pointerEvents={docked ? "none" : "auto"}
				style={[{ paddingHorizontal: GUTTER }, lineRowStyle]}
			>
				{tabs.map((t) => (
					<Pressable
						accessibilityLabel={tabA11yLabel(t.label, t.badge)}
						accessibilityRole="tab"
						accessibilityState={{ selected: t.focused }}
						className="flex-1 flex-row items-center justify-center gap-1.5"
						key={t.name}
						onPress={() => press(t.index)}
					>
						<AppText
							className={cn(
								"font-semibold text-[15px]",
								t.focused ? "text-foreground" : "text-muted"
							)}
						>
							{t.label}
						</AppText>
						<Badge count={t.badge} />
					</Pressable>
				))}
				<View className="absolute inset-x-5 bottom-0 h-px bg-separator/55" />
				<Animated.View
					className="absolute bottom-0 items-center"
					style={[{ left: GUTTER, width: tabWidth }, indicatorStyle]}
				>
					<View className="h-[2.5px] w-12 rounded-full bg-foreground" />
				</Animated.View>
			</Animated.View>

			<Animated.View
				accessibilityElementsHidden={!docked}
				className="absolute inset-0 flex-row items-center gap-2"
				importantForAccessibility={docked ? "auto" : "no-hide-descendants"}
				pointerEvents={docked ? "auto" : "none"}
				style={[{ paddingHorizontal: GUTTER }, pillRowStyle]}
			>
				{tabs.map((t) => (
					<Pill
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

type PillProps = {
	label: string;
	index: number;
	focused: boolean;
	badge: number;
	indexDecimal: SharedValue<number>;
	onPress: () => void;
};

function Pill({
	label,
	index,
	focused,
	badge,
	indexDecimal,
	onPress,
}: PillProps) {
	// The filled state slides between neighbours as the pager swipes. The
	// inverted label rides inside the fill, so text and fill change together
	// instead of the text snapping on tap while the fill is still fading.
	const fillStyle = useAnimatedStyle(() => ({
		opacity: 1 - clamp(Math.abs(indexDecimal.get() - index), 0, 1),
	}));
	return (
		<Pressable
			accessibilityLabel={tabA11yLabel(label, badge)}
			accessibilityRole="tab"
			accessibilityState={{ selected: focused }}
			className="h-[38px] flex-1 flex-row items-center justify-center gap-1.5 overflow-hidden rounded-full border border-border/60 bg-surface"
			onPress={onPress}
		>
			<PillLabel badge={badge} label={label} />
			<Animated.View
				accessibilityElementsHidden
				className="absolute inset-0 flex-row items-center justify-center gap-1.5 rounded-full bg-foreground"
				importantForAccessibility="no-hide-descendants"
				style={fillStyle}
			>
				<PillLabel badge={badge} inverted label={label} />
			</Animated.View>
		</Pressable>
	);
}

function PillLabel({
	label,
	badge,
	inverted,
}: {
	label: string;
	badge: number;
	inverted?: boolean;
}) {
	return (
		<>
			<AppText
				className={cn(
					"font-semibold text-sm",
					inverted ? "text-background" : "text-foreground"
				)}
			>
				{label}
			</AppText>
			<Badge count={badge} inverted={inverted} />
		</>
	);
}

function Badge({ count, inverted }: { count: number; inverted?: boolean }) {
	if (count <= 0) {
		return null;
	}
	return (
		<View
			className={cn(
				"h-[18px] min-w-[18px] items-center justify-center rounded-full px-1.5",
				inverted ? "bg-background" : "bg-ember"
			)}
		>
			<AppText
				className={cn(
					"font-bold text-[11px]",
					inverted ? "text-foreground" : "text-background"
				)}
			>
				{count}
			</AppText>
		</View>
	);
}

function tabA11yLabel(label: string, badge: number) {
	return badge > 0 ? `${label}, ${badge} waiting on you` : label;
}
