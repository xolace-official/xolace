import { AaSheet } from "@/features/lantern/reader/sheets/aa-sheet";
import { AppearanceData } from "@/features/lantern/reader/sheets/sheets-data";

/** The reader's Aa sheet. */
export default function ReaderAppearanceRoute() {
	return (
		<AppearanceData>
			<AaSheet />
		</AppearanceData>
	);
}
