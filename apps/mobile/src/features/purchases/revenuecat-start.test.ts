import type { CustomerInfo, PurchasesOfferings } from "react-native-purchases";
import { describe, expect, it } from "vitest";
import { startRevenueCat } from "@/features/purchases/revenuecat-start";

const info = {
	originalAppUserId: "$RCAnonymousID:a",
} as unknown as CustomerInfo;
const offerings = { all: {}, current: null } as unknown as PurchasesOfferings;
const offline = new Error("network unavailable");

const sdk = (
	overrides: Partial<Parameters<typeof startRevenueCat>[0]> = {}
) => ({
	configure: () => undefined,
	getCustomerInfo: () => Promise.resolve(info),
	getOfferings: () => Promise.resolve(offerings),
	...overrides,
});

describe("startRevenueCat", () => {
	it("is configured with both results when everything loads", async () => {
		expect(await startRevenueCat(sdk())).toEqual({
			configured: true,
			customerInfo: info,
			errors: [],
			offerings,
		});
	});

	it("stays configured when offerings fail, so the user still gets logged in", async () => {
		const start = await startRevenueCat(
			sdk({ getOfferings: () => Promise.reject(offline) })
		);
		expect(start).toEqual({
			configured: true,
			customerInfo: info,
			errors: [offline],
			offerings: null,
		});
	});

	it("stays configured when customer info fails", async () => {
		const start = await startRevenueCat(
			sdk({ getCustomerInfo: () => Promise.reject(offline) })
		);
		expect(start.configured).toBe(true);
		expect(start.customerInfo).toBeNull();
		expect(start.offerings).toBe(offerings);
	});

	it("is not configured when configure throws, and fetches nothing", async () => {
		let fetched = false;
		const bad = new Error("invalid api key");
		const start = await startRevenueCat(
			sdk({
				configure: () => {
					throw bad;
				},
				getCustomerInfo: () => {
					fetched = true;
					return Promise.resolve(info);
				},
			})
		);
		expect(start).toEqual({
			configured: false,
			customerInfo: null,
			errors: [bad],
			offerings: null,
		});
		expect(fetched).toBe(false);
	});
});
