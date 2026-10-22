import Constants from 'expo-constants';

/**
 * App-level feature configuration.
 *
 * `features.payments` is the master switch for RevenueCat: while false the
 * purchases layer stays inert (no SDK configure, no network) and
 * `devIsPlus` acts as the local free/plus switch so the whole paywall +
 * gating UI is buildable and testable before the RC dashboard exists.
 * Flip to true once RC dashboard + store products + API keys are configured.
 */
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
  features: {
    /** ← flip true once RC dashboard + store products are configured. */
    payments: true,
  },
  monetization: {
    /** User is Plus if ANY of these entitlements is active. */
    entitlements: ['xolace-plus'],
    revenueCatApiKey: {
      ios: extra?.revenueCat?.iosKey ?? '',
      android: extra?.revenueCat?.androidKey ?? '',
    },
    revenueCatApiKeyTestStore: {
      ios: extra?.revenueCat?.iosTestKey ?? '',
      android: extra?.revenueCat?.androidTestKey ?? '',
    },
  },
  /** Local free/plus switch while payments=false (client gates only). */
  devIsPlus: false,
} as const;
