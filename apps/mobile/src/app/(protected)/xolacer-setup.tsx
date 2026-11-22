import { SetupData } from "@/features/connect/setup/setup-data";
import { SetupScreen } from "@/features/connect/setup/setup-screen";

export default function XolacerSetupRoute() {
	return (
		<SetupData>
			<SetupScreen />
		</SetupData>
	);
}
