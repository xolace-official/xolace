import { Surface, useThemeColor } from "heroui-native";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/src/components/shared/app-text";
import { SegmentedControl } from "@/src/components/shared/segmented-control";
import { cn } from "@/src/lib/utils";
import type { IntroOffer } from "./paywall-intro-offer";

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
	/** Monthly's intro discount when this user can take it; null shows the plain price. */
	monthlyIntro: IntroOffer | null;
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
	monthlyIntro,
	selected,
	onSelect,
}: Props) {
	const current = selected === "annual" ? annual : monthly;
	const intro = selected === "monthly" ? monthlyIntro : null;

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
					className="flex-1 flex-row items-center justify-center gap-2 py-2.5"
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
					{monthlyIntro && (
						<SegmentBadge
							isSelected={selected === "monthly"}
							label={
								selected === "monthly"
									? `-${monthlyIntro.percentOff}%`
									: `${monthlyIntro.percentOff}% off`
							}
						/>
					)}
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
						<SegmentBadge
							isSelected={selected === "annual"}
							label={
								selected === "annual"
									? `-${discountPercent}%`
									: `Save ${discountPercent}%`
							}
						/>
					)}
				</SegmentedControl.Item>
			</SegmentedControl>

			<Surface
				className="flex-row items-center justify-between rounded-2xl px-4 py-3.5"
				style={styles.borderCurve}
			>
				{intro ? (
					<IntroPrice intro={intro} />
				) : (
					<View>
						<AppText className="font-semibold text-[15px] text-foreground">
							{current.price}
						</AppText>
						<AppText className="mt-0.5 text-[12px] text-muted">
							{current.detail}
						</AppText>
					</View>
				)}
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
				{intro && (
					<View
						className="rounded-full bg-accent/12 px-2.5 py-1"
						style={styles.borderCurve}
					>
						<AppText className="font-medium text-[11px] text-accent">
							Intro offer
						</AppText>
					</View>
				)}
			</Surface>
		</View>
	);
}

function SegmentBadge({
	label,
	isSelected,
}: {
	label: string;
	isSelected: boolean;
}) {
	const accentForeground = useThemeColor("accent-foreground") as string;
	return (
		<View
			className={cn(
				"rounded-full px-2 py-0.5",
				isSelected ? "bg-accent-foreground/15" : "bg-accent/15"
			)}
		>
			<AppText
				className="font-semibold text-[11px]"
				style={{ color: isSelected ? accentForeground : undefined }}
			>
				{label}
			</AppText>
		</View>
	);
}

/**
 * Intro price with the full price struck through, and the renewal price spelled
 * out: Apple rejects paywalls that hide what the plan renews at.
 */
function IntroPrice({ intro }: { intro: IntroOffer }) {
	const renewal = `for your first ${intro.term}, then ${intro.fullPrice}/mo`;
	return (
		<View
			accessibilityLabel={`${intro.price} per month for your first ${intro.term}, then ${intro.fullPrice} per month`}
			accessible
			className="shrink"
		>
			<View className="flex-row items-baseline gap-1.5">
				<AppText className="font-semibold text-[15px] text-foreground">
					{intro.price}/mo
				</AppText>
				<AppText className="text-[13px] text-muted line-through">
					{intro.fullPrice}
				</AppText>
			</View>
			<AppText className="mt-0.5 text-[12px] text-muted">{renewal}</AppText>
		</View>
	);
}

const styles = StyleSheet.create({
	borderCurve: { borderCurve: "continuous" },
});
