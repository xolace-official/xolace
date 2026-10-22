import type { PurchasesPackage } from "react-native-purchases";
import { describe, expect, it } from "vitest";
import { paywallCtaLabel } from "./paywall-cta-label";

const pkg = (product: Record<string, unknown>) =>
	({ product }) as unknown as PurchasesPackage;

const appStoreTrial = pkg({ introPrice: { period: "P1W", price: 0 } });
const playTrial = pkg({
	defaultOption: { freePhase: { billingPeriod: { iso8601: "P7D" } } },
	introPrice: null,
});
const shortTrial = pkg({ introPrice: { period: "P3D", price: 0 } });
const noTrial = pkg({ defaultOption: { freePhase: null }, introPrice: null });

describe("paywallCtaLabel", () => {
	it("claims the free week only for an annual package that carries one", () => {
		expect(paywallCtaLabel("annual", appStoreTrial)).toBe(
			"Start your free week"
		);
		expect(paywallCtaLabel("annual", playTrial)).toBe("Start your free week");
	});

	it("never claims a week for an offer that is not seven days", () => {
		expect(paywallCtaLabel("annual", shortTrial)).toBe("Continue with Plus");
	});

	it("never claims a trial on monthly, even if the product carries one", () => {
		expect(paywallCtaLabel("monthly", appStoreTrial)).toBe(
			"Continue with Plus"
		);
	});

	it("falls back to the plain label without a trial or without a package", () => {
		expect(paywallCtaLabel("annual", noTrial)).toBe("Continue with Plus");
		expect(paywallCtaLabel("annual", null)).toBe("Continue with Plus");
	});
});
