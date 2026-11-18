import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AppText } from "@/components/shared/app-text";
import { LegalBottomSheet } from "@/components/shared/legal-bottom-sheet";
import {
	type LegalDocument,
	PRIVACY_POLICY,
	TERMS_OF_SERVICE,
} from "@/components/shared/legal-content";
import { PressScale } from "@/components/shared/press-scale";
import { LinearGradient } from "@/components/shared/styled";
import { clearOf } from "@/design/clear-of";
import {
	type PlanId,
	planCta,
	planPriceLine,
} from "@/features/purchases/plans";
import { playAffirmativePress, playSoftPress } from "@/lib/haptics";
import { useTokenColor } from "@/lib/use-token-color";
import { PLUS } from "../copy";
import { usePlusScreen } from "../plus-data";
import { PlanCards } from "./plan-cards";
import { PlansUnavailable } from "./plans-unavailable";

const FADE = 26;

/** The bottom: the plans, the button and what it costs, Continue free, Terms and Privacy. Fixed,
 * or `stacked` in the page's flow at the accessibility text sizes. */
export function PlusFooter({
	plan,
	onPick,
	stacked = false,
}: {
	plan: PlanId;
	onPick: (plan: PlanId) => void;
	stacked?: boolean;
}) {
	const { state, actions } = usePlusScreen();
	const insets = useSafeAreaInsets();
	const bg = useTokenColor("background");
	const ink = useTokenColor("offer-ink");
	const [doc, setDoc] = useState<LegalDocument | null>(null);
	const busy = state.buying || state.exiting;
	const canBuy = !(busy || state.owned) && state.plans[plan].pkg !== null;
	const label = state.owned ? PLUS.owned : planCta(plan, state.plans);
	const price = state.owned ? null : planPriceLine(plan, state.plans);
	return (
		<View
			className="bg-background px-4.5 pt-2.5"
			style={{ paddingBottom: insets.bottom + 8 }}
		>
			{!stacked && (
				<LinearGradient
					className="absolute inset-x-0"
					colors={[clearOf(bg), bg]}
					pointerEvents="none"
					style={{ height: FADE, top: -FADE }}
				/>
			)}
			{state.unavailable ? (
				<PlansUnavailable />
			) : (
				<View className="gap-2.5">
					{!state.owned && (
						<PlanCards
							disabled={busy}
							onPick={onPick}
							plan={plan}
							plans={state.plans}
							stacked={stacked}
						/>
					)}
					<PressScale
						accessibilityLabel={label}
						accessibilityState={{ busy: state.buying, disabled: !canBuy }}
						className="min-h-13.5 items-center justify-center rounded-full bg-ember px-5"
						disabled={!canBuy}
						haptic={playAffirmativePress}
						onPress={() => actions.buy(plan)}
						scaleTo={0.97}
						style={{ opacity: canBuy || state.buying ? 1 : 0.5 }}
					>
						{state.buying ? (
							<ActivityIndicator color={ink} />
						) : (
							<AppText className="text-[17px] text-offer-ink" weight="semibold">
								{label}
							</AppText>
						)}
					</PressScale>
					{price && (
						<AppText
							center
							className="text-[12.5px] leading-[17px]"
							color="muted"
						>
							{price}
						</AppText>
					)}
				</View>
			)}
			<PressScale
				className="min-h-11 items-center justify-center self-center px-3"
				disabled={state.exiting}
				haptic={playSoftPress}
				onPress={actions.leave}
			>
				<AppText className="text-[15px]" weight="semibold">
					{state.owned ? PLUS.freeOwned : PLUS.free}
				</AppText>
			</PressScale>
			<View className="flex-row flex-wrap justify-center gap-x-4.5 gap-y-1">
				<AppText
					accessibilityRole="link"
					className="text-[11.5px] underline"
					color="muted"
					onPress={() => setDoc(TERMS_OF_SERVICE)}
				>
					{PLUS.terms}
				</AppText>
				<AppText
					accessibilityRole="link"
					className="text-[11.5px] underline"
					color="muted"
					onPress={() => setDoc(PRIVACY_POLICY)}
				>
					{PLUS.privacy}
				</AppText>
			</View>
			<LegalBottomSheet document={doc} onClose={() => setDoc(null)} />
		</View>
	);
}
