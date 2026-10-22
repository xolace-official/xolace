import type { ConfigContext, ExpoConfig } from "expo/config";

function requireEnv(name: string, value: string | undefined): string {
	if (!value) {
		if (process.env.EAS_BUILD === "true" || process.env.CI === "true") {
			throw new Error(`Missing required environment variable: ${name}`);
		}
		console.warn(
			`[app.config] ${name} is missing — run \`eas env:pull <environment>\` to populate .env.local`
		);
		return "";
	}
	return value;
}

const IS_DEV = process.env.APP_VARIANT === "development";
const IS_PREVIEW = process.env.APP_VARIANT === "preview";

const getUniqueIdentifier = () => {
	if (IS_DEV) {
		return "com.xolaceincorg.xolace.dev";
	}

	if (IS_PREVIEW) {
		return "com.xolaceincorg.xolace.preview";
	}

	return "com.xolaceincorg.xolace";
};

const getAppName = () => {
	if (IS_DEV) {
		return "Xolace (Dev)";
	}

	if (IS_PREVIEW) {
		return "Xolace (Preview)";
	}

	return "Xolace";
};

const getGoogleServicesPath = () => {
	if (IS_DEV) {
		return "./google-services.json";
	}

	if (IS_PREVIEW) {
		return "./google-services-preview/google-services.json";
	}

	return "./google-services.json";
};

