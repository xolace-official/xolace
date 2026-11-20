import { createContext, type ReactNode, use } from "react";
import type { PlusStatus } from "@/features/purchases/plus-status";
import type { SheetKind } from "@/features/settings/privacy/copy";
import { useDeleteSheet } from "@/features/settings/privacy/delete/use-delete-sheet";

export type DeleteSheet = {
	state: {
		kind: SheetKind;
		plus: PlusStatus;
		busy: boolean;
		deleted: boolean;
	};
	actions: {
		confirm: () => void;
		keep: () => void;
	};
};

const DeleteSheetContext = createContext<DeleteSheet | null>(null);

export function DeleteSheetProvider({
	value,
	children,
}: {
	value: DeleteSheet;
	children: ReactNode;
}) {
	return <DeleteSheetContext value={value}>{children}</DeleteSheetContext>;
}

export function DeleteSheetData({
	kind,
	onDataWiped,
	children,
}: {
	kind: SheetKind;
	onDataWiped: () => Promise<void>;
	children: ReactNode;
}) {
	return (
		<DeleteSheetProvider value={useDeleteSheet(kind, onDataWiped)}>
			{children}
		</DeleteSheetProvider>
	);
}

export function useDeleteSheetScreen(): DeleteSheet {
	const value = use(DeleteSheetContext);
	if (!value) {
		throw new Error(
			"useDeleteSheetScreen needs a DeleteSheetProvider above it"
		);
	}
	return value;
}
