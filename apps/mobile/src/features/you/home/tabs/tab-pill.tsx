import { Pressable, View } from "react-native";
import Animated, {
	clamp,
	type SharedValue,
	useAnimatedStyle,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { cn } from "@/lib/cn";

/** One docked tab: a glass pill whose filled state slides between neighbours as the pager
 * swipes. The inverted label rides inside the fill, so text and fill change together. */
export function TabPill({
	label,
	a11y,
	index,
	focused,
	badge,
	indexDecimal,
	onPress,
}: {
	label: string;
	a11y: string;
	index: number;
	focused: boolean;
	badge: number;
	indexDecimal: SharedValue<number>;
	onPress: () => void;
}) {
	const fillStyle = useAnimatedStyle(() => ({
		opacity: 1 - clamp(Math.abs(indexDecimal.get() - index), 0, 1),
	}));
	return (
		<Pressable
			accessibilityLabel={a11y}
			accessibilityRole="tab"
			accessibilityState={{ selected: focused }}
			className="h-9.5 flex-1 flex-row items-center justify-center gap-1.5 overflow-hidden rounded-[19px] border-[0.5px] border-separator bg-glass"
			onPress={onPress}
		>
			<PillLabel badge={badge} label={label} />
			<Animated.View
				accessibilityElementsHidden
				className="absolute inset-0 flex-row items-center justify-center gap-1.5 rounded-[19px] bg-foreground"
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
				className="text-[14px]"
				color={inverted ? "background" : "muted"}
				variant="callout"
				weight="semibold"
			>
				{label}
			</AppText>
			<TabBadge count={badge} inverted={inverted} />
		</>
	);
}

/** The waiting count beside Follow-ups; nothing at zero. */
export function TabBadge({
	count,
	inverted,
}: {
	count: number;
	inverted?: boolean;
}) {
	if (count <= 0) {
		return null;
	}
	return (
		<View
			className={cn(
				"h-4.5 min-w-4.5 items-center justify-center rounded-full px-1.25",
				inverted ? "bg-background" : "bg-accent"
			)}
		>
			<AppText
				className="text-[11px] leading-[13px]"
				color={inverted ? "foreground" : "accentForeground"}
				variant="caption"
				weight="bold"
			>
				{count}
			</AppText>
		</View>
	);
}
