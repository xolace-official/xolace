import { HelpData } from "@/features/care/help/help-data";
import { HelpScreen } from "@/features/care/help/help-screen";

export default function NeedHelpRoute() {
	return (
		<HelpData>
			<HelpScreen />
		</HelpData>
	);
}
