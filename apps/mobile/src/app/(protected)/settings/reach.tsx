import { Redirect } from "expo-router";
import { ReachMeOnSheet } from "@/features/reach-me-on/components/reach-me-on-sheet";
import { useReachMeOnFlag } from "@/features/reach-me-on/use-reach-channels";

export default function ReachRoute() {
	const enabled = useReachMeOnFlag();
	// Behind the flag like its row: a deep link with the flag off goes back.
	if (enabled === false) {
		return <Redirect href="/settings/notifications" />;
	}
	return enabled ? <ReachMeOnSheet /> : null;
}
