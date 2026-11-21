import { SwapSheetData } from "@/features/sit-with-this/swap/swap-data";
import { SwapSheetView } from "@/features/sit-with-this/swap/swap-sheet";

export default function SitWithThisSwapRoute() {
	return (
		<SwapSheetData>
			<SwapSheetView />
		</SwapSheetData>
	);
}
