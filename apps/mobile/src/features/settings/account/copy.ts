import type { IconName } from "@/components/shared/icon";

/** How the person signed in, as Clerk's external accounts say. */
export type SignIn = "apple" | "google" | "email";

/** The two names the page edits. */
export type NameKind = "name" | "space";

/**
 * Settings › Account (P/design/handoff/settings-sections.md §1 "Account"), word for word. The
 * companion's default name (Ember) comes from production's `COMPANION_FALLBACK_NAME`.
 */
export const ACCOUNT_COPY = {
	alert: {
		body: "Everything stays in your account. Reminders stop on this phone until you sign back in.",
		ok: "Log out",
		title: "Log out?",
	},
	dialog: {
		cancel: "Cancel",
		name: {
			desc: "What Xolace calls you.",
			field: "Your name",
			title: "Your name",
		},
		reset: (companion: string) => `Reset to ${companion}`,
		save: "Save",
		space: {
			desc: (companion: string) =>
				`A soft label, just for you. It’s also the name of your Talk companion, ${companion} until you name it.`,
			field: "Name",
			title: "Your space",
		},
	},
	logOut: "Log out",
	/** Production's `useConfirmAction` fallback when log out throws. */
	logOutFailed: {
		description: "Please try again.",
		title: "Something went wrong",
	},
	logOutLink: "Privacy & Data",
	logOutNote: "To delete your account, go to ",
	manage: "Manage subscription",
	/** Store billing, per platform (the handoff's line is Apple's; Android's says Google Play). */
	manageNote: {
		android:
			"Billing is with Google Play. Changing or cancelling happens there.",
		ios: "Billing is with Apple. Changing or cancelling happens there.",
	},
	names: "Names",
	namesNote:
		"Your name is what Xolace calls you. Your space’s name is just for you, and it’s also what your Talk companion is called.",
	/** A row that leaves the app says so to VoiceOver. */
	outside: (label: string) => `${label}, opens outside Xolace`,
	plus: "Xolace+",
	restore: "Restore purchases",
	restoreNote: {
		android:
			"Already have Xolace+ on this Google account? This brings it back.",
		ios: "Already have Xolace+ on this Apple ID? This brings it back.",
	},
	restoring: "Restoring…",
	signedIn: {
		apple: "Signed in with Apple",
		email: "Signed in with email",
		google: "Signed in with Google",
	} satisfies Record<SignIn, string>,
	signedOut: "Signed out",
	signIn: "Sign-in",
	/** Spoken on the sign-in row's place while Clerk loads. */
	signInLoading: "Loading how you sign in",
	yourName: "Your name",
	yourSpace: "Your space",
} as const;

/** The rows' icons, with their Android twins. Apple's and Google's marks are drawn. */
export const ACCOUNT_ICONS = {
	email: { android: "mail", ios: "envelope" },
	manage: { android: "auto_awesome", ios: "sparkle" },
	name: { android: "person", ios: "person" },
	restore: { android: "restore", ios: "arrow.counterclockwise" },
	space: { android: "home", ios: "house" },
} as const satisfies Record<string, IconName>;
