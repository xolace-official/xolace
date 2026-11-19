import { WelcomeBackData } from "@/features/coming-back/welcome-back-data";
import { WelcomeBackScreen } from "@/features/coming-back/welcome-back-screen";

/** Coming back's greeting, a detached sheet over Today. */
export default function WelcomeBackRoute() {
	return (
		<WelcomeBackData>
			<WelcomeBackScreen />
		</WelcomeBackData>
	);
}
