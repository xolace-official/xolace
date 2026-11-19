import Fire from "@expo/material-symbols/local_fire_department.xml";
import MoreVert from "@expo/material-symbols/more_vert.xml";
import { Stack } from "expo-router";
import { Alert } from "react-native";
import { COPY } from "../copy";

const IOS = process.env.EXPO_OS === "ios";

/**
 * The bar's ⋯ menu (§11.1): "Put this kindling out", behind an alert. A skip still in its undo
 * window is sent first (`beforeOpen`), as leaving would.
 */
export function KindlingMenu({
	beforeOpen,
	onPutOut,
}: {
	beforeOpen: () => void;
	onPutOut: () => void;
}) {
	const ask = () => {
		beforeOpen();
		Alert.alert(COPY.alert.title, COPY.alert.body, [
			{ style: "cancel", text: COPY.alert.cancel },
			{ onPress: onPutOut, style: "destructive", text: COPY.alert.confirm },
		]);
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
