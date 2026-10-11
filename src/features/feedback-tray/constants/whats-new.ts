import type { ComponentProps } from "react";
import type { SymbolView } from "expo-symbols";

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
    id: "2026-10-ota-image-speed",
    label: "OTA Update",
    date: "October 2026",
    highlights: [
      {
        icon: { ios: "photo.fill", android: "image" },
        title: "Pictures show up faster",
        body: "Covers in the Lantern now load quickly, appearing as a soft blur first and then sharpening, so browsing feels smooth instead of waiting on images.",
      },
      {
        icon: { ios: "book.fill", android: "menu_book" },
        title: "More to read",
        body: "A few new reads have joined the Lantern, including more on loneliness.",
      },
    ],
  },
  {
    id: "1.12.0",
    label: "Version 1.12.0",
    date: "September 2026",
    highlights: [
      {
        icon: { ios: "book.fill", android: "menu_book" },
        title: "Meet the Lantern",
        body: "A new library of reads for when you want to understand what you're carrying; browse by topic, pick one up, and come back to where you left off.",
      },
      {
        icon: { ios: "flame.fill", android: "local_fire_department" },
        title: "A new streak experience",
        body: "Showing up now feels like something. Your streak has a fresh look and a quiet acknowledgement for the days you keep coming back.",
      },
      {
        icon: { ios: "arrow.turn.down.right", android: "subdirectory_arrow_right" },
        title: "A gentler follow-up",
        body: "The follow-up after a moment has been redesigned to be clearer and easier to answer, at whatever pace suits you.",
      },
      {
        icon: { ios: "wand.and.stars", android: "auto_fix_high" },
        title: "Faster, steadier",
        body: "The app loads and moves more smoothly, and a round of bug fixes and polish is tucked in throughout.",
      },
    ],
  },
  {
    id: "2026-09-ota-polish",
    label: "OTA Update",
    date: "September 2026",
    highlights: [
      {
        icon: { ios: "hand.tap.fill", android: "touch_app" },
        title: "Feedback that fits the moment",
        body: "Taps and haptics across the app are tuned down and cleaned up, so your phone buzzes when it means something and stays quiet when it doesn't.",
      },
      {
        icon: { ios: "wand.and.stars", android: "auto_fix_high" },
        title: "Small fixes",
        body: "Reaching your daily session limit no longer crashes and now explains itself clearly, and a few other rough edges are smoothed out.",
      },
    ],
  },
  {
    id: "2026-09-ota-minor-fixes",
    label: "OTA Update",
    date: "September 2026",
    highlights: [
      {
        icon: { ios: "bell.badge.fill", android: "notifications_active" },
        title: "Notifications open the right place",
        body: "Tapping a notification now takes you where it meant to, and an old one you already dealt with won't quietly reopen later.",
      },
      {
        icon: { ios: "wand.and.stars", android: "auto_fix_high" },
        title: "Small fixes",
        body: "The vent screen stays lit while you're in it, tapping the reflect card always opens it, and a few layout rough edges are smoothed out.",
      },
    ],
  },
  {
    id: "1.10.0",
    label: "Version 1.10.0",
    date: "September 2026",
    highlights: [
      {
        icon: { ios: "envelope.fill", android: "mail" },
        title: "A letter from the founder",
        body: "Right after you sign up, Nathaniel — Xolace's CEO — introduces himself in his own words, and tells you why this exists. If you've been here a while, he says that too.",
      },
      {
        icon: { ios: "list.bullet.rectangle.fill", android: "assignment" },
        title: "A few short questions, once",
        body: "New sign-ups now walk through a brief intake so Xolace can meet you where you actually are, instead of guessing. It runs one time and then gets out of the way.",
      },
      {
        icon: { ios: "rectangle.and.pencil.and.ellipsis", android: "edit_note" },
        title: "The reflect screen, rebuilt",
        body: "Tapping to write now opens the page that's already in front of you rather than jumping to a new screen, the background carries a soft wash of your theme's color, and your draft is kept if you close the composer by accident.",
      },
      {
        icon: { ios: "star.fill", android: "star" },
        title: "Keep a quote",
        body: "Star a daily quote to save it — kept quotes now have their own archive you can scroll back through. Quotes also arrive with a title now, and you can reply to the deck's question.",
      },
      {
        icon: { ios: "wand.and.stars", android: "auto_fix_high" },
        title: "Steadier and quicker",
        body: "A sign-in hang is fixed, the home screen loads faster, and there's a round of smaller fixes and polish throughout.",
      },
    ],
  },
  {
    id: "2026-08-ota-mirror-closing-question",
    label: "OTA Update",
    date: "August 2026",
    highlights: [
      {
        icon: { ios: "questionmark.bubble.fill", android: "help" },
        title: "The mirror asks, instead of just stopping",
        body: "When Xolace can't quite reach what you mean, it used to just leave it there. Now it ends with a question — sometimes naming something it remembers about you, to check if that's what tonight is about.",
      },
    ],
  },
  {
    id: "2026-08-ota-weekly-cohort-card",
    label: "OTA Update",
    date: "August 2026",
    highlights: [
      {
        icon: { ios: "flame.fill", android: "local_fire_department" },
        title: "You are not alone",
        body: "Once a week, Discovery shows you how many other campers sat with the same feeling you did — a quiet reminder that whatever you're carrying, someone else set it down by this fire too.",
      },
    ],
  },
  {
    id: "2026-08-ota-chat-archive-close",
    label: "OTA Update",
    date: "August 2026",
    highlights: [
      {
        icon: { ios: "archivebox.fill", android: "archive" },
        title: "Archive a conversation",
        body: "Long-press any conversation in Connect to archive it — it moves out of your list without touching the other side's, and comes back on its own the moment there's new activity.",
      },
      {
        icon: { ios: "moon.fill", android: "bedtime" },
        title: "Xolacers can close a conversation early",
        body: "A xolacer can now wrap up a conversation on their own terms, right from the same long-press menu, instead of waiting on it to go quiet.",
      },
      {
        icon: { ios: "trash.fill", android: "delete" },
        title: "Clear out old requests",
        body: "A declined or expired request can now be removed from your list — it's gone from your side without affecting theirs.",
      },
    ],
  },
  {
    id: "1.9.1",
    label: "Version 1.9.1",
    date: "August 2026",
    highlights: [
      {
        icon: { ios: "sparkles", android: "auto_awesome" },
        title: "A new welcome",
        body: "First time here? You'll meet the fire one beat at a time before you sign in. Coming back? You'll see the carousel deck, then the sign-in sheet.",
      },
      {
        icon: { ios: "person.crop.circle.fill", android: "account_circle" },
        title: "Change your username",
        body: "Pick a new display name anytime from Settings.",
      },
      {
        icon: { ios: "pencil", android: "edit" },
        title: "Edit your Xolacer profile",
        body: "Already listed as a Xolacer? You can now go back and update your photo, bio, and specialties — no need to start over.",
      },
    ],
  },
  {
    id: "2026-08-ota-message-actions",
    label: "OTA Update",
    date: "August 2026",
    highlights: [
      {
        icon: { ios: "text.bubble.fill", android: "chat" },
        title: "Fix a message you've sent",
        body: "Press and hold any message in a conversation to copy, edit, or delete it. These were quietly doing nothing before — they work now.",
      },
    ],
  },
  {
    id: "1.9.0",
    label: "Version 1.9.0",
    date: "August 2026",
    highlights: [
      {
        icon: { ios: "bell.badge.fill", android: "notifications_active" },
        title: "Chat notifications",
        body: "You'll now hear about it when someone sends a request, accepts, declines, or messages you — each with its own sound. And you can mute chat notifications separately from Xolace's own gentle nudges, in Settings.",
      },
      {
        icon: { ios: "circle.fill", android: "circle" },
        title: "See who's here now",
        body: "A xolacer's profile, your requests, and your chats list now show a live dot when they're in the app — so waiting doesn't feel like nothing's happening.",
      },
      {
        icon: { ios: "ellipsis.bubble.fill", android: "more_horiz" },
        title: "Real-time in your conversations",
        body: "An open chat now shows typing, online, and when they were last active — right in the header.",
      },
    ],
  },
  {
    id: "2026-08-ota-chat-unread-typing",
    label: "OTA Update",
    date: "August 2026",
    highlights: [
      {
        icon: { ios: "bell.badge.fill", android: "notifications_active" },
        title: "You can see what's waiting",
        body: "Conversations in Connect now show how many messages are waiting for you, on the ones you're still in — including a chat that's gone quiet. Requests and closed conversations stay quiet.",
      },
      {
        icon: { ios: "ellipsis.bubble.fill", android: "more_horiz" },
        title: "You'll know when they're writing",
        body: "When the person you're talking to is typing, you'll see it — with their name, never anyone else's.",
      },
    ],
  },
  {
    id: "2026-08-ota-discovery-appearance",
    label: "OTA Update",
    date: "August 2026",
    highlights: [
      {
        icon: { ios: "rectangle.stack.fill", android: "view_carousel" },
        title: "Your Moments, right up front",
        body: "A few of your recent moments now show up on the home tab, right after your daily quote — tap through to see the rest on your timeline.",
      },
      {
        icon: { ios: "paintpalette.fill", android: "palette" },
        title: "A better way to pick a theme",
        body: "Browsing themes in Settings → Appearance feels alive now — the one you're centered on grows, and the background gives you a hint of its color before you commit.",
      },
    ],
  },
  {
    id: "1.8.0",
    label: "Version 1.8.0",
    date: "August 2026",
    highlights: [
      {
        icon: { ios: "person.2.fill", android: "groups" },
        title: "Talk to a real person",
        body: "The new Connect tab holds Xolacers — people who've offered to listen. Browse who's there, see what they listen to, and send a request. They're trained peers, not therapists, and nothing is sent until they accept.",
      },
      {
        icon: { ios: "hand.raised.fill", android: "front_hand" },
        title: "Become a Xolacer",
        body: "You can offer to listen too. Five short steps — a photo, a name, a line about you, and what you're here for. Your real name and contact details are never shown, and you can go Away anytime.",
      },
      {
        icon: { ios: "figure.wave", android: "waving_hand" },
        title: "Someone offered, at the end",
        body: "When a session ends on something a xolacer listens to, we'll show you that one person before you close. Tapping only opens their profile — nothing is sent unless you reach out.",
      },
      {
        icon: { ios: "hand.raised.slash.fill", android: "block" },
        title: "Block and report",
        body: "Every conversation and every Xolacer profile now has a menu with Block and Report. Blocking stops messages for both of you at once — we'll ask you to confirm, because it can't be undone, and the other person is never told. Nothing you wrote is deleted. Reports now say who they're about, so we can actually act on them.",
      },
      {
        icon: { ios: "sparkles", android: "auto_awesome" },
        title: "A new way in",
        body: "The app now opens on a home tab with a daily quote, and Reflect is always one tap away at the bottom of the screen.",
      },
    ],
  },
  {
    id: "2026-07-personal-memory",
    label: "Version 1.7.0",
    date: "July 2026",
    highlights: [
      {
        icon: { ios: "brain.head.profile", android: "psychology" },
        title: "Personal memory",
        body: "Xolace now remembers what's come up for you across sessions, so mirrors can reflect your patterns, not just the moment in front of you. It's on by default — find the toggle in Settings → Data if you'd rather turn it off.",
      },
      {
        icon: { ios: "paintpalette.fill", android: "palette" },
        title: "Premium themes",
        body: "Xolace+ members can now dress the fire in five new palettes — Emerald, Rosé, Platinum, Velvet, and Noir. Find them in Settings → Appearance.",
      },
      {
        icon: { ios: "waveform", android: "graphic_eq" },
        title: "Choose your voice",
        body: "Xolace+ members can pick who speaks their mirror and their vent: Sage, Wren, Vesper, or Ash. Preview each one in Settings → Mirror before you choose.",
      },
    ],
  },
  {
    id: "1.6.1",
    label: "OTA Update",
    date: "June 2026",
    highlights: [
      {
        icon: { ios: "hand.wave.fill", android: "waving_hand" },
        title: "Gentle check-ins",
        body: "When a moment feels unfinished, we'll quietly check back a day or so later to see how it's sitting. No pressure; just a soft door if you want it.",
      },
    ],
  },
  {
    id: "1.6.0",
    label: "Version 1.6.0",
    date: "June 2026",
    highlights: [
      {
        icon: { ios: "person.crop.circle.fill", android: "account_circle" },
        title: "Your profile",
        body: "A personal look at your moments, streak, and the emotions that show up most for you.",
      },
      {
        icon: { ios: "bubble.left.and.bubble.right.fill", android: "forum" },
        title: "Shake to talk to us",
        body: "Shake your phone anywhere in the app to report a bug or suggest an idea.",
      },
    ],
  },
  {
    id: "1.5.0",
    label: "Version 1.5.0",
    date: "June 2026",
    highlights: [
      {
        icon: { ios: "flame.fill", android: "local_fire_department" },
        title: "Voice Vent",
        body: "Speak something heavy aloud and watch it burn away. Your voice is never stored.",
      },
      {
        icon: { ios: "heart.fill", android: "favorite" },
        title: "Awareness moments",
        body: "Gentle, monthly acknowledgements of what you might be carrying.",
      },
    ],
  },
  {
    id: "1.4.0",
    label: "Version 1.4.0",
    date: "June 2026",
    highlights: [
      {
        icon: { ios: "paperplane.fill", android: "send" },
        title: "Trusted Bridge",
        body: "Turn what you felt into a message you can actually send to someone who matters.",
      },
    ],
  },
  {
    id: "1.3.0",
    label: "Version 1.3.0",
    date: "May 2026",
    highlights: [
      {
        icon: { ios: "quote.bubble.fill", android: "format_quote" },
        title: "Daily quotes",
        body: "A personalized line each day, distilled from your sessions. Never your raw words.",
      },
      {
        icon: { ios: "square.and.arrow.up", android: "share" },
        title: "Share a quote",
        body: "Send a quote out as a polished, theme-aware card.",
      },
    ],
  },
];

/** Id of the newest entry — what `lastSeenVersion` is compared against. */
export const LATEST_WHATS_NEW_ID: string | null = WHATS_NEW[0]?.id ?? null;

/** True when there's a newest entry the user hasn't opened yet. */
export const hasUnseenWhatsNew = (lastSeenVersion: string | null): boolean =>
  LATEST_WHATS_NEW_ID !== null && lastSeenVersion !== LATEST_WHATS_NEW_ID;
