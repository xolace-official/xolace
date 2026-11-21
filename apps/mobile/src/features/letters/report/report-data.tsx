import { createContext, type ReactNode, use } from "react";
import type { ReportReason } from "../copy";
import { useReport } from "./use-report";

export type LetterReport = {
	state: { reason: ReportReason | null };
	actions: {
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
