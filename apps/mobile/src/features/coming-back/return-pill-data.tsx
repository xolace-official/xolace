import { createContext, type ReactNode, use } from "react";
import { useReturnPill as useReturnPillData } from "./use-coming-back";

export type ReturnPill = {
	state: {
		label: string | null;
		ck: boolean;
		pm: boolean;
		closeKey: number;
		reduced: boolean;
	};
	actions: {
		open: () => void;
	};
};

const ReturnPillContext = createContext<ReturnPill | null>(null);

export function ReturnPillProvider({
	value,
	children,
}: {
	value: ReturnPill;
	children: ReactNode;
}) {
	return <ReturnPillContext value={value}>{children}</ReturnPillContext>;
}

export function useReturnPill(): ReturnPill {
	const value = use(ReturnPillContext);
	if (!value) {
		throw new Error("useReturnPill outside ReturnPillData");
	}
	return value;
}

export function ReturnPillData({ children }: { children: ReactNode }) {
	return (
		<ReturnPillProvider value={useReturnPillData()}>
			{children}
		</ReturnPillProvider>
	);
}
