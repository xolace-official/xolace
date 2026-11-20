import { usePathname } from "expo-router";
import {
	useDevMenuTrigger,
	useFeedbackShake,
	useShakeHint,
} from "./use-feedback-shake";

const REFLECT_ROUTE = "/reflect";

/**
 * The global shake: on every screen of the app but Reflect's (which runs its own, off while
 * someone writes). A `(protected)` host (`features/navigation/hosts.ts`), as the sheet is a route
 * of that stack; renders nothing.
 */
export function FeedbackShake() {
	const pathname = usePathname();
	const here = pathname !== REFLECT_ROUTE;
	useDevMenuTrigger();
	// The hint lives here alone: a second one in Reflect would toast twice when the tip comes due.
	useShakeHint(here);
	useFeedbackShake({ enabled: here });
	return null;
}
