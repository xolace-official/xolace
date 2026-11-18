/** Connect's words: the prototype's board copy where it drew the screen, production's where it
 * didn't (lifecycle lines, empty states, the toasts). */
export const COPY = {
	archived: {
		emptyBody:
			"Archiving a chat tucks it out of your list, your copy only. It comes back on its own when there's new activity.",
		emptyTitle: "Nothing archived",
		hint: "Chats return to your list when there's new activity.",
	},
	archivedRow: {
		a11y: (n: number) =>
			`Archived, ${n} ${n === 1 ? "conversation" : "conversations"}`,
		label: (n: number) => `Archived · ${n}`,
	},
	archivedTitle: "Archived",
	channel: {
		a11y: (unread: string | null) =>
			`Xolace, verified${unread ? `, ${unread}` : ""}`,
		name: "Xolace",
		sub: "Camp announcements",
	},
	chip: {
		closed: "Closed",
		newRequest: "New request",
		resting: "Resting",
		talking: "Talking",
		waiting: "Waiting",
		wrappedUp: "Wrapped up",
	},
	deleteDialog: {
		body: "It disappears from your list for good. Their copy stays until they delete it too.",
		confirm: "Delete",
		title: "Delete this request?",
	},
	disabled: {
		body: "This space is still being prepared. Check back soon.",
		title: "Nothing here yet",
	},
	empty: {
		archivedOnlyBody:
			"Everything you've talked about is archived. It comes back here on its own when there's new activity.",
		archivedOnlyTitle: "No active conversations",
		body: "When you message a Xolacer, it'll live here, with anything you've talked about before.",
		browse: "See who's listening",
		title: "No conversations yet",
	},
	line: {
		afterSession: "Just after a session",
		closed: "This conversation is closed",
		expired: "This request quietly expired",
		quiet: "Gone quiet. Pick it back up anytime.",
		requestSent: (name: string) =>
			`Request sent. ${name} will reply when they can.`,
		stillHere: "Everything you two wrote is still here",
		theyCouldnt: (name: string) => `${name} couldn't take this one on`,
		theyWrappedUp: (name: string) =>
			`${name} wrapped this up. Pick it back up anytime.`,
		youClosed: "You closed this request",
		youWrappedUp: "You wrapped this up. It can still be picked back up.",
	},
	menu: {
		archive: "Archive",
		cancel: "Cancel",
		close: "Close",
		delete: "Delete request",
		unarchive: "Unarchive",
	},
	myProfile: {
		label: "Your Xolacer profile",
		paused: "Your Xolacer profile, you're paused",
	},
	roster: {
		card: (name: string, presence: string, rating: string, bio: string) =>
			`${name}, ${presence}, ${rating}. ${bio}`,
		emptyBody:
			"Xolacers are still settling in. They'll show up here as they arrive. Check back soon.",
		emptyTitle: "No one's here just yet",
		everyone: "Everyone",
		filterA11y: (label: string) => `Show ${label}`,
		full: "Full right now",
		hereNow: "Here now",
		newXolacer: "New Xolacer",
		noMatch:
			"Nobody's listed that right now. Try another tag, or browse everyone.",
		rating: (r: number) => `★ ${r.toFixed(1)}`,
		ratingA11y: (r: number, n: number) =>
			`rated ${r.toFixed(1)} out of 5 from ${n} conversations`,
		repliesInADay: "Replies within a day",
		talking: "Talking",
	},
	row: {
		a11y: (name: string, present: boolean, unread: string | null) =>
			`Conversation with ${name}${present ? ", here right now" : ""}${unread ? `, ${unread}` : ""}`,
		more: "More actions",
		unread: (n: number) => `${n} unread message${n === 1 ? "" : "s"}`,
	},
	segments: [
		{ id: "chats", label: "Chats" },
		{ id: "xolacers", label: "Xolacers" },
	],
	setup: {
		body: "People can't find you until it's published.",
		title: "Set up your Xolacer profile",
	},
	title: "Connect",
	toast: {
		archived: "Archived",
		archiveFailed: "Couldn't archive",
		closeFailed: "Couldn't close",
		deleteFailed: "Couldn't delete",
		tryAgain: "Something went wrong. Try again.",
		unarchived: "Moved back to Chats",
		unarchiveFailed: "Couldn't unarchive",
		undo: "Undo",
	},
} as const;
