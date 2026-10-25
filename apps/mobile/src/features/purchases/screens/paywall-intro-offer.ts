import type { PurchasesStoreProduct } from "react-native-purchases";

const MICROS_PER_UNIT = 1_000_000;

/** The paywall renders intro prices per month, so only P1M phases fit. */
const MONTHLY_PERIOD = /^P1M$/i;

const UNIT_BY_ISO: Record<string, string> = {
	D: "day",
	M: "month",
	W: "week",
	Y: "year",
};

/** A paid intro discount the user is eligible for, ready to render. */
export type IntroOffer = {
	/** Localized intro price per period, e.g. "$4.99". */
	price: string;
	/** Localized full price it renews at, e.g. "$9.99". */
	fullPrice: string;
	/** The intro's length, e.g. "2 months" or "month". */
	term: string;
	/** Whole-number percent off, worked out from the two prices (never hardcoded). */
	percentOff: number;
};

type IntroPhase = {
	price: number;
	priceString: string;
	cycles: number;
	period: string;
};

/**
 * The paid intro phase on either store. `introPrice` is the App Store path (a
 * free trial shows up there too, as price 0, so it's skipped). Google Play
 * puts the offer on the default subscription option, which RevenueCat only
 * lists when the user is eligible for it.
 */
function introPhaseOf(product: PurchasesStoreProduct): IntroPhase | null {
	const intro = product.introPrice;
	if (intro && intro.price > 0) {
		return intro;
	}
	const phase = product.defaultOption?.introPhase;
	if (!phase || phase.price.amountMicros <= 0) {
		return null;
	}
	return {
		cycles: phase.billingCycleCount ?? 1,
		period: phase.billingPeriod.iso8601,
		price: phase.price.amountMicros / MICROS_PER_UNIT,
		priceString: phase.price.formatted,
	};
}

/**
 * "2 months" from a period of P1M over 2 cycles; a lone period reads "month",
 * so the copy can say "your first month".
 */
function introTerm(period: string, cycles: number): string | null {
	const match = /^P(\d+)([DWMY])$/i.exec(period);
	if (!match) {
		return null;
	}
	const unit = UNIT_BY_ISO[match[2].toUpperCase()];
	const total = Number(match[1]) * cycles;
	return total === 1 ? unit : `${total} ${unit}s`;
}

/**
 * What the paywall shows for a discounted intro, or null for the plain price.
 * `isEligible` is the iOS eligibility check (Android lists only offers the user
 * can take, so it passes true). The store's payment sheet has the final say.
 * A pay-up-front intro (one P3M cycle, say) is one charge for the whole term,
 * not a monthly price, so it falls back to the plain price.
 */
export function introOfferOf(
	product: PurchasesStoreProduct | null | undefined,
	isEligible: boolean
): IntroOffer | null {
	if (!(product && isEligible) || product.price <= 0) {
		return null;
	}
	const phase = introPhaseOf(product);
	if (
		!(phase && MONTHLY_PERIOD.test(phase.period)) ||
		phase.price >= product.price
	) {
		return null;
	}
	const term = introTerm(phase.period, phase.cycles);
	if (!term) {
		return null;
	}
	return {
		fullPrice: product.priceString,
		percentOff: Math.round((1 - phase.price / product.price) * 100),
		price: phase.priceString,
		term,
	};
}
