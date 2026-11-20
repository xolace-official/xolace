import type { Button } from "@expo/ui/swift-ui";
import type { ComponentProps, ReactElement } from "react";
import { Alert, Pressable } from "react-native";
import { HOME } from "@/features/explore/copy";

const HOLD_MS = 450;

type Props = {
	label: string;
	icon: ComponentProps<typeof Button>["systemImage"];
	onPress: () => void;
	children: ReactElement;
	width?: number;
};

export function HomeMenu({ label, onPress, children, width }: Props) {
	const open = () =>
		Alert.alert("", undefined, [
			{ onPress, style: "destructive", text: label },
			{ style: "cancel", text: HOME.cancel },
		]);
	return (
		<Pressable
			accessible={false}
			delayLongPress={HOLD_MS}
			onLongPress={open}
			style={width ? { width } : undefined}
		>
			{children}
		</Pressable>
	);
}
