/** Where someone rates or reviews Xolace: Settings › Follow & Support, and the rating screen. */

/** Production's links (`enjoying-xolace-section.tsx`), unchanged. */
const REVIEW_LINKS = {
	android:
		"https://play.google.com/store/apps/details?id=com.xolaceincorg.xolace&showAllReviews=true",
	ios: "https://apps.apple.com/app/apple-store/id6761601429?action=write-review",
} as const;

export type Store = keyof typeof REVIEW_LINKS;

/** Production's choice: the App Store on iOS, Google Play everywhere else. */
export const storeOf = (os: string | undefined): Store =>
	os === "ios" ? "ios" : "android";

/** The store page that opens straight on writing a review. */
export const reviewUrl = (os: string | undefined) => REVIEW_LINKS[storeOf(os)];
