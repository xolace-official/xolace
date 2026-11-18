import { useWelcome } from "@/features/lantern/welcome/use-welcome";
import { WelcomeScreen } from "@/features/lantern/welcome/welcome-screen";

/** Lantern's one-time welcome, opened by its home on a first visit. */
export default function LanternWelcomeRoute() {
	return <WelcomeScreen onBegin={useWelcome().begin} />;
}
