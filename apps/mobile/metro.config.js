const path = require("path");
const { withUniwindConfig } = require("uniwind/metro");
const { getSentryExpoConfig } = require("@sentry/react-native/metro");

// biome-ignore lint/correctness/noGlobalDirnameFilename: CommonJS config file
const projectRoot = __dirname;

/** @type {import('expo/metro-config').MetroConfig} */
const config = getSentryExpoConfig(projectRoot);

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
		platform !== "web" &&
		moduleName.endsWith("/browser/nativeModule") &&
		context.originModulePath.includes("react-native-purchases/dist/")
	) {
		return {
			filePath: path.resolve(
				projectRoot,
				"metro-stubs/rn-purchases-browser.js"
			),
			type: "sourceFile",
		};
	}
	return originalResolveRequest
		? originalResolveRequest(context, moduleName, platform)
		: context.resolveRequest(context, moduleName, platform);
};

module.exports = withUniwindConfig(config, {
	cssEntryFile: "./src/global.css",
	dtsFile: "./src/uniwind-types.d.ts",

	extraThemes: require("./src/design/theme-names.generated.json"),
});
