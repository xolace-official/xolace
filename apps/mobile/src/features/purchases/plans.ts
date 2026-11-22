import type { PurchasesPackage } from "react-native-purchases";
import { introOfferOf } from "@/features/purchases/intro-offer";
import { hasFreeTrial } from "@/features/purchases/screens/paywall-cta-label";
import type { PlanId } from "@/features/purchases/screens/paywall-period-picker";

type PlanOffer = { eligible: boolean; pkg: PurchasesPackage | null };

export type Plans = Record<PlanId, PlanOffer>;

const PLAIN_CTA = "Continue with Plus";
/** Auto-renewal said where the price is (App Review 3.1.2), as the paywall's CTA says it. */
const CANCEL = "Renews automatically. Cancel any time.";

const introOf = ({ eligible, pkg }: PlanOffer) =>
	introOfferOf(pkg?.product, eligible);

export const defaultPlan = (plans: Plans): PlanId =>
	!plans.annual.pkg && plans.monthly.pkg ? "monthly" : "annual";

export const startsTrial = (plan: PlanId, plans: Plans) =>
	plan === "annual" && hasFreeTrial(plans.annual.pkg, plans.annual.eligible);

const discountOn = (plan: PlanId, plans: Plans) =>
	plan === "monthly" ? introOf(plans.monthly) : null;

export function planCta(plan: PlanId, plans: Plans): string {
	if (startsTrial(plan, plans)) {
		return "Start my free week";
	}
	const intro = discountOn(plan, plans);
	return intro
		? `Get ${intro.percentOff}% off your first ${intro.term}`
		: PLAIN_CTA;
}

/** What it costs, under the button. A discount says what it renews at (Apple rejects a
 * paywall that hides it). */
export function planPriceLine(plan: PlanId, plans: Plans): string | null {
	const pkg = plans[plan].pkg;
	if (!pkg) {
		return null;
	}
	if (startsTrial(plan, plans)) {
		return `Then ${pkg.product.priceString} a year. ${CANCEL}`;
	}
	const intro = discountOn(plan, plans);
	if (intro) {
		return `${intro.price}/mo for your first ${intro.term}, then ${intro.fullPrice}/mo. ${CANCEL}`;
	}
	const per = plan === "annual" ? "year" : "month";
	return `${pkg.product.priceString} a ${per}. ${CANCEL}`;
}

export function planPrice(plan: PlanId, plans: Plans): string | null {
	const product = plans[plan].pkg?.product;
	if (!product) {
		return null;
	}
	const intro = discountOn(plan, plans);
	if (intro) {
		return `${intro.price}/mo for ${intro.term}`;
	}
	if (plan === "monthly") {
		return `${product.priceString}/mo`;
	}
	return product.pricePerMonthString
		? `${product.priceString}/yr · ${product.pricePerMonthString}/mo`
		: `${product.priceString}/yr`;
}

export function planTag(plan: PlanId, plans: Plans): string | null {
	if (startsTrial(plan, plans)) {
		return "7 days free";
	}
	const intro = discountOn(plan, plans);
	return intro ? `${intro.percentOff}% off` : null;
}
