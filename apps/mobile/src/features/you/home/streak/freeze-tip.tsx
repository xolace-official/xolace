import { useEffect, useRef } from "react";
import {
	AccessibilityInfo,
	Pressable,
	View,
	type ViewInstance,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { COPY } from "@/features/you/copy";
import { useYouHome } from "@/features/you/home/you-data";
import { freezeCopy } from "@/features/you/home/you-model";
import { useYouUi } from "@/features/you/home/you-ui";
import { cn } from "@/lib/cn";

const IN_MS = 220;
const OUT_MS = 150;
/** After the fade starts: iOS drops a focus move onto a view that's still being inserted. */
const FOCUS_DELAY_MS = 250;

/**
 * Production's freeze explanation, dropped just below the streak card, with Buy one · 50
 * sparks. Drawn by the screen over everything (the tab bar follows the header); a tap anywhere
 * outside closes it, and any scroll does too. Buying keeps it open, now with the next reason.
 * For VoiceOver it's modal (the tabs behind it go quiet), takes focus as it opens, and the
 * escape gesture closes it.
 */
export function FreezeTip() {
	const { state, actions } = useYouHome();
	const { tip, closeTip } = useYouUi();
	const { streak, freeze, buying } = state;
	const shown = Boolean(tip.open && tip.top > 0 && streak && freeze);
	const explanation = useRef<ViewInstance>(null);

	useEffect(() => {
		if (!shown) {
			return;
		}
		const t = setTimeout(() => {
			if (explanation.current) {
				AccessibilityInfo.sendAccessibilityEvent(explanation.current, "focus");
			}
		}, FOCUS_DELAY_MS);
		return () => clearTimeout(t);
	}, [shown]);

	// Placed once the streak card has measured where it ends.
	if (!(shown && streak && freeze)) {
		return null;
	}
	const { label, hint } = freezeCopy(streak.freezes, streak.streak > 0);
	const off = freeze.reason !== null || buying;
	return (
		<>
			<Pressable
				accessibilityElementsHidden
				accessible={false}
				className="absolute inset-0"
				importantForAccessibility="no"
				onPress={closeTip}
			/>
			<Animated.View
				accessibilityViewIsModal
				className="absolute right-8 left-8 rounded-[16px] border-[0.5px] border-continuous border-separator bg-surface-secondary px-3.25 py-2.75 shadow-card"
				entering={FadeIn.duration(IN_MS)}
				exiting={FadeOut.duration(OUT_MS)}
				onAccessibilityEscape={closeTip}
				style={{ top: tip.top }}
			>
				<View
					accessibilityLabel={`${label}. ${hint}`}
					accessible
					ref={explanation}
				>
					<AppText
						className="mb-0.5 text-[13px] leading-[17px]"
						variant="footnote"
						weight="bold"
					>
						{label}
					</AppText>
					<AppText
						className="text-[12.5px] leading-[17.5px]"
						variant="footnote"
					>
						{hint}
					</AppText>
				</View>
				<View className="mt-2.5 flex-row items-center gap-2.5 border-separator border-t-[0.5px] pt-2.5">
					<PressScale
						accessibilityHint={freeze.reason ?? undefined}
						accessibilityRole="button"
						accessibilityState={{ busy: buying, disabled: off }}
						className={cn(
							"h-8 justify-center rounded-[16px] bg-accent px-3.5",
							off ? "opacity-40" : "opacity-100"
						)}
						disabled={off}
						onPress={actions.buyFreeze}
					>
						<AppText
							className="text-[13px]"
							color="accentForeground"
							variant="footnote"
							weight="semibold"
						>
							{COPY.streak.buy(freeze.price)}
						</AppText>
					</PressScale>
					<AppText
						accessibilityLiveRegion="polite"
						className="flex-1 text-[11.5px] leading-[15.5px]"
						color="muted"
						variant="caption"
					>
						{freeze.reason ?? COPY.streak.spare(freeze.sparks)}
					</AppText>
				</View>
			</Animated.View>
		</>
	);
}
