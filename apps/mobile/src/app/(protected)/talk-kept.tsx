// What a talk is, and what's kept: a sheet over Talk's start screen.
import { KeptSheet } from "@/features/talk/sheets/kept-sheet";
import { TalkSheetsData } from "@/features/talk/talk-sheets-data";

export default function TalkKeptRoute() {
	return (
		<TalkSheetsData>
			<KeptSheet />
		</TalkSheetsData>
	);
}
