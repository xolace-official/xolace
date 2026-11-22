import { type ReactNode, useState } from "react";
import { View } from "react-native";
import { MODULE_GAP } from "./today-motion";

export function TodaySlot({ children }: { children: ReactNode }) {
	const [filled, setFilled] = useState(false);
	return (
		<View className="mx-4" style={{ marginTop: filled ? MODULE_GAP : 0 }}>
			<View
				onLayout={(e) => {
					const has = e.nativeEvent.layout.height > 0;
					if (has !== filled) {
						setFilled(has);
					}
				}}
			>
				{children}
			</View>
		</View>
	);
}
