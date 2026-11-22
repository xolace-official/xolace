import { createContext, type ReactNode, use } from "react";
import type { NameKind, SignIn } from "@/features/settings/account/copy";
import { useAccount } from "@/features/settings/account/use-account";

export type NameDraft = { kind: NameKind; draft: string; error: string };

export type Account = {
	state: {
		signIn: SignIn | undefined;
		name: string | undefined;
		space: string | null | undefined;
		companion: string;
		plus: boolean | undefined;
		restoring: boolean;
		dialog: NameDraft | null;
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
