import { createContext, type ReactNode, use } from "react";
import type { SetupDraft } from "./setup-model";
import { useSetup } from "./use-setup";

export type SetupState =
	| { phase: "loading" }
	/** Loaded, and there's no Xolacer profile on this account. */
	| { phase: "missing" }
	| {
			phase: "ready";
			draft: SetupDraft;
			step: number;
			uploading: boolean;
			busy: boolean;
			active: boolean;
	  };

export type SetupScreenData = {
	state: SetupState;
	actions: {
		setName: (next: string) => void;
		setBio: (next: string) => void;
		toggleSpecialty: (slug: string) => void;
		pickPhoto: () => void;
		next: () => void;
		back: () => void;
		save: () => void;
		close: () => void;
		setActive: (next: boolean) => void;
	};
};

const Context = createContext<SetupScreenData | null>(null);

export function SetupProvider({
	value,
	children,
}: {
	value: SetupScreenData;
	children: ReactNode;
}) {
	return <Context value={value}>{children}</Context>;
}

export function SetupData({ children }: { children: ReactNode }) {
	return <SetupProvider value={useSetup()}>{children}</SetupProvider>;
}

export function useSetupScreen(): SetupScreenData {
	const value = use(Context);
	if (!value) {
		throw new Error("useSetupScreen needs a SetupProvider");
	}
	return value;
}
