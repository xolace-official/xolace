import { createContext, type ReactNode, use } from "react";
import type { NameKind, SignIn } from "@/features/settings/account/copy";
import { useAccount } from "@/features/settings/account/use-account";

/** The open name dialog: which name, what's typed, and what's wrong with it ("" when it saves). */
export type NameDraft = { kind: NameKind; draft: string; error: string };

/**
 * Everything Settings › Account reads and does. Two adapters fill it: Clerk, Convex and
 * RevenueCat in the app (`AccountData`), fixtures in its dev states (`dev/`). A value that is
 * undefined is still loading.
 */
export type Account = {
	state: {
		signIn: SignIn | undefined;
		/** What Xolace calls you (`profile.getSummary`). */
		name: string | undefined;
		/** The space's own name; null while unnamed (the companion's default shows). */
		space: string | null | undefined;
		/** The companion's name while the space is unnamed: Ember. */
		companion: string;
		plus: boolean | undefined;
		/** A restore is running. */
		restoring: boolean;
		dialog: NameDraft | null;
		/** The log-out alert. */
		logOutOpen: boolean;
	};
	actions: {
		edit: (kind: NameKind) => void;
		setDraft: (draft: string) => void;
		cancelEdit: () => void;
		save: (trimmed: string) => void;
		resetSpace: () => void;
		manageSubscription: () => void;
		restore: () => void;
		askLogOut: () => void;
		closeLogOut: () => void;
		logOut: () => void;
		openPrivacy: () => void;
	};
};

const AccountContext = createContext<Account | null>(null);

export function AccountProvider({
	value,
	children,
}: {
	value: Account;
	children: ReactNode;
}) {
	return <AccountContext value={value}>{children}</AccountContext>;
}

/** The app's adapter. */
export function AccountData({ children }: { children: ReactNode }) {
	return <AccountProvider value={useAccount()}>{children}</AccountProvider>;
}

export function useAccountScreen(): Account {
	const value = use(AccountContext);
	if (!value) {
		throw new Error("useAccountScreen needs an AccountProvider above it");
	}
	return value;
}
