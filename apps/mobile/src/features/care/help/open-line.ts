/**
 * Opens a line straight away and says so only if the phone can't. No `canOpenURL` check first:
 * on Android 11+ it can't see the dialer without a `<queries>` entry, so a crisis call would be
 * refused before it was tried. `openURL` itself rejects when nothing can take the link
 * (Android's ActivityNotFoundException), and that's when the toast says what to do. Pure: the
 * opener and the toast come in, so the failure path is tested (`open-line.test.ts`).
 */
import { failureOf, type LineKind } from "@/features/care/help/help-model";

export async function openOrSay(
	url: string,
	kind: LineKind,
	io: {
		openURL: (url: string) => Promise<unknown>;
		say: (message: string) => void;
	}
): Promise<boolean> {
	try {
		await io.openURL(url);
		return true;
	} catch {
		io.say(failureOf(kind));
		return false;
	}
}
