/**
 * The "share your story" call-out: people write to the founders by email, nothing is written in
 * the app yet. Pure, so the link and the fallback are tested (`story-call-model.test.ts`); the
 * opener, the clipboard and the toast come in from `use-story-call.ts`.
 */
import { COPY } from "@/features/lantern/copy";

export type Mail = { to: string; subject: string; body: string };

export const STORY_MAIL: Mail = {
	body: COPY.storyCall.mail.body,
	subject: COPY.storyCall.mail.subject,
	to: COPY.storyCall.email,
};

/** `mailto:` with the subject and body encoded (spaces as `%20`, which mail apps read; never `+`). */
export function mailtoOf({ to, subject, body }: Mail): string {
	return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export type MailOutcome = "opened" | "copied" | "shown";

/**
 * Opens the mail composer straight away, with no `canOpenURL` check first (the Help screen's
 * `openOrSay` pattern: `openURL` rejects when nothing can take the link). With no mail app, the
 * address goes on the clipboard and a toast says so; if even that fails, the toast shows it.
 */
export async function openOrCopy(
	mail: Mail,
	io: {
		openURL: (url: string) => Promise<unknown>;
		copy: (text: string) => Promise<unknown>;
		say: (message: string, description?: string) => void;
	}
): Promise<MailOutcome> {
	try {
		await io.openURL(mailtoOf(mail));
		return "opened";
	} catch {}
	try {
		await io.copy(mail.to);
		io.say(COPY.storyCall.copied, mail.to);
		return "copied";
	} catch {
		io.say(COPY.storyCall.noMail(mail.to));
		return "shown";
	}
}
