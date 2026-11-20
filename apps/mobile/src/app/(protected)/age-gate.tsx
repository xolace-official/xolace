import { AgeSheetData } from "@/features/connect/age-gate/age-gate-data";
import { AgeGateSheet } from "@/features/connect/age-gate/age-gate-sheet";

export default function AgeGateRoute() {
	return (
		<AgeSheetData>
			<AgeGateSheet />
		</AgeSheetData>
	);
}
