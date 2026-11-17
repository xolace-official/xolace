import { ReportSheetView } from "@/features/peer-reflection/report/report-sheet";
import { ReportSheetData } from "@/features/peer-reflection/report/report-sheet-data";

export default function ReportReflectionRoute() {
	return (
		<ReportSheetData>
			<ReportSheetView />
		</ReportSheetData>
	);
}
