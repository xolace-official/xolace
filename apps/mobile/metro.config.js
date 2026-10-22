const path = require('path');
const { withUniwindConfig } = require('uniwind/metro');
const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(__dirname);

// react-native-purchases statically requires its web/Expo-Go fallback
// (dist/browser/*, which pulls in @revenuecat/purchases-js-hybrid-mappings)
// even on native, where the real native module is always linked. That's
// ~1MB of dead JS in every native bundle. Redirect it to a tiny stub.
// Safe unconditionally: this app only ever runs as a dev-client/standalone
// build (native modules linked), never in Expo Go, which is the one native
// case that would need the browser fallback.
const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (
    platform !== 'web' &&
    moduleName.endsWith('/browser/nativeModule') &&
    context.originModulePath.includes('react-native-purchases/dist/')
  ) {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'metro-stubs/rn-purchases-browser.js'),
    };
  }
  return originalResolveRequest
    ? originalResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withUniwindConfig(config, {
  cssEntryFile: './src/global.css',
  dtsFile: './src/uniwind-types.d.ts',

  // Register custom themes here so Uniwind can resolve them at build time.
  // When adding a new theme:
  //   1. Create a CSS file in src/themes/ with @variant <name>-light and @variant <name>-dark
  //   2. Import it in src/global.css
  //   3. Add both variant names to this array
  //   4. Add the variant names to ThemeName in src/context/app-theme-context.tsx
  extraThemes: [
    'quiet-light',
    'quiet-dark',
    'reverie-light',
    'reverie-dark',
    'human-light',
    'human-dark',
    'nightly-light',
    'nightly-dark',
    // xolace+ premium themes
    'emerald-light',
    'emerald-dark',
    'rose-light',
    'rose-dark',
    'platinum-light',
    'platinum-dark',
    'velvet-light',
    'velvet-dark',
    'noir-light',
    'noir-dark',
  ],
});