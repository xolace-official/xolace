import { createContext, type ReactNode, use } from "react";
import type { Retention, SheetKind } from "@/features/settings/privacy/copy";
import type { PastRetention } from "@/features/settings/privacy/privacy-model";
import { usePrivacy } from "@/features/settings/privacy/use-privacy";

/**
 * Everything Settings › Privacy & Data reads and does. Two adapters fill it: Convex in the app
 * (`PrivacyData`), fixtures in its dev states (`dev/`).
 */
export type Privacy = {
	state: {
		/** Preferences haven't arrived yet. */
		loading: boolean;
		/** `personalMemoryEnabled`, on unless turned off. */
		memory: boolean;
		/** `contributeByDefault`. */
		share: boolean;
		/** `dataRetentionPreference`, as saved. */
		retention: Retention;
		/** A shorter period being counted or asked about; the list shows it meanwhile. */
		pending: Retention | null;
		/** What the pending period would delete: set, the alert is up. */
		past: PastRetention | null;
		/** "Delete them" is on its way. */
		applying: boolean;
		/** The privacy policy sheet is up. */
		policyOpen: boolean;
	};
	actions: {
		setMemory: (on: boolean) => void;
		setShare: (on: boolean) => void;
		pickRetention: (retention: Retention) => void;
		/** The alert's Cancel: the previous choice stays. */
		cancelRetention: () => void;
		/** The alert's "Delete them": saves and deletes what it counted, now. */
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

/** The app's adapter. */
export function PrivacyData({ children }: { children: ReactNode }) {
	return <PrivacyProvider value={usePrivacy()}>{children}</PrivacyProvider>;
}

export function usePrivacyScreen(): Privacy {
	const value = use(PrivacyContext);
	if (!value) {
		throw new Error("usePrivacyScreen needs a PrivacyProvider above it");
	}
	return value;
}
