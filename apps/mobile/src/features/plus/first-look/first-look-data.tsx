import { createContext, type ReactNode, use } from "react";
import type { PlanId, Plans } from "@/features/purchases/plans";
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
		tryTalk?: () => void;
	};
	state: {
		busy: boolean;
		buying: boolean;
		owned: boolean;
		plan: PlanId;
		plans: Plans;
		restoring: boolean;
		retrying: boolean;
		said: string | null;
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
