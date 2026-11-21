import { createContext, type ReactNode, use } from "react";
import type { Retention, SheetKind } from "@/features/settings/privacy/copy";
import type { PastRetention } from "@/features/settings/privacy/privacy-model";
import { usePrivacy } from "@/features/settings/privacy/use-privacy";
import type { ComposedSwitch } from "@/features/settings/settings-switch-row";

export type Privacy = {
	state: {
		loading: boolean;
		memory: boolean;
		share: boolean;
		receiveLetters: boolean | null;
		retention: Retention;
		pending: Retention | null;
		past: PastRetention | null;
		applying: boolean;
		policyOpen: boolean;
	};
	actions: {
		setMemory: (on: boolean) => void;
		setShare: (on: boolean) => void;
		setReceiveLetters: (on: boolean) => void;
		pickRetention: (retention: Retention) => void;
		cancelRetention: () => void;
		confirmRetention: () => void;
		openCopy: () => void;
		openPolicy: () => void;
		closePolicy: () => void;
		openDelete: (kind: SheetKind) => void;
	};
};

const PrivacyContext = createContext<Privacy | null>(null);

export function PrivacyProvider({
	value,
	children,
}: {
	value: Privacy;
	children: ReactNode;
}) {
	return <PrivacyContext value={value}>{children}</PrivacyContext>;
}

export function PrivacyData({
	letters,
	children,
}: {
	letters: ComposedSwitch;
	children: ReactNode;
}) {
	return (
		<PrivacyProvider value={usePrivacy(letters)}>{children}</PrivacyProvider>
	);
}

export function usePrivacyScreen(): Privacy {
	const value = use(PrivacyContext);
	if (!value) {
		throw new Error("usePrivacyScreen needs a PrivacyProvider above it");
	}
	return value;
}
