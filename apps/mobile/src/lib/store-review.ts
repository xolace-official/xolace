const REVIEW_LINKS = {
	android:
		"https://play.google.com/store/apps/details?id=com.xolaceincorg.xolace&showAllReviews=true",
	ios: "https://apps.apple.com/app/apple-store/id6761601429?action=write-review",
} as const;

export type Store = keyof typeof REVIEW_LINKS;

export const storeOf = (os: string | undefined): Store =>
	os === "ios" ? "ios" : "android";

export const reviewUrl = (os: string | undefined) => REVIEW_LINKS[storeOf(os)];
