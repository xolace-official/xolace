import type { SymbolView } from "expo-symbols";
import type { ComponentProps } from "react";

type CrossPlatformSymbol = ComponentProps<typeof SymbolView>["name"];

export type WhatsNewHighlight = {
	icon: CrossPlatformSymbol;
	title: string;
	body: string;
};

export type WhatsNewEntry = {
	/**
	 * Stable unique key used for seen-tracking. NOT the same as the version number
	 * — OTA updates keep the store version, so each entry needs its own id
	 * ([[feedback_ota_versioning]]).
	 */
	id: string;
	/** Display label, e.g. "Version 1.6.0" or "OTA Update". */
	label: string;
	/** Human date string for display. */
	date: string;
	highlights: WhatsNewHighlight[];
};

/**
 * User-facing release notes, newest first. Kept warm and plain-language — this
 * is what the user sees, not the engineering CHANGELOG.md. Local for now;
 * a Convex-driven changelog is a P3 TODO.
 */
export const WHATS_NEW: WhatsNewEntry[] = [
	{
		date: "October 2026",
		highlights: [
			{
				body: "Small fixes and polish across Reflect, Browse and Settings to keep things running smoothly.",
				icon: { android: "build", ios: "wrench.and.screwdriver.fill" },
				title: "Bug fixes",
			},
		],
		id: "2026-10-ota-fixes",
		label: "OTA Update",
	},
	{
		date: "October 2026",
		highlights: [
			{
				body: "A new Insights screen in your profile shows how each part of your life has been sitting over time. Areas open up as you keep coming back, and Xolace+ members also see their usual, the trend, and what Xolace has noticed across months.",
				icon: { android: "insights", ios: "chart.line.uptrend.xyaxis" },
				title: "See how steady you've been",
			},
			{
				body: "Xolace+ members can now talk instead of type in Reflect, with clearer transcription. We'll always ask before your voice is processed, and it's never kept.",
				icon: { android: "mic", ios: "mic.fill" },
				title: "Speak your reflection",
			},
			{
				body: "One search bar now finds reads, support audio, music and topics, all in one place.",
				icon: { android: "search", ios: "magnifyingglass" },
				title: "Search everything in Browse",
			},
			{
				body: "A mini-player keeps your track close while you move around the app.",
				icon: { android: "play_circle", ios: "play.circle.fill" },
				title: "Keep listening as you go",
			},
			{
				body: "Glassier surfaces, smoother navigation, swipe to archive a conversation, and press-and-hold previews on your moments and reads.",
				icon: { android: "auto_awesome", ios: "sparkles" },
				title: "A fresher look",
			},
		],
		id: "1.14.0",
		label: "Version 1.14.0",
	},
	{
		date: "October 2026",
		highlights: [
			{
				body: "Covers in the Lantern now load quickly, appearing as a soft blur first and then sharpening, so browsing feels smooth instead of waiting on images.",
				icon: { android: "image", ios: "photo.fill" },
				title: "Pictures show up faster",
			},
			{
				body: "A few new reads have joined the Lantern, including more on loneliness.",
				icon: { android: "menu_book", ios: "book.fill" },
				title: "More to read",
			},
		],
		id: "2026-10-ota-image-speed",
		label: "OTA Update",
	},
	{
		date: "September 2026",
		highlights: [
			{
				body: "A new library of reads for when you want to understand what you're carrying; browse by topic, pick one up, and come back to where you left off.",
				icon: { android: "menu_book", ios: "book.fill" },
				title: "Meet the Lantern",
			},
			{
				body: "Showing up now feels like something. Your streak has a fresh look and a quiet acknowledgement for the days you keep coming back.",
				icon: { android: "local_fire_department", ios: "flame.fill" },
				title: "A new streak experience",
			},
			{
				body: "The follow-up after a moment has been redesigned to be clearer and easier to answer, at whatever pace suits you.",
				icon: {
					android: "subdirectory_arrow_right",
					ios: "arrow.turn.down.right",
				},
				title: "A gentler follow-up",
			},
			{
				body: "The app loads and moves more smoothly, and a round of bug fixes and polish is tucked in throughout.",
				icon: { android: "auto_fix_high", ios: "wand.and.stars" },
				title: "Faster, steadier",
			},
		],
		id: "1.12.0",
		label: "Version 1.12.0",
	},
	{
		date: "September 2026",
		highlights: [
			{
				body: "Taps and haptics across the app are tuned down and cleaned up, so your phone buzzes when it means something and stays quiet when it doesn't.",
				icon: { android: "touch_app", ios: "hand.tap.fill" },
				title: "Feedback that fits the moment",
			},
			{
				body: "Reaching your daily session limit no longer crashes and now explains itself clearly, and a few other rough edges are smoothed out.",
				icon: { android: "auto_fix_high", ios: "wand.and.stars" },
				title: "Small fixes",
			},
		],
		id: "2026-09-ota-polish",
		label: "OTA Update",
	},
	{
		date: "September 2026",
		highlights: [
			{
				body: "Tapping a notification now takes you where it meant to, and an old one you already dealt with won't quietly reopen later.",
				icon: { android: "notifications_active", ios: "bell.badge.fill" },
				title: "Notifications open the right place",
			},
			{
				body: "The vent screen stays lit while you're in it, tapping the reflect card always opens it, and a few layout rough edges are smoothed out.",
				icon: { android: "auto_fix_high", ios: "wand.and.stars" },
				title: "Small fixes",
			},
		],
		id: "2026-09-ota-minor-fixes",
		label: "OTA Update",
	},
	{
		date: "September 2026",
		highlights: [
			{
				body: "Right after you sign up, Nathaniel — Xolace's CEO — introduces himself in his own words, and tells you why this exists. If you've been here a while, he says that too.",
				icon: { android: "mail", ios: "envelope.fill" },
				title: "A letter from the founder",
			},
			{
				body: "New sign-ups now walk through a brief intake so Xolace can meet you where you actually are, instead of guessing. It runs one time and then gets out of the way.",
				icon: { android: "assignment", ios: "list.bullet.rectangle.fill" },
				title: "A few short questions, once",
			},
			{
				body: "Tapping to write now opens the page that's already in front of you rather than jumping to a new screen, the background carries a soft wash of your theme's color, and your draft is kept if you close the composer by accident.",
				icon: {
					android: "edit_note",
					ios: "rectangle.and.pencil.and.ellipsis",
				},
				title: "The reflect screen, rebuilt",
			},
			{
				body: "Star a daily quote to save it — kept quotes now have their own archive you can scroll back through. Quotes also arrive with a title now, and you can reply to the deck's question.",
				icon: { android: "star", ios: "star.fill" },
				title: "Keep a quote",
			},
			{
				body: "A sign-in hang is fixed, the home screen loads faster, and there's a round of smaller fixes and polish throughout.",
				icon: { android: "auto_fix_high", ios: "wand.and.stars" },
				title: "Steadier and quicker",
			},
		],
		id: "1.10.0",
		label: "Version 1.10.0",
	},
	{
		date: "August 2026",
		highlights: [
			{
				body: "When Xolace can't quite reach what you mean, it used to just leave it there. Now it ends with a question — sometimes naming something it remembers about you, to check if that's what tonight is about.",
				icon: { android: "help", ios: "questionmark.bubble.fill" },
				title: "The mirror asks, instead of just stopping",
			},
		],
		id: "2026-08-ota-mirror-closing-question",
		label: "OTA Update",
	},
	{
		date: "August 2026",
		highlights: [
			{
				body: "Once a week, Discovery shows you how many other campers sat with the same feeling you did — a quiet reminder that whatever you're carrying, someone else set it down by this fire too.",
				icon: { android: "local_fire_department", ios: "flame.fill" },
				title: "You are not alone",
			},
		],
		id: "2026-08-ota-weekly-cohort-card",
		label: "OTA Update",
	},
	{
		date: "August 2026",
		highlights: [
			{
				body: "Long-press any conversation in Connect to archive it — it moves out of your list without touching the other side's, and comes back on its own the moment there's new activity.",
				icon: { android: "archive", ios: "archivebox.fill" },
				title: "Archive a conversation",
			},
			{
				body: "A xolacer can now wrap up a conversation on their own terms, right from the same long-press menu, instead of waiting on it to go quiet.",
				icon: { android: "bedtime", ios: "moon.fill" },
				title: "Xolacers can close a conversation early",
			},
			{
				body: "A declined or expired request can now be removed from your list — it's gone from your side without affecting theirs.",
				icon: { android: "delete", ios: "trash.fill" },
				title: "Clear out old requests",
			},
		],
		id: "2026-08-ota-chat-archive-close",
		label: "OTA Update",
	},
	{
		date: "August 2026",
		highlights: [
			{
				body: "First time here? You'll meet the fire one beat at a time before you sign in. Coming back? You'll see the carousel deck, then the sign-in sheet.",
				icon: { android: "auto_awesome", ios: "sparkles" },
				title: "A new welcome",
			},
			{
				body: "Pick a new display name anytime from Settings.",
				icon: { android: "account_circle", ios: "person.crop.circle.fill" },
				title: "Change your username",
			},
			{
				body: "Already listed as a Xolacer? You can now go back and update your photo, bio, and specialties — no need to start over.",
				icon: { android: "edit", ios: "pencil" },
				title: "Edit your Xolacer profile",
			},
		],
		id: "1.9.1",
		label: "Version 1.9.1",
	},
	{
		date: "August 2026",
		highlights: [
			{
				body: "Press and hold any message in a conversation to copy, edit, or delete it. These were quietly doing nothing before — they work now.",
				icon: { android: "chat", ios: "text.bubble.fill" },
				title: "Fix a message you've sent",
			},
		],
		id: "2026-08-ota-message-actions",
		label: "OTA Update",
	},
	{
		date: "August 2026",
		highlights: [
			{
				body: "You'll now hear about it when someone sends a request, accepts, declines, or messages you — each with its own sound. And you can mute chat notifications separately from Xolace's own gentle nudges, in Settings.",
				icon: { android: "notifications_active", ios: "bell.badge.fill" },
				title: "Chat notifications",
			},
			{
				body: "A xolacer's profile, your requests, and your chats list now show a live dot when they're in the app — so waiting doesn't feel like nothing's happening.",
				icon: { android: "circle", ios: "circle.fill" },
				title: "See who's here now",
			},
			{
				body: "An open chat now shows typing, online, and when they were last active — right in the header.",
				icon: { android: "more_horiz", ios: "ellipsis.bubble.fill" },
				title: "Real-time in your conversations",
			},
		],
		id: "1.9.0",
		label: "Version 1.9.0",
	},
	{
		date: "August 2026",
		highlights: [
			{
				body: "Conversations in Connect now show how many messages are waiting for you, on the ones you're still in — including a chat that's gone quiet. Requests and closed conversations stay quiet.",
				icon: { android: "notifications_active", ios: "bell.badge.fill" },
				title: "You can see what's waiting",
			},
			{
				body: "When the person you're talking to is typing, you'll see it — with their name, never anyone else's.",
				icon: { android: "more_horiz", ios: "ellipsis.bubble.fill" },
				title: "You'll know when they're writing",
			},
		],
		id: "2026-08-ota-chat-unread-typing",
		label: "OTA Update",
	},
	{
		date: "August 2026",
		highlights: [
			{
				body: "A few of your recent moments now show up on the home tab, right after your daily quote — tap through to see the rest on your timeline.",
				icon: { android: "view_carousel", ios: "rectangle.stack.fill" },
				title: "Your Moments, right up front",
			},
			{
				body: "Browsing themes in Settings → Appearance feels alive now — the one you're centered on grows, and the background gives you a hint of its color before you commit.",
				icon: { android: "palette", ios: "paintpalette.fill" },
				title: "A better way to pick a theme",
			},
		],
		id: "2026-08-ota-discovery-appearance",
		label: "OTA Update",
	},
	{
		date: "August 2026",
		highlights: [
			{
				body: "The new Connect tab holds Xolacers — people who've offered to listen. Browse who's there, see what they listen to, and send a request. They're trained peers, not therapists, and nothing is sent until they accept.",
				icon: { android: "groups", ios: "person.2.fill" },
				title: "Talk to a real person",
			},
			{
				body: "You can offer to listen too. Five short steps — a photo, a name, a line about you, and what you're here for. Your real name and contact details are never shown, and you can go Away anytime.",
				icon: { android: "front_hand", ios: "hand.raised.fill" },
				title: "Become a Xolacer",
			},
			{
				body: "When a session ends on something a xolacer listens to, we'll show you that one person before you close. Tapping only opens their profile — nothing is sent unless you reach out.",
				icon: { android: "waving_hand", ios: "figure.wave" },
				title: "Someone offered, at the end",
			},
			{
				body: "Every conversation and every Xolacer profile now has a menu with Block and Report. Blocking stops messages for both of you at once — we'll ask you to confirm, because it can't be undone, and the other person is never told. Nothing you wrote is deleted. Reports now say who they're about, so we can actually act on them.",
				icon: { android: "block", ios: "hand.raised.slash.fill" },
				title: "Block and report",
			},
			{
				body: "The app now opens on a home tab with a daily quote, and Reflect is always one tap away at the bottom of the screen.",
				icon: { android: "auto_awesome", ios: "sparkles" },
				title: "A new way in",
			},
		],
		id: "1.8.0",
		label: "Version 1.8.0",
	},
	{
		date: "July 2026",
		highlights: [
			{
				body: "Xolace now remembers what's come up for you across sessions, so mirrors can reflect your patterns, not just the moment in front of you. It's on by default — find the toggle in Settings → Data if you'd rather turn it off.",
				icon: { android: "psychology", ios: "brain.head.profile" },
				title: "Personal memory",
			},
			{
				body: "Xolace+ members can now dress the fire in five new palettes — Emerald, Rosé, Platinum, Velvet, and Noir. Find them in Settings → Appearance.",
				icon: { android: "palette", ios: "paintpalette.fill" },
				title: "Premium themes",
			},
			{
				body: "Xolace+ members can pick who speaks their mirror and their vent: Sage, Wren, Vesper, or Ash. Preview each one in Settings → Mirror before you choose.",
				icon: { android: "graphic_eq", ios: "waveform" },
				title: "Choose your voice",
			},
		],
		id: "2026-07-personal-memory",
		label: "Version 1.7.0",
	},
	{
		date: "June 2026",
		highlights: [
			{
				body: "When a moment feels unfinished, we'll quietly check back a day or so later to see how it's sitting. No pressure; just a soft door if you want it.",
				icon: { android: "waving_hand", ios: "hand.wave.fill" },
				title: "Gentle check-ins",
			},
		],
		id: "1.6.1",
		label: "OTA Update",
	},
	{
		date: "June 2026",
		highlights: [
			{
				body: "A personal look at your moments, streak, and the emotions that show up most for you.",
				icon: { android: "account_circle", ios: "person.crop.circle.fill" },
				title: "Your profile",
			},
			{
				body: "Shake your phone anywhere in the app to report a bug or suggest an idea.",
				icon: { android: "forum", ios: "bubble.left.and.bubble.right.fill" },
				title: "Shake to talk to us",
			},
		],
		id: "1.6.0",
		label: "Version 1.6.0",
	},
	{
		date: "June 2026",
		highlights: [
			{
				body: "Speak something heavy aloud and watch it burn away. Your voice is never stored.",
				icon: { android: "local_fire_department", ios: "flame.fill" },
				title: "Voice Vent",
			},
			{
				body: "Gentle, monthly acknowledgements of what you might be carrying.",
				icon: { android: "favorite", ios: "heart.fill" },
				title: "Awareness moments",
			},
		],
		id: "1.5.0",
		label: "Version 1.5.0",
	},
	{
		date: "June 2026",
		highlights: [
			{
				body: "Turn what you felt into a message you can actually send to someone who matters.",
				icon: { android: "send", ios: "paperplane.fill" },
				title: "Trusted Bridge",
			},
		],
		id: "1.4.0",
		label: "Version 1.4.0",
	},
	{
		date: "May 2026",
		highlights: [
			{
				body: "A personalized line each day, distilled from your sessions. Never your raw words.",
				icon: { android: "format_quote", ios: "quote.bubble.fill" },
				title: "Daily quotes",
			},
			{
				body: "Send a quote out as a polished, theme-aware card.",
				icon: { android: "share", ios: "square.and.arrow.up" },
				title: "Share a quote",
			},
		],
		id: "1.3.0",
		label: "Version 1.3.0",
	},
];

/** Id of the newest entry — what `lastSeenVersion` is compared against. */
export const LATEST_WHATS_NEW_ID: string | null = WHATS_NEW[0]?.id ?? null;

/** True when there's a newest entry the user hasn't opened yet. */
export const hasUnseenWhatsNew = (lastSeenVersion: string | null): boolean =>
	LATEST_WHATS_NEW_ID !== null && lastSeenVersion !== LATEST_WHATS_NEW_ID;
