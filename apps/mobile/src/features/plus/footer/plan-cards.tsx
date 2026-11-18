import { View } from "react-native";
import { Presets } from "react-native-pulsar";
import { AppText } from "@/components/shared/app-text";
import { PressScale } from "@/components/shared/press-scale";
import {
	type PlanId,
	type Plans,
	planPrice,
	planTag,
} from "@/features/purchases/plans";
import { cn } from "@/lib/cn";
import { PLUS } from "../copy";

const PLAN_ORDER: readonly PlanId[] = ["annual", "monthly"];

/** Yearly and Monthly, each with its price and its free week or discount. Only what the store sells. */
export function PlanCards({
	plan,
	plans,
	disabled,
	onPick,
	stacked,
}: {
	plan: PlanId;
	plans: Plans;
	disabled: boolean;
	onPick: (plan: PlanId) => void;
	/** One above the other, at the accessibility text sizes. */
	stacked: boolean;
}) {
	const sellable = PLAN_ORDER.filter((id) => plans[id].pkg);
	if (sellable.length === 0) {
		return null;
	}
	return (
		<View
			accessibilityLabel={PLUS.plansLabel}
			accessibilityRole="radiogroup"
			className={cn("gap-2", !stacked && "flex-row")}
		>
			{sellable.map((id) => {
				const on = id === plan;
				const tag = planTag(id, plans);
				const price = planPrice(id, plans);
				return (
					<PressScale
						accessibilityLabel={[PLUS.plans[id], price, tag]
							.filter(Boolean)
							.join(", ")}
						accessibilityRole="radio"
						accessibilityState={{ checked: on, disabled }}
						className={cn(
							"min-h-14 justify-center gap-0.5 rounded-[18px] px-3.5 py-2.5",
							!stacked && "flex-1",
							on
								? "border-2 border-ember bg-ember/10"
								: "border border-foreground/14 bg-foreground/4"
						)}
						disabled={disabled}
						haptic={Presets.System.selection}
						key={id}
						onPress={() => onPick(id)}
					>
						<View className="flex-row flex-wrap items-center gap-x-2">
							<AppText className="text-[14.5px]" weight="semibold">
								{PLUS.plans[id]}
							</AppText>
							{tag && (
								<View className="rounded-full bg-ember px-1.5 py-px">
									<AppText className="text-[11px] text-offer-ink" weight="bold">
										{tag}
									</AppText>
								</View>
							)}
						</View>
						{price && (
							<AppText className="text-[12.5px] tabular-nums" color="muted">
								{price}
							</AppText>
						)}
					</PressScale>
				);
			})}
		</View>
	);
}
