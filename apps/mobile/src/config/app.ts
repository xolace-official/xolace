import Constants from "expo-constants";

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
	devIsPlus: false,
	features: {
		payments: true,
	},
	monetization: {
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
