/** One-time asks that belong to an account, not the phone: a second account on this device
 * still gets them, and one account's answer never silences another's. */

export type AccountFlag =
	| "copingAskSeen"
	| "findingCardDismissed"
	| "notifNudgeDismissed"
	| "starterSuggestionsSeen";

const ALL_ACCOUNT_FLAGS: readonly AccountFlag[] = [
	"copingAskSeen",
	"findingCardDismissed",
	"notifNudgeDismissed",
	"starterSuggestionsSeen",
];

/** The top-level booleans are the pre-per-account marks, owner unknown. They stand in for
 * every account until `claimLegacyAccountFlags` hands them to the first one signed in. */
export type AccountFlagsSlice = Record<AccountFlag, boolean> & {
	/** Flags each account (by Clerk user id) has set. */
	accountFlags: Record<string, AccountFlag[]>;
	markAccountFlag: (owner: string, flag: AccountFlag) => void;
	/** Unsets `flags` for one account, all of them by default. */
	clearAccountFlags: (owner: string, flags?: readonly AccountFlag[]) => void;
	/** A set legacy mark never gets written again, so without this it would silence every
	 * later account on the device for good. */
	claimLegacyAccountFlags: (owner: string) => void;
};

type SetState = (
	partial: (s: AccountFlagsSlice) => Partial<AccountFlagsSlice>
) => void;

export const hasAccountFlag = (
	s: Pick<AccountFlagsSlice, AccountFlag | "accountFlags">,
	owner: string,
	flag: AccountFlag
): boolean => s[flag] || (s.accountFlags[owner]?.includes(flag) ?? false);

export const createAccountFlagsSlice = (set: SetState): AccountFlagsSlice => ({
	accountFlags: {},
	claimLegacyAccountFlags: (owner) =>
		set((s) => {
			const legacy = ALL_ACCOUNT_FLAGS.filter((flag) => s[flag]);
			if (legacy.length === 0) {
				return {};
			}
			const own = s.accountFlags[owner] ?? [];
			return {
				accountFlags: {
					...s.accountFlags,
					[owner]: [...new Set([...own, ...legacy])],
				},
				copingAskSeen: false,
				findingCardDismissed: false,
				notifNudgeDismissed: false,
				starterSuggestionsSeen: false,
			};
		}),
	clearAccountFlags: (owner, flags = ALL_ACCOUNT_FLAGS) =>
		set((s) => ({
			accountFlags: {
				...s.accountFlags,
				[owner]: (s.accountFlags[owner] ?? []).filter(
					(flag) => !flags.includes(flag)
				),
			},
		})),
	copingAskSeen: false,
	findingCardDismissed: false,
	markAccountFlag: (owner, flag) =>
		set((s) => {
			const own = s.accountFlags[owner] ?? [];
			return own.includes(flag)
				? {}
				: { accountFlags: { ...s.accountFlags, [owner]: [...own, flag] } };
		}),
	notifNudgeDismissed: false,
	starterSuggestionsSeen: false,
});

/** Keys persisted by the app store's `partialize`. */
export const accountFlagsPersistedKeys = (s: AccountFlagsSlice) => ({
	accountFlags: s.accountFlags,
	copingAskSeen: s.copingAskSeen,
	findingCardDismissed: s.findingCardDismissed,
	notifNudgeDismissed: s.notifNudgeDismissed,
	starterSuggestionsSeen: s.starterSuggestionsSeen,
});
