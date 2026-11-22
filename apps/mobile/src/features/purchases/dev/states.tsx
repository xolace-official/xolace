import { View } from "react-native";
import type { DevState } from "@/dev/dev-state";
import { PaywallPlansUnavailable } from "../screens/paywall-plans-unavailable";

const noop = () => undefined;

function Unavailable({ retrying }: { retrying: boolean }) {
	return (
		<View className="flex-1 justify-center bg-background px-6">
			<PaywallPlansUnavailable isRetrying={retrying} onRetry={noop} />
		</View>
	);
}

/** @public Found by `src/dev/discovered.ts` (`require.context`), which knip can't follow. */
export const devStates: readonly DevState[] = [
	{
		id: "plans-unavailable",
		options: { headerShown: false },
		Screen: () => <Unavailable retrying={false} />,
		title: "Plans unavailable",
	},
	{
		id: "plans-retrying",
		options: { headerShown: false },
		Screen: () => <Unavailable retrying />,
		title: "Plans unavailable, retrying",
	},
];
