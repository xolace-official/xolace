import { createContext, type ReactNode, use } from "react";
import type { ReportReason } from "../copy";
import { useReportSheetData } from "./use-report-sheet";

export type ReportSheet = {
	actions: {
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

export function ReportSheetData({ children }: { children: ReactNode }) {
	const value = useReportSheetData();
	return <ReportSheetProvider value={value}>{children}</ReportSheetProvider>;
}
