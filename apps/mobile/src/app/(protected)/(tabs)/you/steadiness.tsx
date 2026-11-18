import { SteadinessData } from "@/features/you/steadiness/steadiness-data";
import { SteadinessScreen } from "@/features/you/steadiness/steadiness-screen";
import { SteadinessUiProvider } from "@/features/you/steadiness/steadiness-ui";

/** Steadiness, pushed inside the You tab so the tab bar shows (`/you/steadiness`). */
export default function SteadinessRoute() {
	return (
		<SteadinessData>
			<SteadinessUiProvider>
				<SteadinessScreen />
			</SteadinessUiProvider>
		</SteadinessData>
	);
}
