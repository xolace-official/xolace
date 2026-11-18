import { createContext, type ReactNode, use } from "react";
import type { ReportReason } from "../copy";
import { useReport } from "./use-report";

/** The report sheet: one action. Two adapters: the data module (`ReportData`), fixtures. */
export type LetterReport = {
	state: { reason: ReportReason | null };
	actions: {
		/** Closes the sheet; the letter goes once it has (380 ms), and the sender isn't told. */
		report: (reason: ReportReason) => void;
	};
};

const ReportContext = createContext<LetterReport | null>(null);

export function ReportProvider({
	value,
	children,
}: {
	value: LetterReport;
	children: ReactNode;
}) {
	return <ReportContext value={value}>{children}</ReportContext>;
}

export function ReportData({
	id,
	children,
}: {
	id: string;
	children: ReactNode;
}) {
	return <ReportProvider value={useReport(id)}>{children}</ReportProvider>;
}

export function useReportSheet(): LetterReport {
	const value = use(ReportContext);
	if (!value) {
		throw new Error("useReportSheet needs a ReportProvider above it");
	}
	return value;
}
