// Expo fingerprint settings. The fingerprint is the production runtimeVersion
// and drives the `native-change` PR label, so it must change only when the
// native app does.
//
// app.config.ts copies per-environment values into `extra`. They differ between
// the development, preview and production EAS environments (and are missing in
// CI), so they used to flip the fingerprint with no native change. `extra`
// reaches the app through the embedded manifest and every OTA update's
// manifest (Constants.expoConfig), never through native code, so these keys are
// dropped before hashing.
//
// EXPO_PUBLIC_CLERK_GOOGLE_IOS_URL_SCHEME stays in: the @clerk/expo-google-signin
// config plugin writes it into Info.plist CFBundleURLTypes at prebuild, which is
// a real native change.
//
// When you add a key to `extra`, add it here only if no config plugin or native
// code reads it.
/** @type {readonly string[]} */
const JS_ONLY_EXTRA_KEYS = [
	"EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID",
	"EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID",
	"EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID",
	"posthogHost",
	"posthogProjectToken",
	"revenueCat",
];

/** @type {import('@expo/fingerprint').Config} */
const config = {
	// bun applies the root `patchedDependencies` (../../patches) at install. The
	// fingerprint hashes native modules by name and version only, so a patch to
	// a native module's code would otherwise not change it.
	extraSources: [
		{
			filePath: "../../patches",
			reasons: ["bunPatchedDependencies"],
			type: "dir",
		},
	],
	/**
	 * @param {{ type: string; id?: string }} source
	 * @param {string | Buffer | null} chunk
	 */
	fileHookTransform(source, chunk) {
		if (source.type !== "contents" || source.id !== "expoConfig") {
			return chunk;
		}
		const expoConfig = JSON.parse(String(chunk));
		for (const key of JS_ONLY_EXTRA_KEYS) {
			delete expoConfig.extra?.[key];
		}
		return JSON.stringify(expoConfig);
	},
	// app.config.ts imports the guard, so the fingerprint would hash it as a
	// config-plugin dependency. It only validates env and never changes the
	// native project; editing it must not force a store build.
	ignorePaths: ["release/**"],
};

module.exports = config;
