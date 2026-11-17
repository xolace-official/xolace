import { VentData } from "@/features/vent/vent-data";
import { VentScreen } from "@/features/vent/vent-screen";

export default function VoiceVentRoute() {
	return (
		<VentData>
			<VentScreen />
		</VentData>
	);
}
