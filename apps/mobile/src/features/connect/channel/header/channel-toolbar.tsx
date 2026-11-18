import HelpIcon from "@expo/material-symbols/health_and_safety.xml";
import { Stack } from "expo-router";
import { useTokenColor } from "@/lib/use-token-color";
import { useChannelScreen } from "../channel-data";
import { CHANNEL } from "../copy";

const IOS = process.env.EXPO_OS === "ios";

/** Right of the identity: help, one tap away, as in the thread's header. Production's channel had it
 * as a strip over the list; every chat surface keeps one way to crisis resources. */
export function ChannelToolbar() {
	const { actions } = useChannelScreen();
	const danger = useTokenColor("danger-ink");
	return (
		<Stack.Toolbar placement="right">
			<Stack.Toolbar.Button
				accessibilityLabel={CHANNEL.help}
				icon={IOS ? "lifepreserver" : HelpIcon}
				onPress={actions.openHelp}
				separateBackground
				tintColor={danger}
			/>
		</Stack.Toolbar>
	);
}
