import {
	DISPLAY_NAME_MAX_LENGTH,
	validateDisplayName,
} from "@xolace/backend/convex/lib/displayName";
import {
	SPACE_NAME_MAX_LENGTH,
	validateSpaceName,
} from "@xolace/backend/convex/lib/spaceName";
import type { NameDialogCopy } from "@/components/settings-kit/name-dialog";
import {
	ACCOUNT_COPY as C,
	type NameKind,
	type SignIn,
} from "@/features/settings/account/copy";

/** The most characters each name takes, as the backend's validators count them. */
export const NAME_MAX: Record<NameKind, number> = {
	name: DISPLAY_NAME_MAX_LENGTH,
	space: SPACE_NAME_MAX_LENGTH,
};

/**
 * How the person signed in (production's `useAccountSettings`): Apple or Google from any of
 * Clerk's external accounts. Production signs in with those two only, so email shows only when
 * Clerk reports neither.
 */
export function signInOf(providers: readonly string[]): SignIn {
	for (const raw of providers) {
		const provider = raw.toLowerCase();
		if (provider.includes("apple")) {
			return "apple";
		}
		if (provider.includes("google")) {
			return "google";
		}
	}
	return "email";
}

/** What's wrong with a draft, in the backend validator's own words, or "" when it can be saved. */
export function nameError(kind: NameKind, draft: string): string {
	const result =
		kind === "space" ? validateSpaceName(draft) : validateDisplayName(draft);
	return result.ok ? "" : result.message;
}

/** A Convex error's own message ("30 characters max"), as production's `NameDialog` showed it. */
export function errorText(error: unknown): string {
	if (!(error instanceof Error)) {
		return "Something went wrong";
	}
	const match = error.message.match(/Uncaught Error: (.+?)(?:\n|$)/);
	return match ? match[1] : error.message;
}

/** The space as the row shows it: its name, or the companion's default while unnamed. */
export const spaceShown = (space: string | null, companion: string) =>
	space ?? companion;

/** "Reset to Ember" is offered only when the space has a name of its own. */
export const canResetSpace = (space: string | null, companion: string) =>
	space !== null && space !== companion;

/** The dialog's words for one name; the space's mention the companion's default. */
export function dialogCopy(kind: NameKind, companion: string): NameDialogCopy {
	const shared = {
		cancel: C.dialog.cancel,
		reset: C.dialog.reset(companion),
		save: C.dialog.save,
	};
	if (kind === "name") {
		return { ...shared, ...C.dialog.name };
	}
	return {
		...shared,
		desc: C.dialog.space.desc(companion),
		field: C.dialog.space.field,
		title: C.dialog.space.title,
	};
}
