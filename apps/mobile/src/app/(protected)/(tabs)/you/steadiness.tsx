import { SteadinessData } from "@/features/you/steadiness/steadiness-data";
import { SteadinessScreen } from "@/features/you/steadiness/steadiness-screen";
import { SteadinessUiProvider } from "@/features/you/steadiness/steadiness-ui";

export default function SteadinessRoute() {
	return (
		<SteadinessData>
			<SteadinessUiProvider>
				<SteadinessScreen />
			</SteadinessUiProvider>
		</SteadinessData>
	);
}
