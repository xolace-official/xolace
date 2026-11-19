/**
 * The native splash: expo-splash-screen's options, which `app.config.ts` passes to its plugin.
 * The Default theme's backgrounds, light and dark following the phone, so the launch cover
 * (src/features/launch) takes over on the same colour. Its own file because evaluating
 * app.config.ts reads env, and `launch-model.test.ts` holds these against the cover and the
 * theme without it. A change here is a native change: it ships with a store build.
 */
const IMAGE = "./assets/images/icons/splash-icon.png";

export const NATIVE_SPLASH = {
	// Android 12+ draws the logo in the icon's 288 dp canvas; 76 dp fits its circle.
	android: { imageWidth: 76 },
	backgroundColor: "#F7F5FB",
	dark: { backgroundColor: "#0E0C15", image: IMAGE },
	image: IMAGE,
	imageWidth: 200,
};
