import { useLocalSearchParams } from "expo-router";
import { ReportData } from "@/features/letters/report/report-data";
import { ReportSheet } from "@/features/letters/report/report-sheet";

export default function ReportLetterRoute() {
	const { id = "" } = useLocalSearchParams<{ id?: string }>();
	return (
		<ReportData id={id}>
			<ReportSheet />
		</ReportData>
	);
}