export default ({ config }: ConfigContext): ExpoConfig => ({
	...config,
	android: {
		adaptiveIcon: {
			backgroundColor: "#000000",
			backgroundImage: "./assets/images/android-icon-background.png",
			foregroundImage: "./assets/images/android-icon-foreground.png",
			monochromeImage: "./assets/images/android-icon-monochrome.png",
		},
		blockedPermissions: [
			"android.permission.READ_MEDIA_IMAGES",
			"android.permission.READ_MEDIA_VIDEO",
			"android.permission.ACTIVITY_RECOGNITION",
			"com.google.android.gms.permission.AD_ID",
			// Added by @config-plugins/react-native-webrtc; talks are audio only.
			"android.permission.CAMERA",
			"android.permission.SYSTEM_ALERT_WINDOW",
		],
		googleServicesFile: getGoogleServicesPath(),
		package: getUniqueIdentifier(),
		predictiveBackGestureEnabled: false,
	},
	experiments: {
		reactCompiler: true,
		typedRoutes: true,
	},
	extra: {
		EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID: requireEnv(
			"EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID",
			process.env.EXPO_PUBLIC_CLERK_GOOGLE_ANDROID_CLIENT_ID
		),
		EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID: requireEnv(
			"EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID",
			process.env.EXPO_PUBLIC_CLERK_GOOGLE_IOS_CLIENT_ID
		),
		EXPO_PUBLIC_CLERK_GOOGLE_IOS_URL_SCHEME: requireEnv(
			"EXPO_PUBLIC_CLERK_GOOGLE_IOS_URL_SCHEME",
			process.env.EXPO_PUBLIC_CLERK_GOOGLE_IOS_URL_SCHEME
		),
		EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID: requireEnv(
			"EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID",
			process.env.EXPO_PUBLIC_CLERK_GOOGLE_WEB_CLIENT_ID
		),
		eas: {
			projectId: "9b49d23b-d85c-48c9-84a4-db117b864dd3",
		},
		posthogHost: process.env.POSTHOG_HOST,
		posthogProjectToken: process.env.POSTHOG_PROJECT_TOKEN,
		// Optional until the RevenueCat dashboard exists — gates stay inert
		// while appConfig.features.payments is false, so no requireEnv here.
		revenueCat: {
			androidKey: process.env.REVENUECAT_ANDROID_KEY,
			androidTestKey: process.env.REVENUECAT_ANDROID_TEST_KEY,
			iosKey: process.env.REVENUECAT_IOS_KEY,
			iosTestKey: process.env.REVENUECAT_IOS_TEST_KEY,
		},
		router: {},
	},
	icon: "./assets/images/icon.png",
	ios: {
		bundleIdentifier: getUniqueIdentifier(),
		icon: "./assets/xolace-app-v2.icon",
		infoPlist: {
			ITSAppUsesNonExemptEncryption: false,
			LSApplicationQueriesSchemes: [
				"tel",
				"mailto",
				"whatsapp",
				"instagram",
				"instagram-stories",
				"fb",
				"facebook-stories",
				"tg",
				"twitter",
			],
			NSPhotoLibraryAddUsageDescription:
				"Allow $(PRODUCT_NAME) to save quote images to your photos.",
			NSPhotoLibraryUsageDescription:
				"Allow $(PRODUCT_NAME) to access your photos.",
		},
		privacyManifests: {
			NSPrivacyCollectedDataTypes: [
				{
					NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeEmailAddress",
					NSPrivacyCollectedDataTypeLinked: true,
					NSPrivacyCollectedDataTypePurposes: [
						"NSPrivacyCollectedDataTypePurposeAppFunctionality",
					],
					NSPrivacyCollectedDataTypeTracking: false,
				},
				{
					NSPrivacyCollectedDataType:
						"NSPrivacyCollectedDataTypeCustomerSupport",
					NSPrivacyCollectedDataTypeLinked: true,
					NSPrivacyCollectedDataTypePurposes: [
						"NSPrivacyCollectedDataTypePurposeAppFunctionality",
					],
					NSPrivacyCollectedDataTypeTracking: false,
				},
				{
					NSPrivacyCollectedDataType:
						"NSPrivacyCollectedDataTypeOtherUserContent",
					NSPrivacyCollectedDataTypeLinked: true,
					NSPrivacyCollectedDataTypePurposes: [
						"NSPrivacyCollectedDataTypePurposeAppFunctionality",
					],
					NSPrivacyCollectedDataTypeTracking: false,
				},
				{
					NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeUserID",
					NSPrivacyCollectedDataTypeLinked: true,
					NSPrivacyCollectedDataTypePurposes: [
						"NSPrivacyCollectedDataTypePurposeAppFunctionality",
						"NSPrivacyCollectedDataTypePurposeAnalytics",
					],
					NSPrivacyCollectedDataTypeTracking: false,
				},
				{
					NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeDeviceID",
					NSPrivacyCollectedDataTypeLinked: true,
					NSPrivacyCollectedDataTypePurposes: [
						"NSPrivacyCollectedDataTypePurposeAppFunctionality",
						"NSPrivacyCollectedDataTypePurposeAnalytics",
					],
					NSPrivacyCollectedDataTypeTracking: false,
				},
				{
					NSPrivacyCollectedDataType:
						"NSPrivacyCollectedDataTypeProductInteraction",
					NSPrivacyCollectedDataTypeLinked: true,
					NSPrivacyCollectedDataTypePurposes: [
						"NSPrivacyCollectedDataTypePurposeAppFunctionality",
						"NSPrivacyCollectedDataTypePurposeAnalytics",
					],
					NSPrivacyCollectedDataTypeTracking: false,
				},
				{
					NSPrivacyCollectedDataType: "NSPrivacyCollectedDataTypeCrashData",
					NSPrivacyCollectedDataTypeLinked: true,
					NSPrivacyCollectedDataTypePurposes: [
						"NSPrivacyCollectedDataTypePurposeAppFunctionality",
					],
					NSPrivacyCollectedDataTypeTracking: false,
				},
				{
					NSPrivacyCollectedDataType:
						"NSPrivacyCollectedDataTypePerformanceData",
					NSPrivacyCollectedDataTypeLinked: true,
					NSPrivacyCollectedDataTypePurposes: [
						"NSPrivacyCollectedDataTypePurposeAppFunctionality",
						"NSPrivacyCollectedDataTypePurposeAnalytics",
					],
					NSPrivacyCollectedDataTypeTracking: false,
				},
			],
		},
		supportsTablet: true,
	},
	name: getAppName(),
	orientation: "portrait",
	owner: "xolace-inc-org",
	plugins: [
		// First so EAS Android builds cap Gradle workers before other plugins run.
		"./plugins/with-eas-gradle-workers.js",
		[
			"expo-build-properties",
			{
				ios: {
					extraPods: [
						{ modular_headers: true, name: "GoogleUtilities" },
						{ modular_headers: true, name: "RecaptchaInterop" },
					],
				},
			},
		],
		"expo-router",
		[
			"expo-splash-screen",
			{
				android: {
					image: "./assets/images/icons/splash-icon-dark.png",
					imageWidth: 76,
				},
				backgroundColor: "#040307",
				ios: {
					dark: {
						backgroundColor: "#040307",
						image: "./assets/images/icons/splash-icon-light.png",
					},
					image: "./assets/images/icons/splash-icon-dark.png",
					imageWidth: 200,
				},
			},
		],
		[
			"expo-font",
			{
				fonts: [
					"./assets/fonts/Poppins-Regular.ttf",
					"./assets/fonts/Poppins-Medium.ttf",
					"./assets/fonts/Poppins-Bold.ttf",
					"./assets/fonts/Poppins-SemiBold.ttf",
				],
			},
		],
		"expo-sqlite",
		"@clerk/expo",
		"@clerk/expo-google-signin",
		"expo-secure-store",
		"expo-apple-authentication",
		[
			"expo-notifications",
			{
				// Bundling is the only way a custom sound reaches either platform:
				// iOS names the file in the payload but plays it from the binary, and
				// Android copies it to res/raw where a channel can point at it.
				// Basenames become Android resource names, so they must stay
				// lowercase and free of dots beyond the extension.
				sounds: [
					"./assets/sounds/notifications/reach.wav",
					"./assets/sounds/notifications/message.wav",
					"./assets/sounds/notifications/nudge.wav",
				],
			},
		],
		"expo-localization",
		[
			"expo-speech-recognition",
			{
				microphonePermission:
					"Allow Xolace to use the microphone to capture what you're feeling.",
				speechRecognitionPermission:
					"Allow Xolace to use speech recognition to transcribe your voice.",
			},
		],
		"expo-video",
		["expo-audio", { enableBackgroundPlayback: true }],
		// Companion talks (#591): ElevenLabs agents run over LiveKit WebRTC.
		"@livekit/react-native-expo-plugin",
		[
			"@config-plugins/react-native-webrtc",
			{
				microphonePermission:
					"Allow Xolace to use the microphone to capture what you're feeling.",
			},
		],
		"expo-asset",
		"expo-image",
		"expo-status-bar",
		"expo-web-browser",
		"expo-sharing",
		[
			"expo-media-library",
			{
				isAccessMediaLocationEnabled: false,
				photosPermission: "Allow $(PRODUCT_NAME) to access your photos.",
				savePhotosPermission:
					"Allow $(PRODUCT_NAME) to save quote images to your photos.",
			},
		],
		[
			"react-native-share",
			{
				android: [
					"com.whatsapp",
					"com.instagram.android",
					"com.facebook.katana",
					"org.telegram.messenger",
					"com.twitter.android",
				],
				ios: [
					"whatsapp",
					"instagram",
					"instagram-stories",
					"fb",
					"facebook-stories",
					"tg",
					"twitter",
				],
			},
		],
		[
			"@sentry/react-native/expo",
			{
				organization: "xolace-inc",
				project: "react-native",
				url: "https://sentry.io/",
			},
		],
	],
	runtimeVersion: {
		policy: "appVersion",
	},
	scheme: "xolace",
	slug: "xolace",
	updates: {
		url: "https://u.expo.dev/9b49d23b-d85c-48c9-84a4-db117b864dd3",
	},
	userInterfaceStyle: "automatic",
	version: "1.15.0",
	web: {
		favicon: "./assets/images/favicon.png",
		output: "static",
	},
});
