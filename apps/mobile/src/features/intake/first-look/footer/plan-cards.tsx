// The plans the store sells, side by side, with one ember frame that slides to the picked one.
// Names, prices and tags come from the store (`purchases/plans.ts`).
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withTiming,
} from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { PLAY_AS_CHOSEN } from "@/design/springs";
import { planPrice, planTag } from "@/features/purchases/plans";
import type { PlanId } from "@/features/purchases/screens/paywall-period-picker";
import { playSoftPress } from "@/lib/haptics";
import { FIRST_LOOK } from "../copy";
import { useFirstLookData } from "../first-look-data";
import { MOVE_EASE } from "../first-look-motion";

const GAP = 8;
const SLIDE_MS = 380;
const ORDER: readonly PlanId[] = ["annual", "monthly"];
const CARD_MAX_SCALE = 1.3;

export function PlanCards({ reduced }: { reduced: boolean }) {
	const { actions, state } = useFirstLookData();
	const sellable = ORDER.filter((id) => state.plans[id].pkg);
	const [w, setW] = useState(0);
	const half = sellable.length > 1 ? (w - GAP) / 2 : w;
	const x = sellable.indexOf(state.plan) > 0 ? half + GAP : 0;
	// The first measure places the frame; later picks slide it.
	const tx = useSharedValue(-1);
	useEffect(() => {
		if (w === 0) {
			return;
		}
		if (tx.get() < 0 || reduced) {
			tx.set(x);
		} else {
			tx.set(
				withTiming(x, {
					duration: SLIDE_MS,
					easing: MOVE_EASE,
					...PLAY_AS_CHOSEN,
				})
			);
		}
	}, [reduced, tx, w, x]);
	const frame = useAnimatedStyle(() => ({
		transform: [{ translateX: Math.max(0, tx.get()) }],
	}));
	const lock = state.busy || state.buying || state.restoring;

	return (
		<View
			accessibilityLabel={FIRST_LOOK.a11y.plans}
			accessibilityRole="radiogroup"
			className="min-h-14 flex-row"
			onLayout={(e) => setW(e.nativeEvent.layout.width)}
			style={{ gap: GAP }}
		>
			{w > 0 ? (
				<Animated.View
					className="absolute inset-y-0 left-0 rounded-[18px] border-2 border-ember bg-ember-wash"
					pointerEvents="none"
					style={[{ borderCurve: "continuous", width: half }, frame]}
				/>
			) : null}
			{sellable.map((id) => {
				const on = id === state.plan;
				const price = planPrice(id, state.plans) ?? "";
				const tag = planTag(id, state.plans);
				const name = FIRST_LOOK.plans[id];
				return (
					<PressScale
						accessibilityLabel={[name, price, tag].filter(Boolean).join(", ")}
						accessibilityRole="radio"
						accessibilityState={{ checked: on, disabled: lock, selected: on }}
						className="flex-1 justify-center gap-0.5 rounded-[18px] border-[1.5px] border-separator px-3 py-2"
						disabled={lock}
						haptic={playSoftPress}
						key={id}
						onPress={() => actions.pick(id)}
						style={{ borderCurve: "continuous" }}
					>
						<View className="flex-row items-center justify-between gap-1">
							<AppText
								maxFontSizeMultiplier={CARD_MAX_SCALE}
								variant="callout"
								weight="semibold"
							>
								{name}
							</AppText>
							{tag ? (
								<View className="h-5 justify-center rounded-full bg-ember px-[7px]">
									<AppText
										className="text-offer-ink"
										maxFontSizeMultiplier={CARD_MAX_SCALE}
										variant="caption"
										weight="bold"
									>
										{tag}
									</AppText>
								</View>
							) : null}
						</View>
						<AppText
							className="tabular-nums"
							color="muted"
							maxFontSizeMultiplier={CARD_MAX_SCALE}
							variant="caption"
						>
							{price}
						</AppText>
					</PressScale>
				);
			})}
		</View>
	);
}
