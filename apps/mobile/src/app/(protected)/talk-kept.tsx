import { KeptSheet } from "@/features/talk/sheets/kept-sheet";
import { TalkSheetsData } from "@/features/talk/talk-sheets-data";

export default function TalkKeptRoute() {
	return (
		<TalkSheetsData>
			<KeptSheet />
		</TalkSheetsData>
	);
}
