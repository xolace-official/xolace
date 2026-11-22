import { Spinner } from "heroui-native";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import { LinearGradient } from "@/components/shared/styled";
import { clearOf } from "@/design/clear-of";
import { planCta, planPriceLine } from "@/features/purchases/plans";
import { PaywallPlansUnavailable } from "@/features/purchases/screens/paywall-plans-unavailable";
import { cn } from "@/lib/cn";
import { playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";
import { FIRST_LOOK } from "../copy";
import { useFirstLookData } from "../first-look-data";
import { LegalLinks } from "./legal-links";
import { PlanCards } from "./plan-cards";

const FADE_H = 26;
const BOTTOM = 20;
const CTA_SCALE = 0.97;
const CTA_MAX_SCALE = 1.4;

function BuyButton() {
	const { actions, state } = useFirstLookData();
	const onEmber = useTokenColor("offer-ink");
	const label = planCta(state.plan, state.plans);
	const off =
		state.busy ||
		state.buying ||
		state.restoring ||
		state.owned ||
		!state.plans[state.plan].pkg;
	return (
		<PressScale
			accessibilityLabel={label}
			accessibilityRole="button"
			accessibilityState={{ busy: state.buying, disabled: off }}
			className={cn(
				"mt-2.5 min-h-13.5 items-center justify-center rounded-full bg-ember px-5",
				off && !state.buying && "opacity-50"
			)}
			disabled={off}
			haptic={playSoftPress}
			onPress={actions.buy}
			scaleTo={CTA_SCALE}
		>
			{state.buying ? (
				<Spinner color={onEmber} />
			) : (
				<AppText
					className="text-offer-ink"
					maxFontSizeMultiplier={CTA_MAX_SCALE}
					variant="body"
					weight="semibold"
				>
					{label}
				</AppText>
			)}
		</PressScale>
	);
}

export function FirstLookFooter({ reduced }: { reduced: boolean }) {
	const { actions, state } = useFirstLookData();
	const { bottom } = useSafeAreaInsets();
	const background = useTokenColor("background");
	const clear = clearOf(background);
	const price = planPriceLine(state.plan, state.plans);
	const lock = state.busy || state.buying || state.restoring;
	return (
		<View
			className="bg-background px-4.5 pt-2.5"
			style={{ paddingBottom: BOTTOM + bottom }}
		>
			<LinearGradient
				className="absolute inset-x-0"
				colors={[clear, background]}
				pointerEvents="none"
				style={{ height: FADE_H, top: -FADE_H }}
			/>
			{state.unavailable ? (
				<PaywallPlansUnavailable
					isRetrying={state.retrying}
					onRetry={actions.retry}
				/>
			) : (
				<>
					<PlanCards reduced={reduced} />
					<BuyButton />
					{price ? (
						<AppText
							center
							className="mx-1.5 mt-[7px]"
							color="muted"
							textBreakStrategy="balanced"
							variant="caption"
						>
							{price}
						</AppText>
					) : null}
				</>
			)}
			<PressScale
				accessibilityRole="button"
				accessibilityState={{ disabled: lock }}
				className="mt-0.5 min-h-11 items-center justify-center"
				disabled={lock}
				haptic={playSoftPress}
				onPress={actions.continueFree}
			>
				<AppText variant="callout" weight="semibold">
					{state.owned ? FIRST_LOOK.continue : FIRST_LOOK.continueFree}
				</AppText>
			</PressScale>
			<LegalLinks />
		</View>
	);
}
