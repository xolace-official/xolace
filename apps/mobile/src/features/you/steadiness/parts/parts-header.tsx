import { useEffect } from "react";
import { View } from "react-native";
import Animated, {
	Easing,
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { Icon } from "@/components/shared/icon";
import { PressScale } from "@/components/shared/press-scale";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { COPY } from "@/features/you/copy";
import {
	type PartsView,
	useSteadinessUi,
} from "@/features/you/steadiness/steadiness-ui";
import { useEffectiveReducedMotion } from "@/lib/motion/use-effective-reduced-motion";
import { useTokenColor } from "@/lib/use-token-color";

const S = COPY.steadinessScreen;
// Production's ViewToggle, its one pill sliding as native-cook's pricing-segmented-button
// (480 ms, bezier(.65, 0, .35, 1)); the icon tints cross-fade.
const SEG_W = 46;
const SEG_H = 30;
const PILL_MS = 480;
const PILL_EASE = Easing.bezier(0.65, 0, 0.35, 1);
const ICON_FADE_MS = 200;
const ICONS = {
	grid: { android: "grid_view", ios: "circle.grid.2x2.fill" },
	list: { android: "view_list", ios: "list.bullet" },
} as const;

/** "Parts of your life" and the grid / list toggle. */
export function PartsHeader() {
	const { view, setView } = useSteadinessUi();
	return (
		<View className="mt-5 flex-row items-center justify-between">
			<AppText
				accessibilityRole="header"
				className="text-[20px] leading-[26px] tracking-[-0.2px]"
				variant="title"
				weight="semibold"
			>
				{S.parts}
			</AppText>
			<ViewToggle onChange={setView} value={view} />
		</View>
	);
}

function ViewToggle({
	value,
	onChange,
}: {
	value: PartsView;
	onChange: (v: PartsView) => void;
}) {
	const reduced = useEffectiveReducedMotion();
	const at = useSharedValue(value === "list" ? 1 : 0);
	useEffect(() => {
		const to = value === "list" ? 1 : 0;
		at.set(
			reduced
				? to
				: withTiming(to, {
						duration: PILL_MS,
						easing: PILL_EASE,
						...PLAY_AS_CHOSEN,
					})
		);
	}, [value, reduced, at]);
	const pill = useAnimatedStyle(() => ({
		transform: [{ translateX: at.get() * SEG_W }],
	}));
	return (
		<View
			accessibilityLabel={S.partsAs}
			accessibilityRole="radiogroup"
			className="flex-row rounded-full bg-surface-secondary p-1"
		>
			<Animated.View
				className="absolute top-1 left-1 rounded-full bg-accent"
				style={[{ height: SEG_H, width: SEG_W }, pill]}
			/>
			{(["grid", "list"] as const).map((v) => (
				<PressScale
					accessibilityLabel={v === "grid" ? S.gridLabel : S.listLabel}
					accessibilityRole="radio"
					accessibilityState={{ selected: value === v }}
					className="items-center justify-center"
					key={v}
					onPress={() => value !== v && onChange(v)}
					style={{ height: SEG_H, width: SEG_W }}
				>
					<ToggleIcon on={value === v} view={v} />
				</PressScale>
			))}
		</View>
	);
}

/** Two layers, one opacity: the tint follows the pill. */
function ToggleIcon({ on, view }: { on: boolean; view: PartsView }) {
	const subtle = useTokenColor("subtle");
	const ink = useTokenColor("accent-foreground");
	const reduced = useEffectiveReducedMotion();
	const o = useSharedValue(on ? 1 : 0);
	useEffect(() => {
		const to = on ? 1 : 0;
		o.set(
			reduced
				? to
				: withTiming(to, { duration: ICON_FADE_MS, ...PLAY_AS_CHOSEN })
		);
	}, [on, reduced, o]);
	const onStyle = useAnimatedStyle(() => ({ opacity: o.get() }));
	return (
		<View className="size-3.75">
			<Icon color={subtle} name={ICONS[view]} size={15} weight="semibold" />
			<Animated.View className="absolute inset-0" style={onStyle}>
				<Icon color={ink} name={ICONS[view]} size={15} weight="semibold" />
			</Animated.View>
		</View>
	);
}
