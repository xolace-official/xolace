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

export const NAME_MAX: Record<NameKind, number> = {
	name: DISPLAY_NAME_MAX_LENGTH,
	space: SPACE_NAME_MAX_LENGTH,
};

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

export function nameError(kind: NameKind, draft: string): string {
	const result =
		kind === "space" ? validateSpaceName(draft) : validateDisplayName(draft);
	return result.ok ? "" : result.message;
}

export function errorText(error: unknown): string {
	if (!(error instanceof Error)) {
		return "Something went wrong";
	}
	const match = error.message.match(/Uncaught Error: (.+?)(?:\n|$)/);
	return match ? match[1] : error.message;
}

export const spaceShown = (space: string | null, companion: string) =>
	space ?? companion;

export const spaceUnchanged = (
	space: string | null,
	draft: string,
	companion: string
) => draft === spaceShown(space, companion);

export const canResetSpace = (space: string | null, companion: string) =>
	space !== null && space !== companion;

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
