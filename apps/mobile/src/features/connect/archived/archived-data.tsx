import { createContext, type ReactNode, use } from "react";
import type { PairRowView } from "../list/chats-model";
import type { DeleteConfirm, RowActions } from "../list/row-actions";
import { useArchived } from "./use-archived";

export type ArchivedScreenData = {
	state: { rows: PairRowView[] | undefined };
	deleting: DeleteConfirm;
	actions: RowActions;
};

const Context = createContext<ArchivedScreenData | null>(null);

export function ArchivedProvider({
	value,
	children,
}: {
	value: ArchivedScreenData;
	children: ReactNode;
}) {
	return <Context value={value}>{children}</Context>;
}

export function ArchivedData({ children }: { children: ReactNode }) {
	return <ArchivedProvider value={useArchived()}>{children}</ArchivedProvider>;
}

export function useArchivedScreen(): ArchivedScreenData {
	const value = use(Context);
	if (!value) {
		throw new Error("useArchivedScreen outside ArchivedData");
	}
	return value;
}
