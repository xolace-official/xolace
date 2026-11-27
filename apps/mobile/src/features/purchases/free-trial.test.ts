import type { PurchasesPackage } from "react-native-purchases";
import { describe, expect, it } from "vitest";
import { hasFreeTrial } from "./free-trial";

const pkg = (product: Record<string, unknown>) =>
	({ product }) as unknown as PurchasesPackage;

const appStoreTrial = pkg({ introPrice: { period: "P1W", price: 0 } });
const playTrial = pkg({
	defaultOption: { freePhase: { billingPeriod: { iso8601: "P7D" } } },
	introPrice: null,
});
const shortTrial = pkg({ introPrice: { period: "P3D", price: 0 } });
const noTrial = pkg({ defaultOption: { freePhase: null }, introPrice: null });

describe("hasFreeTrial", () => {
	it("finds a free week on either store", () => {
		expect(hasFreeTrial(appStoreTrial, true)).toBe(true);
		expect(hasFreeTrial(playTrial, true)).toBe(true);
	});

	it("never claims a week for an offer that is not seven days", () => {
		expect(hasFreeTrial(shortTrial, true)).toBe(false);
	});

	it("is false without a trial or without a package", () => {
		expect(hasFreeTrial(noTrial, true)).toBe(false);
		expect(hasFreeTrial(null, true)).toBe(false);
	});

	it("never claims a week for someone who already spent theirs", () => {
		expect(hasFreeTrial(appStoreTrial, false)).toBe(false);
		expect(hasFreeTrial(playTrial, false)).toBe(false);
	});
});
