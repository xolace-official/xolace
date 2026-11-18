// The first look's provider: what its parts read and the taps they send. `FirstLookData`
// fills it from the store (and puts the Talk demo over it); a dev state fills it from fixtures.
import { createContext, type ReactNode, use } from "react";
import type { Plans } from "@/features/purchases/plans";
import type { PlanId } from "@/features/purchases/screens/paywall-period-picker";
import type { RowId } from "./copy";
import { TalkDemo } from "./talk-demo/talk-demo";
import { type FirstLookStepProps, useFirstLook } from "./use-first-look";

export type FirstLookValue = {
	actions: {
		buy: () => void;
		continueFree: () => void;
		pick: (plan: PlanId) => void;
		restore: () => void;
		retry: () => void;
		rowOpened: (row: RowId) => void;
		/** Opens the Talk demo; absent while the intake saves. */
		tryTalk?: () => void;
	};
	state: {
		/** The intake is saving: nothing may be tapped again. */
		busy: boolean;
		/** A purchase is in flight. */
		buying: boolean;
		/** Xolace+ is theirs already: only the way on is live. */
		owned: boolean;
		plan: PlanId;
		plans: Plans;
		restoring: boolean;
		retrying: boolean;
		/** Their words for "You said …", or null for the plain line. */
		said: string | null;
		/** Payments are on and the store sells nothing. */
		unavailable: boolean;
	};
};

const FirstLookContext = createContext<FirstLookValue | null>(null);

export function useFirstLookData(): FirstLookValue {
	const value = use(FirstLookContext);
	if (!value) {
		throw new Error("useFirstLookData needs a FirstLookProvider above it");
	}
	return value;
}

export function FirstLookProvider({
	children,
	value,
}: {
	children: ReactNode;
	value: FirstLookValue;
}) {
	return <FirstLookContext value={value}>{children}</FirstLookContext>;
}

/** The provider filled from the store, with the Talk demo over the step. */
export function FirstLookData({
	children,
	...props
}: FirstLookStepProps & { children: ReactNode }) {
	const { demo, ...value } = useFirstLook(props);
	return (
		<FirstLookProvider value={value}>
			{children}
			<TalkDemo
				keepTalkingLabel={demo.label}
				onClose={demo.onClose}
				onKeepTalking={demo.onKeepTalking}
				onSafety={demo.onSafety}
				visible={demo.open}
			/>
		</FirstLookProvider>
	);
}
