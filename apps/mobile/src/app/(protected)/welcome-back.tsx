import { WelcomeBackData } from "@/features/coming-back/welcome-back-data";
import { WelcomeBackScreen } from "@/features/coming-back/welcome-back-screen";

export default function WelcomeBackRoute() {
	return (
		<WelcomeBackData>
			<WelcomeBackScreen />
		</WelcomeBackData>
	);
}
