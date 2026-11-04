// The bottom of the Xolace+ step (#713). On Free: "See it with Plus", "Saying it stays
// free." On Plus: the two plans, the button, what it costs. "Continue free" on both, always.
import { Button, Spinner } from "heroui-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { useCSSVariable } from "uniwind";
import { AppText } from "@/components/shared/app-text";
import { LegalBottomSheet } from "@/components/shared/legal-bottom-sheet";
import {
	type LegalDocument,
	PRIVACY_POLICY,
	TERMS_OF_SERVICE,
} from "@/components/shared/legal-content";
import type { PlusSide } from "@/features/intake/v2/machine";
import {
	type Plans,
	planCta,
	planPriceLine,
	planTag,
} from "@/features/intake/v2/plus/plans";
import type { PlanId } from "@/features/purchases/screens/paywall-period-picker";
import { PaywallPlansUnavailable } from "@/features/purchases/screens/paywall-plans-unavailable";
import { cn } from "@/lib/utils";

const PLAN_LABEL: Record<PlanId, string> = {
	annual: "Yearly",
	monthly: "Monthly",
};
const PLAN_ORDER: PlanId[] = ["annual", "monthly"];

export type PlusFooterProps = {
	/** The intake is being saved: nothing on it may be tapped again. */
	busy: boolean;
	/** A purchase is in flight. */
	buying: boolean;
	/** Xolace+ is theirs already: only the way on is live. */
	owned: boolean;
	onBuy: () => void;
	onContinueFree: () => void;
	onPick: (plan: PlanId) => void;
	onRetry: () => void;
	onSeePlus: () => void;
	plan: PlanId;
	plans: Plans;
	retrying: boolean;
	side: PlusSide;
	unavailable: boolean;
};

export function PlusFooter(props: PlusFooterProps) {
	const { busy, buying, onContinueFree, owned, side } = props;
	return (
		<View className="gap-1 px-5 pt-3">
			{side === "free" ? (
				<FreeSideFooter {...props} />
			) : (
				<PlusSideFooter {...props} />
			)}
			<Button
				className="self-center"
				isDisabled={busy || buying}
				onPress={onContinueFree}
				size="sm"
				variant="ghost"
			>
				<Button.Label className="text-[13px] text-muted">
					{owned ? "Continue" : "Continue free"}
				</Button.Label>
			</Button>
		</View>
	);
}

function FreeSideFooter({
	busy,
	onSeePlus,
}: Pick<PlusFooterProps, "busy" | "onSeePlus">) {
	return (
		<>
			<Button isDisabled={busy} onPress={onSeePlus} variant="outline">
				<Button.Label>See it with Plus →</Button.Label>
			</Button>
			<AppText className="mt-1 text-center text-[12px] text-muted">
				Saying it stays free.
			</AppText>
		</>
	);
}

function PlusSideFooter(props: PlusFooterProps) {
	const { busy, buying, onBuy, onPick, owned, plan, plans, unavailable } =
		props;
	// Themed, not in `@theme static`, so it is read through Uniwind.
	const ink = useCSSVariable("--color-offer-ink") as string;
	if (unavailable) {
		return (
			<PaywallPlansUnavailable
				isRetrying={props.retrying}
				onRetry={props.onRetry}
			/>
		);
	}
	const sellable = PLAN_ORDER.filter((id) => plans[id].pkg);
	const price = planPriceLine(plan, plans);
	return (
		<View className="gap-2.5">
			{sellable.length > 1 && (
				<View accessibilityRole="radiogroup" className="flex-row gap-2">
					{sellable.map((id) => (
						<PlanOption
							key={id}
							onPress={() => onPick(id)}
							selected={id === plan}
							tag={planTag(id, plans)}
							title={PLAN_LABEL[id]}
						/>
					))}
				</View>
			)}
			<Button
				className="bg-ember"
				isDisabled={busy || buying || owned || !plans[plan].pkg}
				onPress={onBuy}
			>
				{buying ? (
					<Spinner color={ink} />
				) : (
					<Button.Label className="text-offer-ink">
						{planCta(plan, plans)}
					</Button.Label>
				)}
			</Button>
			{price && (
				<AppText className="text-center text-[12px] text-foreground/80">
					{price}
				</AppText>
			)}
			<LegalLinks />
		</View>
	);
}

type OptionProps = {
	onPress: () => void;
	selected: boolean;
	tag: string | null;
	title: string;
};

function PlanOption({ onPress, selected, tag, title }: OptionProps) {
	return (
		<Pressable
			accessibilityLabel={tag ? `${title}, ${tag}` : title}
			accessibilityRole="radio"
			accessibilityState={{ checked: selected }}
			className={cn(
				"min-h-11 flex-1 flex-row items-center justify-center gap-2 rounded-2xl border px-3",
				selected ? "border-ember bg-ember/10" : "border-border bg-surface"
			)}
			onPress={onPress}
			style={{ borderCurve: "continuous" }}
		>
			<AppText className="font-[Poppins-Medium] text-[14px] text-foreground">
				{title}
			</AppText>
			{tag && (
				<AppText className="font-[Poppins-SemiBold] text-[11px] text-ember">
					{tag}
				</AppText>
			)}
		</Pressable>
	);
}

/** Terms and Privacy where the subscription is sold (App Review 3.1.2). */
function LegalLinks() {
	const [open, setOpen] = useState<LegalDocument | null>(null);
	return (
		<>
			<View className="flex-row items-center justify-center gap-5">
				<AppText
					accessibilityRole="link"
					className="text-[11px] text-muted underline"
					onPress={() => setOpen(TERMS_OF_SERVICE)}
				>
					Terms of Service
				</AppText>
				<AppText
					accessibilityRole="link"
					className="text-[11px] text-muted underline"
					onPress={() => setOpen(PRIVACY_POLICY)}
				>
					Privacy Policy
				</AppText>
			</View>
			<LegalBottomSheet document={open} onClose={() => setOpen(null)} />
		</>
	);
}
