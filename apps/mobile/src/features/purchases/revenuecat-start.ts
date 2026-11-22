import type { CustomerInfo, PurchasesOfferings } from "react-native-purchases";

type StartSdk = {
	configure: () => void;
	getCustomerInfo: () => Promise<CustomerInfo>;
	getOfferings: () => Promise<PurchasesOfferings>;
};

type RevenueCatStart = {
	configured: boolean;
	customerInfo: CustomerInfo | null;
	offerings: PurchasesOfferings | null;
	errors: unknown[];
};

export async function startRevenueCat(sdk: StartSdk): Promise<RevenueCatStart> {
	try {
		sdk.configure();
	} catch (error) {
		return {
			configured: false,
			customerInfo: null,
			errors: [error],
			offerings: null,
		};
	}
	const [info, offerings] = await Promise.allSettled([
		sdk.getCustomerInfo(),
		sdk.getOfferings(),
	]);
	return {
		configured: true,
		customerInfo: info.status === "fulfilled" ? info.value : null,
		errors: [info, offerings].flatMap((r) =>
			r.status === "rejected" ? [r.reason] : []
		),
		offerings: offerings.status === "fulfilled" ? offerings.value : null,
	};
}
