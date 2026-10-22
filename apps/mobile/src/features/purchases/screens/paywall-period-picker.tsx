import { useThemeColor } from "heroui-native";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/shared/app-text";
import { SegmentedControl } from "@/src/components/shared/segmented-control";
import { cn } from "@/src/lib/utils";

export type PlanId = "annual" | "monthly";

type PlanPrice = { price: string; detail: string };

type Props = {
	annual: PlanPrice;
	monthly: PlanPrice;
	/** Whole-number percent saved by choosing annual over monthly, e.g. 58. */
	discountPercent: number | null;
	/**
	 * Whether the *selected* package actually carries a free week. Same gate as
	 * the CTA label — the badge is a trial claim too, and an ungated one would
	 * promise a free week the CTA underneath it refuses to.
	 */
	hasFreeTrial: boolean;
	selected: PlanId;
	onSelect: (plan: PlanId) => void;
};

/**
 * Pinned segmented control (Monthly / Yearly) + a single price card that
 * updates to the selected plan. Replaces the old side-by-side two-card
 * grid — there's only one product tier, so the segment itself carries the
 * period choice instead of duplicating it across cards.
 */
export function PaywallPeriodPicker({
	annual,
	monthly,
	discountPercent,
	hasFreeTrial,
	selected,
	onSelect,
}: Props) {
	const accentForeground = useThemeColor("accent-foreground") as string;
	const current = selected === "annual" ? annual : monthly;

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

				<SegmentedControl.Item
					className="flex-1 items-center py-2.5"
					value="monthly"
				>
					<AppText
						className={cn(
							"font-medium text-[14px]",
							selected === "monthly"
								? "text-accent-foreground"
								: "text-foreground"
						)}
					>
						Monthly
					</AppText>
				</SegmentedControl.Item>

				<SegmentedControl.Item
					className="flex-1 flex-row items-center justify-center gap-2 py-2.5"
					value="annual"
				>
					<AppText
						className={cn(
							"font-medium text-[14px]",
							selected === "annual"
								? "text-accent-foreground"
								: "text-foreground"
						)}
					>
						Yearly
					</AppText>
					{discountPercent !== null && (
						<View
							className={cn(
								"rounded-full px-2 py-0.5",
								selected === "annual"
									? "bg-accent-foreground/15"
									: "bg-accent/15"
							)}
						>
							<AppText
								className="font-semibold text-[11px]"
								style={{
									color: selected === "annual" ? accentForeground : undefined,
								}}
							>
								{selected === "annual"
									? `-${discountPercent}%`
									: `Save ${discountPercent}%`}
							</AppText>
						</View>
					)}
				</SegmentedControl.Item>
			</SegmentedControl>

			<View
				className="flex-row items-center justify-between rounded-2xl border border-border bg-surface px-4 py-3.5"
				style={styles.borderCurve}
			>
				<View>
					<AppText className="font-semibold text-[15px] text-foreground">
						{current.price}
					</AppText>
					<AppText className="mt-0.5 text-[12px] text-muted">
						{current.detail}
					</AppText>
				</View>
				{selected === "annual" && hasFreeTrial && (
					<View
						className="rounded-full bg-accent/12 px-2.5 py-1"
						style={styles.borderCurve}
					>
						<AppText className="font-medium text-[11px] text-accent">
							7-day free trial
						</AppText>
					</View>
				)}
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	borderCurve: { borderCurve: "continuous" },
});
