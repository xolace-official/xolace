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
			/** Setup's step, 0-based. Edit shows every field at once. */
			step: number;
			uploading: boolean;
			/** Publishing (setup) or saving (edit). */
			busy: boolean;
			/** Listed on the roster, or paused (edit). */
			active: boolean;
	  };

/** Everything setup and edit read and do. Convex fills it in the app (`SetupData`), fixtures
 * in the dev states. */
export type SetupScreenData = {
	state: SetupState;
	actions: {
		setName: (next: string) => void;
		setBio: (next: string) => void;
		toggleSpecialty: (slug: string) => void;
		/** The photo library, a square crop, then the upload. */
		pickPhoto: () => void;
		/** Setup: Continue on steps 1 to 4, Publish on 5. */
		next: () => void;
		/** Setup: Close on step 1, back a step after. */
		back: () => void;
		/** Edit: Save. */
		save: () => void;
		/** Edit: Cancel. */
		close: () => void;
		/** Edit: listed or paused, written straight away. */
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

/** Fills setup and edit from Convex. */
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
