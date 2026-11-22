import Fire from "@expo/material-symbols/local_fire_department.xml";
import MoreVert from "@expo/material-symbols/more_vert.xml";
import { Stack } from "expo-router";
import { Alert } from "react-native";
import { COPY } from "../copy";

const IOS = process.env.EXPO_OS === "ios";

export function KindlingMenu({
	onAsk,
	onCancel,
	onPutOut,
}: {
	onAsk: () => void;
	onCancel: () => void;
	onPutOut: () => void;
}) {
	const ask = () => {
		onAsk();
		Alert.alert(
			COPY.alert.title,
			COPY.alert.body,
			[
				{ onPress: onCancel, style: "cancel", text: COPY.alert.cancel },
				{ onPress: onPutOut, style: "destructive", text: COPY.alert.confirm },
			],
			// Android: tapping outside the alert cancels it too.
			{ cancelable: true, onDismiss: onCancel }
		);
	};
	return (
		<Stack.Toolbar placement="right">
			<Stack.Toolbar.Menu
				accessibilityLabel={COPY.more}
				icon={IOS ? "ellipsis" : MoreVert}
			>
				<Stack.Toolbar.MenuAction
					destructive
					icon={IOS ? "flame" : Fire}
					onPress={ask}
				>
					{COPY.putOut}
				</Stack.Toolbar.MenuAction>
			</Stack.Toolbar.Menu>
		</Stack.Toolbar>
	);
}
