import Constants from "expo-constants";

/** App-level feature configuration. `features.payments` is the RevenueCat master switch; while
 * false, `devIsPlus` is the local free/plus switch. */
const extra = Constants.expoConfig?.extra as
	| {
			revenueCat?: {
				iosKey?: string;
				androidKey?: string;
				iosTestKey?: string;
				androidTestKey?: string;
			};
	  }
	| undefined;

export const appConfig = {
	/** Local free/plus switch while payments=false (client gates only). */
	devIsPlus: false,
	features: {
		payments: true,
	},
	monetization: {
		/** User is Plus if ANY of these entitlements is active. */
		entitlements: ["xolace-plus"],
		revenueCatApiKey: {
			android: extra?.revenueCat?.androidKey ?? "",
			ios: extra?.revenueCat?.iosKey ?? "",
		},
		revenueCatApiKeyTestStore: {
			android: extra?.revenueCat?.androidTestKey ?? "",
			ios: extra?.revenueCat?.iosTestKey ?? "",
		},
	},
} as const;
