import { Surface } from "heroui-native";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/shared/app-text";
import { SegmentedControl } from "@/components/shared/segmented-control";
import type { IntroOffer } from "@/features/purchases/intro-offer";
import { cn } from "@/lib/utils";

export type PlanId = "annual" | "monthly";

type PlanPrice = { price: string; detail: string };

type Props = {
	annual: PlanPrice;
	monthly: PlanPrice;
	hasFreeTrial: boolean;
	monthlyIntro: IntroOffer | null;
	selected: PlanId;
	onSelect: (plan: PlanId) => void;
};

export function PaywallPeriodPicker({
	annual,
	monthly,
	hasFreeTrial,
	monthlyIntro,
	selected,
	onSelect,
}: Props) {
	const current = selected === "annual" ? annual : monthly;
	const note = priceNote(
		current,
		selected === "annual" && hasFreeTrial,
		selected === "monthly" ? monthlyIntro : null
	);

	return (
		<View className="gap-3">
			<SegmentedControl
				className="relative rounded-2xl bg-surface-secondary p-1"
				onValueChange={(value) => onSelect(value as PlanId)}
				value={selected}
			>
				<SegmentedControl.Indicator
					className="top-1 rounded-xl bg-accent"
					style={styles.borderCurve}
				/>
				<SegmentItem label="Monthly" selected={selected} value="monthly" />
				<SegmentItem label="Yearly" selected={selected} value="annual" />
			</SegmentedControl>

			<Surface
				accessibilityLabel={`${current.price}, ${note}`}
				accessible
				className="rounded-2xl px-4 py-3.5"
				style={styles.borderCurve}
			>
				<AppText className="font-semibold text-[17px] text-foreground">
					{current.price}
				</AppText>
				<AppText className="mt-0.5 text-[12px] text-muted">{note}</AppText>
			</Surface>
		</View>
	);
}

function SegmentItem({
	label,
	selected,
	value,
}: {
	label: string;
	selected: PlanId;
	value: PlanId;
}) {
	return (
		<SegmentedControl.Item
			className="flex-1 flex-row items-center justify-center gap-2 py-2.5"
			value={value}
		>
			<AppText
				className={cn(
					"font-medium text-[14px]",
					selected === value ? "text-accent-foreground" : "text-foreground"
				)}
			>
				{label}
			</AppText>
		</SegmentedControl.Item>
	);
}

/** Everything but the billed amount, on one smaller muted line under it: a trial, intro or
 * discount never outranks what is billed (App Review 3.1.2(c)). */
function priceNote(
	plan: PlanPrice,
	freeWeek: boolean,
	intro: IntroOffer | null
): string {
	if (intro) {
		return `${intro.price}/mo for your first ${intro.term} · ${plan.detail}`;
	}
	return freeWeek ? `7 days free · ${plan.detail}` : plan.detail;
}

const styles = StyleSheet.create({
	borderCurve: { borderCurve: "continuous" },
});
