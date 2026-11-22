import { AaSheet } from "@/features/lantern/reader/sheets/aa-sheet";
import { AppearanceData } from "@/features/lantern/reader/sheets/sheets-data";

export default function ReaderAppearanceRoute() {
	return (
		<AppearanceData>
			<AaSheet />
		</AppearanceData>
	);
}
