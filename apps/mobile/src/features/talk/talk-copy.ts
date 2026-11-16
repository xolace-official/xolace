// Words the talk screen says about itself (#593).

export {
	MIN_TALK_S,
	TALK_TIME_RESETS,
	talkTimeLine,
	WEEKLY_TALK_S,
} from "@/lib/talk/talk-time";
export { COMPANION_FALLBACK_NAME } from "@/lib/talk/use-companion-name";

/** Agreed in #588. Rule 12: it has to be literally true when it ships. */
export const PRIVACY_LINE =
	"Your talk is saved as text in Xolace, like a reflection, and goes when you delete your data. We don't keep a recording. Our voice provider is set to keep nothing and we ask it to delete its copy as soon as you finish.";

// Ending a talk: the mirror now, or "Just end", which still makes it, for later.
export const JUST_END = "Just end";
export const MIRROR_LATER = "Your mirror waits in your timeline";
