import { IASP_DIRECTORY_URL } from "../../lib/crisisResources";
import { siteLink } from "../appLinks";
import { type EmailLinkTarget, emailLink } from "./appLinks";
import { EMAIL_LOGO_PATH } from "./logo";

/**
 * The welcome's words (#915), in one place for both the HTML template and the
 * plain-text part. The subject and preview say nothing about mental health,
 * so a glance at an inbox gives nothing away. Copy changes go through review.
 */

export const WELCOME_SUBJECT = "Welcome to Xolace";

/** The inbox preview line: neutral, like the subject. */
export const WELCOME_PREVIEW = "A few places to start, whenever you're ready.";

export const WELCOME_INTRO =
	"Xolace is a quiet place to put down what's on your mind, in writing or out loud, whenever you need to.";

export const WELCOME_START = "A few places to start, whenever you're ready:";

/** Where the welcome invites them first, in order. */
export const WELCOME_STARTS: readonly {
	label: string;
	target: EmailLinkTarget;
}[] = [
	{ label: "Talk something through", target: "talk" },
	{ label: "Say it out loud and let it go", target: "vent" },
	{ label: "Find something calm to listen to or read", target: "explore" },
];

/** Mentions the gist and the recap; signs no one up to either. */
export const WELCOME_SETTINGS =
	"Xolace can also send you a short weekly gist to read, and a recap of your own week. Both stay off unless you turn them on in Settings.";

export const WELCOME_CRISIS =
	"If you're in danger or thinking about ending your life, please call your local emergency number now.";

export const WELCOME_HELPLINES = "Find a helpline in your country";

export const WELCOME_SUPPORT = "Support resources in the app";

export const WELCOME_REPLIES =
	"You can reply to this email. A person reads replies, not instantly, so please don't use it in an emergency.";

export const WELCOME_SIGN_OFF = "The Xolace team";

export type WelcomeLinks = Record<EmailLinkTarget, string> & {
	helplines: string;
	/** The logo, served by this deployment. */
	logo: string;
};

/** Every link the welcome carries, for this deployment. */
export function welcomeLinks(): WelcomeLinks {
	return {
		explore: emailLink("explore"),
		helplines: IASP_DIRECTORY_URL,
		logo: siteLink(EMAIL_LOGO_PATH, ""),
		support: emailLink("support"),
		talk: emailLink("talk"),
		vent: emailLink("vent"),
	};
}

/** The plain-text part, stored as the outreach's channel-neutral body. */
export function welcomeText(): string {
	const links = welcomeLinks();
	return [
		WELCOME_SUBJECT,
		WELCOME_INTRO,
		[
			WELCOME_START,
			...WELCOME_STARTS.map(
				({ label, target }) => `- ${label}: ${links[target]}`
			),
		].join("\n"),
		WELCOME_SETTINGS,
		WELCOME_SIGN_OFF,
		"--",
		[
			WELCOME_CRISIS,
			`${WELCOME_HELPLINES}: ${links.helplines}`,
			`${WELCOME_SUPPORT}: ${links.support}`,
		].join("\n"),
		WELCOME_REPLIES,
	].join("\n\n");
}
