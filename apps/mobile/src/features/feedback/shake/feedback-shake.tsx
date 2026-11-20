import { usePathname } from "expo-router";
import {
	useDevMenuTrigger,
	useFeedbackShake,
	useShakeHint,
} from "./use-feedback-shake";

const REFLECT_ROUTE = "/reflect";

export function FeedbackShake() {
	const pathname = usePathname();
	const here = pathname !== REFLECT_ROUTE;
	useDevMenuTrigger();
	useShakeHint(here);
	useFeedbackShake({ enabled: here });
	return null;
}
