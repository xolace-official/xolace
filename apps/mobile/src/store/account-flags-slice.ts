type LegacyAccountFlag = "findingCardDismissed";

export type AccountFlag = LegacyAccountFlag | "telegramOfferDismissed";

const LEGACY_ACCOUNT_FLAGS: readonly LegacyAccountFlag[] = [
	"findingCardDismissed",
];

const ALL_ACCOUNT_FLAGS: readonly AccountFlag[] = [
	...LEGACY_ACCOUNT_FLAGS,
	"telegramOfferDismissed",
];

const LEGACY_SET = new Set<string>(LEGACY_ACCOUNT_FLAGS);
const isLegacy = (flag: AccountFlag): flag is LegacyAccountFlag =>
	LEGACY_SET.has(flag);

export type AccountFlagsSlice = Record<LegacyAccountFlag, boolean> & {
	accountFlags: Record<string, AccountFlag[]>;
	markAccountFlag: (owner: string, flag: AccountFlag) => void;
	clearAccountFlags: (owner: string, flags?: readonly AccountFlag[]) => void;
	claimLegacyAccountFlags: (owner: string) => void;
};

type SetState = (
	partial: (s: AccountFlagsSlice) => Partial<AccountFlagsSlice>
) => void;

export const hasAccountFlag = (
	s: Pick<AccountFlagsSlice, LegacyAccountFlag | "accountFlags">,
	owner: string,
	flag: AccountFlag
): boolean =>
	(isLegacy(flag) && s[flag]) ||
	(s.accountFlags[owner]?.includes(flag) ?? false);

export const createAccountFlagsSlice = (set: SetState): AccountFlagsSlice => ({
	accountFlags: {},
	claimLegacyAccountFlags: (owner) =>
		set((s) => {
			const legacy = LEGACY_ACCOUNT_FLAGS.filter((flag) => s[flag]);
			if (legacy.length === 0) {
				return {};
			}
			const own = s.accountFlags[owner] ?? [];
			return {
				accountFlags: {
					...s.accountFlags,
					[owner]: [...new Set([...own, ...legacy])],
				},
				findingCardDismissed: false,
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
	findingCardDismissed: false,
	markAccountFlag: (owner, flag) =>
		set((s) => {
			const own = s.accountFlags[owner] ?? [];
			return own.includes(flag)
				? {}
				: { accountFlags: { ...s.accountFlags, [owner]: [...own, flag] } };
		}),
});

export const accountFlagsPersistedKeys = (s: AccountFlagsSlice) => ({
	accountFlags: s.accountFlags,
	findingCardDismissed: s.findingCardDismissed,
});
