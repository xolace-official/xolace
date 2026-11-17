import { createContext, type ReactNode, use } from "react";
import type { ReportReason } from "../copy";
import { useReportSheetData } from "./use-report-sheet";

/**
 * What the report sheet does: send a reason, or cancel. Convex in the app
 * (`ReportSheetData`), nothing in its dev state.
 */
export type ReportSheet = {
	actions: {
		/** Closes the sheet first, then sends; the card folds once the report is in. */
		pick: (reason: ReportReason) => void;
		cancel: () => void;
	};
};

const ReportSheetContext = createContext<ReportSheet | null>(null);

export function ReportSheetProvider({
	value,
	children,
}: {
	value: ReportSheet;
	children: ReactNode;
}) {
	return <ReportSheetContext value={value}>{children}</ReportSheetContext>;
}

export function useReportSheet(): ReportSheet {
	const sheet = use(ReportSheetContext);
	if (!sheet) {
		throw new Error("useReportSheet needs a ReportSheetProvider above it");
	}
	return sheet;
}

/** The app's adapter. */
export function ReportSheetData({ children }: { children: ReactNode }) {
	const value = useReportSheetData();
	return <ReportSheetProvider value={value}>{children}</ReportSheetProvider>;
}
