import { createContext, type ReactNode, use } from "react";
import type { SheetKind } from "@/features/settings/privacy/copy";
import { useDeleteSheet } from "@/features/settings/privacy/delete/use-delete-sheet";

/**
 * Everything the delete sheet reads and does. Two adapters fill it: Convex and Clerk in the app
 * (`DeleteSheetData`), fixtures in its dev states (`dev/`).
 */
export type DeleteSheet = {
	state: {
		kind: SheetKind;
		/** On Xolace+: the account sheet says the billing isn't Xolace's to end. */
		plus: boolean;
		/** The delete is on its way. */
		busy: boolean;
	};
	actions: {
		confirm: () => void;
		/** Keep my data / Keep my account: closes the sheet. */
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

/**
 * The app's adapter. `onDataWiped` is what else a data wipe clears on this phone (Reflect's
 * unsent draft), composed in by the route: features meet in routes.
 */
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
