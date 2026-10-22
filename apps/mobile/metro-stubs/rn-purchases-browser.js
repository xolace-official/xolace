// Stub for react-native-purchases' browser/Expo-Go fallback module.
// On native platforms the real native module (RNPurchases) is always linked
// (dev-client / production builds), so this ~1MB web-only code path
// (@revenuecat/purchases-js-hybrid-mappings + friends) is dead weight.
// See metro.config.js resolveRequest.
exports.browserNativeModuleRNPurchases = null;
