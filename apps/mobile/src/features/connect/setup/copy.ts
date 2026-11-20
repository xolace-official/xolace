/**
 * Xolacer setup and edit (C2). Every string is production's (`xolacer-chat/setup/*`), its em
 * dashes made a colon or a full stop; the cap and ready lines are the handoff's.
 */
export const SETUP = {
	bio: {
		label: "Bio",
		placeholder:
			"Here for the nights that feel too loud. I don’t scare easy, and I won’t try to fix you.",
	},
	close: "Close",
	cont: "Continue",
	edit: {
		active: "You’re listed",
		activeA11y: "Available for new conversations",
		activeFoot:
			"People can find you and send requests. Takes effect right away.",
		cancel: "Cancel",
		gap: (missing: string) =>
			`Your profile is live. ${capitalise(missing)} before saving.`,
		goneBody: "There’s no Xolacer profile on this account right now.",
		goneTitle: "No profile to edit",
		loading: "Loading your profile",
		paused: "You’re paused",
		pausedFoot: "You’re off the roster. Chats you already have still work.",
		photoNow: "A new photo replaces the old one straight away.",
		save: "Save",
		saveA11y: "Save profile",
		saved: "Profile updated.",
		saving: "Saving…",
		specialties: "What you’re here for",
		title: "Edit profile",
	},
	failed: {
		active: (listing: boolean) =>
			listing
				? "Couldn’t list you. Try again."
				: "Couldn’t pause you. Try again.",
		photo: "Couldn’t upload that photo. Try again.",
		publish: "Couldn’t publish yet. Something’s missing.",
		save: "Couldn’t save that. Check your connection.",
	},
	loading: "Loading your Xolacer profile",
	name: {
		help: "Your real name is never shown, only what you type here.",
		label: "Display name",
		placeholder: "Maya",
	},
	photo: {
		add: "Add a photo",
		change: "Change your photo",
		choose: "Choose a photo",
		chooseOther: "Choose a different photo",
		fine: "This is the only image anyone sees. It stays on your Xolacer profile and nowhere else.",
	},
	previous: "Previous step",
	progress: (done: number, total: number, missing: string) =>
		`${done} of ${total} complete. ${capitalise(missing)} to publish.`,
	publish: "Publish profile",
	published: "You’re on the roster.",
	publishing: "Publishing…",
	ready: "All set. Publish when you’re ready.",
	review: {
		fine: "Publishing puts you on the roster. You can edit any of this later, and people only reach you by sending a request you can decline.",
		noBio: "Your bio",
		noName: "Your name",
	},
	spec: { full: "Four is the limit. Deselect one to swap." },
	stepOf: (n: number, total: number) => `Step ${n} of ${total}`,
} as const;

function capitalise(text: string) {
	return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}
